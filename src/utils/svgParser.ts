import { BezierNode, PathContour, Point } from '../types';
import {
  generateId,
  getContoursBoundingBox,
  transformContours,
  contoursHaveFiniteCoordinates,
} from './pathUtils';
import { SCREEN_BASELINE_Y } from './font/constants';

/** Placement of parsed contours inside the 1000x1000 EM box. */
export type SvgFitMode = 'center' | 'baseline' | 'viewbox';

export interface SvgParseOptions {
  fitMode?: SvgFitMode;
  maxContours?: number;
}

export interface SvgParseResult {
  contours: PathContour[];
  width: number;
  height: number;
  rawPathCount: number;
  /** Non-fatal notices for the caller to display (skipped shapes, limits, ...). */
  warnings: string[];
  /** Number of contours dropped by the contour limit. */
  truncatedContourCount: number;
}

/** Maximum number of contours taken from one SVG. */
export const SVG_MAX_CONTOURS = 1000;
/** Margin kept around fitted contours inside the 1000x1000 EM box. */
export const SVG_FIT_MARGIN = 80;
/** Baseline Y used by the 'baseline' fit mode. */
export const SVG_BASELINE_Y = SCREEN_BASELINE_Y;

/** SVG 2D matrix [a, b, c, d, e, f]: x' = a*x + c*y + e, y' = b*x + d*y + f. */
export type SvgMatrix = [number, number, number, number, number, number];

const IDENTITY_MATRIX: SvgMatrix = [1, 0, 0, 1, 0, 0];

function multiplyMatrices(m1: SvgMatrix, m2: SvgMatrix): SvgMatrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function isFiniteMatrix(m: SvgMatrix): boolean {
  return m.every((v) => Number.isFinite(v));
}

function applyMatrixToPoint(m: SvgMatrix, p: Point): Point {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

/**
 * Parses an SVG transform attribute into a single matrix.
 * Functions are applied left to right, per the SVG specification:
 * transform="translate(100,0) scale(2)" scales first, then translates.
 * Returns null when the attribute contains a non-finite number.
 * Unknown functions are reported through `warnings` and ignored.
 */
export function parseSvgTransform(
  transformStr: string | null | undefined,
  warnings?: string[]
): SvgMatrix | null {
  if (!transformStr) return [...IDENTITY_MATRIX] as SvgMatrix;
  const fnRegex = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  const known = new Set(['matrix', 'translate', 'scale', 'rotate', 'skewX', 'skewY']);
  const unknownReported = new Set<string>();
  let result: SvgMatrix = [...IDENTITY_MATRIX] as SvgMatrix;
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(transformStr)) !== null) {
    const name = match[1];
    const args = parseNumbers(match[2]);
    if (!known.has(name)) {
      if (warnings && !unknownReported.has(name)) {
        unknownReported.add(name);
        warnings.push(`未対応の transform 関数 "${name}" を無視しました。`);
      }
      continue;
    }
    if (args.some((v) => !Number.isFinite(v))) return null;
    let m: SvgMatrix | null = null;
    switch (name) {
      case 'matrix': {
        if (args.length >= 6) {
          m = [args[0], args[1], args[2], args[3], args[4], args[5]];
        }
        break;
      }
      case 'translate': {
        const tx = args[0] ?? 0;
        const ty = args.length >= 2 ? args[1] : 0;
        m = [1, 0, 0, 1, tx, ty];
        break;
      }
      case 'scale': {
        const sx = args[0] ?? 1;
        const sy = args.length >= 2 ? args[1] : sx;
        m = [sx, 0, 0, sy, 0, 0];
        break;
      }
      case 'rotate': {
        const angle = ((args[0] ?? 0) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rot: SvgMatrix = [cos, sin, -sin, cos, 0, 0];
        if (args.length >= 3) {
          const cx = args[1];
          const cy = args[2];
          // T(cx, cy) * R * T(-cx, -cy)
          m = multiplyMatrices(
            [1, 0, 0, 1, cx, cy],
            multiplyMatrices(rot, [1, 0, 0, 1, -cx, -cy])
          );
        } else {
          m = rot;
        }
        break;
      }
      case 'skewX': {
        const angle = ((args[0] ?? 0) * Math.PI) / 180;
        m = [1, 0, Math.tan(angle), 1, 0, 0];
        break;
      }
      case 'skewY': {
        const angle = ((args[0] ?? 0) * Math.PI) / 180;
        m = [1, Math.tan(angle), 0, 1, 0, 0];
        break;
      }
    }
    if (m) {
      if (!isFiniteMatrix(m)) return null;
      result = multiplyMatrices(result, m);
    }
  }
  return result;
}

