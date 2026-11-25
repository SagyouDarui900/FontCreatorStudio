import { PathContour, GlyphData } from '../types';
import { generateId } from './path/id';
import { getContoursBoundingBox, normalizeGlyphContoursWinding } from './path/bounds';
import { pixelGridToContours, normalizePixelGrid } from './pixelFontUtils';
import { DEFAULT_UPM } from './font/constants';

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
    // customOffsetX / customOffsetY は 1000 UPM 基準の値として扱い、
    // 形状と同じ emScale で換算して加算する。
    x: Math.round((anchorX + (x * emScale - anchorX) * safeScale + customOffsetX * emScale) * 100) / 100,
    y: Math.round((anchorY + (y * emScale - anchorY) * safeScale + customOffsetY * emScale) * 100) / 100,
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
  // customOffsetX / customOffsetY は 1000 UPM 基準の値として扱い、
  // 形状と同じ emScale で換算して加算する。
  // 濁点のアンカー y 220 と同じ値にする。従来の 215 との 5 ユニットの
  // 差に意図を示す記録はなく、濁点と半濁点で位置を揃える。
  const cx = Math.round((835 * emScale + customOffsetX * emScale) * 100) / 100;
  const cy = Math.round((220 * emScale + customOffsetY * emScale) * 100) / 100;
  // 濁点と同じく節点座標を小数第 2 位に丸める。
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  const roundContour = (c: PathContour): PathContour => ({
    ...c,
    nodes: c.nodes.map((n) => ({
      ...n,
      x: round2(n.x),
      y: round2(n.y),
      handleIn: n.handleIn ? { x: round2(n.handleIn.x), y: round2(n.handleIn.y) } : null,
      handleOut: n.handleOut ? { x: round2(n.handleOut.x), y: round2(n.handleOut.y) } : null,
    })),
  });

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
    return [roundContour(outerCircle)];
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

  return [roundContour(outerCircle), roundContour(innerCircle)];
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
 * 輪郭を平行移動する。節点とハンドルを小数第 2 位に丸める。
 */
function translateContours(contours: PathContour[], dx: number, dy: number): PathContour[] {
  if (dx === 0 && dy === 0) return contours;
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  return contours.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => ({
      ...n,
      x: round2(n.x + dx),
      y: round2(n.y + dy),
      handleIn: n.handleIn ? { x: round2(n.handleIn.x + dx), y: round2(n.handleIn.y + dy) } : null,
      handleOut: n.handleOut ? { x: round2(n.handleOut.x + dx), y: round2(n.handleOut.y + dy) } : null,
    })),
  }));
}

/**
 * 輪郭が em ボックス内に収まるよう平行移動する。em ボックスより大きい
 * 場合は左端・上端に合わせる。
 */
function clampToEmBox(accent: PathContour[], upm: number): PathContour[] {
  const bbox = getContoursBoundingBox(accent);
  if (bbox.width <= 0 || bbox.height <= 0) return accent;
  let dx = 0;
  let dy = 0;
  if (bbox.width > upm) {
    dx = -bbox.minX;
  } else {
    if (bbox.minX < 0) dx = -bbox.minX;
    if (bbox.maxX + dx > upm) dx -= bbox.maxX + dx - upm;
  }
  if (bbox.height > upm) {
    dy = -bbox.minY;
  } else {
    if (bbox.minY < 0) dy = -bbox.minY;
    if (bbox.maxY + dy > upm) dy -= bbox.maxY + dy - upm;
  }
  return translateContours(accent, dx, dy);
}

/**
 * 濁点・半濁点の輪郭を親文字の右上付近に配置する。濁点の bounding box の
 * 右端を親文字の右端に、濁点の上端を親文字の上端 + 50 emScale に合わせる。
 * 標準的な全角仮名（親文字が x 100-900、y 100-800 付近）では従来の固定
 * 位置（x 745-900、y 155-285 付近）とほぼ同じになる。em ボックス内に
 * 収まるようクランプする。
 */
function placeAccentNearParentTopRight(
  accent: PathContour[],
  baseBbox: ReturnType<typeof getContoursBoundingBox>,
  upm: number
): PathContour[] {
  const accentBbox = getContoursBoundingBox(accent);
  if (accentBbox.width <= 0 || accentBbox.height <= 0) return accent;
  const emScale = upm / 1000;
  const targetRight = baseBbox.maxX;
  const targetTop = baseBbox.minY + 50 * emScale;
  const dx = targetRight - accentBbox.maxX;
  const dy = targetTop - accentBbox.minY;
  return clampToEmBox(translateContours(accent, dx, dy), upm);
}

