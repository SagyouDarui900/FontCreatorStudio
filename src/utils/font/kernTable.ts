export interface KernPair {
  leftIndex: number;
  rightIndex: number;
  value: number;
}

interface SfntTableEntry {
  tag: string;
  data: Uint8Array;
}

const SFNT_HEADER_SIZE = 12;
const TABLE_RECORD_SIZE = 16;
const HEAD_CHECKSUM_ADJUSTMENT_OFFSET = 8;
const HEAD_CHECKSUM_MAGIC = 0xb1b0afba;
// OpenType kern format 0 subtable stores its byte length in a uint16 (max 65535),
// with 14 bytes of subtable/format-0 header + 6 bytes per pair -> max 10920 pairs.
const MAX_FORMAT0_PAIRS = Math.floor((0xffff - 14) / 6);

function computeSearchParams(count: number, unitSize: number): {
  searchRange: number;
  entrySelector: number;
  rangeShift: number;
} {
  if (count <= 0) {
    return { searchRange: 0, entrySelector: 0, rangeShift: 0 };
  }
  const entrySelector = Math.floor(Math.log2(count));
  const searchRange = (1 << entrySelector) * unitSize;
  const rangeShift = count * unitSize - searchRange;
  return { searchRange, entrySelector, rangeShift };
}

function calcTableChecksum(bytes: Uint8Array): number {
  const paddedLen = (bytes.length + 3) & ~3;
  let sum = 0;
  for (let i = 0; i < paddedLen; i += 4) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const b3 = bytes[i + 3] ?? 0;
    const word = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    sum = (sum + word) >>> 0;
  }
  return sum >>> 0;
}

function clampInt16(value: number): number {
  const rounded = Math.round(value);
  return Math.max(-32768, Math.min(32767, rounded));
}

function buildKernTableBytes(pairs: KernPair[]): Uint8Array {
  // Deduplicate by (leftIndex, rightIndex), keeping the latest value,
  // and exclude out-of-range glyph indices or zero values.
  const deduped = new Map<number, KernPair>();
  for (const pair of pairs) {
    const left = Math.round(pair.leftIndex);
    const right = Math.round(pair.rightIndex);
    const val = clampInt16(pair.value);
    if (left <= 0 || left > 0xffff || right <= 0 || right > 0xffff || val === 0) {
      continue;
    }
    const key = left * 65536 + right;
    deduped.set(key, { leftIndex: left, rightIndex: right, value: val });
  }

  const sortedPairs = Array.from(deduped.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_FORMAT0_PAIRS)
    .map(([, pair]) => pair);

  const nPairs = sortedPairs.length;
  const subtableLength = 14 + nPairs * 6;
  const totalLength = 4 + subtableLength;
  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);

  // kern table header (version 0, 1 subtable)
  view.setUint16(0, 0, false); // version
  view.setUint16(2, 1, false); // nTables

  // subtable header (format 0, horizontal kerning coverage = 0x0001)
  view.setUint16(4, 0, false); // subtable version
  view.setUint16(6, subtableLength, false); // subtable length
  view.setUint16(8, 0x0001, false); // coverage: horizontal

  // format 0 binary-search header
  const { searchRange, entrySelector, rangeShift } = computeSearchParams(nPairs, 6);
  view.setUint16(10, nPairs, false);
  view.setUint16(12, searchRange, false);
  view.setUint16(14, entrySelector, false);
  view.setUint16(16, rangeShift, false);

  let offset = 18;
  for (const pair of sortedPairs) {
    view.setUint16(offset, pair.leftIndex, false);
    view.setUint16(offset + 2, pair.rightIndex, false);
    view.setInt16(offset + 4, pair.value, false);
    offset += 6;
  }

  return out;
}

/**
 * Inject (or replace) one or more tables inside a serialized SFNT
 * (OTF/TTF) ArrayBuffer and update directory offsets and checksums.
 * Tables with a tag already present in the font are replaced; all other
 * tables are copied through unchanged. The `head` table's
 * checkSumAdjustment is recomputed, so the result stays a valid SFNT
 * container. This is the shared primitive behind injectKernTable and
 * the GPOS / vmtx / vhea injection: opentype.js 2.0.0 never writes any
 * of those tables, so they have to be added after serialization.
 */
