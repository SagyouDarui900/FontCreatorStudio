import { GlyphData, PathContour, BezierNode } from '../../types';
import { GridFittingConfig, RenderingMode, StemInfo } from './types';

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
  config: GridFittingConfig
): GlyphData {
  if (!glyph.contours || glyph.contours.length === 0 || ppem <= 0) return glyph;

  const pixelSizeInUnits = upm / ppem;
  const minStrokeUnits = config.minStemWidthPx * pixelSizeInUnits;

  const newContours: PathContour[] = glyph.contours.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => {
      let targetX = n.x;
      let targetY = n.y;

      if (config.snapVertical) {
        const roundedX = Math.round(n.x / pixelSizeInUnits) * pixelSizeInUnits;
        targetX = n.x + (roundedX - n.x) * config.snapStrength;
      }

      if (config.snapHorizontal) {
        const roundedY = Math.round(n.y / pixelSizeInUnits) * pixelSizeInUnits;
        targetY = n.y + (roundedY - n.y) * config.snapStrength;
      }

      if (config.snapMetrics) {
        const baselineY = Math.round(upm * 0.8);
        const capHeightY = Math.round(upm * 0.3);
        const ascenderY = Math.round(upm * 0.2);
        const descenderY = upm;
        const threshold = pixelSizeInUnits * 0.5;

        if (Math.abs(n.y - baselineY) < threshold) {
          targetY = n.y + (baselineY - n.y) * config.snapStrength;
        } else if (Math.abs(n.y - capHeightY) < threshold) {
          targetY = n.y + (capHeightY - n.y) * config.snapStrength;
        } else if (Math.abs(n.y - ascenderY) < threshold) {
          targetY = n.y + (ascenderY - n.y) * config.snapStrength;
        } else if (Math.abs(n.y - 0) < threshold) {
          targetY = n.y + (0 - n.y) * config.snapStrength;
        } else if (Math.abs(n.y - descenderY) < threshold) {
          targetY = n.y + (descenderY - n.y) * config.snapStrength;
        }
      }

      const dx = targetX - n.x;
      const dy = targetY - n.y;

      const handleIn = n.handleIn ? { ...n.handleIn } : null;
      const handleOut = n.handleOut ? { ...n.handleOut } : null;

      if (config.adjustHandles) {
        if (handleIn) {
          handleIn.x += dx * config.snapStrength;
          handleIn.y += dy * config.snapStrength;
        }
        if (handleOut) {
          handleOut.x += dx * config.snapStrength;
          handleOut.y += dy * config.snapStrength;
        }
      }

      return {
        ...n,
        x: Math.round(targetX * 10) / 10,
        y: Math.round(targetY * 10) / 10,
        handleIn,
        handleOut,
      };
    }),
  }));

  if (minStrokeUnits > 0) {
    const stems = detectGlyphStems(newContours, ppem, upm);
    for (const s of stems) {
      if (s.width < minStrokeUnits) {
        const expand = (minStrokeUnits - s.width) / 2;
        for (const c of newContours) {
          for (const node of c.nodes) {
            if (s.type === 'v' && Math.abs(node.x - s.pos) < s.width + 10) {
              node.x += node.x >= s.pos ? expand : -expand;
            } else if (s.type === 'h' && Math.abs(node.y - s.pos) < s.width + 10) {
              node.y += node.y >= s.pos ? expand : -expand;
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

  const off = document.createElement('canvas');
  off.width = selectedPpem;
  off.height = selectedPpem;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, selectedPpem, selectedPpem);

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

  const imgData = offCtx.getImageData(0, 0, selectedPpem, selectedPpem);
  const data = imgData.data;

  if (renderingMode === 'mono') {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const v = avg < 128 ? 0 : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    offCtx.putImageData(imgData, 0, 0);
  }

  const cellSize = width / selectedPpem;
  ctx.imageSmoothingEnabled = false;

  for (let py = 0; py < selectedPpem; py++) {
    for (let px = 0; px < selectedPpem; px++) {
      const idx = (py * selectedPpem + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const alpha = (255 - (r + g + b) / 3) / 255;

      if (renderingMode === 'subpixel_lcd') {
        const subW = cellSize / 3;
        ctx.fillStyle = `rgb(${255 - r}, 0, 0)`;
        ctx.fillRect(px * cellSize, py * cellSize, subW, cellSize);
        ctx.fillStyle = `rgb(0, ${255 - g}, 0)`;
        ctx.fillRect(px * cellSize + subW, py * cellSize, subW, cellSize);
        ctx.fillStyle = `rgb(0, 0, ${255 - b})`;
        ctx.fillRect(px * cellSize + subW * 2, py * cellSize, subW, cellSize);
      } else {
        const fillColor = isLight
          ? `rgba(20, 30, 25, ${alpha})`
          : `rgba(52, 211, 153, ${alpha * 0.9})`;
        ctx.fillStyle = fillColor;
        ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
      }
    }
  }

  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= selectedPpem; i++) {
    const p = Math.floor(i * cellSize) + 0.5;
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