/**
 * pixelData のみを持つグリフの輪郭を返す。contours がある場合はそれを
 * そのまま返す。品質チェック（checker.ts）とコンパイラと同じ方法で
 * pixelGridToContours により変換する。upm / ascender / descender は
 * 正規化した値を渡す（未指定時は upm の 80% / -20% を既定値とする）。
 */
export function resolveSourceContours(
  glyph: GlyphData,
  upm: number,
  ascender?: number,
  descender?: number
): PathContour[] {
  const contours = glyph.contours || [];
  if (contours.length > 0) return contours;
  const pixelData = glyph.pixelData;
  if (!pixelData || !pixelData.width || !pixelData.height) return [];
  if (!Array.isArray(pixelData.data) || !pixelData.data.some((d) => d !== 0)) return [];
  const normalizedUpm = Number.isFinite(upm) && upm > 0 ? upm : DEFAULT_UPM;
  const normalizedAscender =
    typeof ascender === 'number' && Number.isFinite(ascender) && ascender > 0
      ? ascender
      : Math.round(normalizedUpm * 0.8);
  const normalizedDescender =
    typeof descender === 'number' && Number.isFinite(descender)
      ? descender
      : Math.round(-normalizedUpm * 0.2);
  const advWidth = Math.round(
    Number.isFinite(glyph.advanceWidth) && (glyph.advanceWidth ?? 0) > 0
      ? (glyph.advanceWidth ?? DEFAULT_UPM)
      : glyph.unicode > 255
        ? normalizedUpm
        : Math.round(normalizedUpm / 2)
  );
  const pGrid = normalizePixelGrid(pixelData.data);
  if (!pGrid.some((val) => val === 1)) return [];
  return pixelGridToContours(
    pGrid,
    pixelData.width,
    pixelData.height,
    normalizedUpm,
    normalizedAscender,
    normalizedDescender,
    advWidth,
    pixelData.shape || 'square',
    true
  );
}

/**
 * 生成先グリフから補助データを除く。contours を置き換えるときに古い
 * pixelData と vectorContoursBackup が残らないようにする。
 */
