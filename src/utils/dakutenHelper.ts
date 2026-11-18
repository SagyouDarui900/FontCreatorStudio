import { PathContour, GlyphData } from '../types';
import { generateId } from './path/id';
import { normalizeGlyphContoursWinding } from './path/bounds';

/**
 * 日本語の清音・濁音・半濁音の対応マップ
 */
export interface DakutenPairInfo {
  seionChar: string;
  seionCode: number;
  dakuChar?: string;
  dakuCode?: number;
  handakuChar?: string;
  handakuCode?: number;
}

export const DAKUTEN_MAPPINGS: Record<string, { daku?: string; handaku?: string; seion?: string; type: 'seion' | 'daku' | 'handaku' }> = {
  // ひらがな
  'か': { daku: 'が', type: 'seion' },
  'き': { daku: 'ぎ', type: 'seion' },
  'く': { daku: 'ぐ', type: 'seion' },
  'け': { daku: 'げ', type: 'seion' },
  'こ': { daku: 'ご', type: 'seion' },
  'さ': { daku: 'ざ', type: 'seion' },
  'し': { daku: 'じ', type: 'seion' },
  'す': { daku: 'ず', type: 'seion' },
  'せ': { daku: 'ぜ', type: 'seion' },
  'そ': { daku: 'ぞ', type: 'seion' },
  'た': { daku: 'だ', type: 'seion' },
  'ち': { daku: 'ぢ', type: 'seion' },
  'つ': { daku: 'づ', type: 'seion' },
  'て': { daku: 'で', type: 'seion' },
  'と': { daku: 'ど', type: 'seion' },
  'は': { daku: 'ば', handaku: 'ぱ', type: 'seion' },
  'ひ': { daku: 'び', handaku: 'ぴ', type: 'seion' },
  'ふ': { daku: 'ぶ', handaku: 'ぷ', type: 'seion' },
  'へ': { daku: 'べ', handaku: 'ぺ', type: 'seion' },
  'ほ': { daku: 'ぼ', handaku: 'ぽ', type: 'seion' },
  'う': { daku: 'ゔ', type: 'seion' },

  // ひらがな濁音
  'が': { seion: 'か', type: 'daku' },
  'ぎ': { seion: 'き', type: 'daku' },
  'ぐ': { seion: 'く', type: 'daku' },
  'げ': { seion: 'け', type: 'daku' },
  'ご': { seion: 'こ', type: 'daku' },
  'ざ': { seion: 'さ', type: 'daku' },
  'じ': { seion: 'し', type: 'daku' },
  'ず': { seion: 'す', type: 'daku' },
  'ぜ': { seion: 'せ', type: 'daku' },
  'ぞ': { seion: 'そ', type: 'daku' },
  'だ': { seion: 'た', type: 'daku' },
  'ぢ': { seion: 'ち', type: 'daku' },
  'づ': { seion: 'つ', type: 'daku' },
  'で': { seion: 'て', type: 'daku' },
  'ど': { seion: 'と', type: 'daku' },
  'ば': { seion: 'は', type: 'daku' },
  'び': { seion: 'ひ', type: 'daku' },
  'ぶ': { seion: 'ふ', type: 'daku' },
  'べ': { seion: 'へ', type: 'daku' },
  'ぼ': { seion: 'ほ', type: 'daku' },
  'ゔ': { seion: 'う', type: 'daku' },

  // ひらがな半濁音
  'ぱ': { seion: 'は', type: 'handaku' },
  'ぴ': { seion: 'ひ', type: 'handaku' },
  'ぷ': { seion: 'ふ', type: 'handaku' },
  'ぺ': { seion: 'へ', type: 'handaku' },
  'ぽ': { seion: 'ほ', type: 'handaku' },

  // カタカナ
  'カ': { daku: 'ガ', type: 'seion' },
  'キ': { daku: 'ギ', type: 'seion' },
  'ク': { daku: 'グ', type: 'seion' },
  'ケ': { daku: 'ゲ', type: 'seion' },
  'コ': { daku: 'ゴ', type: 'seion' },
  'サ': { daku: 'ザ', type: 'seion' },
  'シ': { daku: 'ジ', type: 'seion' },
  'ス': { daku: 'ズ', type: 'seion' },
  'セ': { daku: 'ゼ', type: 'seion' },
  'ソ': { daku: 'ゾ', type: 'seion' },
  'タ': { daku: 'ダ', type: 'seion' },
  'チ': { daku: 'ヂ', type: 'seion' },
  'ツ': { daku: 'ヅ', type: 'seion' },
  'テ': { daku: 'デ', type: 'seion' },
  'ト': { daku: 'ド', type: 'seion' },
  'ハ': { daku: 'バ', handaku: 'パ', type: 'seion' },
  'ヒ': { daku: 'ビ', handaku: 'ピ', type: 'seion' },
  'フ': { daku: 'ブ', handaku: 'プ', type: 'seion' },
  'ヘ': { daku: 'ベ', handaku: 'ペ', type: 'seion' },
  'ホ': { daku: 'ボ', handaku: 'ポ', type: 'seion' },
  'ウ': { daku: 'ヴ', type: 'seion' },
  'ワ': { daku: 'ヷ', type: 'seion' },
  'ヰ': { daku: 'ヸ', type: 'seion' },
  'ヱ': { daku: 'ヹ', type: 'seion' },
  'ヲ': { daku: 'ヺ', type: 'seion' },

  // カタカナ濁音
  'ガ': { seion: 'カ', type: 'daku' },
  'ギ': { seion: 'キ', type: 'daku' },
  'グ': { seion: 'ク', type: 'daku' },
  'ゲ': { seion: 'ケ', type: 'daku' },
  'ゴ': { seion: 'コ', type: 'daku' },
  'ザ': { seion: 'サ', type: 'daku' },
  'ジ': { seion: 'シ', type: 'daku' },
  'ズ': { seion: 'ス', type: 'daku' },
  'ゼ': { seion: 'セ', type: 'daku' },
  'ゾ': { seion: 'ソ', type: 'daku' },
  'ダ': { seion: 'タ', type: 'daku' },
  'ヂ': { seion: 'チ', type: 'daku' },
  'ヅ': { seion: 'ツ', type: 'daku' },
  'デ': { seion: 'テ', type: 'daku' },
  'ド': { seion: 'ト', type: 'daku' },
  'バ': { seion: 'ハ', type: 'daku' },
  'ビ': { seion: 'ヒ', type: 'daku' },
  'ブ': { seion: 'フ', type: 'daku' },
  'ベ': { seion: 'ヘ', type: 'daku' },
  'ボ': { seion: 'ホ', type: 'daku' },
  'ヴ': { seion: 'ウ', type: 'daku' },
  'ヷ': { seion: 'ワ', type: 'daku' },
  'ヸ': { seion: 'ヰ', type: 'daku' },
  'ヹ': { seion: 'ヱ', type: 'daku' },
  'ヺ': { seion: 'ヲ', type: 'daku' },

  // カタカナ半濁音
  'パ': { seion: 'ハ', type: 'handaku' },
  'ピ': { seion: 'ヒ', type: 'handaku' },
  'プ': { seion: 'フ', type: 'handaku' },
  'ペ': { seion: 'ヘ', type: 'handaku' },
  'ポ': { seion: 'ホ', type: 'handaku' },
};

