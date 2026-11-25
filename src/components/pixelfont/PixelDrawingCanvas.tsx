import React, { useEffect, useRef, useState } from 'react';
import { FontProject, GlyphData, Point } from '../../types';
import { PixelDotShape, BrushStampShape } from './types';

interface PixelDrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  grid: Uint8Array;
  previewGrid: Uint8Array | null;
  gridWidth: number;
  gridHeight: number;
  isLight: boolean;
  dotShape: PixelDotShape;
  showGridLines: boolean;
  showSubdivisions: boolean;
  showMetricsGuides: boolean;
  showTrace: boolean;
  traceSource: 'font' | 'image';
  traceChar: string;
  currentGlyph: GlyphData;
  traceFontFamily: string;
  traceOpacity: number;
  traceScale: number;
  traceOffsetX: number;
  traceOffsetY: number;
  traceImageVersion?: number;
  traceImageRef: React.RefObject<HTMLImageElement | null>;
  hoverPos: Point | null;
  isDrawing: boolean;
  brushSize: number;
  brushStamp: BrushStampShape;
  project: FontProject;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
}

export const PixelDrawingCanvas: React.FC<PixelDrawingCanvasProps> = ({
  canvasRef,
  grid,
  previewGrid,
  gridWidth,
  gridHeight,
  isLight,
  dotShape,
  showGridLines,
  showSubdivisions,
  showMetricsGuides,
  showTrace,
  traceSource,
  traceChar,
  currentGlyph,
  traceFontFamily,
  traceOpacity,
  traceScale,
  traceOffsetX,
  traceOffsetY,
  traceImageVersion = 0,
  traceImageRef,
  hoverPos,
  isDrawing,
  brushSize,
  brushStamp,
  project,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  onPointerLeave,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateSize = () => {
      const style = window.getComputedStyle(el);
      const padX = parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0');
      const padY = parseFloat(style.paddingTop || '0') + parseFloat(style.paddingBottom || '0');
      const availW = Math.max(80, el.clientWidth - padX);
      const availH = Math.max(80, el.clientHeight - padY);

      const ratio = gridWidth / Math.max(1, gridHeight);
      let fitW = availW;
      let fitH = fitW / ratio;
      if (fitH > availH) {
        fitH = availH;
        fitW = fitH * ratio;
      }
      const nextW = Math.max(64, Math.floor(fitW));
      const nextH = Math.max(64, Math.floor(fitH));
      setBoxSize((prev) => (prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }));
    };

    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    let rafId: number | null = null;
    const scheduleUpdateSize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateSize();
      });
    };
    const ro = new ResizeObserver(scheduleUpdateSize);
    ro.observe(el);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [gridWidth, gridHeight]);

  const maxDim = Math.max(gridWidth, gridHeight);
  const cellPx = maxDim <= 16 ? 32 : maxDim <= 32 ? 16 : 8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderGrid = previewGrid || grid;
    const width = canvas.width;
    const height = canvas.height;

    const cellW = width / gridWidth;
    const cellH = height / gridHeight;

    ctx.clearRect(0, 0, width, height);

    // 1. Background Fill
    ctx.fillStyle = isLight ? '#f9f9f8' : '#080d0a';
    ctx.fillRect(0, 0, width, height);

    // 2. Trace / Underlay Layer
    if (showTrace) {
      ctx.save();
      ctx.globalAlpha = traceOpacity / 100;

      if (traceSource === 'image' && traceImageRef.current) {
        const img = traceImageRef.current;
        const scale = traceScale / 100;
        const drawW = width * scale;
        const drawH = height * scale;
        const dx = (width - drawW) / 2 + traceOffsetX * cellW;
        const dy = (height - drawH) / 2 + traceOffsetY * cellH;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      } else {
        const charToDraw = traceChar || currentGlyph.char || 'A';
        const scale = traceScale / 100;
        const fontSize = Math.round(height * 0.82 * scale);
        ctx.font = `bold ${fontSize}px ${traceFontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isLight ? '#065f46' : '#6ee7b7';
        ctx.fillText(charToDraw, width / 2 + traceOffsetX * cellW, height / 2 + traceOffsetY * cellH);
      }
      ctx.restore();
    }

    // 3. Active Pixels
    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const isFilled = renderGrid[gy * gridWidth + gx] === 1;

        if (isFilled) {
          const px = gx * cellW;
          const py = gy * cellH;

          ctx.fillStyle = isLight ? '#064e3b' : '#34d399';

          if (dotShape === 'square') {
            ctx.fillRect(px, py, cellW, cellH);
          } else if (dotShape === 'round') {
            ctx.beginPath();
            ctx.arc(px + cellW / 2, py + cellH / 2, Math.min(cellW, cellH) * 0.46, 0, Math.PI * 2);
            ctx.fill();
          } else if (dotShape === 'squircle') {
            const inset = Math.min(cellW, cellH) * 0.04;
            const cr = Math.min(cellW, cellH) * 0.25;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(
                px + inset,
                py + inset,
                Math.max(1, cellW - inset * 2),
                Math.max(1, cellH - inset * 2),
                cr
              );
            } else {
              ctx.fillRect(px + inset, py + inset, Math.max(1, cellW - inset * 2), Math.max(1, cellH - inset * 2));
            }
            ctx.fill();
          } else if (dotShape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(px + cellW / 2, py);
            ctx.lineTo(px + cellW, py + cellH / 2);
            ctx.lineTo(px + cellW / 2, py + cellH);
            ctx.lineTo(px, py + cellH / 2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // 4. Grid Lines
    if (showGridLines) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();

      for (let x = 0; x <= gridWidth; x++) {
        const gx = Math.round(x * cellW);
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, height);
      }
      for (let y = 0; y <= gridHeight; y++) {
        const gy = Math.round(y * cellH);
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(width, gy + 0.5);
      }
      ctx.stroke();
    }

    // 5. Subdivisions
    if (showSubdivisions) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.35)' : 'rgba(52, 211, 153, 0.35)';
      ctx.beginPath();

      if (gridWidth % 2 === 0) {
        const midX = Math.round((gridWidth / 2) * cellW);
        ctx.moveTo(midX + 0.5, 0);
        ctx.lineTo(midX + 0.5, height);
      }
      if (gridHeight % 2 === 0) {
        const midY = Math.round((gridHeight / 2) * cellH);
        ctx.moveTo(0, midY + 0.5);
        ctx.lineTo(width, midY + 0.5);
      }

      if (gridWidth >= 16) {
        const step = gridWidth >= 64 ? 16 : 8;
        for (let x = step; x < gridWidth; x += step) {
          const gx = Math.round(x * cellW);
          ctx.moveTo(gx + 0.5, 0);
          ctx.lineTo(gx + 0.5, height);
        }
      }
      if (gridHeight >= 16) {
        const stepY = gridHeight >= 64 ? 16 : 8;
        for (let y = stepY; y < gridHeight; y += stepY) {
          const gy = Math.round(y * cellH);
          ctx.moveTo(0, gy + 0.5);
          ctx.lineTo(width, gy + 0.5);
        }
      }

      ctx.stroke();
    }

    // 5.1 Baseline
    if (showMetricsGuides) {
      const asc = project.metadata.ascender ?? 800;
      const desc = project.metadata.descender ?? -200;
      const totalH = Math.max(10, asc - desc);
      const marginY = totalH * 0.08;
      const usableHeight = Math.max(10, totalH - 2 * marginY);
      const cellHMath = usableHeight / gridHeight;
      const topY = asc - marginY;
      const baselineGy = Math.round(topY / cellHMath);
      const baselineY = Math.min(height - 1, Math.max(0, baselineGy * cellH));

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isLight ? 'rgba(37, 99, 235, 0.75)' : 'rgba(96, 165, 250, 0.75)';
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(0, baselineY + 0.5);
      ctx.lineTo(width, baselineY + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.85)' : 'rgba(96, 165, 250, 0.85)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Baseline (基準線)', 4, Math.max(10, baselineY - 3));
    }

    // 6. Hover Brush Cursor Footprint
    if (hoverPos && !isDrawing) {
      ctx.strokeStyle = isLight ? '#059669' : '#10b981';
      ctx.lineWidth = 2;

      if (brushSize <= 1) {
        if (hoverPos.x >= 0 && hoverPos.x < gridWidth && hoverPos.y >= 0 && hoverPos.y < gridHeight) {
          ctx.strokeRect(hoverPos.x * cellW + 0.5, hoverPos.y * cellH + 0.5, cellW - 1, cellH - 1);
        }
      } else {
        const minD = -Math.floor(brushSize / 2);
        const maxD = minD + brushSize - 1;
        const center = (minD + maxD) / 2;
        const maxR = (brushSize - 0.5) / 2;
        const maxRSq = maxR * maxR;

        for (let dy = minD; dy <= maxD; dy++) {
          for (let dx = minD; dx <= maxD; dx++) {
            if (brushStamp === 'round' && brushSize > 2) {
              const ox = dx - center;
              const oy = dy - center;
              if (ox * ox + oy * oy > maxRSq) continue;
            }
            const cx = hoverPos.x + dx;
            const cy = hoverPos.y + dy;
            if (cx >= 0 && cx < gridWidth && cy >= 0 && cy < gridHeight) {
              ctx.strokeRect(cx * cellW + 0.5, cy * cellH + 0.5, cellW - 1, cellH - 1);
            }
          }
        }
      }
    }
  }, [
    grid,
    previewGrid,
    gridWidth,
    gridHeight,
    isLight,
    dotShape,
    showGridLines,
    showSubdivisions,
    showMetricsGuides,
    showTrace,
    traceSource,
    traceChar,
    currentGlyph,
    traceFontFamily,
    traceOpacity,
    traceScale,
    traceOffsetX,
    traceOffsetY,
    traceImageVersion,
    hoverPos,
    isDrawing,
    brushSize,
    brushStamp,
    project,
    traceImageRef,
    canvasRef,
  ]);

  return (
    <div
      ref={wrapperRef}
      className="flex-1 flex items-center justify-center w-full h-full min-h-0 min-w-0 p-2 sm:p-4 overflow-hidden"
    >
      <div
        className="relative rounded-none overflow-hidden border-2 touch-none flex items-center justify-center shrink-0"
        style={{
          borderColor: isLight ? '#047857' : '#34d399',
          width: boxSize.w > 0 ? `${boxSize.w}px` : undefined,
          height: boxSize.h > 0 ? `${boxSize.h}px` : undefined,
          aspectRatio: `${gridWidth} / ${gridHeight}`,
        }}
      >
        <canvas
          onContextMenu={(e) => e.preventDefault()}
          ref={canvasRef}
          width={gridWidth * cellPx}
          height={gridHeight * cellPx}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={onPointerLeave}
          className="w-full h-full block cursor-crosshair touch-none"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
};