function withoutAuxData(existing: GlyphData | undefined): Omit<GlyphData, 'pixelData' | 'vectorContoursBackup'> {
  const rest = { ...(existing || {}) } as Partial<GlyphData>;
  delete rest.pixelData;
  delete rest.vectorContoursBackup;
  return rest as Omit<GlyphData, 'pixelData' | 'vectorContoursBackup'>;
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
    /** プロジェクト内の standalone 濁点・半濁点グリフ（U+309B / U+309C）の輪郭。ある場合は手続き生成の代わりに使う。 */
    standaloneAccentContours?: PathContour[];
  }
): PathContour[] {
  // 空の親文字輪郭には濁点だけを付けない。呼び出し元はすべて空の場合を
  // 事前に防いでいる（batchSynthesizeDakuten、プレビュー、
  // handleGenerateDakutenTarget）が、関数単体でも誤用を防ぐ。
  if (!baseContours || baseContours.length === 0) return [];
  const ox = options?.offsetX ?? 0;
  const oy = options?.offsetY ?? 0;
  const scale = options?.scale ?? 1;
  const unitsPerEm = options?.unitsPerEm && options.unitsPerEm > 0 ? options.unitsPerEm : 1000;

  // 親文字と濁点・半濁点をそれぞれ単独で正規化してから結合する。
  // 全体をまとめて正規化すると、親文字の輪郭が半濁点の中心を囲む場合に
  // 半濁点の外側円・内側円の巻き方向が反転し、リングが円盤になる。
  // 単独で正規化すれば、親文字に囲まれても濁点・半濁点の巻き方向は
  // 保たれ、nonzero 塗りでは囲まれた内側の穴が親文字で塗られる
  // （親文字と濁点の和集合として正しい描画になる）。
  const normalizedBase = normalizeGlyphContoursWinding(cloneContours(baseContours));
  const baseBbox = getContoursBoundingBox(normalizedBase);

  // オフセットは親文字から決めた配置位置に対する調整として、配置の
  // 後に適用する。生成時に加えると配置の計算で打ち消されてしまうため、
  // ここではオフセット 0 で生成する。
  const standalone = options?.standaloneAccentContours;
  const accent =
    standalone && standalone.length > 0
      ? normalizeGlyphContoursWinding(cloneContours(standalone))
      : isHandakuten
        ? createHandakutenContours(0, 0, options?.handakuStyle ?? 'standard', scale, unitsPerEm)
        : createDakutenContours(0, 0, options?.dakuStyle ?? 'standard', scale, unitsPerEm);

  const placedAccent = placeAccentNearParentTopRight(accent, baseBbox, unitsPerEm);
  const emScale = unitsPerEm / 1000;
  const offsetAccent = clampToEmBox(
    translateContours(placedAccent, ox * emScale, oy * emScale),
    unitsPerEm
  );

  return [...normalizedBase, ...offsetAccent];
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
    ascender?: number;
    descender?: number;
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

  // standalone の濁点・半濁点グリフ（U+309B / U+309C）。輪郭がある場合
  // はその輪郭を濁点・半濁点の形状として使う。ない場合は手続き生成を使う。
  const standaloneDakuten = glyphs[0x309b];
  const standaloneHandakuten = glyphs[0x309c];
  const standaloneDakutenContours =
    standaloneDakuten?.contours && standaloneDakuten.contours.length > 0
      ? standaloneDakuten.contours
      : undefined;
  const standaloneHandakutenContours =
    standaloneHandakuten?.contours && standaloneHandakuten.contours.length > 0
      ? standaloneHandakuten.contours
      : undefined;

  const buildTarget = (
    sourceChar: string,
    sourceGlyph: GlyphData,
    sourceContours: PathContour[],
    targetChar: string,
    targetCode: number,
    isHandakuten: boolean
  ): void => {
    const existing = glyphs[targetCode];
    if (existing?.locked) return;
    const hasExistingContours = existing && existing.contours && existing.contours.length > 0;
    if (hasExistingContours && !overwrite) return;
    const combined = synthesizeDakutenContours(sourceContours, isHandakuten, {
      ...options,
      standaloneAccentContours: isHandakuten
        ? standaloneHandakutenContours
        : standaloneDakutenContours,
    });
    // 合成後の輪郭の bounding box から lsb を再計算する。小書きの
    // batchGenerateSmallKana と同じ方式。
    const combinedBbox = getContoursBoundingBox(combined);
    const lsb = Math.max(0, Math.round(combinedBbox.minX));
    // advanceWidth は親文字の値を維持し、合成後の右端がそれを超える
    // 場合だけ広げる。
    const baseAdvance = sourceGlyph.advanceWidth || existing?.advanceWidth || upm;
    const advanceWidth = Math.max(baseAdvance, Math.round(combinedBbox.maxX - lsb));
    updatedGlyphs[targetCode] = {
      ...withoutAuxData(existing),
      unicode: targetCode,
      char: targetChar,
      name: `uni${targetCode.toString(16).toUpperCase().padStart(4, '0')}`,
      advanceWidth,
      lsb,
      contours: combined,
      modified: true,
    };
    generatedCount++;
    details.push({ sourceChar, targetChar, isHandakuten });
  };

  for (const [char, mapping] of Object.entries(DAKUTEN_MAPPINGS)) {
    if (mapping.type !== 'seion') continue;

    const sourceCode = char.codePointAt(0);
    if (!sourceCode) continue;

    const isHiragana = sourceCode >= 0x3041 && sourceCode <= 0x3096;
    const isKatakana = sourceCode >= 0x30a1 && sourceCode <= 0x30fa;

    if (scope === 'hiragana' && !isHiragana) continue;
    if (scope === 'katakana' && !isKatakana) continue;

    const sourceGlyph = glyphs[sourceCode];
    if (!sourceGlyph) continue;
    // contours が空でも pixelData がある親文字は対象に含める。
    const sourceContours = resolveSourceContours(
      sourceGlyph,
      upm,
      options?.ascender,
      options?.descender
    );
    if (sourceContours.length === 0) {
      // 親文字が未作成ならスキップ
      continue;
    }

    // 濁音
    if (mapping.daku) {
      const targetChar = mapping.daku;
      const targetCode = targetChar.codePointAt(0);
      if (targetCode) {
        buildTarget(char, sourceGlyph, sourceContours, targetChar, targetCode, false);
      }
    }

    // 半濁音
    if (mapping.handaku) {
      const targetChar = mapping.handaku;
      const targetCode = targetChar.codePointAt(0);
      if (targetCode) {
        buildTarget(char, sourceGlyph, sourceContours, targetChar, targetCode, true);
      }
    }
  }

  return { updatedGlyphs, generatedCount, details };
}