export type DakutenStyle = 'standard' | 'brush' | 'round' | 'square';
export type HandakutenStyle = 'standard' | 'brush' | 'solid';

/**
 * 標準濁点「゛」の2本ストローク輪郭を生成 (全スタイルでスケール・オフセット対応)
 */
export function createDakutenContours(
  customOffsetX = 0,
  customOffsetY = 0,
  style: DakutenStyle = 'standard',
  scale = 1,
  unitsPerEm = 1000
): PathContour[] {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const upm = Number.isFinite(unitsPerEm) && unitsPerEm > 0 ? unitsPerEm : 1000;
  const emScale = upm / 1000;
  const anchorX = 835 * emScale;
  const anchorY = 220 * emScale;

  const transformPt = (x: number, y: number) => ({
    x: Math.round((anchorX + (x * emScale - anchorX) * safeScale + customOffsetX) * 100) / 100,
    y: Math.round((anchorY + (y * emScale - anchorY) * safeScale + customOffsetY) * 100) / 100,
  });

  if (style === 'round') {
    // 丸みのある小丸（丸文字・ポップ手書き向け）
    const makeCircle = (cx: number, cy: number, r: number): PathContour => {
      const top = transformPt(cx, cy - r);
      const topIn = transformPt(cx - r * 0.552, cy - r);
      const topOut = transformPt(cx + r * 0.552, cy - r);

      const right = transformPt(cx + r, cy);
      const rightIn = transformPt(cx + r, cy - r * 0.552);
      const rightOut = transformPt(cx + r, cy + r * 0.552);

      const bottom = transformPt(cx, cy + r);
      const bottomIn = transformPt(cx + r * 0.552, cy + r);
      const bottomOut = transformPt(cx - r * 0.552, cy + r);

      const left = transformPt(cx - r, cy);
      const leftIn = transformPt(cx - r, cy + r * 0.552);
      const leftOut = transformPt(cx - r, cy - r * 0.552);

      return {
        id: generateId(),
        closed: true,
        nodes: [
          { id: generateId(), ...top, handleIn: topIn, handleOut: topOut, type: 'smooth' },
          { id: generateId(), ...right, handleIn: rightIn, handleOut: rightOut, type: 'smooth' },
          { id: generateId(), ...bottom, handleIn: bottomIn, handleOut: bottomOut, type: 'smooth' },
          { id: generateId(), ...left, handleIn: leftIn, handleOut: leftOut, type: 'smooth' },
        ],
      };
    };
    return [
      makeCircle(780, 195, 35),
      makeCircle(855, 235, 35),
    ];
  }

  if (style === 'brush') {
    // 書道・筆風（入りが細く、腹が出て、鋭く払う形状）
    const stroke1: PathContour = {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), ...transformPt(755, 155), handleIn: null, handleOut: null, type: 'corner' },
        {
          id: generateId(),
          ...transformPt(825, 180),
          handleIn: transformPt(810, 165),
          handleOut: transformPt(835, 195),
          type: 'smooth',
        },
        { id: generateId(), ...transformPt(800, 255), handleIn: null, handleOut: null, type: 'corner' },
        {
          id: generateId(),
          ...transformPt(735, 215),
          handleIn: transformPt(760, 245),
          handleOut: transformPt(730, 180),
          type: 'smooth',
        },
      ],
    };
    const stroke2: PathContour = {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), ...transformPt(830, 190), handleIn: null, handleOut: null, type: 'corner' },
        {
          id: generateId(),
          ...transformPt(900, 220),
          handleIn: transformPt(885, 205),
          handleOut: transformPt(910, 235),
          type: 'smooth',
        },
        { id: generateId(), ...transformPt(875, 295), handleIn: null, handleOut: null, type: 'corner' },
        {
          id: generateId(),
          ...transformPt(810, 255),
          handleIn: transformPt(835, 285),
          handleOut: transformPt(805, 220),
          type: 'smooth',
        },
      ],
    };
    return [stroke1, stroke2];
  }

  // standard or square
  const isSquare = style === 'square';
  const slant = isSquare ? 15 : 25;
  const stroke1: PathContour = {
    id: generateId(),
    closed: true,
    nodes: [
      { id: generateId(), ...transformPt(770, 155), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(825, 180), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(825 - slant, 245), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(770 - slant, 220), handleIn: null, handleOut: null, type: 'corner' },
    ],
  };

  const stroke2: PathContour = {
    id: generateId(),
    closed: true,
    nodes: [
      { id: generateId(), ...transformPt(845, 195), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(900, 220), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(900 - slant, 285), handleIn: null, handleOut: null, type: 'corner' },
      { id: generateId(), ...transformPt(845 - slant, 260), handleIn: null, handleOut: null, type: 'corner' },
    ],
  };

  return [stroke1, stroke2];
}

