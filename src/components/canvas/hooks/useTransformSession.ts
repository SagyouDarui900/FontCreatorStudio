import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  PathContour,
  Point,
  GridSettings,
  SnapGuideLine,
  CustomGuideline,
  SnapMetrics,
} from '../../../types';
import { getContoursBoundingBox } from '../../../utils/path';
import { snapContourMovement, snapSinglePoint } from '../../../utils/snap';

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
  targetIds: string[];
  allInitialNodes?: Point[];
}

export interface UseTransformSessionOptions {
  contours: PathContour[];
  contoursRef?: React.MutableRefObject<PathContour[]>;
  selectedContourIds: string[];
  screenToCanvas: (clientX: number, clientY: number) => Point;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  /** Remove the history entry a cancelled drag committed, if it matches the restored contours. */
  onDiscardLastHistory?: (initialContours: PathContour[]) => void;
  gridSettings: GridSettings;
  snapMetrics: SnapMetrics;
  customGuidelines: CustomGuideline[];
  zoom: number;
  setActiveSnapGuides: React.Dispatch<React.SetStateAction<SnapGuideLine[]>>;
  isGlyphLocked?: boolean;
  showCanvasToast?: (title: string, desc?: string) => void;
}

export function useTransformSession({
  contours,
  contoursRef,
  selectedContourIds,
  screenToCanvas,
  onChangeContours,
  onCommitHistory,
  onDiscardLastHistory,
  gridSettings,
  snapMetrics,
  customGuidelines,
  zoom,
  setActiveSnapGuides,
  isGlyphLocked = false,
  showCanvasToast,
}: UseTransformSessionOptions) {
  const [transformSession, setTransformSession] = useState<TransformSessionData | null>(null);
  const transformSessionRef = useRef<TransformSessionData | null>(null);
  const [rotateDisplayAngle, setRotateDisplayAngle] = useState<number | null>(null);
  const pendingTransformContoursRef = useRef<PathContour[] | null>(null);
  const transformRafRef = useRef<number | null>(null);
  const hasCommittedTransformHistoryRef = useRef<boolean>(false);

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
      if (isGlyphLocked) {
        showCanvasToast?.('この文字は編集ロックされています', '解除してから変形してください');
        return;
      }
      const targetIds = overrideTargetIds || selectedContourIds;
      if (targetIds.length === 0) return;
      const currentContours = contoursRef?.current || contours;
      const targetContours = currentContours.filter((c) => targetIds.includes(c.id));
      if (targetContours.length === 0) return;

      try {
        const el = e.currentTarget as Element;
        (el.closest?.('svg') || el).setPointerCapture?.(e.pointerId);
      } catch {
        // Ignored
      }
      hasCommittedTransformHistoryRef.current = false;

      const bbox = getContoursBoundingBox(targetContours);
      const pos = screenToCanvas(e.clientX, e.clientY);
      const allInitialNodes = targetContours.flatMap((c) => c.nodes.map((n) => ({ x: n.x, y: n.y })));
      const nextSession: TransformSessionData = {
        handle,
        startPoint: pos,
        initialBBox: bbox,
        initialContours: targetContours,
        targetIds: [...targetIds],
        allInitialNodes,
      };
      transformSessionRef.current = nextSession;
      setTransformSession(nextSession);
    },
    [isGlyphLocked, showCanvasToast, selectedContourIds, contours, contoursRef, screenToCanvas]
  );

  const handleTransformPointerMove = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>): boolean => {
      const activeSession = transformSessionRef.current || transformSession;
      const activeTargetIds =
        activeSession?.targetIds && activeSession.targetIds.length > 0
          ? activeSession.targetIds
          : selectedContourIds;
      if (!activeSession || activeTargetIds.length === 0) {
        return false;
      }

      const currentContours = contoursRef?.current || contours;
      const { handle, startPoint, initialBBox, initialContours, allInitialNodes: precomputedNodes } =
        activeSession;
      const rawDx = pos.x - startPoint.x;
      const rawDy = pos.y - startPoint.y;

      if (handle === 'move') {
        let finalDx = rawDx;
        let finalDy = rawDy;

        if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
          const otherContours = currentContours.filter((c) => !activeTargetIds.includes(c.id));
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

        const nextContours = currentContours.map((c) => updatedMap.get(c.id) || c);
        if (contoursRef) {
          contoursRef.current = nextContours;
        }
        pendingTransformContoursRef.current = nextContours;
        if (transformRafRef.current == null) {
          transformRafRef.current = requestAnimationFrame(() => {
            transformRafRef.current = null;
            if (pendingTransformContoursRef.current) {
              if (!hasCommittedTransformHistoryRef.current) {
                onCommitHistory?.();
                hasCommittedTransformHistoryRef.current = true;
              }
              onChangeContours(pendingTransformContoursRef.current, { skipHistory: true });
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

        const nextContours = currentContours.map((c) => updatedMap.get(c.id) || c);
        if (contoursRef) {
          contoursRef.current = nextContours;
        }
        pendingTransformContoursRef.current = nextContours;
        if (transformRafRef.current == null) {
          transformRafRef.current = requestAnimationFrame(() => {
            transformRafRef.current = null;
            if (pendingTransformContoursRef.current) {
              if (!hasCommittedTransformHistoryRef.current) {
                onCommitHistory?.();
                hasCommittedTransformHistoryRef.current = true;
              }
              onChangeContours(pendingTransformContoursRef.current, { skipHistory: true });
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
        const otherContours = currentContours.filter((c) => !activeTargetIds.includes(c.id));
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

      const nextContours = currentContours.map((c) => updatedMap.get(c.id) || c);
      if (contoursRef) {
        contoursRef.current = nextContours;
      }
      pendingTransformContoursRef.current = nextContours;
      if (transformRafRef.current == null) {
        transformRafRef.current = requestAnimationFrame(() => {
          transformRafRef.current = null;
          if (pendingTransformContoursRef.current) {
            if (!hasCommittedTransformHistoryRef.current) {
              onCommitHistory?.();
              hasCommittedTransformHistoryRef.current = true;
            }
            onChangeContours(pendingTransformContoursRef.current, { skipHistory: true });
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
      contoursRef,
      zoom,
      snapMetrics,
      customGuidelines,
      setActiveSnapGuides,
      onChangeContours,
      onCommitHistory,
    ]
  );

  const handleTransformPointerUp = useCallback((): boolean => {
    if (!transformSessionRef.current && !transformSession) return false;
    if (transformRafRef.current != null) {
      cancelAnimationFrame(transformRafRef.current);
      transformRafRef.current = null;
    }
    if (pendingTransformContoursRef.current) {
      if (!hasCommittedTransformHistoryRef.current) {
        onCommitHistory?.();
        hasCommittedTransformHistoryRef.current = true;
      }
      if (contoursRef) {
        contoursRef.current = pendingTransformContoursRef.current;
      }
      onChangeContours(pendingTransformContoursRef.current, { skipHistory: true });
      pendingTransformContoursRef.current = null;
    }
    hasCommittedTransformHistoryRef.current = false;
    transformSessionRef.current = null;
    setTransformSession(null);
    setRotateDisplayAngle(null);
    setActiveSnapGuides([]);
    return true;
  }, [transformSession, contoursRef, onChangeContours, onCommitHistory, setActiveSnapGuides]);

  const cancelTransformSession = useCallback(() => {
    if (transformRafRef.current != null) {
      cancelAnimationFrame(transformRafRef.current);
      transformRafRef.current = null;
    }
    pendingTransformContoursRef.current = null;
    // Capture whether the drag already committed history before resetting
    // the flag: only then is there a phantom entry to remove.
    const hadCommittedHistory = hasCommittedTransformHistoryRef.current;
    hasCommittedTransformHistoryRef.current = false;
    const activeSession = transformSessionRef.current || transformSession;
    transformSessionRef.current = null;
    if (activeSession) {
      const initialMap = new Map(activeSession.initialContours.map((c) => [c.id, c]));
      const currentContours = contoursRef?.current || contours;
      const restoredContours = currentContours.map((c) => initialMap.get(c.id) || c);
      if (contoursRef) {
        contoursRef.current = restoredContours;
      }
      onChangeContours(restoredContours, { skipHistory: true });
      if (hadCommittedHistory) {
        // The drag's RAF callback committed the pre-drag glyph and the
        // contours are now restored to exactly that state, so the top
        // undo entry is a phantom: drop it so the next Ctrl+Z undoes
        // the previous real edit instead of doing nothing.
        onDiscardLastHistory?.(activeSession.initialContours);
      }
    }
    setTransformSession(null);
    setRotateDisplayAngle(null);
  }, [transformSession, contours, contoursRef, onChangeContours, onDiscardLastHistory]);

  return {
    transformSession,
    setTransformSession,
    rotateDisplayAngle,
    handleTransformPointerDown,
    handleTransformPointerMove,
    handleTransformPointerUp,
    cancelTransformSession,
    reset: cancelTransformSession,
    pendingTransformContoursRef,
  };
}
