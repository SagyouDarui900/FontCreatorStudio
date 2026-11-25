/**
 * Binary builders for the OpenType tables opentype.js 2.0.0 cannot write:
 *
 * - GPOS (`palt` / `pkna`): SinglePos (lookup type 1, format 2) records
 *   that adjust each glyph's advance width. palt in this codebase is a
 *   per-glyph advance-width model (`proportionalAdvance`), so one
 *   SinglePos value per glyph is the matching implementation. A PairPos
 *   (kern-like) lookup would only adjust the advance in front of a
 *   specific following glyph and would miss every other context.
 *   Only `xAdvance` is written, not `xPlacement`: the stored xPlacement
 *   is derived from the unscaled project outline, while the compiled
 *   glyph is scaled (default 1.35x) and optically centered, so writing
 *   it would shift glyphs by a stale amount.
 * - vmtx / vhea: vertical advances and top side bearings for vertical
 *   writing. opentype.js has no vmtx/vhea support at all (neither parse
 *   nor write), so both tables are built here as raw bytes.
 *
 * All three tables are injected into the serialized font with
 * `injectSfntTables` (kernTable.ts), the same mechanism as the kern
 * table: opentype.js 2.0.0 cannot write GPOS either, because its
 * internal `makeGposTable` has an empty subtable-maker table, so
 * building the bytes here is the only route.
 */

/** One glyph's SinglePos advance adjustment, in font units. */
export interface GposSinglePosEntry {
  glyphIndex: number;
  /** Added to the glyph's hmtx advance width (usually negative). */
  xAdvance: number;
}

/** One glyph's vertical proportional adjustment (`vpal`), in font units. */
export interface GposVpalEntry {
  glyphIndex: number;
  /** Vertical origin shift (positive moves the glyph upward). */
  yPlacement: number;
  /** Vertical advance delta (positive shrinks downward advanceHeight). */
  yAdvance: number;
}

/** One glyph's explicit vertical origin Y entry for the `VORG` table. */
export interface VorgEntry {
  glyphIndex: number;
  vertOriginY: number;
}

/** One GPOS `kern` pair adjustment, in font units. */
export interface GposKernPair {
  leftGlyph: number;
  rightGlyph: number;
  value: number;
}

/** One glyph's vertical metrics, in font units. */
export interface VmtxEntry {
  glyphIndex: number;
  advanceHeight: number;
  topSideBearing: number;
}

export interface VheaMetrics {
  ascender: number;
  descender: number;
  lineGap: number;
  advanceHeightMax: number;
  minTopSideBearing: number;
  minBottomSideBearing: number;
  xMaxExtent: number;
  numberOfVMetrics: number;
}

/** Horizontal metrics for the `hhea` table, in font units. */
export interface HheaMetrics {
  ascender: number;
  descender: number;
  lineGap: number;
  advanceWidthMax: number;
  minLeftSideBearing: number;
  minRightSideBearing: number;
  xMaxExtent: number;
  numberOfHMetrics: number;
}

/** Hiragana, katakana and halfwidth katakana (the `pkna` glyph set). */
export function isKanaUnicode(unicode: number): boolean {
  return (
    (unicode >= 0x3041 && unicode <= 0x309f) ||
    (unicode >= 0x30a0 && unicode <= 0x30ff) ||
    (unicode >= 0xff66 && unicode <= 0xff9d)
  );
}

/** Maximum size of a GPOS table: every offset inside it is a uint16. */
export const GPOS_MAX_TABLE_SIZE = 0xffff;

function clampInt16(value: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}

function clampUint16(value: number): number {
  return Math.max(0, Math.min(0xffff, Math.round(value)));
}

/**
 * A uint16 value that must fit: offsets and counts inside GPOS cannot
 * be clamped, because a clamped offset would point at the wrong table
 * and silently corrupt the font. Throw instead so the export stops.
 */
function requireUint16(value: number, what: string): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded < 0 || rounded > 0xffff) {
    throw new Error(`GPOS ${what} (${value}) does not fit in 16 bits`);
  }
  return rounded;
}

/** Minimal big-endian writer with patchable uint16 slots. */
class ByteWriter {
  private bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  u16(value: number): void {
    const v = requireUint16(value, 'uint16 value');
    this.bytes.push((v >> 8) & 0xff, v & 0xff);
  }

  i16(value: number): void {
    this.u16(clampInt16(value) & 0xffff);
  }

  u32(value: number): void {
    const v = value >>> 0;
    this.bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  }

  tag(text: string): void {
    for (let i = 0; i < 4; i++) {
      this.bytes.push(text.charCodeAt(i) & 0xff);
    }
  }

