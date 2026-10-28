import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Point, PathContour, ToolMode, GridSettings, SnapGuideLine, CustomGuideline, SnapMetrics } from '../../../types';
import {
  createRectContour,
  createRoundedRectContour,
  createPillContour,
  createEllipseContour,
  createTriangleContour,
  createRightTriangleContour,
  createSemicircleContour,
  createRingContours,
  createParallelogramContour,
  createStarContour,
  createHeartContour,
  createSparkleContour,
  createStarburstContour,
  createDiamondContour,
  createHexagonContour,
  createCrescentContour,
  createLineContour,
  snapToStraightAngle,
} from '../../../utils/pathUtils';
import { snapSinglePoint } from '../../../utils/snapUtils';

interface UseShapeCreationOptions {
  toolMode: ToolMode;
  brushWidth: number;
  zoom: number;
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  snapMetrics: SnapMetrics;
  customGuidelines: CustomGuideline[];
  gridSettings: GridSettings;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedContourId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const isShapeToolMode = (mode: ToolMode): boolean => [
  'rect',
  'rounded_rect',
  'pill',
  'ellipse',
  'circle',
  'triangle',
  'triangle_down',
  'right_triangle',
  'semicircle',
  'ring',
  'parallelogram',
  'crescent',
  'star',
  'heart',
  'sparkle',
  'starburst',
  'diamond',
  'polygon',
  'line',
  'hexagon',
].includes(mode);

export function useShapeCreation({
  toolMode,
  brushWidth,
  zoom,
  contours,
  contoursRef,
  snapMetrics,
  customGuidelines,
  gridSettings,
  onChangeContours,
  onCommitHistory,
  setActiveSnapGuides,
  setSelectedContourIds,
  setSelectedContourId,
}: UseShapeCreationOptions) {
  const isShapeTool = isShapeToolMode(toolMode);

  const [shapeStartPoint, setShapeStartPoint] = useState<Point | null>(null);
  const [shapeCurrentPoint, setShapeCurrentPoint] = useState<Point | null>(null);
  const shapeRafRef = useRef<number | null>(null);
  const [isShiftLockRatio, setIsShiftLockRatio] = useState<boolean>(false);
  const [isAltFromCenter, setIsAltFromCenter] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (shapeRafRef.current != null) {
        cancelAnimationFrame(shapeRafRef.current);
      }
    };
  }, []);

  const getShapeContoursFromPoints = useCallback(
    (
      mode: ToolMode,
      p1: Point,
      p2: Point,
      options?: { shiftKey?: boolean; altKey?: boolean }
    ): PathContour[] => {
      let startX = p1.x;
      let startY = p1.y;
      let endX = p2.x;
      let endY = p2.y;

      const forceSquare =
        options?.shiftKey ||
        mode === 'square' ||
        mode === 'circle' ||
        isShiftLockRatio;

      if (options?.altKey || isAltFromCenter) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const maxD = forceSquare ? Math.max(dx, dy) : 0;
        const rx = forceSquare ? maxD : dx;
        const ry = forceSquare ? maxD : dy;
        startX = p1.x - rx;
        startY = p1.y - ry;
        endX = p1.x + rx;
        endY = p1.y + ry;
      } else if (forceSquare) {
        const dx = endX - startX;
        const dy = endY - startY;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        endX = startX + (dx >= 0 ? side : -side);
        endY = startY + (dy >= 0 ? side : -side);
      }

      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const width = Math.max(16, maxX - minX);
      const height = Math.max(16, maxY - minY);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = width / 2;
      const ry = height / 2;

      switch (mode) {
        case 'rect':
        case 'square':
          return [createRectContour(minX, minY, maxX, maxY)];
        case 'rounded_rect':
          return [createRoundedRectContour(cx, cy, width, height, Math.min(width, height) * 0.2)];
        case 'pill':
          return [createPillContour(cx, cy, width, height)];
        case 'ellipse':
        case 'circle':
          return [createEllipseContour(cx, cy, rx, ry)];
        case 'triangle':
          return [createTriangleContour(cx, cy, width, height, 'up')];
        case 'triangle_down':
          return [createTriangleContour(cx, cy, width, height, 'down')];
        case 'right_triangle':
          return [createRightTriangleContour(cx, cy, width, height)];
        case 'semicircle':
          return [createSemicircleContour(cx, cy, rx, ry, 'top')];
        case 'ring':
          return createRingContours(cx, cy, rx, ry * 0.55);
        case 'parallelogram':
          return [createParallelogramContour(cx, cy, width, height, 18)];
        case 'star':
          return [createStarContour(cx, cy, Math.max(rx, ry), Math.max(rx, ry) * 0.42, 5)];
        case 'heart':
          return [createHeartContour(cx, cy, width, height)];
        case 'sparkle':
          return [createSparkleContour(cx, cy, Math.max(rx, ry), 0.22)];
        case 'starburst':
          return [createStarburstContour(cx, cy, Math.max(rx, ry), 0.45, 8)];
        case 'diamond':
          return [createDiamondContour(cx, cy, width, height)];
        case 'polygon':
          return [createHexagonContour(cx, cy, Math.max(rx, ry))];
        case 'crescent':
          return [createCrescentContour(cx, cy, Math.max(rx, ry))];
        case 'line': {
          let lEndX = p2.x;
          let lEndY = p2.y;
          if (options?.shiftKey || isShiftLockRatio) {
            const snapped = snapToStraightAngle(p1.x, p1.y, p2.x, p2.y);
            lEndX = snapped.x;
            lEndY = snapped.y;
          }
          return [createLineContour(p1.x, p1.y, lEndX, lEndY, brushWidth || 32)];
        }
        default:
          return [createRectContour(minX, minY, maxX, maxY)];
      }
    },
    [brushWidth, isAltFromCenter, isShiftLockRatio]
  );

  const handleShapePointerDown = useCallback((pos: Point, e: React.PointerEvent) => {
    if (!isShapeTool) return false;
    setShapeStartPoint(pos);
    setShapeCurrentPoint(pos);
    setIsShiftLockRatio(e.shiftKey);
    setIsAltFromCenter(e.altKey);
    return true;
  }, [isShapeTool]);

  const handleShapePointerMove = useCallback(
    (pos: Point, e: React.PointerEvent) => {
      if (!isShapeTool || !shapeStartPoint) return false;

      setIsShiftLockRatio(e.shiftKey);
      setIsAltFromCenter(e.altKey);
      let snapPos = pos;
      if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
        const snapResult = snapSinglePoint(
          pos,
          contours,
          snapMetrics,
          customGuidelines,
          Math.max(7, Math.round(12 / zoom)),
          gridSettings
        );
        snapPos = snapResult.point;
        setActiveSnapGuides(snapResult.activeGuides);
      } else {
        setActiveSnapGuides([]);
      }
      if (shapeRafRef.current == null) {
        shapeRafRef.current = requestAnimationFrame(() => {
          shapeRafRef.current = null;
          setShapeCurrentPoint(snapPos);
        });
      }
      return true;
    },
    [contours, customGuidelines, gridSettings, isShapeTool, setActiveSnapGuides, shapeStartPoint, snapMetrics, zoom]
  );

  const handleShapePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isShapeTool || !shapeStartPoint || !shapeCurrentPoint) return false;

      if (shapeRafRef.current != null) {
        cancelAnimationFrame(shapeRafRef.current);
        shapeRafRef.current = null;
      }
      const dist = Math.hypot(
        shapeCurrentPoint.x - shapeStartPoint.x,
        shapeCurrentPoint.y - shapeStartPoint.y
      );
      const p1 =
        dist < 10
          ? { x: shapeStartPoint.x - 90, y: shapeStartPoint.y - 90 }
          : shapeStartPoint;
      const p2 =
        dist < 10
          ? { x: shapeStartPoint.x + 90, y: shapeStartPoint.y + 90 }
          : shapeCurrentPoint;

      const newContours = getShapeContoursFromPoints(toolMode, p1, p2, {
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
      const currentContours = contoursRef.current || [];
      const nextContours = [...currentContours, ...newContours];
      contoursRef.current = nextContours;
      onChangeContours(nextContours);
      setSelectedContourIds([]);
      setSelectedContourId(null);
      setShapeStartPoint(null);
      setShapeCurrentPoint(null);
      setIsShiftLockRatio(false);
      setIsAltFromCenter(false);
      onCommitHistory?.();
      return true;
    },
    [
      contoursRef,
      getShapeContoursFromPoints,
      isShapeTool,
      onChangeContours,
      onCommitHistory,
      setSelectedContourId,
      setSelectedContourIds,
      shapeCurrentPoint,
      shapeStartPoint,
      toolMode,
    ]
  );

  // Active shape preview contours for live SVG rendering
  const activeShapeContours = React.useMemo(() => {
    if (!isShapeTool || !shapeStartPoint || !shapeCurrentPoint) return [];
    return getShapeContoursFromPoints(toolMode, shapeStartPoint, shapeCurrentPoint);
  }, [getShapeContoursFromPoints, isShapeTool, shapeCurrentPoint, shapeStartPoint, toolMode]);

  const reset = useCallback(() => {
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setIsShiftLockRatio(false);
    setIsAltFromCenter(false);
    if (shapeRafRef.current != null) {
      cancelAnimationFrame(shapeRafRef.current);
      shapeRafRef.current = null;
    }
  }, []);

  return {
    isShapeTool,
    shapeStartPoint,
    shapeCurrentPoint,
    setShapeStartPoint,
    setShapeCurrentPoint,
    handleShapePointerDown,
    handleShapePointerMove,
    handleShapePointerUp,
    activeShapeContours,
    getShapeContoursFromPoints,
    isShiftLockRatio,
    setIsShiftLockRatio,
    isAltFromCenter,
    setIsAltFromCenter,
    reset,
  };
}