function isIdentityMatrix(m: SvgMatrix): boolean {
  return (
    m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0
  );
}

function applyMatrixToContours(contours: PathContour[], m: SvgMatrix): PathContour[] {
  if (isIdentityMatrix(m)) return contours;
  return transformContours(contours, (p) => applyMatrixToPoint(m, p));
}

/**
 * Combined transform of an element and its ancestors, from the outermost
 * ancestor down to the element itself. Stops before `stopExclusive`
 * (used for <use> targets so the outer <svg> transform is not applied twice).
 */
function getElementTransformMatrix(
  el: Element,
  stopExclusive?: Element | null,
  warnings?: string[]
): SvgMatrix | null {
  const chain: Element[] = [];
  let current: Element | null = el;
  while (current && current !== stopExclusive) {
    chain.unshift(current);
    current = current.parentElement;
  }
  let result: SvgMatrix = [...IDENTITY_MATRIX] as SvgMatrix;
  for (const node of chain) {
    const m = parseSvgTransform(node.getAttribute('transform'), warnings);
    if (m === null) return null;
    result = multiplyMatrices(result, m);
  }
  return result;
}

function isInDefs(el: Element): boolean {
  let current: Element | null = el.parentElement;
  while (current) {
    if (current.tagName.toLowerCase() === 'defs') return true;
    current = current.parentElement;
  }
  return false;
}

/** True when a <defs> element sits between `el` and `stopExclusive`. */
function hasDefsAncestorBelow(el: Element, stopExclusive: Element): boolean {
  let current: Element | null = el.parentElement;
  while (current && current !== stopExclusive) {
    if (current.tagName.toLowerCase() === 'defs') return true;
    current = current.parentElement;
  }
  return false;
}

function parseStyleDeclarations(style: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx > 0) {
      out[decl.slice(0, idx).trim().toLowerCase()] = decl.slice(idx + 1).trim();
    }
  }
  return out;
}

/**
 * Effective presentation attribute, following SVG inheritance: the element
 * itself first, then its ancestors. `fallbackEl` (the <use> element that
 * references this element) is consulted after the element's own chain.
 */
function getEffectivePresentationAttr(
  el: Element,
  name: 'fill' | 'stroke',
  fallbackEl?: Element | null
): string | null {
  let current: Element | null = el;
  while (current) {
    const attr = current.getAttribute(name);
    if (attr !== null && attr.trim() !== '') return attr.trim();
    const fromStyle = parseStyleDeclarations(current.getAttribute('style'))[name];
    if (fromStyle !== undefined && fromStyle !== '') return fromStyle;
    current = current.parentElement;
  }
  if (fallbackEl) {
    return getEffectivePresentationAttr(fallbackEl, name);
  }
  return null;
}

function isNoneValue(value: string | null): boolean {
  return value !== null && value.toLowerCase() === 'none';
}

