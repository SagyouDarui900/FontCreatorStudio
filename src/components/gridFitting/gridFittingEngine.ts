import { GlyphData, PathContour, BezierNode } from '../../types';
import { GridFittingConfig, RenderingMode, StemInfo } from './types';
import { CanvasMetricsMetadataInput, resolveCanvasMetrics } from '../../utils/font/constants';

/**
 * Convert contour set to SVG Path 'd' attribute string
 */
export function contourToSvgPath(contour: PathContour): string {
  if (!contour.nodes || contour.nodes.length === 0) return '';
  let d = '';
  const nodes = contour.nodes;
  const start = nodes[0];
  d += `M ${start.x} ${start.y} `;

  for (let i = 0; i < nodes.length; i++) {
    const curr = nodes[i];
    const nextIndex = (i + 1) % nodes.length;
    if (nextIndex === 0 && !contour.closed) break;
    const next = nodes[nextIndex];

    if (curr.handleOut || next.handleIn) {
      const h1 = curr.handleOut || curr;
      const h2 = next.handleIn || next;
      d += `C ${h1.x} ${h1.y}, ${h2.x} ${h2.y}, ${next.x} ${next.y} `;
    } else {
      d += `L ${next.x} ${next.y} `;
    }
  }

  if (contour.closed) {
    d += ' Z';
  }
  return d;
}

export function contoursToSvgPath(contours: PathContour[]): string {
  if (!contours || contours.length === 0) return '';
  return contours.map(contourToSvgPath).filter(Boolean).join(' ');
}

/**
 * Detect vertical and horizontal stems from contour nodes
 */
export function detectGlyphStems(contours: PathContour[], ppem: number, upm: number = 1000): StemInfo[] {
  const stems: StemInfo[] = [];
  if (!contours || contours.length === 0 || ppem <= 0) return stems;

  const nodes: BezierNode[] = [];
  for (const c of contours) {
    if (c.nodes) nodes.push(...c.nodes);
  }

  if (nodes.length < 2) return stems;

  const pxUnit = upm / ppem;

  // Group nodes by X coordinate (for vertical stems)
  const xThreshold = Math.max(12, pxUnit * 0.25);
  const xGroups: { x: number; count: number }[] = [];

  for (const n of nodes) {
    const existing = xGroups.find((g) => Math.abs(g.x - n.x) < xThreshold);
    if (existing) {
      existing.count++;
    } else {
      xGroups.push({ x: n.x, count: 1 });
    }
  }

  const significantX = xGroups.filter((g) => g.count >= 2).sort((a, b) => a.x - b.x);
  for (let i = 0; i < significantX.length - 1; i++) {
    const left = significantX[i];
    const right = significantX[i + 1];
    const dist = right.x - left.x;
    if (dist >= 15 && dist <= 240) {
      const center = (left.x + right.x) / 2;
      const roundedGridCenter = Math.round(center / pxUnit) * pxUnit;
      stems.push({
        id: `vstem_${i}_${Math.round(left.x)}`,
        type: 'v',
        pos: Math.round(center),
        width: Math.round(dist),
        alignedPos: Math.round(roundedGridCenter),
        shiftDelta: Math.round(roundedGridCenter - center),
      });
    }
  }

  // Group nodes by Y coordinate (for horizontal stems)
  const yThreshold = Math.max(12, pxUnit * 0.25);
  const yGroups: { y: number; count: number }[] = [];

  for (const n of nodes) {
    const existing = yGroups.find((g) => Math.abs(g.y - n.y) < yThreshold);
    if (existing) {
      existing.count++;
    } else {
      yGroups.push({ y: n.y, count: 1 });
    }
  }

  const significantY = yGroups.filter((g) => g.count >= 2).sort((a, b) => a.y - b.y);
  for (let i = 0; i < significantY.length - 1; i++) {
    const top = significantY[i];
    const bottom = significantY[i + 1];
    const dist = bottom.y - top.y;
    if (dist >= 15 && dist <= 240) {
      const center = (top.y + bottom.y) / 2;
      const roundedGridCenter = Math.round(center / pxUnit) * pxUnit;
      stems.push({
        id: `hstem_${i}_${Math.round(top.y)}`,
        type: 'h',
        pos: Math.round(center),
        width: Math.round(dist),
        alignedPos: Math.round(roundedGridCenter),
        shiftDelta: Math.round(roundedGridCenter - center),
      });
    }
  }

  return stems;
}

