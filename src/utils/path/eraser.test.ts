// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  subtractEraserStrokeFromClosedContours,
  eraseContoursAtPoint,
  sliceOpenContourWithEraser,
} from './eraser';
import { PathContour } from '../../types';

describe('eraser.ts geometry & bitmap fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reconstructs closed loops cleanly without broken left vertical edges in subtractEraserStrokeFromClosedContours', () => {
    // Provide a deterministic 2D canvas & Path2D implementation in jsdom
    let currentWidth = 0;
    let currentHeight = 0;
    let scaleVal = 1;
    let translateX = 0;
    let translateY = 0;
    let fillColor = '#ffffff';
    let buffer = new Uint8ClampedArray(0);
    let currentArc: { x: number; y: number; r: number } | null = null;

    class MockPath2D {
      d: string;
      constructor(d: string = '') {
        this.d = d;
      }
    }
    vi.stubGlobal('Path2D', MockPath2D);

    const setPixel = (px: number, py: number, val: number) => {
      if (px < 0 || px >= currentWidth || py < 0 || py >= currentHeight) return;
      const idx = (py * currentWidth + px) * 4;
      buffer[idx] = val;
      buffer[idx + 1] = val;
      buffer[idx + 2] = val;
      buffer[idx + 3] = 255;
    };

    const mockCtx = {
      set fillStyle(v: string) {
        fillColor = v;
      },
      get fillStyle() {
        return fillColor;
      },
      strokeStyle: '#ffffff',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      fillRect(_x: number, _y: number, w: number, h: number) {
        buffer = new Uint8ClampedArray(w * h * 4);
        buffer.fill(255);
      },
      scale(sx: number) {
        scaleVal = sx;
      },
      translate(tx: number, ty: number) {
        translateX = tx;
        translateY = ty;
      },
      beginPath() {
        currentArc = null;
      },
      moveTo() {},
      lineTo() {},
      stroke() {},
      arc(cx: number, cy: number, r: number) {
        currentArc = { x: cx, y: cy, r };
      },
      fill(arg?: unknown) {
        if (arg instanceof MockPath2D) {
          // Paint solid black rectangle [100, 100] -> [300, 300] in canvas space
          const x0 = Math.round((100 + translateX) * scaleVal);
          const y0 = Math.round((100 + translateY) * scaleVal);
          const x1 = Math.round((300 + translateX) * scaleVal);
          const y1 = Math.round((300 + translateY) * scaleVal);
          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              setPixel(px, py, 0);
            }
          }
          return;
        }
        if (currentArc) {
          const cx = (currentArc.x + translateX) * scaleVal;
          const cy = (currentArc.y + translateY) * scaleVal;
          const r = currentArc.r * scaleVal;
          const minPx = Math.floor(cx - r);
          const maxPx = Math.ceil(cx + r);
          const minPy = Math.floor(cy - r);
          const maxPy = Math.ceil(cy + r);
          const color = fillColor === '#000000' ? 0 : 255;
          for (let py = minPy; py <= maxPy; py++) {
            for (let px = minPx; px <= maxPx; px++) {
              if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r) {
                setPixel(px, py, color);
              }
            }
          }
        }
      },
      getImageData() {
        return { data: buffer };
      },
    };

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          set width(w: number) {
            currentWidth = w;
          },
          get width() {
            return currentWidth;
          },
          set height(h: number) {
            currentHeight = h;
          },
          get height() {
            return currentHeight;
          },
          getContext: () => mockCtx,
        } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tagName);
    });

    const rect: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };

    // Erase a notch on the right side so the rectangle remains closed with intact left edge
    const result = subtractEraserStrokeFromClosedContours([rect], [{ x: 295, y: 200 }], 25);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].closed).toBe(true);
    expect(result[0].nodes.length).toBeGreaterThanOrEqual(4);
    const xs = result[0].nodes.map((n) => n.x);
    expect(Math.min(...xs)).toBeLessThanOrEqual(105);
  });

  it('eraseContoursAtPoint in node mode returns a new array reference while keeping surviving contours', () => {
    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };

    const source = [rect];
    const remaining = eraseContoursAtPoint(source, { x: 102, y: 102 }, 15, 'node');
    expect(remaining).not.toBe(source);
    expect(remaining.length).toBe(1);
    expect(remaining[0].nodes.length).toBe(3);
  });
});

describe('sliceOpenContourWithEraser cut-end precision', () => {
  it('cuts a straight open contour at the exact circle boundary, not the nearest sample', () => {
    const line: PathContour = {
      id: 'line',
      closed: false,
      nodes: [
        { id: 'n1', x: 0, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
      ],
    };
    // Eraser circle at (150, 100), radius 50: exact crossings at x=100 and x=200.
    // The old sampled implementation ended the runs at x=90 and x=210.
    const runs = sliceOpenContourWithEraser(line, { x: 150, y: 100 }, 50);
    expect(runs.length).toBe(2);
    expect(runs[0].closed).toBe(false);
    expect(runs[1].closed).toBe(false);
    const leftEnd = runs[0].nodes[runs[0].nodes.length - 1];
    const rightStart = runs[1].nodes[0];
    expect(leftEnd.x).toBeCloseTo(100, 1);
    expect(leftEnd.y).toBeCloseTo(100, 1);
    expect(rightStart.x).toBeCloseTo(200, 1);
    expect(rightStart.y).toBeCloseTo(100, 1);
    // Open ends: no wrap-around handles from the other end of the run.
    expect(runs[0].nodes[0].handleIn ?? null).toBeNull();
    expect(leftEnd.handleOut ?? null).toBeNull();
    expect(rightStart.handleIn ?? null).toBeNull();
    expect(runs[1].nodes[runs[1].nodes.length - 1].handleOut ?? null).toBeNull();
  });

  it('keeps the original handles of a cut cubic segment, split at the cut end', () => {
    const curved: PathContour = {
      id: 'curved',
      closed: false,
      nodes: [
        { id: 'n1', x: 100, y: 300, type: 'smooth', handleOut: { x: 200, y: 20 } },
        { id: 'n2', x: 300, y: 300, type: 'corner' },
      ],
    };
    // Eraser circle at the end node: the kept run starts at the original
    // node and ends at the exact crossing. The kept sub-curve is the
    // de Casteljau split of the original curve, so its handleOut is the
    // split control point: it lies on the line from (100, 300) to the
    // original handleOut (200, 20), between the two.
    const runs = sliceOpenContourWithEraser(curved, { x: 300, y: 300 }, 30);
    expect(runs.length).toBe(1);
    const nodes = runs[0].nodes;
    expect(nodes.length).toBe(2);
    expect(nodes[0].x).toBe(100);
    expect(nodes[0].y).toBe(300);
    const hOut = nodes[0].handleOut;
    expect(hOut).not.toBeNull();
    expect(hOut!.x).toBeGreaterThan(100);
    expect(hOut!.x).toBeLessThan(200);
    // Collinear with (100, 300) -> (200, 20): cross product near zero
    // (tolerance 30 allows for the 0.1-unit rounding of the split point).
    const cross = (hOut!.x - 100) * (20 - 300) - (hOut!.y - 300) * (200 - 100);
    expect(Math.abs(cross)).toBeLessThan(30);
    expect(nodes[0].handleIn ?? null).toBeNull();
    // Cut end lies exactly on the eraser circle.
    expect(Math.hypot(nodes[1].x - 300, nodes[1].y - 300)).toBeCloseTo(30, 1);
    expect(nodes[1].handleOut ?? null).toBeNull();
    // The cut end keeps the split curve's incoming handle.
    expect(nodes[1].handleIn).not.toBeNull();
  });
});
