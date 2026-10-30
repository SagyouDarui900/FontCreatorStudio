import React, { useRef, useCallback, useEffect } from 'react';
import {
  StrokePoint,
  Point,
  PathContour,
  ToolMode,
  BrushStyle,
  PressureCurveConfig,
  PenPresetInfo,
  UserPenPreset,
  CustomGuideline,
} from '../types';
import {
  strokePointsToOutline,
  contoursToSvgPath,
  generateStraightStrokePoints,
  snapToStraightAngle,
} from '../utils/pathUtils';
import {
  calibrateStylusPressure,
  computeMouseSpeedPressure,
  blendStrokePressure,
  trimTerminalJitter,
  isAccidentalStrayTap,
  calculateEffectiveSmoothing,
  getDecimatedPointsForLivePreview,
} from '../utils/brush';

// Re-export for backwards compatibility
export { getDecimatedPointsForLivePreview };

export interface UseBrushDrawingOptions {
  toolMode: ToolMode;
  brushWidth: number;
  brushStyle: BrushStyle;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  pressureCurve?: PressureCurveConfig | null;
  smoothingIntensity: number;
  autoSmoothBrush?: boolean;
  smoothStrength?: 'light' | 'standard' | 'strong' | 'mild';
  activePenPreset?: PenPresetInfo | UserPenPreset | null;
  brushStraightMode?: boolean;
  customGuidelines?: CustomGuideline[];
  screenToCanvas: (clientX: number, clientY: number) => Point;
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  setIsStylusActive?: (active: boolean) => void;
  isStylusActive?: boolean;
  onPressureUpdate?: (pressureVal: number) => void;
}

export interface UseBrushDrawingReturn {
  brushStrokePointsRef: React.MutableRefObject<StrokePoint[]>;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  activeBrushSvgDRef: React.MutableRefObject<string>;
  resetBrushDrawing: () => void;
  handleBrushPointerDown: (e: React.PointerEvent<SVGSVGElement>, pos: Point) => void;
  handleBrushPointerMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleBrushPointerUp: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  isActivelyDrawing: () => boolean;
}

