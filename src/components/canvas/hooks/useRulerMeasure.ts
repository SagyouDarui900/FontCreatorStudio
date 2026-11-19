import React, { useState, useCallback, useRef } from 'react';
import { Point, PathContour, GridSettings, SnapGuideLine, CustomGuideline, SnapMetrics, RulerMeasurement } from '../../../types';
import { snapSinglePoint } from '../../../utils/snap';
import { generateId } from '../../../utils/path';

interface UseRulerMeasureOptions {
  contours: PathContour[];
  snapMetrics: SnapMetrics;
  customGuidelines: CustomGuideline[];
  setCustomGuidelines: React.Dispatch<React.SetStateAction<CustomGuideline[]>>;
  gridSettings: GridSettings;
  zoom: number;
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;
  showCanvasToast: (message: string, subText?: string) => void;
}

export function useRulerMeasure({
  contours,
  snapMetrics,
  customGuidelines,
  setCustomGuidelines,
  gridSettings,
  zoom,
  setActiveSnapGuides,
  showCanvasToast,
}: UseRulerMeasureOptions) {
  const [rulerMeasurement, setRulerMeasurement] = useState<RulerMeasurement | null>(null);
  const rulerMeasurementRef = useRef<RulerMeasurement | null>(null);
  rulerMeasurementRef.current = rulerMeasurement;

  const [brushStraightMode, setBrushStraightMode] = useState<boolean>(false);

  const handleRulerPointerDown = useCallback(
    (pos: Point, e: React.PointerEvent) => {
      let startPos = pos;
      if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
        const snapRes = snapSinglePoint(
          pos,
          contours,
          snapMetrics,
          customGuidelines,
          Math.max(7, Math.round(12 / zoom)),
          gridSettings
        );
        startPos = snapRes.point;
        setActiveSnapGuides(snapRes.activeGuides);
      }
      const nextMeasurement: RulerMeasurement = {
        start: startPos,
        end: startPos,
        active: true,
      };
      rulerMeasurementRef.current = nextMeasurement;
      setRulerMeasurement(nextMeasurement);
      return true;
    },
    [contours, customGuidelines, gridSettings, setActiveSnapGuides, snapMetrics, zoom]
  );

  const handleRulerPointerMove = useCallback(
    (pos: Point, e: React.PointerEvent) => {
      const current = rulerMeasurementRef.current;
      if (!current || !current.active) return false;

      let endX = pos.x;
      let endY = pos.y;

      if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
        const snapRes = snapSinglePoint(
          pos,
          contours,
          snapMetrics,
          customGuidelines,
          Math.max(7, Math.round(12 / zoom)),
          gridSettings
        );
        endX = snapRes.point.x;
        endY = snapRes.point.y;
        setActiveSnapGuides(snapRes.activeGuides);
      }

      if (e.shiftKey) {
        const dx = endX - current.start.x;
        const dy = endY - current.start.y;
        const angle = Math.atan2(dy, dx);
        const snapStep = (15 * Math.PI) / 180;
        const snapAngle = Math.round(angle / snapStep) * snapStep;
        const dist = Math.hypot(dx, dy);
        endX = Math.round(current.start.x + Math.cos(snapAngle) * dist);
        endY = Math.round(current.start.y + Math.sin(snapAngle) * dist);
      }

      const nextMeasurement: RulerMeasurement = {
        ...current,
        end: { x: endX, y: endY },
      };
      rulerMeasurementRef.current = nextMeasurement;
      setRulerMeasurement(nextMeasurement);
      return true;
    },
    [contours, customGuidelines, gridSettings, setActiveSnapGuides, snapMetrics, zoom]
  );

  const handleRulerPointerUp = useCallback((_e?: React.PointerEvent) => {
    const current = rulerMeasurementRef.current;
    if (!current || !current.active) return false;

    const dist = Math.hypot(
      current.end.x - current.start.x,
      current.end.y - current.start.y
    );
    if (dist < 4) {
      rulerMeasurementRef.current = null;
      setRulerMeasurement(null);
      return true;
    }

    const nextMeasurement: RulerMeasurement = {
      ...current,
      active: false,
    };
    rulerMeasurementRef.current = nextMeasurement;
    setRulerMeasurement(nextMeasurement);
    return true;
  }, []);

  const handleCreateGuidelineFromRuler = useCallback(
    (guideType: 'h' | 'v' | 'diagonal' | 'auto' = 'auto') => {
      const current = rulerMeasurementRef.current;
      if (!current) return;
      const { start, end } = current;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      let finalType: 'h' | 'v' | 'diagonal' = 'diagonal';
      if (guideType === 'auto') {
        if (absDy < 2) {
          finalType = 'h';
        } else if (absDx < 2) {
          finalType = 'v';
        } else {
          finalType = 'diagonal';
        }
      } else {
        finalType = guideType;
      }

      if (finalType === 'diagonal') {
        const angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;
        const newGuide: CustomGuideline = {
          id: generateId(),
          type: 'diagonal',
          position: 0,
          p1: { x: Math.round(start.x), y: Math.round(start.y) },
          p2: { x: Math.round(end.x), y: Math.round(end.y) },
          angle: angle,
          label: `斜め (${angle}°)`,
        };
        setCustomGuidelines((prev) => [...prev, newGuide]);
        rulerMeasurementRef.current = null;
        setRulerMeasurement(null);
        showCanvasToast(
          '斜めガイド線を作成しました',
          `角度: ${angle}° / 長さ: ${Math.round(Math.hypot(dx, dy))}px`
        );
      } else {
        const isHorizontal = finalType === 'h';
        const newGuide: CustomGuideline = {
          id: generateId(),
          type: isHorizontal ? 'h' : 'v',
          position: isHorizontal ? Math.round((start.y + end.y) / 2) : Math.round((start.x + end.x) / 2),
        };
        setCustomGuidelines((prev) => [...prev, newGuide]);
        rulerMeasurementRef.current = null;
        setRulerMeasurement(null);
        showCanvasToast(
          isHorizontal ? '水平ガイド線を作成しました' : '垂直ガイド線を作成しました',
          `位置: ${newGuide.position}px`
        );
      }
    },
    [setCustomGuidelines, showCanvasToast]
  );

  return {
    rulerMeasurement,
    setRulerMeasurement,
    brushStraightMode,
    setBrushStraightMode,
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
    handleCreateGuidelineFromRuler,
  };
}
