// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { subtractEraserStrokeFromClosedContours, eraseContoursAtPoint } from './eraser';
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
