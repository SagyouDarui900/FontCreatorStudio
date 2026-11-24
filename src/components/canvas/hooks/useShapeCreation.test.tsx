// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useShapeCreation } from './useShapeCreation';
import { PathContour, GridSettings, SnapMetrics } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const gridSettings = {
  showGrid: true,
  gridSize: 100,
  snapToGrid: false,
  snapToPoints: false,
  snapToGuides: false,
  showMetrics: false,
  showPoints: true,
  showHandles: true,
} as GridSettings;

const snapMetrics = {
  lsb: 0,
  advanceWidth: 1000,
  baseline: 0,
  ascender: 800,
  capHeight: 700,
  xHeight: 500,
  descender: -200,
} as SnapMetrics;

function ShapeHarness({
  store,
  zoom,
}: {
  store: { current: any; created?: PathContour[] };
  zoom: number;
}) {
  const [contours, setContours] = React.useState<PathContour[]>([]);
  const contoursRef = React.useRef<PathContour[]>(contours);
  React.useEffect(() => {
    contoursRef.current = contours;
  });
  const api = useShapeCreation({
    toolMode: 'rect',
    brushWidth: 32,
    zoom,
    contours,
    contoursRef,
    snapMetrics,
    customGuidelines: [],
    gridSettings,
    onChangeContours: (next) => {
      store.created = next as PathContour[];
      setContours(next as PathContour[]);
    },
    onCommitHistory: vi.fn(),
    setActiveSnapGuides: vi.fn(),
    setSelectedContourIds: vi.fn(),
    setSelectedContourId: vi.fn(),
  });
  store.current = api;
  return null;
}

function renderShape(zoom: number) {
  const store: { current: any; created?: PathContour[] } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<ShapeHarness store={store} zoom={zoom} />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { store, cleanup };
}

const bboxWidth = (contours: PathContour[]) => {
  const xs = contours.flatMap((c) => c.nodes.map((n) => n.x));
  return Math.max(...xs) - Math.min(...xs);
};

describe('useShapeCreation (Round 3, L11)', () => {
  it('a 9-unit drag at zoom 3 is a drag shape, not a click-create', () => {
    const { store, cleanup } = renderShape(3);
    try {
      act(() => {
        store.current.handleShapePointerDown({ x: 100, y: 100 }, { shiftKey: false, altKey: false } as any);
      });
      act(() => {
        store.current.handleShapePointerMove({ x: 109, y: 100 }, { shiftKey: false, altKey: false } as any);
      });
      act(() => {
        store.current.handleShapePointerUp({ shiftKey: false, altKey: false } as any);
      });
      // Click-create makes a 180-unit square; a drag shape is the
      // dragged size (clamped to the 16-unit minimum).
      expect(store.created).toHaveLength(1);
      expect(bboxWidth(store.created!)).toBeLessThan(100);
    } finally {
      cleanup();
    }
  });

  it('the same 9-unit drag at zoom 0.55 is a click-create', () => {
    const { store, cleanup } = renderShape(0.55);
    try {
      act(() => {
        store.current.handleShapePointerDown({ x: 100, y: 100 }, { shiftKey: false, altKey: false } as any);
      });
      act(() => {
        store.current.handleShapePointerMove({ x: 109, y: 100 }, { shiftKey: false, altKey: false } as any);
      });
      act(() => {
        store.current.handleShapePointerUp({ shiftKey: false, altKey: false } as any);
      });
      // 9 units < 10 / 0.55 ≈ 18.2, so this is a click: 180-unit square.
      expect(store.created).toHaveLength(1);
      expect(bboxWidth(store.created!)).toBeCloseTo(180, 0);
    } finally {
      cleanup();
    }
  });
});