export function useBrushDrawing(options: UseBrushDrawingOptions): UseBrushDrawingReturn {
  const {
    toolMode,
    brushWidth,
    brushStyle,
    pressureSensitivity,
    pressureCurve,
    smoothingIntensity,
    autoSmoothBrush,
    smoothStrength,
    activePenPreset,
    brushStraightMode,
    customGuidelines,
    screenToCanvas,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    setIsStylusActive,
    isStylusActive,
    onPressureUpdate,
  } = options;

  const brushStrokePointsRef = useRef<StrokePoint[]>([]);
  const brushStrokeStartTimeRef = useRef<number>(0);
  const brushStrokeStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingBrushEventsRef = useRef<
    { clientX: number; clientY: number; pressure: number; timeStamp: number; pointerType: string }[]
  >([]);
  const activeBrushPathRef = useRef<SVGPathElement | null>(null);
  const activeBrushSvgDRef = useRef<string>('');
  const brushRafIdRef = useRef<number | null>(null);
  const mouseSmoothSpeedRef = useRef<number>(0.5);
  const lastBrushPointRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const strokeBrushConfigRef = useRef<{
    brushWidth: number;
    brushStyle: BrushStyle;
    pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
    pressureCurve?: PressureCurveConfig | null;
    smoothingIntensity: number;
    autoSmoothBrush?: boolean;
    smoothStrength?: 'light' | 'standard' | 'strong' | 'mild';
    activePenPreset?: PenPresetInfo | UserPenPreset | null;
  } | null>(null);

  const resetBrushDrawing = useCallback(() => {
    if (brushRafIdRef.current != null) {
      cancelAnimationFrame(brushRafIdRef.current);
      brushRafIdRef.current = null;
    }
    brushStrokePointsRef.current = [];
    pendingBrushEventsRef.current = [];
    strokeBrushConfigRef.current = null;
    activeBrushSvgDRef.current = '';
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (brushRafIdRef.current != null) {
        cancelAnimationFrame(brushRafIdRef.current);
      }
    };
  }, []);

  const getProcessedBrushContour = useCallback(
    (pts: StrokePoint[], _isFinalize: boolean = false) => {
      const cfg = strokeBrushConfigRef.current || {
        brushWidth,
        brushStyle,
        pressureSensitivity,
        pressureCurve,
        smoothingIntensity,
        autoSmoothBrush,
        smoothStrength,
        activePenPreset,
      };

      const effectiveSmoothing = calculateEffectiveSmoothing(
        cfg.autoSmoothBrush,
        cfg.smoothStrength,
        cfg.smoothingIntensity
      );

      return strokePointsToOutline(
        pts,
        cfg.brushWidth,
        cfg.brushStyle,
        true,
        cfg.pressureSensitivity,
        cfg.pressureCurve,
        effectiveSmoothing,
        { customPreset: cfg.activePenPreset || undefined }
      );
    },
    [
      brushWidth,
      brushStyle,
      pressureSensitivity,
      pressureCurve,
      smoothingIntensity,
      autoSmoothBrush,
      smoothStrength,
      activePenPreset,
    ]
  );

  const getLivePreviewSvgPath = useCallback(
    (pts: StrokePoint[]): string => {
      if (!pts || pts.length === 0) return '';
      // When points grow large (> 24 pts), decimate to maintain smooth 60fps/120fps live preview
      const previewPts = pts.length > 24 ? getDecimatedPointsForLivePreview(pts) : pts;
      const contour = getProcessedBrushContour(previewPts, false);
      return contoursToSvgPath([contour]);
    },
    [getProcessedBrushContour]
  );

  // Helper to ingest incoming pointer events into stroke points
  const ingestRawEvents = useCallback(
    (events: { clientX: number; clientY: number; pressure: number; timeStamp: number; pointerType: string }[]): boolean => {
      let lastP = brushStrokePointsRef.current[brushStrokePointsRef.current.length - 1];
      let hasNewPoints = false;

      for (let k = 0; k < events.length; k++) {
        const ev = events[k];
        let subPos = screenToCanvas(ev.clientX, ev.clientY);

        // Remove 1px staircase noise for mouse
        if (ev.pointerType === 'mouse' && lastP) {
          subPos = {
            x: subPos.x * 0.75 + lastP.x * 0.25,
            y: subPos.y * 0.75 + lastP.y * 0.25,
          };
        }

        // Ignore micro-sampling (< 1.5px)
        if (lastP) {
          const dx = subPos.x - lastP.x;
          const dy = subPos.y - lastP.y;
          if (dx * dx + dy * dy < 2.25) {
            continue;
          }
        }

        let rawPres = 0.5;
        if (pressureSensitivity === 'off') {
          rawPres = 0.5;
        } else if (ev.pointerType === 'pen') {
          rawPres = calibrateStylusPressure(typeof ev.pressure === 'number' ? ev.pressure : 0);
        } else if (typeof ev.pressure === 'number' && ev.pressure > 0 && ev.pressure !== 0.5) {
          rawPres = ev.pressure;
        } else if (lastP && lastP.time) {
          const dt = ev.timeStamp - lastP.time;
          const ds = Math.hypot(subPos.x - lastP.x, subPos.y - lastP.y);
          const { smoothSpeed, rawPressure } = computeMouseSpeedPressure(dt, ds, mouseSmoothSpeedRef.current);
          mouseSmoothSpeedRef.current = smoothSpeed;
          rawPres = rawPressure;
        }

        const pres = blendStrokePressure(ev.pointerType, pressureSensitivity, rawPres, lastP?.pressure);
        const ptItem: StrokePoint = {
          x: subPos.x,
          y: subPos.y,
          pressure: pres,
          time: ev.timeStamp,
          pointerType: ev.pointerType,
        };
        brushStrokePointsRef.current.push(ptItem);
        lastP = ptItem;
        hasNewPoints = true;
      }

      return hasNewPoints;
    },
    [pressureSensitivity, screenToCanvas]
  );

  const handleBrushPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>, pos: Point) => {
      pendingBrushEventsRef.current = [];
      mouseSmoothSpeedRef.current = 0.5;
      brushStrokeStartTimeRef.current = Date.now();
      brushStrokeStartPosRef.current = { x: pos.x, y: pos.y };

      // Snapshot active brush configuration at stroke inception to prevent mid-stroke jump
      strokeBrushConfigRef.current = {
        brushWidth,
        brushStyle,
        pressureSensitivity,
        pressureCurve,
        smoothingIntensity,
        autoSmoothBrush,
        smoothStrength,
        activePenPreset,
      };

      const isPen = e.pointerType === 'pen';
      let pres = 0.5;
      if (pressureSensitivity === 'off') {
        pres = 0.5;
      } else if (isPen) {
        if (!isStylusActive && setIsStylusActive) {
          setIsStylusActive(true);
        }
        pres = calibrateStylusPressure(e.pressure && e.pressure > 0 ? e.pressure : 0.15);
        if (onPressureUpdate) {
          onPressureUpdate(Math.round(pres * 100));
        }
      } else if (e.pressure && e.pressure > 0 && e.pressure !== 0.5) {
        pres = e.pressure;
      } else {
        pres = 0.55;
      }

      // Shift-Click straight line connection from previous stroke endpoint
      if (e.shiftKey && lastBrushPointRef.current && Date.now() - lastBrushPointRef.current.time < 120000) {
        const pPrev: StrokePoint = {
          x: lastBrushPointRef.current.x,
          y: lastBrushPointRef.current.y,
          pressure: pres,
          time: Date.now() - 50,
        };
        const pCurr: StrokePoint = { x: pos.x, y: pos.y, pressure: pres, time: Date.now() };
        const straightPts = generateStraightStrokePoints(pPrev, pCurr);
        brushStrokePointsRef.current = straightPts;
        if (activeBrushPathRef.current) {
          const d = getLivePreviewSvgPath(brushStrokePointsRef.current);
          activeBrushSvgDRef.current = d;
          activeBrushPathRef.current.setAttribute('d', d);
        }
      } else {
        brushStrokePointsRef.current = [
          { x: pos.x, y: pos.y, pressure: pres, time: Date.now(), pointerType: e.pointerType },
        ];
        activeBrushSvgDRef.current = '';
        if (activeBrushPathRef.current) {
          activeBrushPathRef.current.setAttribute('d', '');
        }
      }
    },
    [
      pressureSensitivity,
      isStylusActive,
      setIsStylusActive,
      onPressureUpdate,
      getLivePreviewSvgPath,
    ]
  );

  const handleBrushPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): boolean => {
      if (toolMode !== 'brush' || brushStrokePointsRef.current.length === 0) {
        return false;
      }
      const isPen = e.pointerType === 'pen';
      if (isPen && !isStylusActive && setIsStylusActive) {
        setIsStylusActive(true);
      }

      // Straight Ruler Assist: When Shift is held or straight mode is ON
      if (e.shiftKey || brushStraightMode) {
        const p0 = brushStrokePointsRef.current[0];
        const subPos = screenToCanvas(e.clientX, e.clientY);
        const snapped = snapToStraightAngle(p0.x, p0.y, subPos.x, subPos.y);
        let endX = snapped.x;
        let endY = snapped.y;

        // Snap to custom guidelines if within 12px
        if (customGuidelines && customGuidelines.length > 0) {
          for (const guide of customGuidelines) {
            if (guide.type === 'h' && Math.abs(endY - guide.position) < 12) {
              endY = guide.position;
            } else if (guide.type === 'v' && Math.abs(endX - guide.position) < 12) {
              endX = guide.position;
            }
          }
        }

        let pres = 0.5;
        if (pressureSensitivity === 'off') {
          pres = 0.5;
        } else if (isPen) {
          pres = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
        }

        const pEnd: StrokePoint = {
          x: endX,
          y: endY,
          pressure: pres,
          time: e.timeStamp || Date.now(),
        };

        brushStrokePointsRef.current = generateStraightStrokePoints(p0, pEnd);

        if (brushRafIdRef.current == null) {
          brushRafIdRef.current = requestAnimationFrame(() => {
            brushRafIdRef.current = null;
            if (activeBrushPathRef.current && brushStrokePointsRef.current.length > 0) {
              const d = getLivePreviewSvgPath(brushStrokePointsRef.current);
              activeBrushSvgDRef.current = d;
              activeBrushPathRef.current.setAttribute('d', d);
            }
          });
        }
        return true;
      }

      // Defer all non-straight brush drawing events to requestAnimationFrame
      const nativeEv = (e.nativeEvent || e) as PointerEvent;
      const rawEvents = typeof nativeEv?.getCoalescedEvents === 'function' ? nativeEv.getCoalescedEvents() : null;
      const eventsToProcess = rawEvents && rawEvents.length > 0 ? rawEvents : [e];

      for (let k = 0; k < eventsToProcess.length; k++) {
        const ev = eventsToProcess[k];
        pendingBrushEventsRef.current.push({
          clientX: ev.clientX,
          clientY: ev.clientY,
          pressure: ev.pressure,
          timeStamp: ev.timeStamp || Date.now(),
          pointerType: ev.pointerType,
        });
      }

      if (brushRafIdRef.current == null) {
        brushRafIdRef.current = requestAnimationFrame(() => {
          brushRafIdRef.current = null;
          if (pendingBrushEventsRef.current.length === 0) return;

          const events = pendingBrushEventsRef.current;
          pendingBrushEventsRef.current = [];

          const hasNewPoints = ingestRawEvents(events);

          if (hasNewPoints && activeBrushPathRef.current && brushStrokePointsRef.current.length > 0) {
            const d = getLivePreviewSvgPath(brushStrokePointsRef.current);
            activeBrushSvgDRef.current = d;
            activeBrushPathRef.current.setAttribute('d', d);
          }
        });
      }
      return true;
    },
    [
      toolMode,
      isStylusActive,
      setIsStylusActive,
      brushStraightMode,
      screenToCanvas,
      customGuidelines,
      pressureSensitivity,
      ingestRawEvents,
      getLivePreviewSvgPath,
    ]
  );

  const handleBrushPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): boolean => {
      if (
        toolMode !== 'brush' ||
        (brushStrokePointsRef.current.length === 0 && pendingBrushEventsRef.current.length === 0)
      ) {
        return false;
      }

      if (pendingBrushEventsRef.current.length > 0) {
        const events = pendingBrushEventsRef.current;
        pendingBrushEventsRef.current = [];
        ingestRawEvents(events);
      }

      if (brushRafIdRef.current != null) {
        cancelAnimationFrame(brushRafIdRef.current);
        brushRafIdRef.current = null;
      }
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      activeBrushSvgDRef.current = '';
      const pts = brushStrokePointsRef.current;
      brushStrokePointsRef.current = [];

      // Trim micro-jitter at stroke end
      trimTerminalJitter(pts);

      // Distinguish accidental stray tap vs intentional mark
      const duration = Date.now() - brushStrokeStartTimeRef.current;
      const isAccidental = isAccidentalStrayTap(
        pts,
        brushStrokeStartPosRef.current,
        duration,
        e.pointerType
      );

      if (isAccidental) {
        strokeBrushConfigRef.current = null;
        return true;
      }

      if (pts.length > 0) {
        const finalizedContour = getProcessedBrushContour(pts, true);
        const currentContours = contoursRef.current || [];
        const nextContours = [...currentContours, finalizedContour];
        contoursRef.current = nextContours;
        onChangeContours(nextContours);
        lastBrushPointRef.current = {
          x: pts[pts.length - 1].x,
          y: pts[pts.length - 1].y,
          time: Date.now(),
        };
        onCommitHistory?.();
      }
      strokeBrushConfigRef.current = null;
      return true;
    },
    [
      toolMode,
      ingestRawEvents,
      getProcessedBrushContour,
      contoursRef,
      onChangeContours,
      onCommitHistory,
    ]
  );

  const isActivelyDrawing = useCallback(() => {
    return brushStrokePointsRef.current.length > 0;
  }, []);

  return {
    brushStrokePointsRef,
    activeBrushPathRef,
    activeBrushSvgDRef,
    resetBrushDrawing,
    handleBrushPointerDown,
    handleBrushPointerMove,
    handleBrushPointerUp,
    isActivelyDrawing,
  };
}
