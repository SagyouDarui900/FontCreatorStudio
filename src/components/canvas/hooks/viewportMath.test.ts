import { describe, it, expect } from 'vitest';
import {
  clampPanToViewport,
  computePinchTransform,
  computeWheelZoomTransform,
  MIN_CANVAS_ZOOM,
  MAX_CANVAS_ZOOM,
} from './viewportMath';

describe('viewportMath', () => {
  it('keeps the canvas point under the pinch midpoint stationary during zoom + pan', () => {
    const initialZoom = 1.0;
    const initialPan = { x: 100, y: 80 };
    const prevCenter = { x: 400, y: 300 };
    const curCenter = { x: 420, y: 310 };
    const containerLeft = 50;
    const containerTop = 40;

    // Canvas coordinate under prevCenter before pinch
    const canvasX = (prevCenter.x - containerLeft - initialPan.x) / initialZoom;
    const canvasY = (prevCenter.y - containerTop - initialPan.y) / initialZoom;

    const result = computePinchTransform({
      currentZoom: initialZoom,
      currentPan: initialPan,
      prevDist: 100,
      curDist: 125,
      prevCenter,
      curCenter,
      containerLeft,
      containerTop,
      upm: 1000,
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(result.zoom).toBeCloseTo(1.25, 6);

    // Canvas coordinate should now project exactly to curCenter relative to container
    const projectedX = result.pan.x + canvasX * result.zoom;
    const projectedY = result.pan.y + canvasY * result.zoom;
    expect(projectedX).toBeCloseTo(curCenter.x - containerLeft, 6);
    expect(projectedY).toBeCloseTo(curCenter.y - containerTop, 6);
  });

  it('clamps zoom to MIN_CANVAS_ZOOM and MAX_CANVAS_ZOOM', () => {
    const zoomedOut = computePinchTransform({
      currentZoom: 0.11,
      currentPan: { x: 0, y: 0 },
      prevDist: 200,
      curDist: 100,
      prevCenter: { x: 300, y: 300 },
      curCenter: { x: 300, y: 300 },
      containerLeft: 0,
      containerTop: 0,
      upm: 1000,
      viewportWidth: 800,
      viewportHeight: 600,
    });
    expect(zoomedOut.zoom).toBe(MIN_CANVAS_ZOOM);

    const zoomedIn = computePinchTransform({
      currentZoom: 30.0,
      currentPan: { x: 0, y: 0 },
      prevDist: 100,
      curDist: 150,
      prevCenter: { x: 300, y: 300 },
      curCenter: { x: 300, y: 300 },
      containerLeft: 0,
      containerTop: 0,
      upm: 1000,
      viewportWidth: 800,
      viewportHeight: 600,
    });
    expect(zoomedIn.zoom).toBe(MAX_CANVAS_ZOOM);
  });

  it('clamps pan so at least part of the canvas stays inside viewport', () => {
    const clamped = clampPanToViewport({ x: -5000, y: 5000 }, 1.0, 1000, 800, 600);
    // minVisible = 180 -> minX = -1000 + 180 = -820, maxY = 600 - 180 = 420
    expect(clamped.x).toBe(-820);
    expect(clamped.y).toBe(420);
  });

  it('keeps cursor point stationary during wheel zoom', () => {
    const mouseX = 350;
    const mouseY = 250;
    const currentZoom = 1.0;
    const currentPan = { x: 50, y: 30 };

    const canvasX = (mouseX - currentPan.x) / currentZoom;
    const canvasY = (mouseY - currentPan.y) / currentZoom;

    const result = computeWheelZoomTransform({
      currentZoom,
      currentPan,
      deltaY: -100,
      mouseX,
      mouseY,
      upm: 1000,
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(result.zoom).toBeCloseTo(1.12, 6);
    expect(result.pan.x + canvasX * result.zoom).toBeCloseTo(mouseX, 6);
    expect(result.pan.y + canvasY * result.zoom).toBeCloseTo(mouseY, 6);
  });
});