/**
 * 標準半濁点「゜」の輪郭を生成 (スタイル対応・ベジェハンドル補正済)
 */
export function createHandakutenContours(
  customOffsetX = 0,
  customOffsetY = 0,
  style: HandakutenStyle = 'standard',
  scale = 1,
  unitsPerEm = 1000
): PathContour[] {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const upm = Number.isFinite(unitsPerEm) && unitsPerEm > 0 ? unitsPerEm : 1000;
  const emScale = upm / 1000;
  const cx = 835 * emScale + customOffsetX;
  const cy = 215 * emScale + customOffsetY;

  const outerRx = Math.round((style === 'brush' ? 64 : 60) * safeScale * emScale);
  const outerRy = Math.round((style === 'brush' ? 56 : 60) * safeScale * emScale);
  const innerRx = style === 'solid' ? 0 : Math.round((style === 'brush' ? 28 : 30) * safeScale * emScale);
  const innerRy = style === 'solid' ? 0 : Math.round((style === 'brush' ? 25 : 30) * safeScale * emScale);
  const innerCx = style === 'brush' ? cx - Math.round(2 * safeScale * emScale) : cx;
  const innerCy = style === 'brush' ? cy + Math.round(2 * safeScale * emScale) : cy;

  // 外側楕円 (時計回り)
  const outerCircle: PathContour = {
    id: generateId(),
    closed: true,
    nodes: [
      {
        id: generateId(),
        x: cx,
        y: cy - outerRy,
        handleIn: { x: cx - outerRx * 0.552, y: cy - outerRy },
        handleOut: { x: cx + outerRx * 0.552, y: cy - outerRy },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: cx + outerRx,
        y: cy,
        handleIn: { x: cx + outerRx, y: cy - outerRy * 0.552 },
        handleOut: { x: cx + outerRx, y: cy + outerRy * 0.552 },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: cx,
        y: cy + outerRy,
        handleIn: { x: cx + outerRx * 0.552, y: cy + outerRy },
        handleOut: { x: cx - outerRx * 0.552, y: cy + outerRy },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: cx - outerRx,
        y: cy,
        handleIn: { x: cx - outerRx, y: cy + outerRy * 0.552 },
        handleOut: { x: cx - outerRx, y: cy - outerRy * 0.552 },
        type: 'smooth',
      },
    ],
  };

  if (style === 'solid') {
    return [outerCircle];
  }

  // 内側楕円 (中抜き用・反時計回り)
  const innerCircle: PathContour = {
    id: generateId(),
    closed: true,
    nodes: [
      {
        id: generateId(),
        x: innerCx,
        y: innerCy - innerRy,
        handleIn: { x: innerCx + innerRx * 0.552, y: innerCy - innerRy },
        handleOut: { x: innerCx - innerRx * 0.552, y: innerCy - innerRy },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: innerCx - innerRx,
        y: innerCy,
        handleIn: { x: innerCx - innerRx, y: innerCy - innerRy * 0.552 },
        handleOut: { x: innerCx - innerRx, y: innerCy + innerRy * 0.552 },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: innerCx,
        y: innerCy + innerRy,
        handleIn: { x: innerCx - innerRx * 0.552, y: innerCy + innerRy },
        handleOut: { x: innerCx + innerRx * 0.552, y: innerCy + innerRy },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: innerCx + innerRx,
        y: innerCy,
        handleIn: { x: innerCx + innerRx, y: innerCy + innerRy * 0.552 },
        handleOut: { x: innerCx + innerRx, y: innerCy - innerRy * 0.552 },
        type: 'smooth',
      },
    ],
  };

  return [outerCircle, innerCircle];
}

