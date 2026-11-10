import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BezierNode,
  PathContour,
  Point,
  ToolMode,
  GridSettings,
  SnapGuideLine,
  CustomGuideline,
} from '../types';
import { generateId } from '../utils/path/id';
import { toggleNodeType, insertNodeOnContourAtPoint } from '../utils/path/stroke';
import { snapSinglePoint } from '../utils/snap';

export interface NodeDragSession {
  contourId: string;
  nodeId: string;
  handleType: 'node' | 'handleIn' | 'handleOut';
  startPos: Point;
  initialNode: BezierNode;
  initialContour: PathContour;
}

export interface UseNodeEditingOptions {
  toolMode: ToolMode;
  zoom: number;
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  screenToCanvas: (clientX: number, clientY: number) => Point;
  gridSettings: GridSettings;
  snapMetrics: {
    lsb: number;
    advanceWidth: number;
    baseline: number;
    ascender: number;
    capHeight: number;
    xHeight: number;
    descender: number;
  };
  customGuidelines?: CustomGuideline[];
  showCanvasToast: (message: string, subText?: string) => void;
  onDeleteSelectedContour?: () => void;
  setActiveSnapGuides?: React.Dispatch<React.SetStateAction<SnapGuideLine[]>>;
}

export interface UseNodeEditingReturn {
  // Selection state
  selectedContourIds: string[];
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContourId: string | null;
  setSelectedContourId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedNodeId: string | null;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedHandleType: 'node' | 'handleIn' | 'handleOut' | null;
  setSelectedHandleType: React.Dispatch<React.SetStateAction<'node' | 'handleIn' | 'handleOut' | null>>;

  // Touch loupe magnifier state
  touchLoupeState: {
    visible: boolean;
    screenX: number;
    screenY: number;
    canvasPos: Point | null;
  };
  setTouchLoupeState: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      screenX: number;
      screenY: number;
      canvasPos: Point | null;
    }>
  >;

  // Drag session ref and pending contours
  nodeDragSessionRef: React.MutableRefObject<NodeDragSession | null>;
  pendingContoursRef: React.MutableRefObject<PathContour[] | null>;

  // Node & handle interaction handlers
  startNodeOrHandleDrag: (
    e: React.PointerEvent,
    contour: PathContour,
    node: BezierNode,
    handleType: 'node' | 'handleIn' | 'handleOut'
  ) => void;
  handleNodePointerDownOnCanvas: (pos: Point, e: React.PointerEvent) => boolean;
  handleInsertNodeOnContour: (e: React.PointerEvent, contour: PathContour) => boolean;
  handleNodeDragMove: (e: React.PointerEvent, pos: Point) => boolean;
  handleNodeDragEnd: () => boolean;
  handleToggleNodeType: (contourId?: string, nodeId?: string) => void;
  handleAddNodeToSelected: () => void;
  handleDeleteSelectedNode: () => void;
  handleNudgeSelectedNode: (dx: number, dy: number) => boolean;
  clearNodeSelection: () => void;
}

