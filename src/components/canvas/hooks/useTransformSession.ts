import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  PathContour,
  Point,
  GridSettings,
  SnapGuideLine,
  CustomGuideline,
} from '../../../types';
import { getContoursBoundingBox } from '../../../utils/pathUtils';
import { snapContourMovement, snapSinglePoint } from '../../../utils/snapUtils';

export type TransformHandleType =
  | 'move'
  | 'rotate'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export interface TransformSessionData {
  handle: TransformHandleType;
  startPoint: Point;
  initialBBox: ReturnType<typeof getContoursBoundingBox>;
  initialContours: PathContour[];
  allInitialNodes?: Point[];
}

export interface UseTransformSessionOptions {
  contours: PathContour[];
  selectedContourIds: string[];
  screenToCanvas: (clientX: number, clientY: number) => Point;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  gridSettings: GridSettings;
  snapMetrics: any;
  customGuidelines: CustomGuideline[];
  zoom: number;
  setActiveSnapGuides: React.Dispatch<React.SetStateAction<SnapGuideLine[]>>;
}

export function useTransformSession({
  contours,
  selectedContourIds,
  screenToCanvas,
  onChangeContours,
  onCommitHistory,
  gridSettings,
  snapMetrics,
  customGuidelines,
  zoom,
  setActiveSnapGuides,
}: UseTransformSessionOptions) {
  const [transformSession, setTransformSession] = useState<TransformSessionData | null>(null);
  const [rotateDisplayAngle, setRotateDisplayAngle] = useState<number | null>(null);
  const pendingTransformContoursRef = useRef<PathContour[] | null>(null);
  const transformRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transformRafRef.current != null) {
        cancelAnimationFrame(transformRafRef.current);
      }
    };
  }, []);

  const handleTransformPointerDown = useCallback(
    (
      e: React.PointerEvent,
      handle: TransformHandleType,
      overrideTargetIds?: string[]
    ) => {
      e.stopPropagation();
      const targetIds = overrideTargetIds || selectedContourIds;
      if (targetIds.length === 0) return;
      const targetContours = contours.filter((c) => targetIds.includes(c.id));
      if (targetContours.length === 0) return;

      const bbox = getContoursBoundingBox(targetContours);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const allInitialNodes = targetContours.flatMap((c) => c.nodes.map((n) => ({ x: n.x, y: n.y })));
      setTransformSession({
        handle,
        startPoint: pos,
        initialBBox: bbox,
        initialContours: targetContours,
        allInitialNodes,
      });
    },
    [selectedContourIds, contours, screenToCanvas]
  );

  const handleTransformPointerMove = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>): boolean => {
      if (!transformSession || selectedContourIds.length === 0) {
        return false;
      }

      const { handle, startPoint, initialBBox, initialContours, allInitialNodes: precomputedNodes } =
        transformSession;
      const rawDx = pos.x - startPoint.x;
      const rawDy = pos.y - startPoint.y;

      if (handle === 'move') {
        let finalDx = rawDx;
        let finalDy = rawDy;

        if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
          const otherContours = contours.filter((c) => !selectedContourIds.includes(c.id));
          const snapThreshold = Math.max(7, Math.round(12 / zoom));
          const allInitialNodes = precomputedNodes || initialContours.flatMap((c) => c.nodes);
          const snapResult = snapContourMovement(
            initialBBox,
            rawDx,
            rawDy,
            otherContours,
            snapMetrics,
            customGuidelines,
            snapThreshold,
            allInitialNodes,
            gridSettings
          );
          finalDx = snapResult.dx;
          finalDy = snapResult.dy;
          setActiveSnapGuides(snapResult.activeGuides);
        } else {
          setActiveSnapGuides([]);
        }

        const updatedMap = new Map<string, PathContour>();
        for (const ic of initialContours) {
          updatedMap.set(ic.id, {
            ...ic,
            nodes: ic.nodes.map((n) => ({
              ...n,
              x: Math.round(n.x + finalDx),
              y: Math.round(n.y + finalDy),
              handleIn: n.handleIn
                ? { x: Math.round(n.handleIn.x + finalDx), y: Math.round(n.handleIn.y + finalDy) }
                : null,
              handleOut: n.handleOut
                ? { x: Math.round(n.handleOut.x + finalDx), y: Math.round(n.handleOut.y + finalDy) }
                : null,
            })),
          });
        }

        const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
        pendingTransformContoursRef.current = nextContours;
        if (transformRafRef.current == null) {
          transformRafRef.current = requestAnimationFrame(() => {
            transformRafRef.current = null;
            if (pendingTransformContoursRef.current) {
              onChangeContours(pendingTransformContoursRef.current);
            }
          });
        }
        return true;
      }

      if (handle === 'rotate') {
        setActiveSnapGuides([]);
        const { centerX, centerY } = initialBBox;
        const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
        const currAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
        let delta = currAngle - startAngle;

        if (e.shiftKey) {
          const step = (15 * Math.PI) / 180;
          delta = Math.round(delta / step) * step;
        }

        const deg = Math.round((delta * 180) / Math.PI);
        setRotateDisplayAngle(deg);

        const cos = Math.cos(delta);
        const sin = Math.sin(delta);

        const rotPoint = (p: Point) => {
          const rx = p.x - centerX;
          const ry = p.y - centerY;
          return {
            x: Math.round(centerX + rx * cos - ry * sin),
            y: Math.round(centerY + rx * sin + ry * cos),
          };
        };

        const updatedMap = new Map<string, PathContour>();
        for (const ic of initialContours) {
          updatedMap.set(ic.id, {
            ...ic,
            nodes: ic.nodes.map((n) => ({
              ...n,
              ...rotPoint({ x: n.x, y: n.y }),
              handleIn: n.handleIn ? rotPoint(n.handleIn) : null,
              handleOut: n.handleOut ? rotPoint(n.handleOut) : null,
            })),
          });
        }

        const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
        pendingTransformContoursRef.current = nextContours;
        if (transformRafRef.current == null) {
          transformRafRef.current = requestAnimationFrame(() => {
            transformRafRef.current = null;
            if (pendingTransformContoursRef.current) {
              onChangeContours(pendingTransformContoursRef.current);
            }
          });
        }
        return true;
      }

      // Handle Resizing (8 Handles: nw, n, ne, e, se, s, sw, w)
      const { minX, minY, maxX, maxY, width, height } = initialBBox;
      const safeW = Math.max(1, width);
      const safeH = Math.max(1, height);

      let snapX = pos.x;
      let snapY = pos.y;

      if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
        const otherContours = contours.filter((c) => !selectedContourIds.includes(c.id));
        const snapThreshold = Math.max(7, Math.round(12 / zoom));
        const snapResult = snapSinglePoint(
          pos,
          otherContours,
          snapMetrics,
          customGuidelines,
          snapThreshold,
          gridSettings
        );
        snapX = snapResult.point.x;
        snapY = snapResult.point.y;
        setActiveSnapGuides(snapResult.activeGuides);
      } else {
        setActiveSnapGuides([]);
      }

      let scaleX = 1;
      let scaleY = 1;
      let anchorX = minX;
      let anchorY = minY;

      const isPreserveAspect = e.shiftKey;

      switch (handle) {
        case 'se': {
          anchorX = minX;
          anchorY = minY;
          const newW = Math.max(8, snapX - minX);
          const newH = Math.max(8, snapY - minY);
          if (isPreserveAspect) {
            const s = Math.max(newW / safeW, newH / safeH);
            scaleX = s;
            scaleY = s;
          } else {
            scaleX = newW / safeW;
            scaleY = newH / safeH;
          }
          break;
        }
        case 'nw': {
          anchorX = maxX;
          anchorY = maxY;
          const newW = Math.max(8, maxX - snapX);
          const newH = Math.max(8, maxY - snapY);
          if (isPreserveAspect) {
            const s = Math.max(newW / safeW, newH / safeH);
            scaleX = s;
            scaleY = s;
          } else {
            scaleX = newW / safeW;
            scaleY = newH / safeH;
          }
          break;
        }
        case 'ne': {
          anchorX = minX;
          anchorY = maxY;
          const newW = Math.max(8, snapX - minX);
          const newH = Math.max(8, maxY - snapY);
          if (isPreserveAspect) {
            const s = Math.max(newW / safeW, newH / safeH);
            scaleX = s;
            scaleY = s;
          } else {
            scaleX = newW / safeW;
            scaleY = newH / safeH;
          }
          break;
        }
        case 'sw': {
          anchorX = maxX;
          anchorY = minY;
          const newW = Math.max(8, maxX - snapX);
          const newH = Math.max(8, snapY - minY);
          if (isPreserveAspect) {
            const s = Math.max(newW / safeW, newH / safeH);
            scaleX = s;
            scaleY = s;
          } else {
            scaleX = newW / safeW;
            scaleY = newH / safeH;
          }
          break;
        }
        case 'e': {
          anchorX = minX;
          anchorY = minY;
          const newW = Math.max(8, snapX - minX);
          scaleX = newW / safeW;
          scaleY = 1;
          break;
        }
        case 'w': {
          anchorX = maxX;
          anchorY = minY;
          const newW = Math.max(8, maxX - snapX);
          scaleX = newW / safeW;
          scaleY = 1;
          break;
        }
        case 's': {
          anchorX = minX;
          anchorY = minY;
          const newH = Math.max(8, snapY - minY);
          scaleX = 1;
          scaleY = newH / safeH;
          break;
        }
        case 'n': {
          anchorX = minX;
          anchorY = maxY;
          const newH = Math.max(8, maxY - snapY);
          scaleX = 1;
          scaleY = newH / safeH;
          break;
        }
      }

      const transformPoint = (p: Point): Point => {
        let nx = p.x;
        let ny = p.y;
        if (handle === 'nw' || handle === 'w' || handle === 'sw') {
          nx = anchorX - (anchorX - p.x) * scaleX;
        } else {
          nx = anchorX + (p.x - anchorX) * scaleX;
        }

        if (handle === 'nw' || handle === 'n' || handle === 'ne') {
          ny = anchorY - (anchorY - p.y) * scaleY;
        } else {
          ny = anchorY + (p.y - anchorY) * scaleY;
        }

        return { x: Math.round(nx), y: Math.round(ny) };
      };

      const updatedMap = new Map<string, PathContour>();
      for (const ic of initialContours) {
        updatedMap.set(ic.id, {
          ...ic,
          nodes: ic.nodes.map((n) => ({
            ...n,
            ...transformPoint({ x: n.x, y: n.y }),
            handleIn: n.handleIn ? transformPoint(n.handleIn) : null,
            handleOut: n.handleOut ? transformPoint(n.handleOut) : null,
          })),
        });
      }

      const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
      pendingTransformContoursRef.current = nextContours;
      if (transformRafRef.current == null) {
        transformRafRef.current = requestAnimationFrame(() => {
          transformRafRef.current = null;
          if (pendingTransformContoursRef.current) {
            onChangeContours(pendingTransformContoursRef.current);
          }
        });
      }
      return true;
    },
    [
      transformSession,
      selectedContourIds,
      gridSettings,
      contours,
      zoom,
      snapMetrics,
      customGuidelines,
      setActiveSnapGuides,
      onChangeContours,
    ]
  );

  const handleTransformPointerUp = useCallback((): boolean => {
    if (!transformSession) return false;
    if (transformRafRef.current != null) {
      cancelAnimationFrame(transformRafRef.current);
      transformRafRef.current = null;
    }
    if (pendingTransformContoursRef.current) {
      onChangeContours(pendingTransformContoursRef.current);
      pendingTransformContoursRef.current = null;
    }
    setTransformSession(null);
    setRotateDisplayAngle(null);
    onCommitHistory?.();
    return true;
  }, [transformSession, onChangeContours, onCommitHistory]);

  const cancelTransformSession = useCallback(() => {
    if (transformRafRef.current != null) {
      cancelAnimationFrame(transformRafRef.current);
      transformRafRef.current = null;
    }
    pendingTransformContoursRef.current = null;
    setTransformSession(null);
    setRotateDisplayAngle(null);
  }, []);

  return {
    transformSession,
    setTransformSession,
    rotateDisplayAngle,
    handleTransformPointerDown,
    handleTransformPointerMove,
    handleTransformPointerUp,
    cancelTransformSession,
    pendingTransformContoursRef,
  };
}