/**
 * 輪郭ディープコピー（新しいユニークIDを採番）
 */
export function cloneContours(contours: PathContour[]): PathContour[] {
  return contours.map((c) => ({
    id: generateId(),
    closed: c.closed,
    nodes: c.nodes.map((n) => ({
      id: generateId(),
      x: n.x,
      y: n.y,
      type: n.type,
      handleIn: n.handleIn ? { ...n.handleIn } : null,
      handleOut: n.handleOut ? { ...n.handleOut } : null,
    })),
  }));
}

/**
 * 親文字の輪郭と濁点・半濁点を合成
 */
export function synthesizeDakutenContours(
  baseContours: PathContour[],
  isHandakuten: boolean,
  options?: {
    offsetX?: number;
    offsetY?: number;
    scale?: number;
    dakuStyle?: DakutenStyle;
    handakuStyle?: HandakutenStyle;
    unitsPerEm?: number;
  }
): PathContour[] {
  const cloned = cloneContours(baseContours);
  const ox = options?.offsetX ?? 0;
  const oy = options?.offsetY ?? 0;
  const scale = options?.scale ?? 1;
  const unitsPerEm = options?.unitsPerEm && options.unitsPerEm > 0 ? options.unitsPerEm : 1000;

  const accent = isHandakuten
    ? createHandakutenContours(ox, oy, options?.handakuStyle ?? 'standard', scale, unitsPerEm)
    : createDakutenContours(ox, oy, options?.dakuStyle ?? 'standard', scale, unitsPerEm);

  return normalizeGlyphContoursWinding([...cloned, ...accent]);
}

