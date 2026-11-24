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
} from '../utils/path';
import {
  calibrateStylusPressure,
  computeMouseSpeedPressure,
  blendStrokePressure,
  trimTerminalJitter,
  classifyBrushTap,
  calculateEffectiveSmoothing,
  getDecimatedPointsForLivePreview,
} from '../utils/brush';

// Re-export for backwards compatibility
export { getDecimatedPointsForLivePreview };

/**
 * Snapshot of the brush configuration taken at stroke start, so the live
 * preview and the committed outline use exactly the same settings.
 */
export interface BrushStrokeConfig {
  brushWidth: number;
  brushStyle: BrushStyle;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  pressureCurve?: PressureCurveConfig | null;
  smoothingIntensity: number;
  autoSmoothBrush?: boolean;
  smoothStrength?: 'light' | 'standard' | 'strong' | 'mild';
  activePenPreset?: PenPresetInfo | UserPenPreset | null;
}

/**
 * The single outline computation shared by the live preview and the
 * finalize step. Both call this with the same configuration, so the shape
 * on screen cannot change when the pen is lifted.
 */
export function buildBrushContour(pts: StrokePoint[], cfg: BrushStrokeConfig): PathContour {
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
}

/**
 * Live preview path for the stroke being drawn.
 *
 * The preview is the same outline the commit produces, not a fast
 * approximation. Previously the preview used a generic-width outline
 * that ignored the per-style width formulas, taper, tipSharpness,
 * pressureWidthFactor, jitter, feather and edgeRoughness, so the shape
 * visibly changed when the pen was lifted. The only remaining difference
 * is decimation: strokes over 96 points are decimated to at most 160
 * points to bound the per-frame cost, while finalize uses every point.
 * The per-frame cost of the shared path is about 3-6ms for a long
 * stroke (measured on this VM), inside one animation frame.
 */
export function buildLiveBrushPreviewSvgPath(pts: StrokePoint[], cfg: BrushStrokeConfig): string {
  if (!pts || pts.length === 0) return '';
  const previewPts = pts.length > 96 ? getDecimatedPointsForLivePreview(pts) : pts;
  return contoursToSvgPath([buildBrushContour(previewPts, cfg)]);
}

export interface UseBrushDrawingOptions {
  toolMode: ToolMode;
  brushWidth: number;
  brushStyle: BrushStyle;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  pressureCurve?: PressureCurveConfig | null;
  smoothingIntensity: number;
  // L11: viewport zoom, so the micro-sampling distance stays constant on
  // screen (1.5 screen px) instead of 1.5 canvas units.
  zoom?: number;
  autoSmoothBrush?: boolean;
  smoothStrength?: 'light' | 'standard' | 'strong' | 'mild';
  activePenPreset?: PenPresetInfo | UserPenPreset | null;
  brushStraightMode?: boolean;
  customGuidelines?: CustomGuideline[];
  screenToCanvas: (clientX: number, clientY: number) => Point;
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
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
  finalizeBrushDrawing: (options?: { allowTapDot?: boolean }) => boolean;
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
    zoom = 1,
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
  const freehandPointsRef = useRef<StrokePoint[]>([]);
  const wasStraightModeRef = useRef<boolean>(false);
  const brushStrokeStartTimeRef = useRef<number>(0);
  const brushStrokeStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Pointer that started the current stroke, so a finalize triggered by a
  // different pointer (e.g. the second finger of a pinch, routed through
  // handleBrushPointerUp) can be told apart from the stroke pointer
  // lifting. See handleBrushPointerUp.
  const brushStrokePointerIdRef = useRef<number | null>(null);
  // Largest PointerEvent contact dimension (CSS px) seen during the stroke.
  // Unknown when the platform does not report contact size (<= 1).
  // Used to keep a palm-sized tap discarded while a fingertip tap dots.
  const brushTapContactSizeRef = useRef<number | undefined>(undefined);
  const pendingBrushEventsRef = useRef<
    { clientX: number; clientY: number; pressure: number; timeStamp: number; pointerType: string }[]
  >([]);
  const activeBrushPathRef = useRef<SVGPathElement | null>(null);
  const activeBrushSvgDRef = useRef<string>('');
  const brushRafIdRef = useRef<number | null>(null);
  const mouseSmoothSpeedRef = useRef<number>(0.5);
  const lastBrushPointRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const strokeBrushConfigRef = useRef<BrushStrokeConfig | null>(null);

