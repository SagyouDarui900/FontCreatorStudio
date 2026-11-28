// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useNodeEditing } from './useNodeEditing';
import { PathContour, GridSettings } from '../types';

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
};

function node(id: string, x: number, y: number) {
  return { id, x, y, type: 'corner' as const };
}

function rectContour(): PathContour {
  return {
    id: 'c1',
    closed: true,
    nodes: [node('n1', 100, 100), node('n2', 200, 100), node('n3', 200, 200), node('n4', 100, 200)],
  };
}

function openContour(): PathContour {
  return {
    id: 'c1',
    closed: false,
    nodes: [node('n1', 100, 100), node('n2', 200, 100), node('n3', 300, 100)],
  };
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
    stopPropagation: vi.fn(),
    currentTarget: { closest: () => null },
    ...overrides,
  }) as any;

function NodeEditingHarness({
  store,
  initialContours,
  spies,
}: {
  store: { current: any };
  initialContours: PathContour[];
  spies: { onCommitHistory: any; onDiscardLastHistory: any };
}) {
  const [contours, setContours] = React.useState<PathContour[]>(initialContours);
  const contoursRef = React.useRef<PathContour[]>(contours);
  React.useEffect(() => {
    contoursRef.current = contours;
  });
  const api = useNodeEditing({
    toolMode: 'node',
    zoom: 1,
    contours,
    contoursRef,
    onChangeContours: (next) => setContours(next as PathContour[]),
    onCommitHistory: spies.onCommitHistory,
    onDiscardLastHistory: spies.onDiscardLastHistory,
    screenToCanvas: (x, y) => ({ x, y }),
    gridSettings,
    snapMetrics,
    showCanvasToast: vi.fn(),
  });
  store.current = api;
  (store as any).contours = contours;
  return null;
}