/**
 * 作成済みのすべての清音から濁音・半濁音を一括自動合成
 */
export function batchSynthesizeDakuten(
  glyphs: Record<number, GlyphData>,
  options?: {
    overwriteExisting?: boolean;
    scope?: 'all' | 'hiragana' | 'katakana';
    offsetX?: number;
    offsetY?: number;
    scale?: number;
    dakuStyle?: DakutenStyle;
    handakuStyle?: HandakutenStyle;
    unitsPerEm?: number;
  }
): {
  updatedGlyphs: Record<number, GlyphData>;
  generatedCount: number;
  details: { sourceChar: string; targetChar: string; isHandakuten: boolean }[];
} {
  const updatedGlyphs = { ...glyphs };
  let generatedCount = 0;
  const details: { sourceChar: string; targetChar: string; isHandakuten: boolean }[] = [];

  const overwrite = options?.overwriteExisting ?? false;
  const scope = options?.scope ?? 'all';
  const upm = options?.unitsPerEm && options.unitsPerEm > 0 ? options.unitsPerEm : 1000;
  const defaultLsb = Math.round(50 * (upm / 1000));

  for (const [char, mapping] of Object.entries(DAKUTEN_MAPPINGS)) {
    if (mapping.type !== 'seion') continue;

    const sourceCode = char.codePointAt(0);
    if (!sourceCode) continue;

    const isHiragana = sourceCode >= 0x3041 && sourceCode <= 0x3096;
    const isKatakana = sourceCode >= 0x30a1 && sourceCode <= 0x30fa;

    if (scope === 'hiragana' && !isHiragana) continue;
    if (scope === 'katakana' && !isKatakana) continue;

    const sourceGlyph = glyphs[sourceCode];
    if (!sourceGlyph || !sourceGlyph.contours || sourceGlyph.contours.length === 0) {
      // 親文字が未作成ならスキップ
      continue;
    }

    // 濁音
    if (mapping.daku) {
      const targetChar = mapping.daku;
      const targetCode = targetChar.codePointAt(0);
      if (targetCode) {
        const existing = glyphs[targetCode];
        if (!existing?.locked) {
          const hasExistingContours = existing && existing.contours && existing.contours.length > 0;
          if (!hasExistingContours || overwrite) {
            const combined = synthesizeDakutenContours(sourceGlyph.contours, false, options);
            updatedGlyphs[targetCode] = {
              ...(existing || {}),
              unicode: targetCode,
              char: targetChar,
              name: `uni${targetCode.toString(16).toUpperCase().padStart(4, '0')}`,
              advanceWidth: sourceGlyph.advanceWidth || existing?.advanceWidth || upm,
              lsb: sourceGlyph.lsb ?? existing?.lsb ?? defaultLsb,
              contours: combined,
              modified: true,
            };
            generatedCount++;
            details.push({ sourceChar: char, targetChar, isHandakuten: false });
          }
        }
      }
    }

    // 半濁音
    if (mapping.handaku) {
      const targetChar = mapping.handaku;
      const targetCode = targetChar.codePointAt(0);
      if (targetCode) {
        const existing = glyphs[targetCode];
        if (!existing?.locked) {
          const hasExistingContours = existing && existing.contours && existing.contours.length > 0;
          if (!hasExistingContours || overwrite) {
            const combined = synthesizeDakutenContours(sourceGlyph.contours, true, options);
            updatedGlyphs[targetCode] = {
              ...(existing || {}),
              unicode: targetCode,
              char: targetChar,
              name: `uni${targetCode.toString(16).toUpperCase().padStart(4, '0')}`,
              advanceWidth: sourceGlyph.advanceWidth || existing?.advanceWidth || upm,
              lsb: sourceGlyph.lsb ?? existing?.lsb ?? defaultLsb,
              contours: combined,
              modified: true,
            };
            generatedCount++;
            details.push({ sourceChar: char, targetChar, isHandakuten: true });
          }
        }
      }
    }
  }

  return { updatedGlyphs, generatedCount, details };
}