  const resetBrushDrawing = useCallback(() => {
    if (brushRafIdRef.current != null) {
      cancelAnimationFrame(brushRafIdRef.current);
      brushRafIdRef.current = null;
    }
    brushStrokePointsRef.current = [];
    freehandPointsRef.current = [];
    wasStraightModeRef.current = false;
    pendingBrushEventsRef.current = [];
    strokeBrushConfigRef.current = null;
    brushStrokePointerIdRef.current = null;
    brushTapContactSizeRef.current = undefined;
    activeBrushSvgDRef.current = '';
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
  }, []);

  // Record the largest contact ellipse seen so far in this stroke.
  // PointerEvent width/height are CSS px; values <= 1 mean "unknown"
  // (some browsers report 1 for touch) and are ignored.
  const noteTapContactSize = useCallback((width?: number, height?: number) => {
    const size = Math.max(
      typeof width === 'number' ? width : 0,
      typeof height === 'number' ? height : 0
    );
    if (size > 1) {
      brushTapContactSizeRef.current = Math.max(
        brushTapContactSizeRef.current ?? 0,
        size
      );
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

  // Configuration snapshot taken at stroke start, falling back to the
  // current props when no stroke is active.
  const getStrokeConfig = useCallback((): BrushStrokeConfig => {
    return (
      strokeBrushConfigRef.current || {
        brushWidth,
        brushStyle,
        pressureSensitivity,
        pressureCurve,
        smoothingIntensity,
        autoSmoothBrush,
        smoothStrength,
        activePenPreset,
      }
    );
  }, [
    brushWidth,
    brushStyle,
    pressureSensitivity,
    pressureCurve,
    smoothingIntensity,
    autoSmoothBrush,
    smoothStrength,
    activePenPreset,
  ]);

  const getProcessedBrushContour = useCallback(
    (pts: StrokePoint[], _isFinalize: boolean = false) => {
      return buildBrushContour(pts, getStrokeConfig());
    },
    [getStrokeConfig]
  );

  const getLivePreviewSvgPath = useCallback(
    (pts: StrokePoint[]): string => {
      return buildLiveBrushPreviewSvgPath(pts, getStrokeConfig());
    },
    [getStrokeConfig]
  );

  // Helper to ingest incoming pointer events into stroke points
  const ingestRawEvents = useCallback(
    (
      events: { clientX: number; clientY: number; pressure: number; timeStamp: number; pointerType: string }[],
      syncFreehand: boolean = false
    ): boolean => {
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

        // Ignore micro-sampling (< 1.5 screen px, i.e. 1.5 / zoom canvas
        // units, L11). A fixed canvas-unit threshold sampled far too
        // coarsely at high zoom and far too finely at low zoom.
        if (lastP) {
          const dx = subPos.x - lastP.x;
          const dy = subPos.y - lastP.y;
          const minSampleDist = 1.5 / (zoom || 1);
          if (dx * dx + dy * dy < minSampleDist * minSampleDist) {
            continue;
          }
        }

        const activePressureSensitivity =
          strokeBrushConfigRef.current?.pressureSensitivity ?? pressureSensitivity;

        let rawPres = 0.5;
        if (activePressureSensitivity === 'off') {
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

        const pres = blendStrokePressure(ev.pointerType, activePressureSensitivity, rawPres, lastP?.pressure);
        const ptItem: StrokePoint = {
          x: subPos.x,
          y: subPos.y,
          pressure: pres,
          time: ev.timeStamp,
          pointerType: ev.pointerType,
        };
        brushStrokePointsRef.current.push(ptItem);
        if (syncFreehand) {
          freehandPointsRef.current.push(ptItem);
        }
        lastP = ptItem;
        hasNewPoints = true;
      }

      return hasNewPoints;
    },
    [pressureSensitivity, screenToCanvas, zoom]
  );

  const handleBrushPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>, pos: Point) => {
      pendingBrushEventsRef.current = [];
      wasStraightModeRef.current = false;
      mouseSmoothSpeedRef.current = 0.5;
      brushStrokeStartTimeRef.current = Date.now();
      brushStrokeStartPosRef.current = { x: pos.x, y: pos.y };
      brushStrokePointerIdRef.current =
        typeof e.pointerId === 'number' ? e.pointerId : null;
      brushTapContactSizeRef.current = undefined;
      noteTapContactSize(e.width, e.height);

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
          pointerType: e.pointerType,
        };
        const pCurr: StrokePoint = { x: pos.x, y: pos.y, pressure: pres, time: Date.now(), pointerType: e.pointerType };
        const straightPts = generateStraightStrokePoints(pPrev, pCurr);
        brushStrokePointsRef.current = straightPts;
        freehandPointsRef.current = straightPts;
        if (activeBrushPathRef.current) {
          const d = getLivePreviewSvgPath(brushStrokePointsRef.current);
          activeBrushSvgDRef.current = d;
          activeBrushPathRef.current.setAttribute('d', d);
        }
      } else {
        const firstPt: StrokePoint = {
          x: pos.x,
          y: pos.y,
          pressure: pres,
          time: Date.now(),
          pointerType: e.pointerType,
        };
        brushStrokePointsRef.current = [firstPt];
        freehandPointsRef.current = [firstPt];
        activeBrushSvgDRef.current = '';
        if (activeBrushPathRef.current) {
          activeBrushPathRef.current.setAttribute('d', '');
        }
      }
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
      isStylusActive,
      setIsStylusActive,
      onPressureUpdate,
      getLivePreviewSvgPath,
      noteTapContactSize,
    ]
  );

  const handleBrushPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): boolean => {
      if (toolMode !== 'brush' || brushStrokePointsRef.current.length === 0) {
        return false;
      }
      noteTapContactSize(e.width, e.height);
      const isPen = e.pointerType === 'pen';
      if (isPen && !isStylusActive && setIsStylusActive) {
        setIsStylusActive(true);
      }

      // Straight Ruler Assist: When Shift is held or straight mode is ON
      if (e.shiftKey || brushStraightMode) {
        wasStraightModeRef.current = true;
        const originPts = freehandPointsRef.current.length > 0 ? freehandPointsRef.current : brushStrokePointsRef.current;
        // M10: the straight segment starts from the end of the freehand
        // part, not from the stroke origin. Previously the whole stroke
        // was replaced by one straight line from its first point, so
        // lifting the pen while Shift was held discarded the freehand
        // curve. The stroke now keeps freehand points plus the tail.
        const p0 = originPts[originPts.length - 1] || { x: 0, y: 0 };
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

        // Straight-line pressure: same rules as normal drawing. Pen uses
        // calibrated stylus pressure; mouse / touch use the speed-based
        // pseudo pressure instead of a fixed 0.5.
        const activePressureSensitivity =
          strokeBrushConfigRef.current?.pressureSensitivity ?? pressureSensitivity;
        let pres = 0.5;
        if (activePressureSensitivity === 'off') {
          pres = 0.5;
        } else if (isPen) {
          pres = calibrateStylusPressure(e.pressure && e.pressure > 0 ? e.pressure : 0.15);
        } else {
          const p0Time = typeof p0.time === 'number' ? p0.time : Date.now();
          const dt = (e.timeStamp || Date.now()) - p0Time;
          const ds = Math.hypot(endX - p0.x, endY - p0.y);
          if (dt > 0 && ds > 0) {
            const { smoothSpeed, rawPressure } = computeMouseSpeedPressure(dt, ds, mouseSmoothSpeedRef.current);
            mouseSmoothSpeedRef.current = smoothSpeed;
            pres = blendStrokePressure(e.pointerType, activePressureSensitivity, rawPressure, p0.pressure);
          } else if (typeof p0.pressure === 'number') {
            pres = p0.pressure;
          }
        }

        const pEnd: StrokePoint = {
          x: endX,
          y: endY,
          pressure: pres,
          time: e.timeStamp || Date.now(),
          pointerType: e.pointerType,
        };

        // M10: keep the freehand part and append the straight tail, so
        // the preview shows the whole stroke and finalize keeps both.
        // With straight mode on from the start, freehand holds only the
        // first point and this is exactly the straight line.
        const straightPts = generateStraightStrokePoints(p0, pEnd);
        brushStrokePointsRef.current =
          freehandPointsRef.current.length > 1
            ? [...freehandPointsRef.current, ...straightPts.slice(1)]
            : straightPts;

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

      // Restore freehand points when releasing Shift / straight mode mid-stroke
      if (wasStraightModeRef.current) {
        wasStraightModeRef.current = false;
        // M10: keep the straight tail that was drawn while Shift was
        // held: adopt the current stroke (freehand + tail) as the new
        // freehand base, so later points continue from the tail end
        // instead of the tail vanishing.
        if (brushStrokePointsRef.current.length > 0) {
          freehandPointsRef.current = [...brushStrokePointsRef.current];
        } else if (freehandPointsRef.current.length > 0) {
          brushStrokePointsRef.current = [...freehandPointsRef.current];
        }
      }

      // Defer all non-straight brush drawing events to requestAnimationFrame
      const nativeEv = (e.nativeEvent || e) as PointerEvent;
      const rawEvents = typeof nativeEv?.getCoalescedEvents === 'function' ? nativeEv.getCoalescedEvents() : null;
      const eventsToProcess = rawEvents && rawEvents.length > 0 ? rawEvents : [e];

      for (let k = 0; k < eventsToProcess.length; k++) {
        const ev = eventsToProcess[k];
        // A palm landing grows over a few ms; keep the largest contact seen.
        noteTapContactSize(ev.width, ev.height);
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

          const hasNewPoints = ingestRawEvents(events, true);

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
      noteTapContactSize,
    ]
  );

  const finalizeBrushDrawing = useCallback((options?: { allowTapDot?: boolean }): boolean => {
    if (brushRafIdRef.current != null) {
      cancelAnimationFrame(brushRafIdRef.current);
      brushRafIdRef.current = null;
    }

    if (pendingBrushEventsRef.current.length > 0) {
      const events = pendingBrushEventsRef.current;
      pendingBrushEventsRef.current = [];
      ingestRawEvents(events);
    }

    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    activeBrushSvgDRef.current = '';

    const pts =
      brushStrokePointsRef.current.length > 0
        ? [...brushStrokePointsRef.current]
        : [...freehandPointsRef.current];

    brushStrokePointsRef.current = [];
    freehandPointsRef.current = [];

    if (pts.length === 0) {
      strokeBrushConfigRef.current = null;
      return false;
    }

    // Trim micro-jitter at stroke end
    trimTerminalJitter(pts);

    // Distinguish an accidental stray tap from an intentional mark or a
    // finger tap that stamps a dot (see classifyBrushTap).
    const duration = Date.now() - brushStrokeStartTimeRef.current;
    const classification = classifyBrushTap(
      pts,
      brushStrokeStartPosRef.current,
      duration,
      pts[0]?.pointerType,
      brushTapContactSizeRef.current
    );
    brushTapContactSizeRef.current = undefined;
    brushStrokePointerIdRef.current = null;

    // A tap-dot is only stamped when the stroke pointer itself lifted.
    // When allowTapDot is false the finalize was triggered by a different
    // pointer (e.g. the second finger of a pinch), so a tap-shaped
    // stroke is the first finger of a gesture, not a dot.
    if (
      classification === 'accidental' ||
      (classification === 'tapDot' && options?.allowTapDot === false)
    ) {
      strokeBrushConfigRef.current = null;
      return true;
    }

    // A finger tap stamps a minimum-size dot at the tap position: reduce
    // the tap to its first point so the outline builder takes its
    // single-point dot branch (a circle of radius max(6, width/2) for the
    // brush style, a square/circle for the sharp styles) instead of a
    // sliver from two near-identical points.
    const commitPts = classification === 'tapDot' ? [pts[0]] : pts;

    if (commitPts.length > 0) {
      const finalizedContour = getProcessedBrushContour(commitPts, true);
      const currentContours = contoursRef.current || [];
      const nextContours = [...currentContours, finalizedContour];
      onCommitHistory?.();
      contoursRef.current = nextContours;
      onChangeContours(nextContours, { skipHistory: true });
      lastBrushPointRef.current = {
        x: commitPts[commitPts.length - 1].x,
        y: commitPts[commitPts.length - 1].y,
        time: Date.now(),
      };
    }
    strokeBrushConfigRef.current = null;
    return true;
  }, [
    ingestRawEvents,
    getProcessedBrushContour,
    contoursRef,
    onChangeContours,
    onCommitHistory,
  ]);

  const handleBrushPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): boolean => {
      if (
        toolMode !== 'brush' ||
        (brushStrokePointsRef.current.length === 0 &&
          pendingBrushEventsRef.current.length === 0 &&
          freehandPointsRef.current.length === 0)
      ) {
        return false;
      }

      // The dispatcher also routes a second finger's pointerdown through
      // this handler when a pinch starts, to finalize the stroke in
      // progress. That event carries the second finger's pointerId, not
      // the stroke pointer's. A tap-shaped stroke finalized that way is
      // the first finger of a pinch gesture, not a dot, so suppress the
      // tap-dot there (a real stroke is still committed, as before).
      // When the pointerId is missing or matches the stroke pointer, the
      // stroke pointer itself lifted and a tap may stamp a dot.
      const strokePointerId = brushStrokePointerIdRef.current;
      const allowTapDot =
        strokePointerId === null ||
        typeof e.pointerId !== 'number' ||
        e.pointerId === strokePointerId;
      return finalizeBrushDrawing({ allowTapDot });
    },
    [toolMode, finalizeBrushDrawing]
  );

  const isActivelyDrawing = useCallback(() => {
    return brushStrokePointsRef.current.length > 0;
  }, []);

  return {
    brushStrokePointsRef,
    activeBrushPathRef,
    activeBrushSvgDRef,
    resetBrushDrawing,
    finalizeBrushDrawing,
    handleBrushPointerDown,
    handleBrushPointerMove,
    handleBrushPointerUp,
    isActivelyDrawing,
  };
}