function renderNodeEditing(initialContours: PathContour[]) {
  const store: { current: any; contours?: PathContour[] } = { current: null };
  const spies = {
    onCommitHistory: vi.fn(),
    onDiscardLastHistory: vi.fn(),
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<NodeEditingHarness store={store} initialContours={initialContours} spies={spies} />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { store, spies, cleanup };
}

const flushRaf = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

describe('useNodeEditing (Round 3)', () => {
  it('H6: cancelling a node drag restores the pre-drag contour and clears the handle', async () => {
    const { store, cleanup } = renderNodeEditing([rectContour()]);
    try {
      const contour = store.contours![0];
      act(() => {
        store.current.startNodeOrHandleDrag(
          fakePointerEvent({ clientX: 100, clientY: 100 }),
          contour,
          contour.nodes[0],
          'node'
        );
      });
      let moved: boolean;
      act(() => {
        moved = store.current.handleNodeDragMove(
          fakePointerEvent({ clientX: 150, clientY: 100, buttons: 1 }),
          { x: 150, y: 100 }
        );
      });
      expect(moved!).toBe(true);

      let cancelled: boolean;
      act(() => {
        cancelled = store.current.handleNodeDragCancel();
      });
      expect(cancelled!).toBe(true);
      await flushRaf();
      expect(store.contours![0].nodes[0].x).toBe(100);
      expect(store.contours![0].nodes[0].y).toBe(100);
      // The handle selection is cleared, so a later hover cannot drag.
      expect(store.current.selectedHandleType).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('H6: a hover after pointercancel does not move the selected node', () => {
    const { store, cleanup } = renderNodeEditing([rectContour()]);
    try {
      // Simulate the post-pointercancel state: selection kept, no session.
      act(() => {
        store.current.setSelectedContourIds(['c1']);
        store.current.setSelectedNodeIds(['n1']);
        store.current.setSelectedHandleType('node');
      });
      let moved: boolean;
      act(() => {
        moved = store.current.handleNodeDragMove(
          fakePointerEvent({ clientX: 300, clientY: 300, buttons: 0 }),
          { x: 300, y: 300 }
        );
      });
      expect(moved!).toBe(false);
      expect(store.contours![0].nodes[0]).toEqual(
        expect.objectContaining({ x: 100, y: 100 })
      );
    } finally {
      cleanup();
    }
  });

  it('H6: cancelling after the drag RAF committed history drops the phantom entry', async () => {
    const { store, spies, cleanup } = renderNodeEditing([rectContour()]);
    try {
      const contour = store.contours![0];
      act(() => {
        store.current.startNodeOrHandleDrag(
          fakePointerEvent({ clientX: 100, clientY: 100 }),
          contour,
          contour.nodes[0],
          'node'
        );
      });
      act(() => {
        store.current.handleNodeDragMove(
          fakePointerEvent({ clientX: 150, clientY: 100, buttons: 1 }),
          { x: 150, y: 100 }
        );
      });
      await flushRaf();
      expect(spies.onCommitHistory).toHaveBeenCalledTimes(1);
      expect(store.contours![0].nodes[0].x).toBe(150);

      act(() => {
        store.current.handleNodeDragCancel();
      });
      expect(store.contours![0].nodes[0].x).toBe(100);
      expect(spies.onDiscardLastHistory).toHaveBeenCalledTimes(1);
      expect(spies.onDiscardLastHistory).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'c1' }),
      ]);
    } finally {
      cleanup();
    }
  });

  it('M13: deleting one node of an open 3-node contour keeps a 2-node line', () => {
    const { store, cleanup } = renderNodeEditing([openContour()]);
    try {
      act(() => {
        store.current.setSelectedContourIds(['c1']);
        store.current.setSelectedNodeIds(['n2']);
      });
      act(() => {
        store.current.handleDeleteSelectedNode();
      });
      expect(store.contours).toHaveLength(1);
      expect(store.contours![0].closed).toBe(false);
      expect(store.contours![0].nodes.map((n: any) => n.id)).toEqual(['n1', 'n3']);
    } finally {
      cleanup();
    }
  });

  it('M13: deleting one node of a closed 3-node contour still removes the contour', () => {
    const closed3: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [node('n1', 100, 100), node('n2', 200, 100), node('n3', 150, 200)],
    };
    const { store, cleanup } = renderNodeEditing([closed3]);
    try {
      act(() => {
        store.current.setSelectedContourIds(['c1']);
        store.current.setSelectedNodeIds(['n2']);
      });
      act(() => {
        store.current.handleDeleteSelectedNode();
      });
      expect(store.contours).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('M13: deleting one node of an open 2-node contour removes the contour', () => {
    const open2: PathContour = {
      id: 'c1',
      closed: false,
      nodes: [node('n1', 100, 100), node('n2', 200, 100)],
    };
    const { store, cleanup } = renderNodeEditing([open2]);
    try {
      act(() => {
        store.current.setSelectedContourIds(['c1']);
        store.current.setSelectedNodeIds(['n2']);
      });
      act(() => {
        store.current.handleDeleteSelectedNode();
      });
      expect(store.contours).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('avoids cumulative rounding drift across multi-frame node drags and ignores right-click pointerdown', async () => {
    const { store, cleanup } = renderNodeEditing([rectContour()]);
    try {
      const contour = store.contours![0];
      // Right-click must not start a drag session
      act(() => {
        store.current.startNodeOrHandleDrag(
          fakePointerEvent({ button: 2, buttons: 2, clientX: 100, clientY: 100 }),
          contour,
          contour.nodes[0],
          'node'
        );
      });
      expect(store.current.nodeDragSessionRef.current).toBeNull();

      act(() => {
        store.current.startNodeOrHandleDrag(
          fakePointerEvent({ button: 0, buttons: 1, clientX: 100, clientY: 100 }),
          contour,
          contour.nodes[0],
          'node'
        );
      });
      // Repeated small sub-pixel drags should always compute from initialNode (no cumulative drift)
      for (let i = 1; i <= 5; i++) {
        act(() => {
          store.current.handleNodeDragMove(
            fakePointerEvent({ clientX: 100 + i * 0.14, clientY: 100 + i * 0.14, buttons: 1, altKey: true }),
            { x: 100 + i * 0.14, y: 100 + i * 0.14 }
          );
        });
        await flushRaf();
      }
      // 5 * 0.14 = 0.7 -> 100.7 (not 100 + 5 * 0.1 = 100.5)
      expect(store.contours![0].nodes[0].x).toBe(100.7);
      expect(store.contours![0].nodes[0].y).toBe(100.7);

      act(() => {
        store.current.handleNodeDragEnd();
      });
    } finally {
      cleanup();
    }
  });

  it('preserves selectedHandleType after drag end in node mode so arrow nudge moves only the handle', async () => {
    const smoothContour: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        {
          id: 'n1',
          x: 100,
          y: 100,
          type: 'corner',
          handleIn: { x: 80, y: 100 },
          handleOut: { x: 120, y: 100 },
        },
        node('n2', 200, 100),
        node('n3', 200, 200),
      ],
    };
    const { store, cleanup } = renderNodeEditing([smoothContour]);
    try {
      const contour = store.contours![0];
      act(() => {
        store.current.startNodeOrHandleDrag(
          fakePointerEvent({ clientX: 120, clientY: 100 }),
          contour,
          contour.nodes[0],
          'handleOut'
        );
      });
      act(() => {
        store.current.handleNodeDragMove(
          fakePointerEvent({ clientX: 140, clientY: 100, buttons: 1 }),
          { x: 140, y: 100 }
        );
      });
      await flushRaf();

      act(() => {
        store.current.handleNodeDragEnd();
      });

      expect(store.current.selectedHandleType).toBe('handleOut');

      // Bare pointermove after drag end must NOT move the handle
      let movedAfterUp: boolean;
      act(() => {
        movedAfterUp = store.current.handleNodeDragMove(
          fakePointerEvent({ clientX: 300, clientY: 300, buttons: 0 }),
          { x: 300, y: 300 }
        );
      });
      expect(movedAfterUp!).toBe(false);
      expect(store.contours![0].nodes[0].handleOut).toEqual({ x: 140, y: 100 });

      // Arrow nudge after drag end moves handleOut, leaving anchor node untouched
      act(() => {
        store.current.handleNudgeSelectedNode(10, -5);
      });
      expect(store.contours![0].nodes[0].x).toBe(100);
      expect(store.contours![0].nodes[0].y).toBe(100);
      expect(store.contours![0].nodes[0].handleOut).toEqual({ x: 150, y: 95 });
    } finally {
      cleanup();
    }
  });
});