/** Removes the DOCTYPE declaration before parsing, so external DTDs are never fetched. */
export function stripSvgDoctype(svgString: string): string {
  return svgString.replace(/<!DOCTYPE(?:[^>"'\[]|\[[^\]]*\])*>/gi, '');
}

/**
 * Parses SVG XML string and extracts all vector paths, polygons, rectangles, circles
 * and converts them into the app's internal PathContour[] cubic Bezier format.
 */
export function parseSvgStringToContours(
  svgString: string,
  fitTo1000Em: boolean = true,
  options?: SvgParseOptions
): SvgParseResult {
  const warnings: string[] = [];
  const fitMode: SvgFitMode = options?.fitMode ?? 'center';
  const maxContours = options?.maxContours ?? SVG_MAX_CONTOURS;

  const parser = new DOMParser();
  const doc = parser.parseFromString(stripSvgDoctype(svgString), 'image/svg+xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('SVGファイルの解析に失敗しました: XML構文エラー');
  }

  const svgEl = doc.querySelector('svg');
  let viewBoxX = 0;
  let viewBoxY = 0;
  let viewBoxW = 1000;
  let viewBoxH = 1000;

  if (svgEl) {
    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
      if (
        parts.length === 4 &&
        parts.every((v) => Number.isFinite(v)) &&
        parts[2] > 0 &&
        parts[3] > 0
      ) {
        viewBoxX = parts[0];
        viewBoxY = parts[1];
        viewBoxW = parts[2];
        viewBoxH = parts[3];
      }
    } else {
      const w = parseFloat(svgEl.getAttribute('width') || '1000');
      const h = parseFloat(svgEl.getAttribute('height') || '1000');
      if (Number.isFinite(w) && w > 0) viewBoxW = w;
      if (Number.isFinite(h) && h > 0) viewBoxH = h;
    }
  }

  const contours: PathContour[] = [];
  let strokeOnlySkipped = 0;

  const collectShape = (el: Element, matrix: SvgMatrix | null, useEl?: Element | null) => {
    if (matrix === null) {
      warnings.push('非有限の数値を含む transform があるため、その要素を除外しました。');
      return;
    }
    const fill = getEffectivePresentationAttr(el, 'fill', useEl);
    if (isNoneValue(fill)) {
      const stroke = getEffectivePresentationAttr(el, 'stroke', useEl);
      if (stroke !== null && !isNoneValue(stroke)) {
        // Stroke-only shape: converting a stroke outline is not supported,
        // so it is excluded with a notice instead of becoming a filled shape.
        strokeOnlySkipped += 1;
      }
      // fill="none" without a stroke is invisible in SVG; skip silently.
      return;
    }
    const parsed = parseShapeElement(el, warnings);
    if (parsed) {
      contours.push(...applyMatrixToContours(parsed, matrix));
    }
  };

  const collectFromSubtree = (
    root: Element,
    baseMatrix: SvgMatrix,
    useEl: Element | null,
    depth: number
  ) => {
    if (depth > 5) {
      warnings.push('<use> の参照が深すぎるため処理を中止しました。');
      return;
    }
    const tag = root.tagName.toLowerCase();
    if (tag === 'use') {
      resolveUseElement(root, baseMatrix, depth, warnings, contours, true, (el, matrix) =>
        collectShape(el, matrix, root)
      );
      return;
    }
    if (tag === 'g' || tag === 'svg' || tag === 'symbol') {
      const shapes = root.querySelectorAll(
        'path, rect, circle, ellipse, polygon, polyline, use'
      );
      shapes.forEach((child) => {
        // Definitions nested below the referenced group are not visible.
        if (hasDefsAncestorBelow(child, root)) return;
        if (child.tagName.toLowerCase() === 'use') {
          resolveUseElement(child, baseMatrix, depth, warnings, contours, true, (el, matrix) =>
            collectShape(el, matrix, child as Element)
          );
          return;
        }
        const chain = getElementTransformMatrix(child, svgEl, warnings);
        if (chain === null) {
          warnings.push('非有限の数値を含む transform があるため、その要素を除外しました。');
          return;
        }
        collectShape(child, multiplyMatrices(baseMatrix, chain), useEl);
      });
      return;
    }
    const chain = getElementTransformMatrix(root, svgEl, warnings);
    if (chain === null) {
      warnings.push('非有限の数値を含む transform があるため、その要素を除外しました。');
      return;
    }
    collectShape(root, multiplyMatrices(baseMatrix, chain), useEl);
  };

  const resolveUseElement = (
    useEl: Element,
    baseMatrix: SvgMatrix,
    depth: number,
    warningsArg: string[],
    out: PathContour[],
    fromDefs: boolean,
    emit: (el: Element, matrix: SvgMatrix | null) => void
  ) => {
    const href =
      useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
    if (!href || !href.startsWith('#')) {
      warningsArg.push('<use> 要素の参照先を解決できなかったため除外しました。');
      return;
    }
    const target = doc.getElementById(href.slice(1));
    if (!target) {
      warningsArg.push(`<use> 要素の参照先 "${href}" が見つからなかったため除外しました。`);
      return;
    }
    // A <use> reached through another <use> lives inside <defs>; its chain
    // stops before the outer <svg> so that transform is not applied twice.
    const useMatrix = getElementTransformMatrix(useEl, fromDefs ? svgEl : null, warningsArg);
    if (useMatrix === null) {
      warningsArg.push('非有限の数値を含む transform があるため、その要素を除外しました。');
      return;
    }
    const x = parseFloat(useEl.getAttribute('x') || '0');
    const y = parseFloat(useEl.getAttribute('y') || '0');
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      warningsArg.push('<use> 要素の x / y が非有限のため除外しました。');
      return;
    }
    const combined = multiplyMatrices(
      multiplyMatrices(baseMatrix, useMatrix),
      [1, 0, 0, 1, x, y] as SvgMatrix
    );
    const targetTag = target.tagName.toLowerCase();
    if (targetTag === 'g' || targetTag === 'svg' || targetTag === 'symbol') {
      collectFromSubtree(target, combined, useEl, depth + 1);
      return;
    }
    if (targetTag === 'use') {
      resolveUseElement(target, combined, depth + 1, warningsArg, out, true, emit);
      return;
    }
    if (isShapeElement(target)) {
      const chain = getElementTransformMatrix(target, svgEl, warningsArg);
      if (chain === null) {
        warningsArg.push('非有限の数値を含む transform があるため、その要素を除外しました。');
        return;
      }
      emit(target, multiplyMatrices(combined, chain));
      return;
    }
    warningsArg.push(`<use> 要素の参照先 "${href}" は図形ではないため除外しました。`);
  };

  // Collect visible shapes in document order. Elements inside <defs> are
  // definitions, not visible shapes, and are skipped here (<use> resolves them).
  const elements = doc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, use');
  elements.forEach((el) => {
    if (isInDefs(el)) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'use') {
      resolveUseElement(el, [...IDENTITY_MATRIX] as SvgMatrix, 0, warnings, contours, false, (targetEl, matrix) =>
        collectShape(targetEl, matrix, el)
      );
      return;
    }
    const matrix = getElementTransformMatrix(el, null, warnings);
    collectShape(el, matrix);
  });

  if (strokeOnlySkipped > 0) {
    warnings.push(
      `fill="none" の線だけのパス ${strokeOnlySkipped} 件を除外しました。線の塗りつぶし変換には未対応のため、塗りつぶし形状としては取り込めません。`
    );
  }

  if (contours.length === 0) {
    return {
      contours: [],
      width: viewBoxW,
      height: viewBoxH,
      rawPathCount: 0,
      warnings,
      truncatedContourCount: 0,
    };
  }

  // Non-finite coordinates must never reach glyph or part state.
  if (!contoursHaveFiniteCoordinates(contours)) {
    throw new Error(
      'SVGに非有限の座標（Infinity / NaN）が含まれているため取り込みを中止しました。'
    );
  }

  const rawPathCount = contours.length;
  let truncatedContourCount = 0;
  let limitedContours = contours;
  if (contours.length > maxContours) {
    truncatedContourCount = contours.length - maxContours;
    limitedContours = contours.slice(0, maxContours);
    warnings.push(
      `輪郭数が上限 ${maxContours} を超えたため、最初の ${maxContours} 件だけを取り込み、${truncatedContourCount} 件を除外しました。`
    );
  }

  // Fit contours into the standard 1000x1000 coordinate system if requested.
  let finalContours = limitedContours;
  if (fitTo1000Em) {
    finalContours = fitContoursToEmBox(limitedContours, fitMode, {
      x: viewBoxX,
      y: viewBoxY,
      width: viewBoxW,
      height: viewBoxH,
    }, warnings);
  }

  // Merge Z endpoints in fitted units, so the threshold is applied after
  // fitting rather than in the source coordinate system.
  finalContours = mergeClosedContourEndpoints(finalContours, 2);

  if (!contoursHaveFiniteCoordinates(finalContours)) {
    throw new Error(
      'SVGに非有限の座標（Infinity / NaN）が含まれているため取り込みを中止しました。'
    );
  }

  return {
    contours: finalContours,
    width: viewBoxW,
    height: viewBoxH,
    rawPathCount,
    warnings,
    truncatedContourCount,
  };
}

function isShapeElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'path' ||
    tag === 'rect' ||
    tag === 'circle' ||
    tag === 'ellipse' ||
    tag === 'polygon' ||
    tag === 'polyline'
  );
}

function parseShapeElement(el: Element, warnings: string[]): PathContour[] | null {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case 'path': {
      const d = el.getAttribute('d');
      if (!d) return null;
      return parseSvgPathData(d, warnings);
    }
    case 'rect': {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const width = parseFloat(el.getAttribute('width') || '0');
      const height = parseFloat(el.getAttribute('height') || '0');
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
        warnings.push('非有限の数値を含む rect 要素を除外しました。');
        return null;
      }
      if (width > 0 && height > 0) {
        return [createRectContourDirect(x, y, width, height)];
      }
      return null;
    }
    case 'circle': {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) {
        warnings.push('非有限の数値を含む circle 要素を除外しました。');
        return null;
      }
      if (r > 0) {
        return [createEllipseContourDirect(cx, cy, r, r)];
      }
      return null;
    }
    case 'ellipse': {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || '0');
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(rx) || !Number.isFinite(ry)) {
        warnings.push('非有限の数値を含む ellipse 要素を除外しました。');
        return null;
      }
      if (rx > 0 && ry > 0) {
        return [createEllipseContourDirect(cx, cy, rx, ry)];
      }
      return null;
    }
    case 'polygon':
    case 'polyline': {
      const pointsAttr = el.getAttribute('points');
      if (!pointsAttr) return null;
      const nums = pointsAttr.trim().split(/[\s,]+/).map(Number);
      if (nums.some((v) => !Number.isFinite(v))) {
        warnings.push(`非有限の数値を含む ${tag} 要素を除外しました。`);
        return null;
      }
      const isClosed = tag === 'polygon';
      const nodes: BezierNode[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        nodes.push({
          id: generateId(),
          x: nums[i],
          y: nums[i + 1],
          type: 'corner',
        });
      }
      if (nodes.length > 1) {
        return [{
          id: generateId(),
          closed: isClosed,
          nodes,
        }];
      }
      return null;
    }
    default:
      return null;
  }
}

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fits contours into the 1000x1000 EM box (margin 80 on each side).
 * - center: scale to fit, centered.
 * - baseline: scale to fit, bottom edge aligned to the baseline (y=800).
 * - viewbox: map the viewBox rect itself into the EM box, keeping its
 *   origin and margins.
 * A zero width fits height only (x centered at 500); a zero height fits
 * width only (y centered at 500). Both zero skips fitting with a notice.
 */
