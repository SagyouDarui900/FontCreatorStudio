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
  const isDrawingRef = useRef<boolean>(false);
  const [drawStartPos, setDrawStartPos] = useState<Point | null>(null);
  const drawStartPosRef = useRef<Point | null>(null);
  const lastDrawPosRef = useRef<Point | null>(null);
  const drawingStartGridRef = useRef<Uint8Array | null>(null);
  const isErasingStrokeRef = useRef<boolean>(false);
  // Only the first pointer draws. A second finger starting mid-stroke is
  // ignored instead of overwriting the drawing state.
  const activePointerIdRef = useRef<number | null>(null);
  const [previewGrid, setPreviewGrid] = useState<Uint8Array | null>(null);
  const previewGridRef = useRef<Uint8Array | null>(null);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);

  const getGridCoordFromEvent = (
    e: React.PointerEvent<HTMLCanvasElement>,
    clamp: boolean = false
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    const cellW = canvas.width / gridWidth;
    const cellH = canvas.height / gridHeight;

    const rawGx = Math.floor(rawX / cellW);
    const rawGy = Math.floor(rawY / cellH);

    if (clamp) {
      return {
        x: Math.max(0, Math.min(gridWidth - 1, rawGx)),
        y: Math.max(0, Math.min(gridHeight - 1, rawGy)),
      };
    }

    if (rawGx < 0 || rawGx >= gridWidth || rawGy < 0 || rawGy >= gridHeight) return null;
    return { x: rawGx, y: rawGy };
  };

  const applyBrushAt = (targetGrid: Uint8Array, gx: number, gy: number, val: number) => {
    const applySingle = (x: number, y: number) => {
      if (brushSize <= 1) {
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
          targetGrid[y * gridWidth + x] = val;
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

  // Set one cell (plus symmetry mirrors) without the brush radius, so
  // rectangle and circle tools draw exactly the dragged range.
  const applySingleCell = (targetGrid: Uint8Array, gx: number, gy: number, val: number) => {
    const applyOne = (x: number, y: number) => {
      if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        targetGrid[y * gridWidth + x] = val;
      }
    };
    applyOne(gx, gy);
    if (symmetryH) applyOne(gridWidth - 1 - gx, gy);
    if (symmetryV) applyOne(gx, gridHeight - 1 - gy);
    if (symmetryH && symmetryV) applyOne(gridWidth - 1 - gx, gridHeight - 1 - gy);
  };

  // Mirror the cells changed by a fill across the enabled symmetry axes,
  // so the bucket respects the same symmetry settings as the brush.
  const mirrorFilledCells = (targetGrid: Uint8Array, before: Uint8Array, fillVal: number) => {
    if (!symmetryH && !symmetryV) return;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const idx = y * gridWidth + x;
        if (targetGrid[idx] === fillVal && before[idx] !== fillVal) {
          if (symmetryH) targetGrid[y * gridWidth + (gridWidth - 1 - x)] = fillVal;
          if (symmetryV) targetGrid[(gridHeight - 1 - y) * gridWidth + x] = fillVal;
          if (symmetryH && symmetryV) {
            targetGrid[(gridHeight - 1 - y) * gridWidth + (gridWidth - 1 - x)] = fillVal;
          }
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (typeof e.button === 'number' && e.button !== 0 && e.button !== 2) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // A second finger starting while a stroke is in progress is ignored.
    if (isDrawingRef.current && activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
      return;
    }
    activePointerIdRef.current = e.pointerId;
    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture is unsupported or pointer is invalid
    }

    const pt = getGridCoordFromEvent(e, false);
    if (!pt) {
      activePointerIdRef.current = null;
      return;
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    drawStartPosRef.current = pt;
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
      const before = new Uint8Array(next);
      const targetVal = next[pt.y * gridWidth + pt.x];
      floodFill(next, gridWidth, gridHeight, pt.x, pt.y, targetVal, currentVal);
      mirrorFilledCells(next, before, currentVal);
      currentGridRef.current = next;
      pushHistory(next);
      isDrawingRef.current = false;
      setIsDrawing(false);
      drawStartPosRef.current = null;
      setDrawStartPos(null);
      activePointerIdRef.current = null;
    } else if (
      tool === 'line' ||
      tool === 'rect' ||
      tool === 'rect_filled' ||
      tool === 'circle' ||
      tool === 'circle_filled'
    ) {
      const pGrid = new Uint8Array(currentGridRef.current);
      if (tool === 'line') {
        applyBrushAt(pGrid, pt.x, pt.y, currentVal);
      } else {
        applySingleCell(pGrid, pt.x, pt.y, currentVal);
      }
      previewGridRef.current = pGrid;
      setPreviewGrid(pGrid);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const hoverPt = getGridCoordFromEvent(e, false);
    setHoverPos(hoverPt);

    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    const pt = hoverPt || getGridCoordFromEvent(e, true);
    if (!pt) return;

    const currentVal = isErasingStrokeRef.current ? 0 : 1;
    const startPos = drawStartPosRef.current;

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
      startPos &&
      (tool === 'line' ||
        tool === 'rect' ||
        tool === 'rect_filled' ||
        tool === 'circle' ||
        tool === 'circle_filled')
    ) {
      const baseGrid = drawingStartGridRef.current || currentGridRef.current;
      const pGrid = new Uint8Array(baseGrid);

      if (tool === 'line') {
        const linePts = getBresenhamLine(startPos.x, startPos.y, pt.x, pt.y);
        for (const p of linePts) {
          applyBrushAt(pGrid, p.x, p.y, currentVal);
        }
      } else if (tool === 'rect' || tool === 'rect_filled') {
        const minX = Math.min(startPos.x, pt.x);
        const maxX = Math.max(startPos.x, pt.x);
        const minY = Math.min(startPos.y, pt.y);
        const maxY = Math.max(startPos.y, pt.y);

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (tool === 'rect_filled' || x === minX || x === maxX || y === minY || y === maxY) {
              applySingleCell(pGrid, x, y, currentVal);
            }
          }
        }
      } else if (tool === 'circle' || tool === 'circle_filled') {
        const dx = pt.x - startPos.x;
        const dy = pt.y - startPos.y;
        const radius = Math.round(Math.hypot(dx, dy));
        const circlePts = getMidpointCircle(startPos.x, startPos.y, radius, tool === 'circle_filled');
        for (const p of circlePts) {
          applySingleCell(pGrid, p.x, p.y, currentVal);
        }
      }

      previewGridRef.current = pGrid;
      setPreviewGrid(pGrid);
    }
  };

  // Finalize the in-progress stroke: apply the preview grid (shape tools)
  // or the live grid (pencil/eraser) to the history and the project.
  // Used by pointer-up and by Esc, so a stroke is never lost on close.
  const commitCurrentStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    isErasingStrokeRef.current = false;
    lastDrawPosRef.current = null;
    activePointerIdRef.current = null;

    const currentPreview = previewGridRef.current;
    if (currentPreview) {
      currentGridRef.current = currentPreview;
      setGrid(currentPreview);
      pushHistory(currentPreview);
      previewGridRef.current = null;
      setPreviewGrid(null);
    } else {
      pushHistory(currentGridRef.current);
    }
    drawStartPosRef.current = null;
    setDrawStartPos(null);
    drawingStartGridRef.current = null;
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
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    commitCurrentStroke();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    try {
      if ((e.currentTarget as HTMLCanvasElement)?.hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // The pointer may already have been released by the browser.
    }
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const initialGrid = drawingStartGridRef.current;
    if (initialGrid) {
      const restored = new Uint8Array(initialGrid);
      currentGridRef.current = restored;
      setGrid(restored);
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    isErasingStrokeRef.current = false;
    drawStartPosRef.current = null;
    setDrawStartPos(null);
    previewGridRef.current = null;
    setPreviewGrid(null);
    lastDrawPosRef.current = null;
    drawingStartGridRef.current = null;
    activePointerIdRef.current = null;
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
    commitCurrentStroke,
  };
}
