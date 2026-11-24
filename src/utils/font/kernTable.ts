/**
 * TrueType `kern` table construction and SFNT injection.
 *
 * opentype.js 2.0.0 only parses kern tables; it never writes one. Its
 * serializer builds the table list from a fixed set plus a few optional
 * tables, and `kern` is not among them, and the `Table` class the app
 * previously used to build one is not exported. So a project with valid
 * kerning pairs used to fail compilation outright
 * ("カーニングテーブルの生成に失敗しました").
 *
 * This module builds the kern table bytes directly (version 0, one
 * format-0 subtable) and rebuilds the SFNT container around the
 * serialized font, inserting the table and fixing the directory, the
 * table offsets, and the checksums. The result round-trips through
 * opentype.js's own parser, which reads the kern table back into
 * `font.kerningPairs`.
 */

export interface KernPair {
  leftIndex: number;
  rightIndex: number;
  value: number;
}

/** The whole-file checksum a valid OpenType font must add up to. */
export const SFNT_CHECKSUM_TARGET = 0xb1b0afba;

function u16Bytes(value: number): [number, number] {
  const v = value & 0xffff;
  return [(v >> 8) & 0xff, v & 0xff];
}

function s16Bytes(value: number): [number, number] {
  return u16Bytes(value);
}

/**
 * Build the bytes of a version-0 kern table with one format-0 subtable.
 * Pairs are sorted by (left, right), as the format requires.
 */
export function buildKernTableBytes(pairs: KernPair[]): number[] {
  const sorted = [...pairs].sort((a, b) =>
    a.leftIndex === b.leftIndex ? a.rightIndex - b.rightIndex : a.leftIndex - b.leftIndex
  );
  const nPairs = sorted.length;
  let entrySelector = 0;
  let searchRange = 1;
  while (searchRange * 2 <= nPairs) {
    searchRange *= 2;
    entrySelector++;
  }
  searchRange *= 6;
  const rangeShift = nPairs * 6 - searchRange;
  const subtableLength = 14 + nPairs * 6;

  const bytes: number[] = [];
  bytes.push(...u16Bytes(0)); // kern table version
  bytes.push(...u16Bytes(1)); // nTables
  bytes.push(...u16Bytes(0)); // subtable version (format 0)
  bytes.push(...u16Bytes(subtableLength));
  bytes.push(...u16Bytes(1)); // coverage: horizontal kerning
  bytes.push(...u16Bytes(nPairs));
  bytes.push(...u16Bytes(searchRange));
  bytes.push(...u16Bytes(entrySelector));
  bytes.push(...u16Bytes(rangeShift));
  for (const pair of sorted) {
    bytes.push(...u16Bytes(pair.leftIndex));
    bytes.push(...u16Bytes(pair.rightIndex));
    bytes.push(...s16Bytes(pair.value));
  }
  return bytes;
}

/**
 * OpenType checksum: the sum of the big-endian uint32 words of the data,
 * zero-padded to a multiple of 4 bytes, modulo 2^32. All arithmetic is
 * kept unsigned (multiplication, not shifts, so bytes >= 0x80 stay
 * positive).
 */
export function computeSfntCheckSum(data: Uint8Array): number {
  let sum = 0;
  const paddedLength = (data.length + 3) & ~3;
  for (let i = 0; i < paddedLength; i += 4) {
    const word =
      (i < data.length ? data[i] : 0) * 0x1000000 +
      (i + 1 < data.length ? data[i + 1] : 0) * 0x10000 +
      (i + 2 < data.length ? data[i + 2] : 0) * 0x100 +
      (i + 3 < data.length ? data[i + 3] : 0);
    sum = (sum + word) % 0x100000000;
  }
  return sum >>> 0;
}

interface SfntTable {
  tag: string;
  data: Uint8Array;
}