export function fitContoursToEmBox(
  contours: PathContour[],
  fitMode: SvgFitMode,
  viewBox: ViewBoxRect,
  warnings?: string[]
): PathContour[] {
  if (contours.length === 0) return contours;
  const margin = SVG_FIT_MARGIN;
  const targetSize = 1000 - margin * 2;

  if (fitMode === 'viewbox') {
    const scale = Math.min(targetSize / viewBox.width, targetSize / viewBox.height);
    const offsetX = margin + (targetSize - viewBox.width * scale) / 2;
    const offsetY = margin + (targetSize - viewBox.height * scale) / 2;
    return transformContours(contours, (p) => ({
      x: Math.round(offsetX + (p.x - viewBox.x) * scale),
      y: Math.round(offsetY + (p.y - viewBox.y) * scale),
    }));
  }

  const bbox = getContoursBoundingBox(contours);
  if (bbox.width <= 0 && bbox.height <= 0) {
    warnings?.push('境界ボックスの幅と高さが 0 のため、フィットを省略しました。');
    return contours;
  }
  if (bbox.width <= 0) {
    warnings?.push('境界ボックスの幅が 0 のため、高さ方向だけフィットしました。');
    const scale = targetSize / bbox.height;
    return transformContours(contours, (p) => ({
      x: Math.round(500),
      y: Math.round(margin + (p.y - bbox.minY) * scale),
    }));
  }
  if (bbox.height <= 0) {
    warnings?.push('境界ボックスの高さが 0 のため、幅方向だけフィットしました。');
    const scale = targetSize / bbox.width;
    return transformContours(contours, (p) => ({
      x: Math.round(margin + (p.x - bbox.minX) * scale),
      y: Math.round(500),
    }));
  }

  const scale = Math.min(targetSize / bbox.width, targetSize / bbox.height);
  if (fitMode === 'baseline') {
    return transformContours(contours, (p) => ({
      x: Math.round(500 + (p.x - bbox.centerX) * scale),
      y: Math.round(SVG_BASELINE_Y - (bbox.maxY - p.y) * scale),
    }));
  }
  const targetX = margin + (targetSize - bbox.width * scale) / 2;
  const targetY = margin + (targetSize - bbox.height * scale) / 2;
  return transformContours(contours, (p) => ({
    x: Math.round(targetX + (p.x - bbox.minX) * scale),
    y: Math.round(targetY + (p.y - bbox.minY) * scale),
  }));
}

/**
 * Merges the last node of a closed contour into its first node when the two
 * are closer than `threshold` in the given (already fitted) coordinates.
 */
export function mergeClosedContourEndpoints(
  contours: PathContour[],
  threshold: number
): PathContour[] {
  return contours.map((contour) => {
    if (!contour.closed || contour.nodes.length <= 1) return contour;
    const first = contour.nodes[0];
    const last = contour.nodes[contour.nodes.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < threshold) {
      const mergedFirst: BezierNode = { ...first };
      if (last.handleIn && !mergedFirst.handleIn) {
        mergedFirst.handleIn = last.handleIn;
      }
      return {
        ...contour,
        nodes: [mergedFirst, ...contour.nodes.slice(1, -1)],
      };
    }
    return contour;
  });
}

/**
 * Parses standard SVG `d` attribute into PathContour[]
 * Supports M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
 */