  patchU16(at: number, value: number): void {
    const v = requireUint16(value, 'offset');
    this.bytes[at] = (v >> 8) & 0xff;
    this.bytes[at + 1] = v & 0xff;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

function buildPairPosLookup(
  writer: ByteWriter,
  pairs: GposKernPair[]
): void {
  // Group by left glyph, in ascending glyph-index order.
  const byLeft = new Map<number, GposKernPair[]>();
  for (const pair of pairs) {
    const list = byLeft.get(pair.leftGlyph) ?? [];
    list.push(pair);
    byLeft.set(pair.leftGlyph, list);
  }
  const leftGlyphs = Array.from(byLeft.keys()).sort((a, b) => a - b);
  for (const list of byLeft.values()) {
    list.sort((a, b) => a.rightGlyph - b.rightGlyph);
  }

  // Lookup table (offsets below are relative to this lookup's start).
  const lookupStart = writer.length;
  writer.u16(2); // lookupType: PairPos
  writer.u16(0); // lookupFlag
  writer.u16(1); // subtableCount
  const subtableOffsetSlot = writer.length;
  writer.u16(0); // subtable offset (patched below)

  // PairPos format 1 subtable. valueFormat1 is xAdvance only and
  // valueFormat2 is empty, so each pair record is one int16.
  const subtableStart = writer.length;
  writer.patchU16(subtableOffsetSlot, subtableStart - lookupStart);
  writer.u16(1); // posFormat
  const coverageOffsetSlot = writer.length;
  writer.u16(0); // coverage offset (patched below)
  writer.u16(0x0004); // valueFormat1: xAdvance only
  writer.u16(0x0000); // valueFormat2: none
  writer.u16(leftGlyphs.length); // pairSetCount
  const pairSetOffsetSlots: number[] = [];
  for (let i = 0; i < leftGlyphs.length; i++) {
    pairSetOffsetSlots.push(writer.length);
    writer.u16(0);
  }

  // Coverage format 1: left glyphs in ascending order.
  const coverageStart = writer.length;
  writer.patchU16(coverageOffsetSlot, coverageStart - subtableStart);
  writer.u16(1); // coverage format 1
  writer.u16(leftGlyphs.length);
  for (const left of leftGlyphs) {
    writer.u16(left);
  }

  // PairSets, one per left glyph.
  for (let i = 0; i < leftGlyphs.length; i++) {
    const pairSetStart = writer.length;
    writer.patchU16(pairSetOffsetSlots[i], pairSetStart - subtableStart);
    const list = byLeft.get(leftGlyphs[i])!;
    writer.u16(list.length); // pairValueCount
    for (const pair of list) {
      writer.u16(pair.rightGlyph);
      writer.i16(pair.value);
    }
  }
}

function buildSinglePosLookup(
  writer: ByteWriter,
  entries: GposSinglePosEntry[]
): void {
  // Lookup table (offsets below are relative to this lookup's start).
  const lookupStart = writer.length;
  writer.u16(1); // lookupType: SinglePos
  writer.u16(0); // lookupFlag
  writer.u16(1); // subtableCount
  const subtableOffsetSlot = writer.length;
  writer.u16(0); // subtable offset (patched below)

  // SinglePos format 2 subtable.
  const subtableStart = writer.length;
  writer.patchU16(subtableOffsetSlot, subtableStart - lookupStart);
  writer.u16(2); // posFormat
  const coverageOffsetSlot = writer.length;
  writer.u16(0); // coverage offset (patched below)
  writer.u16(0x0004); // valueFormat: xAdvance only
  writer.u16(entries.length); // valueCount
  for (const entry of entries) {
    writer.i16(entry.xAdvance);
  }

  // Coverage format 1: glyph list in ascending glyph-index order.
  const coverageStart = writer.length;
  writer.patchU16(coverageOffsetSlot, coverageStart - subtableStart);
  writer.u16(1); // coverage format 1
  writer.u16(entries.length);
  for (const entry of entries) {
    writer.u16(entry.glyphIndex);
  }
}

function buildVpalSinglePosLookup(
  writer: ByteWriter,
  entries: GposVpalEntry[]
): void {
  const lookupStart = writer.length;
  writer.u16(1); // lookupType: SinglePos
  writer.u16(0); // lookupFlag
  writer.u16(1); // subtableCount
  const subtableOffsetSlot = writer.length;
  writer.u16(0);

  // SinglePos format 2 subtable with valueFormat = yPlacement (0x0002) | yAdvance (0x0008).
  const subtableStart = writer.length;
  writer.patchU16(subtableOffsetSlot, subtableStart - lookupStart);
  writer.u16(2); // posFormat
  const coverageOffsetSlot = writer.length;
  writer.u16(0);
  writer.u16(0x000a); // valueFormat: yPlacement + yAdvance
  writer.u16(entries.length);
  for (const entry of entries) {
    writer.i16(entry.yPlacement);
    writer.i16(entry.yAdvance);
  }

  const coverageStart = writer.length;
  writer.patchU16(coverageOffsetSlot, coverageStart - subtableStart);
  writer.u16(1);
  writer.u16(entries.length);
  for (const entry of entries) {
    writer.u16(entry.glyphIndex);
  }
}

/**
 * Build a GPOS table (version 1.0) with `palt` and, when any kana glyph
 * has a non-zero adjustment, `pkna` features, plus a `kern` feature
 * carrying the given kerning pairs as a PairPos lookup. Each palt/pkna
 * feature uses one SinglePos lookup. Entries with a zero xAdvance are
 * dropped; when no entry and no kern pair remain, null is returned and
 * no GPOS table is written.
 *
 * The `kern` feature is written as well as the legacy kern table
 * because opentype.js `Font.getKerningValue` reads kerning from GPOS
 * whenever any GPOS table exists (an empty GPOS kern lookup list is
 * truthy, so a palt-only GPOS would make every kern lookup return 0).
 * Per the OpenType specification, shapers prefer GPOS `kern` over the
 * legacy kern table, so writing both does not double-apply the kerning.
 * Scripts DFLT, hani, kana and latn all reference the same features.
 */
export function buildGposTableBytes(
  entries: GposSinglePosEntry[],
  glyphUnicodes: Map<number, number>,
  kernPairs: GposKernPair[] = [],
  vpalEntries: GposVpalEntry[] = []
): Uint8Array | null {
  const deduped = new Map<number, number>();
  for (const entry of entries) {
    const glyphIndex = Math.round(entry.glyphIndex);
    const xAdvance = clampInt16(entry.xAdvance);
    if (glyphIndex <= 0 || glyphIndex > 0xffff || xAdvance === 0) continue;
    deduped.set(glyphIndex, xAdvance);
  }
  const sorted = Array.from(deduped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([glyphIndex, xAdvance]) => ({ glyphIndex, xAdvance }));

  const dedupedKern = new Map<number, GposKernPair>();
  for (const pair of kernPairs) {
    const leftGlyph = Math.round(pair.leftGlyph);
    const rightGlyph = Math.round(pair.rightGlyph);
    const value = clampInt16(pair.value);
    if (
      leftGlyph <= 0 || leftGlyph > 0xffff ||
      rightGlyph <= 0 || rightGlyph > 0xffff ||
      value === 0
    ) {
      continue;
    }
    dedupedKern.set(leftGlyph * 65536 + rightGlyph, { leftGlyph, rightGlyph, value });
  }
  const sortedKern = Array.from(dedupedKern.values()).sort(
    (a, b) => a.leftGlyph - b.leftGlyph || a.rightGlyph - b.rightGlyph
  );

  const dedupedVpal = new Map<number, GposVpalEntry>();
  for (const entry of vpalEntries) {
    const glyphIndex = Math.round(entry.glyphIndex);
    const yPlacement = clampInt16(entry.yPlacement);
    const yAdvance = clampInt16(entry.yAdvance);
    if (glyphIndex <= 0 || glyphIndex > 0xffff || (yPlacement === 0 && yAdvance === 0)) continue;
    dedupedVpal.set(glyphIndex, { glyphIndex, yPlacement, yAdvance });
  }
  const sortedVpal = Array.from(dedupedVpal.values()).sort(
    (a, b) => a.glyphIndex - b.glyphIndex
  );

  if (sorted.length === 0 && sortedKern.length === 0 && sortedVpal.length === 0) return null;

  const paltEntries = sorted;
  const pknaEntries = sorted.filter((e) => {
    const unicode = glyphUnicodes.get(e.glyphIndex);
    return typeof unicode === 'number' && isKanaUnicode(unicode);
  });
  // One lookup per feature, in alphabetical feature order.
  const lookups: {
    tag: string;
    kind: 'single' | 'pair' | 'vpal';
    singleEntries?: GposSinglePosEntry[];
    kernPairs?: GposKernPair[];
    vpalEntries?: GposVpalEntry[];
  }[] = [];
  if (sortedKern.length > 0) {
    lookups.push({ tag: 'kern', kind: 'pair', kernPairs: sortedKern });
  }
  if (paltEntries.length > 0) {
    lookups.push({ tag: 'palt', kind: 'single', singleEntries: paltEntries });
  }
  if (pknaEntries.length > 0) {
    lookups.push({ tag: 'pkna', kind: 'single', singleEntries: pknaEntries });
  }
  if (sortedVpal.length > 0) {
    lookups.push({ tag: 'vpal', kind: 'vpal', vpalEntries: sortedVpal });
  }
  const features = lookups.map((l) => l.tag);

  const writer = new ByteWriter();
  // GPOS header: version 1.0, offsets relative to the table start.
  writer.u32(0x00010000);
  const scriptListOffsetSlot = writer.length;
  writer.u16(0);
  const featureListOffsetSlot = writer.length;
  writer.u16(0);
  const lookupListOffsetSlot = writer.length;
  writer.u16(0);

  // ScriptList (offsets relative to the ScriptList start).
  const scriptListStart = writer.length;
  writer.patchU16(scriptListOffsetSlot, scriptListStart);
  const scriptTags = ['DFLT', 'hani', 'kana', 'latn'];
  writer.u16(scriptTags.length);
  const scriptRecordSlots: number[] = [];
  for (const tag of scriptTags) {
    writer.tag(tag);
    scriptRecordSlots.push(writer.length);
    writer.u16(0);
  }
  // Script tables + LangSys tables.
  for (let i = 0; i < scriptTags.length; i++) {
    const scriptStart = writer.length;
    writer.patchU16(scriptRecordSlots[i], scriptStart - scriptListStart);
    const defaultLangSysOffsetSlot = writer.length;
    writer.u16(0);
    writer.u16(0); // langSysCount
    const langSysStart = writer.length;
    writer.patchU16(defaultLangSysOffsetSlot, langSysStart - scriptStart);
    writer.u16(0); // lookupOrderOffset: none
    writer.u16(0xffff); // requiredFeatureIndex: none
    writer.u16(features.length); // featureIndexCount
    for (let f = 0; f < features.length; f++) {
      writer.u16(f);
    }
  }

  // FeatureList (offsets relative to the FeatureList start).
  const featureListStart = writer.length;
  writer.patchU16(featureListOffsetSlot, featureListStart);
  writer.u16(features.length);
  const featureRecordSlots: number[] = [];
  for (const feature of features) {
    writer.tag(feature);
    featureRecordSlots.push(writer.length);
    writer.u16(0);
  }
  for (let i = 0; i < features.length; i++) {
    const featureStart = writer.length;
    writer.patchU16(featureRecordSlots[i], featureStart - featureListStart);
    writer.u16(0); // featureParamsOffset: none
    writer.u16(1); // lookupIndexCount
    writer.u16(i); // lookupListIndex
  }

  // LookupList (offsets relative to the LookupList start).
  const lookupListStart = writer.length;
  writer.patchU16(lookupListOffsetSlot, lookupListStart);
  writer.u16(lookups.length);
  const lookupOffsetSlots: number[] = [];
  for (let i = 0; i < lookups.length; i++) {
    lookupOffsetSlots.push(writer.length);
    writer.u16(0);
  }
  for (let i = 0; i < lookups.length; i++) {
    const lookupStart = writer.length;
    writer.patchU16(lookupOffsetSlots[i], lookupStart - lookupListStart);
    if (lookups[i].kind === 'pair') {
      buildPairPosLookup(writer, lookups[i].kernPairs!);
    } else if (lookups[i].kind === 'vpal') {
      buildVpalSinglePosLookup(writer, lookups[i].vpalEntries!);
    } else {
      buildSinglePosLookup(writer, lookups[i].singleEntries!);
    }
  }

  // Every offset inside GPOS is a uint16 measured from its own base,
  // so a table larger than 65535 bytes cannot be addressed correctly.
  // Refuse to write it instead of emitting clamped, wrong offsets.
  if (writer.length > GPOS_MAX_TABLE_SIZE) {
    throw new Error(
      `GPOS table would be ${writer.length} bytes, exceeding the 65535-byte limit ` +
        `for 16-bit offsets (${sortedKern.length} kerning pairs, ` +
        `${sorted.length} palt entries). Reduce the number of kerning pairs ` +
        `or palt entries and export again.`
    );
  }

  return writer.toBytes();
}

/**
 * Build a vmtx table: one (advanceHeight, topSideBearing) pair per
 * glyph, in glyph-index order. `entries` must cover every glyph index
 * from 0 to numGlyphs - 1; missing indices fall back to
 * `defaultAdvanceHeight` with a top side bearing of 0.
 */
export function buildVmtxTableBytes(
  entries: VmtxEntry[],
  numGlyphs: number,
  defaultAdvanceHeight: number
): Uint8Array {
  const byIndex = new Map<number, VmtxEntry>();
  for (const entry of entries) {
    const glyphIndex = Math.round(entry.glyphIndex);
    if (glyphIndex >= 0 && glyphIndex < numGlyphs) {
      byIndex.set(glyphIndex, entry);
    }
  }
  const out = new Uint8Array(numGlyphs * 4);
  const view = new DataView(out.buffer);
  for (let i = 0; i < numGlyphs; i++) {
    const entry = byIndex.get(i);
    const advanceHeight = clampUint16(
      entry ? Math.max(1, entry.advanceHeight) : defaultAdvanceHeight
    );
    const topSideBearing = clampInt16(entry ? entry.topSideBearing : 0);
    view.setUint16(i * 4, advanceHeight, false);
    view.setInt16(i * 4 + 2, topSideBearing, false);
  }
  return out;
}

/** Build a 36-byte vhea table (version 1.0) from the given metrics. */
export function buildVheaTableBytes(metrics: VheaMetrics): Uint8Array {
  const out = new Uint8Array(36);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x00010000, false); // version 1.0
  view.setInt16(4, metrics.ascender, false);
  view.setInt16(6, metrics.descender, false);
  view.setInt16(8, metrics.lineGap, false);
  view.setUint16(10, metrics.advanceHeightMax, false);
  view.setInt16(12, metrics.minTopSideBearing, false);
  view.setInt16(14, metrics.minBottomSideBearing, false);
  view.setInt16(16, metrics.xMaxExtent, false);
  view.setInt16(18, 1, false); // caretSlopeRise
  view.setInt16(20, 0, false); // caretSlopeRun
  view.setInt16(22, 0, false); // caretOffset
  // reserved1..4 (24..31) stay 0
  view.setInt16(32, 0, false); // metricDataFormat
  view.setUint16(34, metrics.numberOfVMetrics, false);
  return out;
}

/**
 * Build an OpenType `VORG` (Vertical Origin) table (version 1.0) for CFF fonts.
 * Stores `defaultVertOriginY` plus optional per-glyph overrides sorted by glyph index.
 */
export function buildVorgTableBytes(
  defaultVertOriginY: number,
  entries: VorgEntry[] = []
): Uint8Array {
  const sorted = [...entries]
    .filter(
      (e) =>
        Number.isInteger(e.glyphIndex) &&
        e.glyphIndex >= 0 &&
        e.glyphIndex <= 0xffff &&
        Number.isFinite(e.vertOriginY)
    )
    .sort((a, b) => a.glyphIndex - b.glyphIndex);
  const out = new Uint8Array(8 + sorted.length * 4);
  const view = new DataView(out.buffer);
  view.setUint16(0, 1, false); // majorVersion
  view.setUint16(2, 0, false); // minorVersion
  view.setInt16(4, clampInt16(defaultVertOriginY), false); // defaultVertOriginY
  view.setUint16(6, sorted.length, false); // numVertOriginYMetrics
  for (let i = 0; i < sorted.length; i++) {
    const offset = 8 + i * 4;
    view.setUint16(offset, clampUint16(sorted[i].glyphIndex), false);
    view.setInt16(offset + 2, clampInt16(sorted[i].vertOriginY), false);
  }
  return out;
}

/**
 * Build a 36-byte `hhea` table. opentype.js recomputes hhea from glyph
 * metrics when serializing and ignores `font.tables.hhea`, so a
 * corrected hhea has to be injected as raw bytes (like GPOS / vmtx /
 * vhea) to reach the written font.
 */
export function buildHheaTableBytes(metrics: HheaMetrics): Uint8Array {
  const out = new Uint8Array(36);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x00010000, false); // version 1.0
  view.setInt16(4, metrics.ascender, false);
  view.setInt16(6, metrics.descender, false);
  view.setInt16(8, metrics.lineGap, false);
  view.setUint16(10, metrics.advanceWidthMax, false);
  view.setInt16(12, metrics.minLeftSideBearing, false);
  view.setInt16(14, metrics.minRightSideBearing, false);
  view.setInt16(16, metrics.xMaxExtent, false);
  view.setInt16(18, 1, false); // caretSlopeRise
  view.setInt16(20, 0, false); // caretSlopeRun
  view.setInt16(22, 0, false); // caretOffset
  // reserved1..4 (24..31) stay 0
  view.setInt16(32, 0, false); // metricDataFormat
  view.setUint16(34, metrics.numberOfHMetrics, false);
  return out;
}