/**
 * Apply stem grid-fitting and hinting transformation to a glyph contour set
 */
export function applyGridFittingToGlyph(
  glyph: GlyphData,
  ppem: number,
  upm: number = 1000,
  config: GridFittingConfig,
  metrics?: CanvasMetricsMetadataInput
): GlyphData {
  if (!glyph.contours || glyph.contours.length === 0 || ppem <= 0) return glyph;

  const pixelSizeInUnits = upm / ppem;
  const strength = Math.max(
    0,
    Math.min(1, Number.isFinite(config.snapStrength) ? config.snapStrength : 1)
  );
  const safeMinStemPx =
    typeof config.minStemWidthPx === 'number' &&
    Number.isFinite(config.minStemWidthPx) &&
    config.minStemWidthPx > 0
      ? config.minStemWidthPx
      : 0;
  const minStrokeUnits = safeMinStemPx * pixelSizeInUnits;
  const resolvedMetrics = config.snapMetrics ? resolveCanvasMetrics(metrics, upm) : null;
  const roundCoord = (v: number) => Math.round(v * 10) / 10;

  const newContours: PathContour[] = glyph.contours.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => {
      let targetX = n.x;
      let targetY = n.y;

      if (config.snapVertical) {
        const roundedX = Math.round(n.x / pixelSizeInUnits) * pixelSizeInUnits;
        targetX = n.x + (roundedX - n.x) * strength;
      }

      if (config.snapHorizontal) {
        const roundedY = Math.round(n.y / pixelSizeInUnits) * pixelSizeInUnits;
        targetY = n.y + (roundedY - n.y) * strength;
      }

      if (config.snapMetrics && resolvedMetrics) {
        const { baselineY, capHeightY, xHeightY, ascenderY, descenderY } = resolvedMetrics;
        const threshold = pixelSizeInUnits * 0.5;

        if (Math.abs(n.y - baselineY) < threshold) {
          targetY = n.y + (baselineY - n.y) * strength;
        } else if (Math.abs(n.y - capHeightY) < threshold) {
          targetY = n.y + (capHeightY - n.y) * strength;
        } else if (Math.abs(n.y - xHeightY) < threshold) {
          targetY = n.y + (xHeightY - n.y) * strength;
        } else if (Math.abs(n.y - ascenderY) < threshold) {
          targetY = n.y + (ascenderY - n.y) * strength;
        } else if (Math.abs(n.y - 0) < threshold) {
          targetY = n.y + (0 - n.y) * strength;
        } else if (Math.abs(n.y - descenderY) < threshold) {
          targetY = n.y + (descenderY - n.y) * strength;
        }
      }

      const finalX = roundCoord(targetX);
      const finalY = roundCoord(targetY);
      const dx = finalX - n.x;
      const dy = finalY - n.y;

      const handleIn = n.handleIn ? { ...n.handleIn } : null;
      const handleOut = n.handleOut ? { ...n.handleOut } : null;

      if (config.adjustHandles) {
        if (handleIn) {
          handleIn.x = roundCoord(handleIn.x + dx);
          handleIn.y = roundCoord(handleIn.y + dy);
        }
        if (handleOut) {
          handleOut.x = roundCoord(handleOut.x + dx);
          handleOut.y = roundCoord(handleOut.y + dy);
        }
      }

      return {
        ...n,
        x: finalX,
        y: finalY,
        handleIn,
        handleOut,
      };
    }),
  }));

  if (minStrokeUnits > 0 && strength > 0) {
    const stems = detectGlyphStems(newContours, ppem, upm);
    const preExpandCoords = new Map<BezierNode, { x: number; y: number }>();
    for (const c of newContours) {
      for (const node of c.nodes) {
        preExpandCoords.set(node, { x: node.x, y: node.y });
      }
    }

    for (const s of stems) {
      if (s.width > 0 && s.width < minStrokeUnits) {
        const expand = ((minStrokeUnits - s.width) / 2) * strength;
        const wallTol = Math.min(s.width * 0.4, Math.max(6, pixelSizeInUnits * 0.25));
        const lowWall = s.pos - s.width / 2;
        const highWall = s.pos + s.width / 2;

        for (const c of newContours) {
          for (const node of c.nodes) {
            const orig = preExpandCoords.get(node);
            if (!orig) continue;
            if (s.type === 'v') {
              let shiftX = 0;
              if (Math.abs(orig.x - lowWall) <= wallTol) {
                shiftX = -expand;
              } else if (Math.abs(orig.x - highWall) <= wallTol) {
                shiftX = expand;
              }
              if (shiftX !== 0) {
                node.x = roundCoord(node.x + shiftX);
                if (config.adjustHandles) {
                  if (node.handleIn) node.handleIn.x = roundCoord(node.handleIn.x + shiftX);
                  if (node.handleOut) node.handleOut.x = roundCoord(node.handleOut.x + shiftX);
                }
              }
            } else if (s.type === 'h') {
              let shiftY = 0;
              if (Math.abs(orig.y - lowWall) <= wallTol) {
                shiftY = -expand;
              } else if (Math.abs(orig.y - highWall) <= wallTol) {
                shiftY = expand;
              }
              if (shiftY !== 0) {
                node.y = roundCoord(node.y + shiftY);
                if (config.adjustHandles) {
                  if (node.handleIn) node.handleIn.y = roundCoord(node.handleIn.y + shiftY);
                  if (node.handleOut) node.handleOut.y = roundCoord(node.handleOut.y + shiftY);
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    ...glyph,
    contours: newContours,
    modified: true,
  };
}

/**
 * Render low-res raster pixel simulation onto HTML5 canvas
 */
export function renderRasterPreviewToCanvas(
  canvas: HTMLCanvasElement,
  contoursToRender: PathContour[],
  selectedPpem: number,
  upm: number,
  renderingMode: RenderingMode,
  isLight: boolean
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isLight ? '#f8faf9' : '#0a120c';
  ctx.fillRect(0, 0, width, height);

  if (!contoursToRender || contoursToRender.length === 0) {
    ctx.fillStyle = isLight ? '#a8a29e' : '#525252';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('輪郭パスが存在しません', width / 2, height / 2);
    return;
  }

  const isSubpixel = renderingMode === 'subpixel_lcd';
  const offWidth = isSubpixel ? selectedPpem * 3 : selectedPpem;
  const off = document.createElement('canvas');
  off.width = offWidth;
  off.height = selectedPpem;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, offWidth, selectedPpem);

  if (isSubpixel) {
    offCtx.save();
    offCtx.scale(3, 1);
  }

  offCtx.fillStyle = '#000000';
  offCtx.beginPath();

  const scale = selectedPpem / upm;

  for (const c of contoursToRender) {
    if (!c.nodes || c.nodes.length === 0) continue;
    const start = c.nodes[0];
    offCtx.moveTo(start.x * scale, start.y * scale);

    for (let i = 0; i < c.nodes.length; i++) {
      const curr = c.nodes[i];
      const nextIndex = (i + 1) % c.nodes.length;
      if (nextIndex === 0 && !c.closed) break;
      const next = c.nodes[nextIndex];

      if (curr.handleOut || next.handleIn) {
        const h1 = curr.handleOut || curr;
        const h2 = next.handleIn || next;
        offCtx.bezierCurveTo(
          h1.x * scale,
          h1.y * scale,
          h2.x * scale,
          h2.y * scale,
          next.x * scale,
          next.y * scale
        );
      } else {
        offCtx.lineTo(next.x * scale, next.y * scale);
      }
    }
    if (c.closed) {
      offCtx.closePath();
    }
  }

  offCtx.fill('evenodd');
  if (isSubpixel) {
    offCtx.restore();
  }

  const imgData = offCtx.getImageData(0, 0, offWidth, selectedPpem);
  const data = imgData.data;

  const cellSize = width / selectedPpem;
  ctx.imageSmoothingEnabled = false;

  const bgRgb = isLight ? [248, 250, 249] : [10, 18, 12];
  const inkRgb = isLight ? [20, 30, 25] : [52, 211, 153];

  for (let py = 0; py < selectedPpem; py++) {
    const y0 = Math.round(py * cellSize);
    const y1 = Math.round((py + 1) * cellSize);
    const cellH = Math.max(1, y1 - y0);

    for (let px = 0; px < selectedPpem; px++) {
      const x0 = Math.round(px * cellSize);
      const x1 = Math.round((px + 1) * cellSize);
      const cellW = Math.max(1, x1 - x0);

      if (isSubpixel) {
        const rIdx = (py * offWidth + px * 3) * 4;
        const gIdx = (py * offWidth + px * 3 + 1) * 4;
        const bIdx = (py * offWidth + px * 3 + 2) * 4;
        const inkR = (255 - (data[rIdx] + data[rIdx + 1] + data[rIdx + 2]) / 3) / 255;
        const inkG = (255 - (data[gIdx] + data[gIdx + 1] + data[gIdx + 2]) / 3) / 255;
        const inkB = (255 - (data[bIdx] + data[bIdx + 1] + data[bIdx + 2]) / 3) / 255;

        if (inkR <= 0 && inkG <= 0 && inkB <= 0) continue;

        const sx0 = x0;
        const sx1 = Math.round(x0 + cellW / 3);
        const sx2 = Math.round(x0 + (cellW * 2) / 3);
        const sx3 = x1;

        const outR = Math.round(bgRgb[0] + (inkRgb[0] - bgRgb[0]) * inkR);
        const outG = Math.round(bgRgb[1] + (inkRgb[1] - bgRgb[1]) * inkG);
        const outB = Math.round(bgRgb[2] + (inkRgb[2] - bgRgb[2]) * inkB);

        if (Math.abs(inkR - inkG) < 0.02 && Math.abs(inkG - inkB) < 0.02) {
          ctx.fillStyle = `rgb(${outR}, ${outG}, ${outB})`;
          ctx.fillRect(x0, y0, cellW, cellH);
        } else {
          const avg = (inkR + inkG + inkB) / 3;
          const blend = (ch: number, weight: number) =>
            Math.round(bgRgb[ch] + (inkRgb[ch] - bgRgb[ch]) * weight);
          ctx.fillStyle = `rgb(${outR}, ${blend(1, avg * 0.7 + inkR * 0.3)}, ${blend(2, avg * 0.7 + inkR * 0.3)})`;
          ctx.fillRect(sx0, y0, Math.max(1, sx1 - sx0), cellH);
          ctx.fillStyle = `rgb(${blend(0, avg * 0.7 + inkG * 0.3)}, ${outG}, ${blend(2, avg * 0.7 + inkG * 0.3)})`;
          ctx.fillRect(sx1, y0, Math.max(1, sx2 - sx1), cellH);
          ctx.fillStyle = `rgb(${blend(0, avg * 0.7 + inkB * 0.3)}, ${blend(1, avg * 0.7 + inkB * 0.3)}, ${outB})`;
          ctx.fillRect(sx2, y0, Math.max(1, sx3 - sx2), cellH);
        }
      } else {
        const idx = (py * offWidth + px) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const alpha = renderingMode === 'mono' ? (gray < 128 ? 1 : 0) : (255 - gray) / 255;
        if (alpha <= 0) continue;

        ctx.fillStyle = isLight
          ? `rgba(20, 30, 25, ${alpha})`
          : `rgba(52, 211, 153, ${alpha * 0.9})`;
        ctx.fillRect(x0, y0, cellW, cellH);
      }
    }
  }

  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= selectedPpem; i++) {
    const p = Math.round(i * cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(width, p);
    ctx.stroke();
  }
}