export function parseSvgPathData(d: string, warnings?: string[]): PathContour[] {
  const contours: PathContour[] = [];
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  let currentPos: Point = { x: 0, y: 0 };
  let startPos: Point = { x: 0, y: 0 };
  let currentContour: PathContour | null = null;
  let prevControlPoint: Point | null = null;
  let prevCommand: string | null = null;
  let hasMove = false;
  let warnedNoMove = false;

  /** Pushes a contour only when it has more than one node. */
  const pushContour = (contour: PathContour | null) => {
    if (contour && contour.nodes.length > 1) {
      contours.push(contour);
    }
  };

  const ensureContour = () => {
    if (!currentContour) {
      if (!hasMove && !warnedNoMove) {
        warnedNoMove = true;
        warnings?.push(
          'Mコマンドなしで始まるパスがあります。最初の座標から輪郭を開始しました。'
        );
      }
      currentContour = {
        id: generateId(),
        closed: false,
        // After a previous subpath (M or Z) the current point is the subpath
        // start, so seed with it. Without any M, start empty instead of
        // creating a node at the origin (0, 0).
        nodes: hasMove
          ? [{ id: generateId(), x: currentPos.x, y: currentPos.y, type: 'corner' }]
          : [],
      };
    }
  };

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1];
    const isRelative = cmd === cmd.toLowerCase();
    const upperCmd = cmd.toUpperCase();
    const args =
      upperCmd === 'A' ? parseArcArgs(match[2]) : parseNumbers(match[2]);
    if (args.some((v) => !Number.isFinite(v))) {
      throw new Error(
        'SVGパスに非有限の数値（Infinity / NaN）が含まれています。'
      );
    }
    let argIdx = 0;

    switch (upperCmd) {
      case 'M': {
        // Move to
        pushContour(currentContour);
        currentContour = null;
        if (args.length >= 2) {
          const x = isRelative ? currentPos.x + args[0] : args[0];
          const y = isRelative ? currentPos.y + args[1] : args[1];
          currentPos = { x, y };
          startPos = { x, y };
          currentContour = {
            id: generateId(),
            closed: false,
            nodes: [{ id: generateId(), x, y, type: 'corner' }],
          };
          prevControlPoint = null;
          hasMove = true;
          argIdx = 2;

          // Subsequent coordinates are implicit L / l
          while (argIdx + 1 < args.length) {
            const lx = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
            const ly = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
            currentContour.nodes.push({ id: generateId(), x: lx, y: ly, type: 'corner' });
            currentPos = { x: lx, y: ly };
          }
        }
        prevCommand = 'M';
        break;
      }

      case 'L': {
        // Line to
        ensureContour();
        while (argIdx + 1 < args.length) {
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({ id: generateId(), x, y, type: 'corner' });
          currentPos = { x, y };
          prevControlPoint = null;
          prevCommand = 'L';
        }
        break;
      }

      case 'H': {
        // Horizontal Line to
        ensureContour();
        while (argIdx < args.length) {
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({
            id: generateId(),
            x,
            y: currentPos.y,
            type: 'corner',
          });
          currentPos = { x, y: currentPos.y };
          prevControlPoint = null;
          prevCommand = 'H';
        }
        break;
      }

      case 'V': {
        // Vertical Line to
        ensureContour();
        while (argIdx < args.length) {
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({
            id: generateId(),
            x: currentPos.x,
            y,
            type: 'corner',
          });
          currentPos = { x: currentPos.x, y };
          prevControlPoint = null;
          prevCommand = 'V';
        }
        break;
      }

      case 'C': {
        // Cubic Bezier curve
        ensureContour();
        while (argIdx + 5 < args.length) {
          const cp1x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp1y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const cp2x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp2y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: cp2x, y: cp2y };
          currentPos = { x, y };
          prevCommand = 'C';
        }
        break;
      }

      case 'S': {
        // Smooth Cubic Bezier: reflect only after C or S.
        ensureContour();
        while (argIdx + 3 < args.length) {
          let cp1x = currentPos.x;
          let cp1y = currentPos.y;
          if ((prevCommand === 'C' || prevCommand === 'S') && prevControlPoint) {
            cp1x = 2 * currentPos.x - prevControlPoint.x;
            cp1y = 2 * currentPos.y - prevControlPoint.y;
          }

          const cp2x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp2y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: cp2x, y: cp2y };
          currentPos = { x, y };
          prevCommand = 'S';
        }
        break;
      }

      case 'Q': {
        // Quadratic Bezier -> Elevate to Cubic Bezier
        ensureContour();
        while (argIdx + 3 < args.length) {
          const qpx = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const qpy = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          // Elevate Quadratic (p0, qp, p1) to Cubic (cp1, cp2)
          const cp1x = currentPos.x + (2 / 3) * (qpx - currentPos.x);
          const cp1y = currentPos.y + (2 / 3) * (qpy - currentPos.y);
          const cp2x = x + (2 / 3) * (qpx - x);
          const cp2y = y + (2 / 3) * (qpy - y);

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: qpx, y: qpy };
          currentPos = { x, y };
          prevCommand = 'Q';
        }
        break;
      }

      case 'T': {
        // Smooth Quadratic Bezier -> Elevate to Cubic Bezier.
        // Reflect only after Q or T.
        ensureContour();
        while (argIdx + 1 < args.length) {
          let qpx = currentPos.x;
          let qpy = currentPos.y;
          if ((prevCommand === 'Q' || prevCommand === 'T') && prevControlPoint) {
            qpx = 2 * currentPos.x - prevControlPoint.x;
            qpy = 2 * currentPos.y - prevControlPoint.y;
          }

          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const cp1x = currentPos.x + (2 / 3) * (qpx - currentPos.x);
          const cp1y = currentPos.y + (2 / 3) * (qpy - currentPos.y);
          const cp2x = x + (2 / 3) * (qpx - x);
          const cp2y = y + (2 / 3) * (qpy - y);

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: qpx, y: qpy };
          currentPos = { x, y };
          prevCommand = 'T';
        }
        break;
      }

      case 'A': {
        // Elliptical Arc -> Convert to Cubic Bezier segments
        ensureContour();
        while (argIdx + 6 < args.length) {
          const rx = args[argIdx++];
          const ry = args[argIdx++];
          const angle = args[argIdx++];
          const largeArcFlag = Boolean(args[argIdx++]);
          const sweepFlag = Boolean(args[argIdx++]);
          const endX = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const endY = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const segments = arcToBeziers(
            currentPos.x,
            currentPos.y,
            rx,
            ry,
            angle,
            largeArcFlag,
            sweepFlag,
            endX,
            endY
          );

          for (const seg of segments) {
            const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
            if (lastNode) {
              lastNode.handleOut = { x: seg.cp1.x, y: seg.cp1.y };
            }
            const newNode: BezierNode = {
              id: generateId(),
              x: seg.end.x,
              y: seg.end.y,
              type: 'smooth',
              handleIn: { x: seg.cp2.x, y: seg.cp2.y },
            };
            currentContour!.nodes.push(newNode);
          }

          currentPos = { x: endX, y: endY };
          prevControlPoint = null;
          prevCommand = 'A';
        }
        break;
      }

      case 'Z': {
        // Close Path. Endpoint merging is done after fitting, in fitted
        // units, by mergeClosedContourEndpoints.
        if (currentContour) {
          currentContour.closed = true;
          pushContour(currentContour);
          currentContour = null;
        }
        currentPos = { ...startPos };
        prevControlPoint = null;
        prevCommand = 'Z';
        break;
      }
    }
  }

  pushContour(currentContour);

  return contours;
}