export function useNodeEditing(options: UseNodeEditingOptions): UseNodeEditingReturn {
  const {
    toolMode,
    zoom,
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    screenToCanvas,
    gridSettings,
    snapMetrics,
    customGuidelines,
    showCanvasToast,
    onDeleteSelectedContour,
    setActiveSnapGuides,
  } = options;

  // Selection & Node Editing State
  const [selectedContourIds, setSelectedContourIds] = useState<string[]>([]);
  const selectedContourId = selectedContourIds.length > 0 ? selectedContourIds[0] : null;
  const setSelectedContourId = useCallback((idOrUpdater: React.SetStateAction<string | null>) => {
    setSelectedContourIds((prev) => {
      const current = prev.length > 0 ? prev[0] : null;
      const next = typeof idOrUpdater === 'function' ? (idOrUpdater as (prev: string | null) => string | null)(current) : idOrUpdater;
      return next ? [next] : [];
    });
  }, []);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null;
  const setSelectedNodeId = useCallback((idOrUpdater: React.SetStateAction<string | null>) => {
    setSelectedNodeIds((prev) => {
      const current = prev.length > 0 ? prev[prev.length - 1] : null;
      const next = typeof idOrUpdater === 'function' ? (idOrUpdater as (prev: string | null) => string | null)(current) : idOrUpdater;
      return next ? [next] : [];
    });
  }, []);
  const [selectedHandleType, setSelectedHandleType] = useState<'node' | 'handleIn' | 'handleOut' | null>(null);

  // Mobile / Tablet Touch Precision Magnifier Loupe state
  const [touchLoupeState, setTouchLoupeState] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    canvasPos: Point | null;
  }>({
    visible: false,
    screenX: 0,
    screenY: 0,
    canvasPos: null,
  });

  // Drag Session Refs & Throttled RAF for 60fps dragging
  const nodeDragRafRef = useRef<number | null>(null);
  const pendingContoursRef = useRef<PathContour[] | null>(null);
  const nodeDragSessionRef = useRef<NodeDragSession | null>(null);

  // External contour selection listener (e.g. from radical insertion)
  useEffect(() => {
    const handleExternalSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ ids?: string[] }>;
      if (customEvent.detail && Array.isArray(customEvent.detail.ids) && customEvent.detail.ids.length > 0) {
        setSelectedContourIds(customEvent.detail.ids);
        setSelectedNodeIds([]);
        setSelectedHandleType(null);
      }
    };
    const handleDeselectAll = () => {
      setSelectedContourIds([]);
      setSelectedNodeIds([]);
      setSelectedHandleType(null);
    };
    window.addEventListener('font_editor_select_contours', handleExternalSelect);
    window.addEventListener('font_editor_deselect_all', handleDeselectAll);
    return () => {
      window.removeEventListener('font_editor_select_contours', handleExternalSelect);
      window.removeEventListener('font_editor_deselect_all', handleDeselectAll);
    };
  }, []);

  // When switching tool modes away from selection / node editing, automatically clear contour selections
  useEffect(() => {
    if (toolMode !== 'select' && toolMode !== 'node') {
      setSelectedContourIds([]);
      setSelectedNodeIds([]);
      setSelectedHandleType(null);
    }
  }, [toolMode]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (nodeDragRafRef.current != null) {
        cancelAnimationFrame(nodeDragRafRef.current);
      }
    };
  }, []);

  // Direct handle or node drag start (e.g. clicked on SVG handle/node circle)
  const startNodeOrHandleDrag = useCallback(
    (
      e: React.PointerEvent,
      contour: PathContour,
      node: BezierNode,
      handleType: 'node' | 'handleIn' | 'handleOut'
    ) => {
      e.stopPropagation();
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // Ignored
      }
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setSelectedContourId(contour.id);
      setSelectedContourIds([contour.id]);

      let nextSelectedIds: string[];
      if (handleType === 'node') {
        if (e.shiftKey) {
          if (selectedNodeIds.includes(node.id)) {
            nextSelectedIds = selectedNodeIds.filter((id) => id !== node.id);
          } else {
            nextSelectedIds = [...selectedNodeIds, node.id];
          }
        } else {
          if (selectedNodeIds.includes(node.id)) {
            nextSelectedIds = selectedNodeIds;
          } else {
            nextSelectedIds = [node.id];
          }
        }
      } else {
        nextSelectedIds = [node.id];
      }

      setSelectedNodeIds(nextSelectedIds);
      setSelectedHandleType(handleType);
      nodeDragSessionRef.current = {
        contourId: contour.id,
        nodeId: node.id,
        handleType,
        startPos: canvasPos,
        initialNode: { ...node },
        initialContour: { ...contour },
      };
    },
    [screenToCanvas, selectedNodeIds, setSelectedContourId]
  );

  // Check if clicking existing handle or node on main canvas pointer down
  const handleNodePointerDownOnCanvas = useCallback(
    (pos: Point, e: React.PointerEvent): boolean => {
      if (toolMode !== 'select' && toolMode !== 'node') return false;

      let foundNode = false;
      const isTouchMode = e.pointerType === 'touch';
      const handleHitDist = isTouchMode ? Math.max(30 / zoom, 24) : 16 / zoom;
      const nodeHitDist = isTouchMode ? Math.max(32 / zoom, 26) : 18 / zoom;

      for (const contour of contours) {
        for (const node of contour.nodes) {
          // Check handleOut
          if (node.handleOut && Math.hypot(node.handleOut.x - pos.x, node.handleOut.y - pos.y) <= handleHitDist) {
            setSelectedContourId(contour.id);
            setSelectedContourIds([contour.id]);
            setSelectedNodeIds([node.id]);
            setSelectedHandleType('handleOut');
            nodeDragSessionRef.current = {
              contourId: contour.id,
              nodeId: node.id,
              handleType: 'handleOut',
              startPos: pos,
              initialNode: { ...node },
              initialContour: { ...contour },
            };
            foundNode = true;
            break;
          }
          // Check handleIn
          if (node.handleIn && Math.hypot(node.handleIn.x - pos.x, node.handleIn.y - pos.y) <= handleHitDist) {
            setSelectedContourId(contour.id);
            setSelectedContourIds([contour.id]);
            setSelectedNodeIds([node.id]);
            setSelectedHandleType('handleIn');
            nodeDragSessionRef.current = {
              contourId: contour.id,
              nodeId: node.id,
              handleType: 'handleIn',
              startPos: pos,
              initialNode: { ...node },
              initialContour: { ...contour },
            };
            foundNode = true;
            break;
          }
          // Check node anchor
          if (Math.hypot(node.x - pos.x, node.y - pos.y) <= nodeHitDist) {
            setSelectedContourId(contour.id);
            setSelectedContourIds([contour.id]);

            let nextSelectedIds: string[];
            if (e.shiftKey) {
              if (selectedNodeIds.includes(node.id)) {
                nextSelectedIds = selectedNodeIds.filter((id) => id !== node.id);
              } else {
                nextSelectedIds = [...selectedNodeIds, node.id];
              }
            } else {
              if (selectedNodeIds.includes(node.id)) {
                nextSelectedIds = selectedNodeIds;
              } else {
                nextSelectedIds = [node.id];
              }
            }
            setSelectedNodeIds(nextSelectedIds);
            setSelectedHandleType('node');
            nodeDragSessionRef.current = {
              contourId: contour.id,
              nodeId: node.id,
              handleType: 'node',
              startPos: pos,
              initialNode: { ...node },
              initialContour: { ...contour },
            };
            foundNode = true;
            break;
          }
        }
        if (foundNode) break;
      }

      if (foundNode) {
        return true;
      }

      // Deselect if clicked empty canvas area (unless Shift is pressed)
      if (!e.shiftKey) {
        setSelectedContourIds([]);
        setSelectedContourId(null);
        setSelectedNodeIds([]);
      }
      setSelectedHandleType(null);
      return false;
    },
    [toolMode, zoom, contours, selectedNodeIds, setSelectedContourId]
  );

  // Insert node on contour at point (node tool click on stroke)
  const handleInsertNodeOnContour = useCallback(
    (e: React.PointerEvent, contour: PathContour): boolean => {
      if (toolMode !== 'node') return false;
      e.stopPropagation();
      const clickPos = screenToCanvas(e.clientX, e.clientY);
      const insertResult = insertNodeOnContourAtPoint(contour, clickPos, 16 / zoom);
      if (insertResult) {
        const newContours = contours.map((c) => (c.id === contour.id ? insertResult.updatedContour : c));
        onChangeContours(newContours);
        setSelectedContourId(contour.id);
        setSelectedContourIds([contour.id]);
        setSelectedNodeId(insertResult.newNodeId);
        setSelectedHandleType('node');
        const insertedNode = insertResult.updatedContour.nodes.find((n) => n.id === insertResult.newNodeId);
        if (insertedNode) {
          nodeDragSessionRef.current = {
            contourId: contour.id,
            nodeId: insertResult.newNodeId,
            handleType: 'node',
            startPos: clickPos,
            initialNode: { ...insertedNode },
            initialContour: { ...insertResult.updatedContour },
          };
          try {
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          } catch {
            // Ignored
          }
        }
        onCommitHistory?.();
        showCanvasToast('頂点を追加しました', 'ドラッグして位置を調整できます');
        return true;
      }
      setSelectedContourId(contour.id);
      setSelectedContourIds([contour.id]);
      return false;
    },
    [toolMode, screenToCanvas, zoom, contours, onChangeContours, setSelectedContourId, onCommitHistory, showCanvasToast]
  );

  // Synchronous ref-accelerated 0ms latency node and handle dragging
  const handleNodeDragMove = useCallback(
    (e: React.PointerEvent, pos: Point): boolean => {
      const isDraggingNode = Boolean(
        nodeDragSessionRef.current ||
        ((toolMode === 'select' || toolMode === 'node') && selectedContourId && selectedNodeId && selectedHandleType)
      );

      if (!isDraggingNode) return false;

      const activeContourId = nodeDragSessionRef.current?.contourId || selectedContourId!;
      const activeNodeId = nodeDragSessionRef.current?.nodeId || selectedNodeId!;
      const activeHandleType = nodeDragSessionRef.current?.handleType || selectedHandleType!;
      const multiNodeIds = selectedNodeIds.length > 0 && selectedNodeIds.includes(activeNodeId)
        ? selectedNodeIds
        : [activeNodeId];

      let snapPos = pos;

      if (e.pointerType === 'touch') {
        setTouchLoupeState({
          visible: true,
          screenX: e.clientX,
          screenY: e.clientY,
          canvasPos: snapPos,
        });
      }

      if (activeHandleType === 'node' && !e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
        const otherContours = contours.filter((c) => c.id !== activeContourId);
        const activeContour = contours.find((c) => c.id === activeContourId);
        const currentContourNodes = activeContour ? activeContour.nodes : undefined;
        const snapThreshold = 8; // Requirement 4: 8px threshold
        const snapResult = snapSinglePoint(
          pos,
          otherContours,
          snapMetrics,
          customGuidelines,
          snapThreshold,
          gridSettings,
          currentContourNodes,
          activeNodeId
        );
        snapPos = snapResult.point;
        if (setActiveSnapGuides) {
          setActiveSnapGuides(snapResult.activeGuides);
        }
      } else if (activeHandleType === 'node' && setActiveSnapGuides) {
        setActiveSnapGuides([]);
      }

      const currentContours: PathContour[] = (contoursRef.current as PathContour[]) || contours;

      // Find the primary node to compute delta
      let primaryNode: BezierNode | undefined;
      for (const c of currentContours) {
        const found = c.nodes.find((n) => n.id === activeNodeId);
        if (found) {
          primaryNode = found;
          break;
        }
      }
      const dx = primaryNode ? snapPos.x - primaryNode.x : 0;
      const dy = primaryNode ? snapPos.y - primaryNode.y : 0;

      const updatedContours = currentContours.map((contour: PathContour) => {
        if (activeHandleType !== 'node' && contour.id !== activeContourId) return contour;
        const hasMatchingNodes = contour.nodes.some((n) => multiNodeIds.includes(n.id));
        if (activeHandleType === 'node' && !hasMatchingNodes) return contour;

        return {
          ...contour,
          nodes: contour.nodes.map((node: BezierNode) => {
            if (activeHandleType === 'node') {
              if (!multiNodeIds.includes(node.id)) return node;
              return {
                ...node,
                x: Math.round((node.x + dx) * 10) / 10,
                y: Math.round((node.y + dy) * 10) / 10,
                handleIn: node.handleIn
                  ? { x: Math.round((node.handleIn.x + dx) * 10) / 10, y: Math.round((node.handleIn.y + dy) * 10) / 10 }
                  : null,
                handleOut: node.handleOut
                  ? { x: Math.round((node.handleOut.x + dx) * 10) / 10, y: Math.round((node.handleOut.y + dy) * 10) / 10 }
                  : null,
              };
            } else if (node.id === activeNodeId && activeHandleType === 'handleOut') {
              if (e.altKey) {
                return {
                  ...node,
                  handleOut: { x: pos.x, y: pos.y },
                  type: 'corner' as const,
                };
              }
              if (node.type === 'smooth' || node.type === 'symmetric') {
                const hdx = pos.x - node.x;
                const hdy = pos.y - node.y;
                const lenOut = Math.hypot(hdx, hdy);
                let handleIn = node.handleIn;
                if (lenOut > 0.01 && handleIn) {
                  const lenIn =
                    node.type === 'symmetric'
                      ? lenOut
                      : Math.hypot(handleIn.x - node.x, handleIn.y - node.y);
                  const angle = Math.atan2(hdy, hdx);
                  handleIn = {
                    x: Math.round(node.x - Math.cos(angle) * lenIn),
                    y: Math.round(node.y - Math.sin(angle) * lenIn),
                  };
                }
                return {
                  ...node,
                  handleOut: { x: pos.x, y: pos.y },
                  handleIn,
                };
              }
              return {
                ...node,
                handleOut: { x: pos.x, y: pos.y },
              };
            } else if (node.id === activeNodeId && activeHandleType === 'handleIn') {
              if (e.altKey) {
                return {
                  ...node,
                  handleIn: { x: pos.x, y: pos.y },
                  type: 'corner' as const,
                };
              }
              if (node.type === 'smooth' || node.type === 'symmetric') {
                const hdx = pos.x - node.x;
                const hdy = pos.y - node.y;
                const lenIn = Math.hypot(hdx, hdy);
                let handleOut = node.handleOut;
                if (lenIn > 0.01 && handleOut) {
                  const lenOut =
                    node.type === 'symmetric'
                      ? lenIn
                      : Math.hypot(handleOut.x - node.x, handleOut.y - node.y);
                  const angle = Math.atan2(hdy, hdx);
                  handleOut = {
                    x: Math.round(node.x - Math.cos(angle) * lenOut),
                    y: Math.round(node.y - Math.sin(angle) * lenOut),
                  };
                }
                return {
                  ...node,
                  handleIn: { x: pos.x, y: pos.y },
                  handleOut,
                };
              }
              return {
                ...node,
                handleIn: { x: pos.x, y: pos.y },
              };
            }
            return node;
          }),
        };
      });

      contoursRef.current = updatedContours;
      pendingContoursRef.current = updatedContours;
      if (nodeDragRafRef.current == null) {
        nodeDragRafRef.current = requestAnimationFrame(() => {
          nodeDragRafRef.current = null;
          if (pendingContoursRef.current) {
            onChangeContours(pendingContoursRef.current);
          }
        });
      }
      return true;
    },
    [
      toolMode,
      selectedContourId,
      selectedNodeId,
      selectedNodeIds,
      selectedHandleType,
      gridSettings,
      contours,
      zoom,
      snapMetrics,
      customGuidelines,
      contoursRef,
      onChangeContours,
      setActiveSnapGuides,
    ]
  );

  // Finalize node/handle drag
  const handleNodeDragEnd = useCallback((): boolean => {
    if (nodeDragSessionRef.current || ((toolMode === 'select' || toolMode === 'node') && selectedHandleType)) {
      if (nodeDragRafRef.current != null) {
        cancelAnimationFrame(nodeDragRafRef.current);
        nodeDragRafRef.current = null;
      }
      let didChange = false;
      if (pendingContoursRef.current) {
        onChangeContours(pendingContoursRef.current);
        pendingContoursRef.current = null;
        didChange = true;
      }
      nodeDragSessionRef.current = null;
      setSelectedHandleType(null);
      if (didChange) {
        onCommitHistory?.();
      }
      return true;
    }
    return false;
  }, [toolMode, selectedHandleType, onChangeContours, onCommitHistory]);

  // Toggle smooth / corner node type (supports 'C' key toggle on selection or direct click)
  const handleToggleNodeType = useCallback(
    (contourId?: string, nodeId?: string) => {
      const targetIds = nodeId
        ? [nodeId]
        : selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
        ? [selectedNodeId]
        : [];
      if (targetIds.length === 0) return;

      // Determine whether primary targeted node is corner or smooth
      let primaryIsCorner = true;
      for (const c of contours) {
        const found = c.nodes.find((n) => targetIds.includes(n.id));
        if (found) {
          primaryIsCorner = found.type !== 'smooth';
          break;
        }
      }

      let count = 0;
      const updated = contours.map((c) => {
        const hasAny = c.nodes.some((n) => targetIds.includes(n.id));
        if (!hasAny) return c;

        return {
          ...c,
          nodes: c.nodes.map((node, idx) => {
            if (!targetIds.includes(node.id)) return node;
            count++;

            if (primaryIsCorner) {
              // Convert to smooth
              let handleIn = node.handleIn;
              let handleOut = node.handleOut;
              if (!handleIn && !handleOut) {
                const prev = c.nodes[(idx - 1 + c.nodes.length) % c.nodes.length];
                const next = c.nodes[(idx + 1) % c.nodes.length];
                if (prev && next) {
                  const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
                  const len = Math.min(45, Math.hypot(next.x - prev.x, next.y - prev.y) * 0.25);
                  handleOut = {
                    x: Math.round(node.x + Math.cos(angle) * len),
                    y: Math.round(node.y + Math.sin(angle) * len),
                  };
                  handleIn = {
                    x: Math.round(node.x - Math.cos(angle) * len),
                    y: Math.round(node.y - Math.sin(angle) * len),
                  };
                }
              }
              return {
                ...node,
                type: 'smooth' as const,
                handleIn,
                handleOut,
              };
            } else {
              // Convert to corner
              return {
                ...node,
                type: 'corner' as const,
              };
            }
          }),
        };
      });

      onChangeContours(updated);
      onCommitHistory?.();
      if (primaryIsCorner) {
        showCanvasToast('頂点をスムーズに変換', `${count} 個の頂点`);
      } else {
        showCanvasToast('頂点をコーナーに変換', `${count} 個の頂点`);
      }
    },
    [contours, selectedNodeIds, selectedNodeId, onChangeContours, onCommitHistory, showCanvasToast]
  );

  // Add node next to selected node in contour
  const handleAddNodeToSelected = useCallback(() => {
    if (!selectedContourId) return;
    const target = contours.find((c) => c.id === selectedContourId);
    if (!target || target.nodes.length < 2) return;
    let idx = target.nodes.findIndex((n) => n.id === selectedNodeId);
    if (idx === -1) idx = 0;
    const nextIdx = (idx + 1) % target.nodes.length;
    const n1 = target.nodes[idx];
    const n2 = target.nodes[nextIdx];

    const newNode: BezierNode = {
      id: generateId(),
      x: Math.round((n1.x + n2.x) / 2),
      y: Math.round((n1.y + n2.y) / 2),
      type: n1.type || 'smooth',
    };

    const newNodes = [...target.nodes];
    newNodes.splice(idx + 1, 0, newNode);
    const updated = { ...target, nodes: newNodes };
    onChangeContours(contours.map((c) => (c.id === selectedContourId ? updated : c)));
    setSelectedNodeIds([newNode.id]);
    onCommitHistory?.();
  }, [selectedContourId, selectedNodeId, contours, onChangeContours, onCommitHistory]);

  const onDeleteSelectedContourRef = useRef(onDeleteSelectedContour);
  useEffect(() => {
    onDeleteSelectedContourRef.current = onDeleteSelectedContour;
  }, [onDeleteSelectedContour]);

  // Delete selected nodes (supports multi-selection)
  const handleDeleteSelectedNode = useCallback(() => {
    const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (targetIds.length === 0) return;

    let anyContourCollapsed = false;
    const updated = contours
      .map((c) => {
        const remaining = c.nodes.filter((n) => !targetIds.includes(n.id));
        if (remaining.length <= 2) {
          anyContourCollapsed = true;
          return null;
        }
        return { ...c, nodes: remaining };
      })
      .filter((c): c is PathContour => c !== null);

    if (anyContourCollapsed && updated.length < contours.length) {
      onChangeContours(updated);
      setSelectedNodeIds([]);
      onCommitHistory?.();
      showCanvasToast('パスを削除しました');
      return;
    }

    onChangeContours(updated);
    setSelectedNodeIds([]);
    onCommitHistory?.();
    showCanvasToast('選択した頂点を削除しました', `${targetIds.length} 個`);
  }, [selectedNodeIds, selectedNodeId, contours, onChangeContours, onCommitHistory, showCanvasToast]);

  // Keyboard arrow nudge for selected nodes and handles
  const handleNudgeSelectedNode = useCallback(
    (dx: number, dy: number): boolean => {
      const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
      if (targetIds.length === 0 && !selectedHandleType) return false;

      let changed = false;
      const updated = contours.map((c) => {
        const hasSelected = c.nodes.some((n) => targetIds.includes(n.id));
        if (!hasSelected) return c;

        return {
          ...c,
          nodes: c.nodes.map((n) => {
            if (!targetIds.includes(n.id)) return n;
            changed = true;

            // Handle-specific nudge
            if (selectedHandleType === 'handleIn' && n.handleIn) {
              return {
                ...n,
                handleIn: {
                  x: Math.round((n.handleIn.x + dx) * 10) / 10,
                  y: Math.round((n.handleIn.y + dy) * 10) / 10,
                },
              };
            }
            if (selectedHandleType === 'handleOut' && n.handleOut) {
              return {
                ...n,
                handleOut: {
                  x: Math.round((n.handleOut.x + dx) * 10) / 10,
                  y: Math.round((n.handleOut.y + dy) * 10) / 10,
                },
              };
            }

            // Vertex + attached handles nudge
            return {
              ...n,
              x: Math.round((n.x + dx) * 10) / 10,
              y: Math.round((n.y + dy) * 10) / 10,
              handleIn: n.handleIn
                ? {
                    x: Math.round((n.handleIn.x + dx) * 10) / 10,
                    y: Math.round((n.handleIn.y + dy) * 10) / 10,
                  }
                : undefined,
              handleOut: n.handleOut
                ? {
                    x: Math.round((n.handleOut.x + dx) * 10) / 10,
                    y: Math.round((n.handleOut.y + dy) * 10) / 10,
                  }
                : undefined,
            };
          }),
        };
      });

      if (changed) {
        onChangeContours(updated);
        onCommitHistory?.();
        return true;
      }
      return false;
    },
    [selectedNodeIds, selectedNodeId, selectedHandleType, contours, onChangeContours, onCommitHistory]
  );

  // Clear all node & contour selection
  const clearNodeSelection = useCallback(() => {
    setSelectedContourIds([]);
    setSelectedNodeIds([]);
    setSelectedHandleType(null);
  }, []);

  return {
    selectedContourIds,
    setSelectedContourIds,
    selectedContourId,
    setSelectedContourId,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeId,
    setSelectedNodeId,
    selectedHandleType,
    setSelectedHandleType,
    touchLoupeState,
    setTouchLoupeState,
    nodeDragSessionRef,
    pendingContoursRef,
    startNodeOrHandleDrag,
    handleNodePointerDownOnCanvas,
    handleInsertNodeOnContour,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleToggleNodeType,
    handleAddNodeToSelected,
    handleDeleteSelectedNode,
    handleNudgeSelectedNode,
    clearNodeSelection,
  };
}