export function injectSfntTables(
  buffer: ArrayBuffer,
  replacements: SfntTableEntry[]
): ArrayBuffer {
  if (replacements.length === 0) {
    return buffer;
  }
  const replaceTags = new Set(replacements.map((t) => t.tag));

  const srcBytes = new Uint8Array(buffer);
  const srcView = new DataView(buffer);
  if (srcBytes.length < SFNT_HEADER_SIZE) {
    throw new Error('Invalid SFNT buffer: shorter than header');
  }

  const sfntVersion = srcView.getUint32(0, false);
  const numTables = srcView.getUint16(4, false);
  if (srcBytes.length < SFNT_HEADER_SIZE + numTables * TABLE_RECORD_SIZE) {
    throw new Error('Invalid SFNT buffer: truncated table directory');
  }

  const tables: SfntTableEntry[] = [];
  for (let i = 0; i < numTables; i++) {
    const recOffset = SFNT_HEADER_SIZE + i * TABLE_RECORD_SIZE;
    const tag = String.fromCharCode(
      srcBytes[recOffset],
      srcBytes[recOffset + 1],
      srcBytes[recOffset + 2],
      srcBytes[recOffset + 3]
    );
    const offset = srcView.getUint32(recOffset + 8, false);
    const length = srcView.getUint32(recOffset + 12, false);
    if (offset + length > srcBytes.length) {
      throw new Error(`Invalid SFNT table "${tag}": exceeds buffer length`);
    }
    if (replaceTags.has(tag)) continue;

    const copy = new Uint8Array(length);
    copy.set(srcBytes.subarray(offset, offset + length));
    if (tag === 'head' && copy.length >= HEAD_CHECKSUM_ADJUSTMENT_OFFSET + 4) {
      // Zero checkSumAdjustment before computing table & whole-font checksums
      copy[HEAD_CHECKSUM_ADJUSTMENT_OFFSET] = 0;
      copy[HEAD_CHECKSUM_ADJUSTMENT_OFFSET + 1] = 0;
      copy[HEAD_CHECKSUM_ADJUSTMENT_OFFSET + 2] = 0;
      copy[HEAD_CHECKSUM_ADJUSTMENT_OFFSET + 3] = 0;
    }
    tables.push({ tag, data: copy });
  }

  for (const replacement of replacements) {
    tables.push({ tag: replacement.tag, data: replacement.data });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const nextNumTables = tables.length;
  const headerAndDirSize = SFNT_HEADER_SIZE + nextNumTables * TABLE_RECORD_SIZE;
  let totalSize = headerAndDirSize;
  for (const t of tables) {
    totalSize += (t.data.length + 3) & ~3;
  }

  const outBuf = new ArrayBuffer(totalSize);
  const outBytes = new Uint8Array(outBuf);
  const outView = new DataView(outBuf);

  const { searchRange, entrySelector, rangeShift } = computeSearchParams(nextNumTables, 16);
  outView.setUint32(0, sfntVersion, false);
  outView.setUint16(4, nextNumTables, false);
  outView.setUint16(6, searchRange, false);
  outView.setUint16(8, entrySelector, false);
  outView.setUint16(10, rangeShift, false);

  let dataOffset = headerAndDirSize;
  let headTableOffset = -1;

  tables.forEach((table, idx) => {
    const recOffset = SFNT_HEADER_SIZE + idx * TABLE_RECORD_SIZE;
    for (let c = 0; c < 4; c++) {
      outBytes[recOffset + c] = table.tag.charCodeAt(c) & 0xff;
    }
    const checkSum = calcTableChecksum(table.data);
    outView.setUint32(recOffset + 4, checkSum, false);
    outView.setUint32(recOffset + 8, dataOffset, false);
    outView.setUint32(recOffset + 12, table.data.length, false);

    outBytes.set(table.data, dataOffset);
    if (table.tag === 'head') {
      headTableOffset = dataOffset;
    }
    dataOffset += (table.data.length + 3) & ~3;
  });

  if (headTableOffset >= 0 && headTableOffset + HEAD_CHECKSUM_ADJUSTMENT_OFFSET + 4 <= outBytes.length) {
    const fontCheckSum = calcTableChecksum(outBytes);
    const checkSumAdjustment = (HEAD_CHECKSUM_MAGIC - fontCheckSum) >>> 0;
    outView.setUint32(headTableOffset + HEAD_CHECKSUM_ADJUSTMENT_OFFSET, checkSumAdjustment, false);
  }

  return outBuf;
}

/**
 * Inject (or replace) a standard Windows/OpenType Format 0 `kern` table inside a
 * serialized SFNT (OTF/TTF) ArrayBuffer and update directory offsets and checksums.
 */
export function injectKernTable(buffer: ArrayBuffer, pairs: KernPair[]): ArrayBuffer {
  const kernBytes = buildKernTableBytes(pairs);
  if (kernBytes.length <= 18) {
    return buffer;
  }
  return injectSfntTables(buffer, [{ tag: 'kern', data: kernBytes }]);
}