function parseNumbers(str: string): number[] {
  if (!str) return [];
  const matches = str.match(/-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Parses arc (A) arguments. The large-arc and sweep flags are single
 * characters (0 or 1) and may be joined to the following number without a
 * separator (for example "A 30 50 0 01162.55 162.45"), so they are read one
 * character at a time instead of splitting on numbers.
 */
function parseArcArgs(argStr: string): number[] {
  const values: number[] = [];
  let i = 0;
  const n = argStr.length;
  const numberRegex = /-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/y;
  const skipSeparators = () => {
    while (i < n) {
      const ch = argStr[i];
      if (ch === ' ' || ch === ',' || ch === '\t' || ch === '\n' || ch === '\r') {
        i++;
      } else {
        break;
      }
    }
  };
  const readNumber = (): number | null => {
    skipSeparators();
    numberRegex.lastIndex = i;
    const m = numberRegex.exec(argStr);
    if (!m) return null;
    i = numberRegex.lastIndex;
    return Number(m[0]);
  };
  const readFlag = (): number | null => {
    skipSeparators();
    if (i < n && (argStr[i] === '0' || argStr[i] === '1')) {
      const v = argStr[i] === '1' ? 1 : 0;
      i++;
      return v;
    }
    return null;
  };
  while (true) {
    skipSeparators();
    if (i >= n) break;
    const rx = readNumber();
    if (rx === null) break;
    const ry = readNumber();
    if (ry === null) break;
    const rot = readNumber();
    if (rot === null) break;
    const large = readFlag();
    if (large === null) break;
    const sweep = readFlag();
    if (sweep === null) break;
    const x = readNumber();
    if (x === null) break;
    const y = readNumber();
    if (y === null) break;
    values.push(rx, ry, rot, large, sweep, x, y);
  }
  return values;
}

function createRectContourDirect(x: number, y: number, w: number, h: number): PathContour {
  return {
    id: generateId(),
    closed: true,
    nodes: [
      { id: generateId(), x, y, type: 'corner' },
      { id: generateId(), x: x + w, y, type: 'corner' },
      { id: generateId(), x: x + w, y: y + h, type: 'corner' },
      { id: generateId(), x, y: y + h, type: 'corner' },
    ],
  };
}

function createEllipseContourDirect(cx: number, cy: number, rx: number, ry: number): PathContour {
  const kx = rx * 0.5522847498;
  const ky = ry * 0.5522847498;
  return {
    id: generateId(),
    closed: true,
    nodes: [
      {
        id: generateId(),
        x: cx,
        y: cy - ry,
        type: 'smooth',
        handleIn: { x: cx - kx, y: cy - ry },
        handleOut: { x: cx + kx, y: cy - ry },
      },
      {
        id: generateId(),
        x: cx + rx,
        y: cy,
        type: 'smooth',
        handleIn: { x: cx + rx, y: cy - ky },
        handleOut: { x: cx + rx, y: cy + ky },
      },
      {
        id: generateId(),
        x: cx,
        y: cy + ry,
        type: 'smooth',
        handleIn: { x: cx + kx, y: cy + ry },
        handleOut: { x: cx - kx, y: cy + ry },
      },
      {
        id: generateId(),
        x: cx - rx,
        y: cy,
        type: 'smooth',
        handleIn: { x: cx - rx, y: cy + ky },
        handleOut: { x: cx - rx, y: cy - ky },
      },
    ],
  };
}

interface BezierArcSegment {
  cp1: Point;
  cp2: Point;
  end: Point;
}

function arcToBeziers(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angleDeg: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x2: number,
  y2: number
): BezierArcSegment[] {
  if (x1 === x2 && y1 === y2) return [];

  let radX = Math.abs(rx);
  let radY = Math.abs(ry);
  if (radX === 0 || radY === 0) {
    return [{
      cp1: { x: x1, y: y1 },
      cp2: { x: x2, y: y2 },
      end: { x: x2, y: y2 },
    }];
  }

  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (radX * radX) + (y1p * y1p) / (radY * radY);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    radX *= s;
    radY *= s;
  }

  const rxSq = radX * radX;
  const rySq = radY * radY;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const denom = rxSq * y1pSq + rySq * x1pSq;
  let factor = 0;
  if (denom > 0 && num > 0) {
    factor = Math.sqrt(num / denom);
  }
  if (largeArcFlag === sweepFlag) {
    factor = -factor;
  }

  const cxp = factor * ((radX * y1p) / radY);
  const cyp = factor * (-(radY * x1p) / radX);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const v1x = (x1p - cxp) / radX;
  const v1y = (y1p - cyp) / radY;
  const v2x = (-x1p - cxp) / radX;
  const v2y = (-y1p - cyp) / radY;

  const vectorAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const theta1 = vectorAngle(1, 0, v1x, v1y);
  let dTheta = vectorAngle(v1x, v1y, v2x, v2y);

  if (!sweepFlag && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweepFlag && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const segDelta = dTheta / segments;
  const result: BezierArcSegment[] = [];

  for (let i = 0; i < segments; i++) {
    const startAng = theta1 + i * segDelta;
    const endAng = startAng + segDelta;
    const halfDelta = segDelta / 2;
    const alpha = (Math.sin(segDelta) * (Math.sqrt(4 + 3 * Math.tan(halfDelta) * Math.tan(halfDelta)) - 1)) / 3;

    const cosS = Math.cos(startAng);
    const sinS = Math.sin(startAng);
    const cosE = Math.cos(endAng);
    const sinE = Math.sin(endAng);

    const ep1x = cosPhi * radX * cosS - sinPhi * radY * sinS + cx;
    const ep1y = sinPhi * radX * cosS + cosPhi * radY * sinS + cy;
    const ep2x = cosPhi * radX * cosE - sinPhi * radY * sinE + cx;
    const ep2y = sinPhi * radX * cosE + cosPhi * radY * sinE + cy;

    const dxS = -cosPhi * radX * sinS - sinPhi * radY * cosS;
    const dyS = -sinPhi * radX * sinS + cosPhi * radY * cosS;
    const dxE = -cosPhi * radX * sinE - sinPhi * radY * cosE;
    const dyE = -sinPhi * radX * sinE + cosPhi * radY * cosE;

    result.push({
      cp1: { x: Math.round((ep1x + alpha * dxS) * 100) / 100, y: Math.round((ep1y + alpha * dyS) * 100) / 100 },
      cp2: { x: Math.round((ep2x - alpha * dxE) * 100) / 100, y: Math.round((ep2y - alpha * dyE) * 100) / 100 },
      end: { x: Math.round(ep2x * 100) / 100, y: Math.round(ep2y * 100) / 100 },
    });
  }

  return result;
}