/**
 * Insert (or replace) the kern table in a serialized OpenType font and
 * return a new ArrayBuffer. The SFNT directory is rebuilt: records stay
 * sorted by tag, offsets are recomputed, per-table checksums are set,
 * and the head table's checkSumAdjustment is fixed so the whole-file
 * checksum equals SFNT_CHECKSUM_TARGET. The head table's own directory
 * checksum is computed with checkSumAdjustment zeroed, as the format
 * requires.
 */
export function injectKernTable(fontBuffer: ArrayBuffer, pairs: KernPair[]): ArrayBuffer {
  if (pairs.length === 0) return fontBuffer;
  const src = new Uint8Array(fontBuffer);
  const view = new DataView(fontBuffer);
  if (src.length < 12) {
    throw new Error('SFNTデータが短すぎます');
  }
  const numTables = view.getUint16(4, false);
  const tables: SfntTable[] = [];
  for (let i = 0; i < numTables; i++) {
    const recordOffset = 12 + i * 16;
    if (recordOffset + 16 > src.length) {
      throw new Error('SFNTディレクトリがフォントデータの末尾を超えています');
    }
    let tag = '';
    for (let j = 0; j < 4; j++) tag += String.fromCharCode(src[recordOffset + j]);
    const offset = view.getUint32(recordOffset + 8, false);
    const length = view.getUint32(recordOffset + 12, false);
    if (offset + length > src.length) {
      throw new Error(`SFNTテーブル ${tag} がフォントデータの末尾を超えています`);
    }
    tables.push({ tag, data: src.slice(offset, offset + length) });
  }

  // Drop any existing kern table; the new one replaces it.
  const kept = tables.filter((t) => t.tag !== 'kern');
  kept.push({ tag: 'kern', data: new Uint8Array(buildKernTableBytes(pairs)) });
  kept.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const n = kept.length;
  let highestPowerOf2 = 1;
  while (highestPowerOf2 * 2 <= n) highestPowerOf2 *= 2;
  const searchRange = 16 * highestPowerOf2;
  const entrySelector = Math.log2(highestPowerOf2);
  const rangeShift = n * 16 - searchRange;

  const headerSize = 12 + n * 16;
  let offset = headerSize;
  const entries = kept.map((t) => {
    // The head table checksum is computed with checkSumAdjustment zeroed.
    const checksumData =
      t.tag === 'head' && t.data.length >= 12
        ? (() => {
            const copy = new Uint8Array(t.data);
            copy[8] = 0;
            copy[9] = 0;
            copy[10] = 0;
            copy[11] = 0;
            return copy;
          })()
        : t.data;
    const entry = {
      tag: t.tag,
      data: t.data,
      offset,
      length: t.data.length,
      checkSum: computeSfntCheckSum(checksumData),
    };
    offset += (t.data.length + 3) & ~3;
    return entry;
  });

  const out = new Uint8Array(offset);
  const outView = new DataView(out.buffer);
  // Keep the original sfnt version tag (OTTO for CFF-flavored fonts).
  out.set(src.subarray(0, 4), 0);
  outView.setUint16(4, n, false);
  outView.setUint16(6, searchRange, false);
  outView.setUint16(8, entrySelector, false);
  outView.setUint16(10, rangeShift, false);
  for (let i = 0; i < n; i++) {
    const recordOffset = 12 + i * 16;
    const entry = entries[i];
    for (let j = 0; j < 4; j++) out[recordOffset + j] = entry.tag.charCodeAt(j);
    outView.setUint32(recordOffset + 4, entry.checkSum, false);
    outView.setUint32(recordOffset + 8, entry.offset, false);
    outView.setUint32(recordOffset + 12, entry.length, false);
    out.set(entry.data, entry.offset);
  }

  // Fix the head table's checkSumAdjustment so the whole-file checksum
  // equals SFNT_CHECKSUM_TARGET. Measure with the field zeroed first.
  const head = entries.find((e) => e.tag === 'head');
  if (head) {
    outView.setUint32(head.offset + 8, 0, false);
    const total = computeSfntCheckSum(out);
    outView.setUint32(head.offset + 8, (SFNT_CHECKSUM_TARGET - total) >>> 0, false);
  }
  return out.buffer;
}
