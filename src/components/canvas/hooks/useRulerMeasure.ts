import React, { useState, useCallback } from 'react';
import { Point, PathContour, GridSettings, SnapGuideLine, CustomGuideline, SnapMetrics, RulerMeasurement } from '../../../types';
import { snapSinglePoint } from '../../../utils/snapUtils';
import { generateId } from '../../../utils/pathUtils';

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
      setRulerMeasurement({
        start: startPos,
        end: startPos,
        active: true,
      });
      return true;
    },
    [contours, customGuidelines, gridSettings, setActiveSnapGuides, snapMetrics, zoom]
  );

  const handleRulerPointerMove = useCallback(
    (pos: Point, e: React.PointerEvent) => {
      if (!rulerMeasurement || !rulerMeasurement.active) return false;

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
        const dx = endX - rulerMeasurement.start.x;
        const dy = endY - rulerMeasurement.start.y;
        const angle = Math.atan2(dy, dx);
        const snapStep = (15 * Math.PI) / 180;
        const snapAngle = Math.round(angle / snapStep) * snapStep;
        const dist = Math.hypot(dx, dy);
        endX = Math.round(rulerMeasurement.start.x + Math.cos(snapAngle) * dist);
        endY = Math.round(rulerMeasurement.start.y + Math.sin(snapAngle) * dist);
      }

      setRulerMeasurement({
        ...rulerMeasurement,
        end: { x: endX, y: endY },
      });
      return true;
    },
    [contours, customGuidelines, gridSettings, rulerMeasurement, setActiveSnapGuides, snapMetrics, zoom]
  );

  const handleRulerPointerUp = useCallback((_e?: React.PointerEvent) => {
    if (!rulerMeasurement || !rulerMeasurement.active) return false;

    const dist = Math.hypot(
      rulerMeasurement.end.x - rulerMeasurement.start.x,
      rulerMeasurement.end.y - rulerMeasurement.start.y
    );
    if (dist < 4) {
      setRulerMeasurement(null);
      return true;
    }

    setRulerMeasurement({
      ...rulerMeasurement,
      active: false,
    });
    return true;
  }, [rulerMeasurement]);

  const handleCreateGuidelineFromRuler = useCallback(
    (guideType: 'h' | 'v' | 'diagonal' | 'auto' = 'auto') => {
      if (!rulerMeasurement) return;
      const { start, end } = rulerMeasurement;
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
        setRulerMeasurement(null);
        showCanvasToast(
          isHorizontal ? '水平ガイド線を作成しました' : '垂直ガイド線を作成しました',
          `位置: ${newGuide.position}px`
        );
      }
    },
    [rulerMeasurement, setCustomGuidelines, showCanvasToast]
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
