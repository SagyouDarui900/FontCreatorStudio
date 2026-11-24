// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasEraser } from './useCanvasEraser';
import { PathContour } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function rectContour(): PathContour {
  return {
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 200, y: 100, type: 'corner' },
      { id: 'n3', x: 200, y: 200, type: 'corner' },
      { id: 'n4', x: 100, y: 200, type: 'corner' },
    ],
  };
}

function EraserHarness({ store }: { store: { current: any } }) {
  const [contours, setContours] = React.useState<PathContour[]>([rectContour()]);
  const contoursRef = React.useRef<PathContour[]>(contours);
  React.useEffect(() => {
    contoursRef.current = contours;
  });
  const [selectedContourIds, setSelectedContourIds] = React.useState<string[]>(['c1']);
  const [selectedContourId, setSelectedContourId] = React.useState<string | null>('c1');
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>('n2');
  const api = useCanvasEraser({
    toolMode: 'eraser',
    contours,
    contoursRef,
    onChangeContours: (next) => setContours(next as PathContour[]),
    onCommitHistory: vi.fn(),
    onUndo: vi.fn(),
    showCanvasToast: vi.fn(),
    selectedContourIds,
    selectedContourId,
    selectedNodeId,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
  });
  store.current = api;
  (store as any).contours = contours;
  (store as any).selectedContourIds = selectedContourIds;
  (store as any).selectedContourId = selectedContourId;
  (store as any).selectedNodeId = selectedNodeId;
  return null;
}

function renderEraser() {
  const store: { current: any } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<EraserHarness store={store} />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { store, cleanup };
}

const fakePointerEvent = (overrides: Record<string, unknown> = {}) =>
  ({
    pointerType: 'mouse',
    pointerId: 1,
    button: 0,
    buttons: 1,
    shiftKey: false,
    altKey: false,
    clientX: 0,
    clientY: 0,
    pressure: 0.5,
    timeStamp: 1000,
    stopPropagation: vi.fn(),
    currentTarget: {},
    ...overrides,
  }) as any;

describe('useCanvasEraser (Round 3, M12)', () => {
  it('cut mode clears the selection of a contour that no longer exists after the cut', () => {
    const { store, cleanup } = renderEraser();
    try {
      act(() => {
        store.current.setEraserMode('cut');
      });
      act(() => {
        store.current.handleEraserPointerDown({ x: 150, y: 90 }, fakePointerEvent({ clientX: 150, clientY: 90 }));
      });
      act(() => {
        store.current.handleEraserPointerMove({ x: 150, y: 210 }, fakePointerEvent({ clientX: 150, clientY: 210 }));
      });
      act(() => {
        store.current.handleEraserPointerUp(fakePointerEvent({ clientX: 150, clientY: 210 }));
      });
      // The rect is split into two new contours with new ids.
      expect((store as any).contours.length).toBe(2);
      expect((store as any).contours.map((c: PathContour) => c.id)).not.toContain('c1');
      // The old selection must not survive: 'c1' no longer exists.
      expect((store as any).selectedContourIds).toEqual([]);
      expect((store as any).selectedContourId).toBeNull();
      expect((store as any).selectedNodeId).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('a cut that misses everything keeps the selection', () => {
    const { store, cleanup } = renderEraser();
    try {
      act(() => {
        store.current.setEraserMode('cut');
      });
      act(() => {
        store.current.handleEraserPointerDown({ x: 400, y: 400 }, fakePointerEvent({ clientX: 400, clientY: 400 }));
      });
      act(() => {
        store.current.handleEraserPointerMove({ x: 400, y: 500 }, fakePointerEvent({ clientX: 400, clientY: 500 }));
      });
      act(() => {
        store.current.handleEraserPointerUp(fakePointerEvent({ clientX: 400, clientY: 500 }));
      });
      expect((store as any).contours.length).toBe(1);
      expect((store as any).selectedContourIds).toEqual(['c1']);
    } finally {
      cleanup();
    }
  });
});
