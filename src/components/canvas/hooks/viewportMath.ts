import { Point } from '../../../types';

export const MIN_CANVAS_ZOOM = 0.1;
export const MAX_CANVAS_ZOOM = 32.0;

/**
 * Pure pan clamping so at least 35% (capped at 180px) of the glyph canvas remains visible.
 * Does not touch the DOM or trigger layout reflows.
 */
export function clampPanToViewport(
  pan: Point,
  currentZoom: number,
  upm: number,
  viewportWidth: number,
  viewportHeight: number
): Point {
  if (viewportWidth <= 0 || viewportHeight <= 0) return pan;

  const canvasWidth = upm * currentZoom;
  const canvasHeight = upm * currentZoom;

  const minVisibleX = Math.min(canvasWidth * 0.35, 180);
  const minVisibleY = Math.min(canvasHeight * 0.35, 180);

  const minX = -canvasWidth + minVisibleX;
  const maxX = viewportWidth - minVisibleX;
  const minY = -canvasHeight + minVisibleY;
  const maxY = viewportHeight - minVisibleY;

  return {
    x: Math.min(maxX, Math.max(minX, pan.x)),
    y: Math.min(maxY, Math.max(minY, pan.y)),
  };
}

export interface PinchTransformInput {
  currentZoom: number;
  currentPan: Point;
  prevDist: number;
  curDist: number;
  prevCenter: Point;
  curCenter: Point;
  containerLeft: number;
  containerTop: number;
  upm: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ViewportTransformResult {
  zoom: number;
  pan: Point;
}

/**
 * Computes exact midpoint-anchored pinch zoom & 2-finger pan without floating-point drift.
 */
export function computePinchTransform({
  currentZoom,
  currentPan,
  prevDist,
  curDist,
  prevCenter,
  curCenter,
  containerLeft,
  containerTop,
  upm,
  viewportWidth,
  viewportHeight,
}: PinchTransformInput): ViewportTransformResult {
  const safePrevDist = Math.max(10, prevDist);
  const safeCurDist = Math.max(10, curDist);
  const rawScaleRatio = safeCurDist / safePrevDist;
  const clampedScaleRatio = Math.max(0.75, Math.min(1.35, rawScaleRatio));

  const nextZoom = Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, currentZoom * clampedScaleRatio));
  const zoomFactor = nextZoom / currentZoom;

  const prevMouseX = prevCenter.x - containerLeft;
  const prevMouseY = prevCenter.y - containerTop;
  const curMouseX = curCenter.x - containerLeft;
  const curMouseY = curCenter.y - containerTop;

  const rawPan: Point = {
    x: curMouseX - (prevMouseX - currentPan.x) * zoomFactor,
    y: curMouseY - (prevMouseY - currentPan.y) * zoomFactor,
  };

  return {
    zoom: nextZoom,
    pan: clampPanToViewport(rawPan, nextZoom, upm, viewportWidth, viewportHeight),
  };
}

export interface WheelZoomInput {
  currentZoom: number;
  currentPan: Point;
  deltaY: number;
  mouseX: number;
  mouseY: number;
  upm: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Computes cursor-anchored wheel/trackpad pinch zoom.
 */
export function computeWheelZoomTransform({
  currentZoom,
  currentPan,
  deltaY,
  mouseX,
  mouseY,
  upm,
  viewportWidth,
  viewportHeight,
}: WheelZoomInput): ViewportTransformResult {
  const zoomFactor = Math.pow(1.12, -deltaY / 100);
  const nextZoom = Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, currentZoom * zoomFactor));
  const scale = nextZoom / currentZoom;

  const rawPan: Point = {
    x: mouseX - (mouseX - currentPan.x) * scale,
    y: mouseY - (mouseY - currentPan.y) * scale,
  };

  return {
    zoom: nextZoom,
    pan: clampPanToViewport(rawPan, nextZoom, upm, viewportWidth, viewportHeight),
  };
}
