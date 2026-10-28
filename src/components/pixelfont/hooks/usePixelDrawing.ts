import React, { useState, useRef } from 'react';
import { Point } from '../../../types';
import { PixelDrawTool, BrushStampShape } from '../types';
import {
  getBresenhamLine,
  getMidpointCircle,
  floodFill,
} from '../../../utils/pixelFontUtils';

interface UsePixelDrawingProps {
  gridWidth: number;
  gridHeight: number;
  grid: Uint8Array;
  setGrid: (grid: Uint8Array) => void;
  currentGridRef: React.MutableRefObject<Uint8Array>;
  pushHistory: (nextGrid: Uint8Array) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function usePixelDrawing({
  gridWidth,
  gridHeight,
  setGrid,
  currentGridRef,
  pushHistory,
  canvasRef,
}: UsePixelDrawingProps) {
  const [tool, setTool] = useState<PixelDrawTool>('pencil');
  const [brushSize, setBrushSize] = useState<number>(1);
  const [brushStamp, setBrushStamp] = useState<BrushStampShape>('square');
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showSubdivisions, setShowSubdivisions] = useState<boolean>(true);
  const [showMetricsGuides, setShowMetricsGuides] = useState<boolean>(true);
  const [symmetryH, setSymmetryH] = useState<boolean>(false);
  const [symmetryV, setSymmetryV] = useState<boolean>(false);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStartPos, setDrawStartPos] = useState<Point | null>(null);
  const lastDrawPosRef = useRef<Point | null>(null);
  const drawingStartGridRef = useRef<Uint8Array | null>(null);
  const isErasingStrokeRef = useRef<boolean>(false);
  const [previewGrid, setPreviewGrid] = useState<Uint8Array | null>(null);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);

  const getGridCoordFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    const cellW = canvas.width / gridWidth;
    const cellH = canvas.height / gridHeight;

    const gx = Math.floor(rawX / cellW);
    const gy = Math.floor(rawY / cellH);

    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return null;
    return { x: gx, y: gy };
  };

  const applyBrushAt = (targetGrid: Uint8Array, gx: number, gy: number, val: number) => {
    const radius = Math.floor(brushSize / 2);
    const applySingle = (x: number, y: number) => {
      if (brushSize === 1) {
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          targetGrid[y * gridWidth + x] = val;
        }
      } else {
        for (let dy = -radius; dy <= (brushSize % 2 === 0 ? radius - 1 : radius); dy++) {
          for (let dx = -radius; dx <= (brushSize % 2 === 0 ? radius - 1 : radius); dx++) {
            if (brushStamp === 'round' && brushSize > 2) {
              if (dx * dx + dy * dy > (radius + 0.2) * (radius + 0.2)) continue;
            }
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
              targetGrid[ny * gridWidth + nx] = val;
            }
          }
        }
      }
    };

    applySingle(gx, gy);

    if (symmetryH) {
      applySingle(gridWidth - 1 - gx, gy);
    }
    if (symmetryV) {
      applySingle(gx, gridHeight - 1 - gy);
    }
    if (symmetryH && symmetryV) {
      applySingle(gridWidth - 1 - gx, gridHeight - 1 - gy);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const pt = getGridCoordFromEvent(e);
    if (!pt) return;

    setIsDrawing(true);
    setDrawStartPos(pt);
    lastDrawPosRef.current = pt;
    drawingStartGridRef.current = new Uint8Array(currentGridRef.current);

    const isRightClick = e.button === 2;
    const currentVal = tool === 'eraser' || isRightClick ? 0 : 1;
    isErasingStrokeRef.current = tool === 'eraser' || isRightClick;

    if (tool === 'pencil' || tool === 'eraser') {
      const next = new Uint8Array(currentGridRef.current);
      applyBrushAt(next, pt.x, pt.y, currentVal);
      currentGridRef.current = next;
      setGrid(next);
    } else if (tool === 'bucket') {
      const next = new Uint8Array(currentGridRef.current);
      const targetVal = next[pt.y * gridWidth + pt.x];
      floodFill(next, gridWidth, gridHeight, pt.x, pt.y, targetVal, currentVal);
      currentGridRef.current = next;
      pushHistory(next);
      setIsDrawing(false);
    } else if (
      tool === 'line' ||
      tool === 'rect' ||
      tool === 'rect_filled' ||
      tool === 'circle' ||
      tool === 'circle_filled'
    ) {
      const pGrid = new Uint8Array(currentGridRef.current);
      applyBrushAt(pGrid, pt.x, pt.y, currentVal);
      setPreviewGrid(pGrid);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const pt = getGridCoordFromEvent(e);
    setHoverPos(pt);

    if (!isDrawing || !pt) return;

    const currentVal = isErasingStrokeRef.current ? 0 : 1;

    if (tool === 'pencil' || tool === 'eraser') {
      const lastPt = lastDrawPosRef.current || pt;
      lastDrawPosRef.current = pt;
      const linePts = getBresenhamLine(lastPt.x, lastPt.y, pt.x, pt.y);
      const next = new Uint8Array(currentGridRef.current);
      for (const p of linePts) {
        applyBrushAt(next, p.x, p.y, currentVal);
      }
      currentGridRef.current = next;
      setGrid(next);
    } else if (
      drawStartPos &&
      (tool === 'line' ||
        tool === 'rect' ||
        tool === 'rect_filled' ||
        tool === 'circle' ||
        tool === 'circle_filled')
    ) {
      const baseGrid = drawingStartGridRef.current || currentGridRef.current;
      const pGrid = new Uint8Array(baseGrid);

      if (tool === 'line') {
        const linePts = getBresenhamLine(drawStartPos.x, drawStartPos.y, pt.x, pt.y);
        for (const p of linePts) {
          applyBrushAt(pGrid, p.x, p.y, currentVal);
        }
      } else if (tool === 'rect' || tool === 'rect_filled') {
        const minX = Math.min(drawStartPos.x, pt.x);
        const maxX = Math.max(drawStartPos.x, pt.x);
        const minY = Math.min(drawStartPos.y, pt.y);
        const maxY = Math.max(drawStartPos.y, pt.y);

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (tool === 'rect_filled' || x === minX || x === maxX || y === minY || y === maxY) {
              applyBrushAt(pGrid, x, y, currentVal);
            }
          }
        }
      } else if (tool === 'circle' || tool === 'circle_filled') {
        const dx = pt.x - drawStartPos.x;
        const dy = pt.y - drawStartPos.y;
        const radius = Math.round(Math.hypot(dx, dy));
        const circlePts = getMidpointCircle(drawStartPos.x, drawStartPos.y, radius, tool === 'circle_filled');
        for (const p of circlePts) {
          applyBrushAt(pGrid, p.x, p.y, currentVal);
        }
      }

      setPreviewGrid(pGrid);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    try {
      if ((e.target as HTMLElement)?.hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // safe fallback
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    isErasingStrokeRef.current = false;
    lastDrawPosRef.current = null;

    if (previewGrid) {
      currentGridRef.current = previewGrid;
      setGrid(previewGrid);
      pushHistory(previewGrid);
      setPreviewGrid(null);
    } else {
      pushHistory(currentGridRef.current);
    }
    setDrawStartPos(null);
    drawingStartGridRef.current = null;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    try {
      if ((e.currentTarget as HTMLCanvasElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // The pointer may already have been released by the browser.
    }
    if (!isDrawing) return;

    const initialGrid = drawingStartGridRef.current;
    if (initialGrid) {
      const restored = new Uint8Array(initialGrid);
      currentGridRef.current = restored;
      setGrid(restored);
    }
    setIsDrawing(false);
    setDrawStartPos(null);
    setPreviewGrid(null);
    lastDrawPosRef.current = null;
    drawingStartGridRef.current = null;
  };

  return {
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushStamp,
    setBrushStamp,
    showGridLines,
    setShowGridLines,
    showSubdivisions,
    setShowSubdivisions,
    showMetricsGuides,
    setShowMetricsGuides,
    symmetryH,
    setSymmetryH,
    symmetryV,
    setSymmetryV,
    showOnionSkin,
    setShowOnionSkin,
    isDrawing,
    drawStartPos,
    previewGrid,
    hoverPos,
    setHoverPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
