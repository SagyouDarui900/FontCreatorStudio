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
  selectedNodeIds?: string[];
  handleType: 'node' | 'handleIn' | 'handleOut';
  startPos: Point;
  initialNode: BezierNode;
  initialContour: PathContour;
  hasCommittedHistory?: boolean;
}

export interface UseNodeEditingOptions {
  toolMode: ToolMode;
  zoom: number;
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  // Drops the phantom undo entry a cancelled drag leaves behind, mirroring
  // cancelTransformSession. Only removes the top entry when it still
  // matches the restored contours.
  onDiscardLastHistory?: (initialContours: PathContour[]) => void;
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
  isGlyphLocked?: boolean;
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
  // Cancels an in-progress node/handle drag and restores the pre-drag
  // contour. Returns true when a drag was actually cancelled.
  handleNodeDragCancel: () => boolean;
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
    onDiscardLastHistory,
    screenToCanvas,
    gridSettings,
    snapMetrics,
    customGuidelines,
    showCanvasToast,
    onDeleteSelectedContour,
    setActiveSnapGuides,
    isGlyphLocked = false,
  } = options;

  // Selection & Node Editing State
  const [selectedContourIds, setSelectedContourIds] = useState<string[]>([]);
  const selectedContourId = selectedContourIds.length > 0 ? selectedContourIds[0] : null;
  const setSelectedContourId = useCallback((idOrUpdater: React.SetStateAction<string | null>) => {
    setSelectedContourIds((prev) => {
      const current = prev.length > 0 ? prev[0] : null;
      const next = typeof idOrUpdater === 'function' ? (idOrUpdater as (prev: string | null) => string | null)(current) : idOrUpdater;
      if (!next) {
        return prev.length === 0 ? prev : [];
      }
      if (prev.length === 1 && prev[0] === next) {
        return prev;
      }
      return [next];
    });
  }, []);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null;
  const setSelectedNodeId = useCallback((idOrUpdater: React.SetStateAction<string | null>) => {
    setSelectedNodeIds((prev) => {
      const current = prev.length > 0 ? prev[prev.length - 1] : null;
      const next = typeof idOrUpdater === 'function' ? (idOrUpdater as (prev: string | null) => string | null)(current) : idOrUpdater;
      if (!next) {
        return prev.length === 0 ? prev : [];
      }
      if (prev.length === 1 && prev[0] === next) {
        return prev;
      }
      return [next];
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
  const hasCommittedDragHistoryRef = useRef<boolean>(false);
  // B9: coalesce rapid consecutive arrow-key nudges into one history entry.
  const lastNudgeTimeRef = useRef<number>(0);
  const lastNudgeTargetKeyRef = useRef<string>('');

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
      setSelectedContourIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedNodeIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedHandleType((prev) => (prev === null ? prev : null));
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
      setSelectedContourIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedNodeIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedHandleType((prev) => (prev === null ? prev : null));
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
        const el = e.currentTarget as Element;
        (el.closest?.('svg') || el).setPointerCapture?.(e.pointerId);
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
      if (isGlyphLocked) {
        setSelectedHandleType(null);
        nodeDragSessionRef.current = null;
        showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
        return;
      }
      setSelectedHandleType(handleType);
      hasCommittedDragHistoryRef.current = false;
      nodeDragSessionRef.current = {
        contourId: contour.id,
        nodeId: node.id,
        selectedNodeIds: nextSelectedIds,
        handleType,
        startPos: canvasPos,
        initialNode: { ...node },
        initialContour: { ...contour },
        hasCommittedHistory: false,
      };
    },
    [screenToCanvas, selectedNodeIds, setSelectedContourId, isGlyphLocked, showCanvasToast]
  );

  // Check if clicking existing handle or node on main canvas pointer down
  const handleNodePointerDownOnCanvas = useCallback(
    (pos: Point, e: React.PointerEvent): boolean => {
      if (toolMode !== 'select' && toolMode !== 'node') return false;

      let foundNode = false;
      const isTouchMode = e.pointerType === 'touch';
      const handleHitDist = isTouchMode ? Math.max(30 / zoom, 24) : 16 / zoom;
      const nodeHitDist = isTouchMode ? Math.max(32 / zoom, 26) : 18 / zoom;

      const liveContours = contoursRef.current || contours;
      for (const contour of liveContours) {
        for (const node of contour.nodes) {
          // Check handleOut
          if (node.handleOut && Math.hypot(node.handleOut.x - pos.x, node.handleOut.y - pos.y) <= handleHitDist) {
            setSelectedContourId(contour.id);
            setSelectedContourIds([contour.id]);
            setSelectedNodeIds([node.id]);
            if (isGlyphLocked) {
              setSelectedHandleType(null);
              nodeDragSessionRef.current = null;
              showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            } else {
              setSelectedHandleType('handleOut');
              hasCommittedDragHistoryRef.current = false;
              nodeDragSessionRef.current = {
                contourId: contour.id,
                nodeId: node.id,
                selectedNodeIds: [node.id],
                handleType: 'handleOut',
                startPos: pos,
                initialNode: { ...node },
                initialContour: { ...contour },
                hasCommittedHistory: false,
              };
            }
            foundNode = true;
            break;
          }
          // Check handleIn
          if (node.handleIn && Math.hypot(node.handleIn.x - pos.x, node.handleIn.y - pos.y) <= handleHitDist) {
            setSelectedContourId(contour.id);
            setSelectedContourIds([contour.id]);
            setSelectedNodeIds([node.id]);
            if (isGlyphLocked) {
              setSelectedHandleType(null);
              nodeDragSessionRef.current = null;
              showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            } else {
              setSelectedHandleType('handleIn');
              hasCommittedDragHistoryRef.current = false;
              nodeDragSessionRef.current = {
                contourId: contour.id,
                nodeId: node.id,
                selectedNodeIds: [node.id],
                handleType: 'handleIn',
                startPos: pos,
                initialNode: { ...node },
                initialContour: { ...contour },
                hasCommittedHistory: false,
              };
            }
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
            if (isGlyphLocked) {
              setSelectedHandleType(null);
              nodeDragSessionRef.current = null;
              showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            } else {
              setSelectedHandleType('node');
              hasCommittedDragHistoryRef.current = false;
              nodeDragSessionRef.current = {
                contourId: contour.id,
                nodeId: node.id,
                selectedNodeIds: nextSelectedIds,
                handleType: 'node',
                startPos: pos,
                initialNode: { ...node },
                initialContour: { ...contour },
                hasCommittedHistory: false,
              };
            }
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
    [toolMode, zoom, contours, contoursRef, selectedNodeIds, setSelectedContourId, isGlyphLocked, showCanvasToast]
  );

  // Insert node on contour at point (node tool click on stroke)
  const handleInsertNodeOnContour = useCallback(
    (e: React.PointerEvent, contour: PathContour): boolean => {
      if (toolMode !== 'node') return false;
      e.stopPropagation();
      if (isGlyphLocked) {
        showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
        return false;
      }
      const clickPos = screenToCanvas(e.clientX, e.clientY);
      const liveContours = contoursRef.current || contours;
      const liveContour = liveContours.find((c) => c.id === contour.id) || contour;
      const insertResult = insertNodeOnContourAtPoint(liveContour, clickPos, 16 / zoom);
      if (insertResult) {
        const newContours = liveContours.map((c) => (c.id === contour.id ? insertResult.updatedContour : c));
        onCommitHistory?.();
        contoursRef.current = newContours;
        onChangeContours(newContours, { skipHistory: true });
        setSelectedContourId(contour.id);
        setSelectedContourIds([contour.id]);
        setSelectedNodeId(insertResult.newNodeId);
        setSelectedNodeIds([insertResult.newNodeId]);
        setSelectedHandleType('node');
        const insertedNode = insertResult.updatedContour.nodes.find((n) => n.id === insertResult.newNodeId);
        if (insertedNode) {
          hasCommittedDragHistoryRef.current = true;
          nodeDragSessionRef.current = {
            contourId: contour.id,
            nodeId: insertResult.newNodeId,
            selectedNodeIds: [insertResult.newNodeId],
            handleType: 'node',
            startPos: clickPos,
            initialNode: { ...insertedNode },
            initialContour: { ...insertResult.updatedContour },
            hasCommittedHistory: true,
          };
          try {
            const el = e.currentTarget as Element;
            (el.closest?.('svg') || el).setPointerCapture?.(e.pointerId);
          } catch {
            // Ignored
          }
        }
        showCanvasToast('頂点を追加しました', 'ドラッグして位置を調整できます');
        return true;
      }
      setSelectedContourId(contour.id);
      setSelectedContourIds([contour.id]);
      return false;
    },
    [toolMode, isGlyphLocked, screenToCanvas, zoom, contours, contoursRef, onChangeContours, setSelectedContourId, setSelectedNodeId, onCommitHistory, showCanvasToast]
  );

  // Synchronous ref-accelerated 0ms latency node and handle dragging
  const handleNodeDragMove = useCallback(
    (e: React.PointerEvent, pos: Point): boolean => {
      if (isGlyphLocked) return false;
      const isDraggingNode = Boolean(
        nodeDragSessionRef.current ||
        ((toolMode === 'select' || toolMode === 'node') && selectedContourId && selectedNodeId && selectedHandleType)
      );

      if (!isDraggingNode) return false;

      // H6: without a drag session, a move must come from a pressed
      // pointer. A bare hover (e.buttons === 0, e.g. after pointercancel
      // cleared the session) must not move the selected node.
      if (!nodeDragSessionRef.current && e.buttons === 0) return false;

      const activeContourId = nodeDragSessionRef.current?.contourId || selectedContourId!;
      const activeNodeId = nodeDragSessionRef.current?.nodeId || selectedNodeId!;
      const activeHandleType = nodeDragSessionRef.current?.handleType || selectedHandleType!;
      const sessionNodeIds = nodeDragSessionRef.current?.selectedNodeIds;
      const multiNodeIds =
        sessionNodeIds && sessionNodeIds.length > 0 && sessionNodeIds.includes(activeNodeId)
          ? sessionNodeIds
          : selectedNodeIds.length > 0 && selectedNodeIds.includes(activeNodeId)
          ? selectedNodeIds
          : [activeNodeId];

      const currentContours: PathContour[] = (contoursRef.current as PathContour[]) || contours;

      // H6: a drag that reaches here without a session (selection kept
      // after pointer capture loss, for example) gets a session, so a
      // later cancel can restore the pre-drag contour instead of leaving
      // moved contours behind.
      if (!nodeDragSessionRef.current) {
        const fallbackContour = currentContours.find((c) => c.id === activeContourId);
        const fallbackNode = fallbackContour?.nodes.find((n) => n.id === activeNodeId);
        if (fallbackContour && fallbackNode) {
          nodeDragSessionRef.current = {
            contourId: fallbackContour.id,
            nodeId: fallbackNode.id,
            selectedNodeIds: multiNodeIds,
            handleType: activeHandleType,
            startPos: pos,
            initialNode: { ...fallbackNode },
            initialContour: { ...fallbackContour },
            hasCommittedHistory: false,
          };
        }
      }
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
        const otherContours = currentContours.filter((c) => c.id !== activeContourId);
        const activeContour = currentContours.find((c) => c.id === activeContourId);
        const currentContourNodes = activeContour ? activeContour.nodes : undefined;
        const snapThreshold = Math.max(7, Math.round(12 / (zoom || 1)));
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
            if (!hasCommittedDragHistoryRef.current && !nodeDragSessionRef.current?.hasCommittedHistory) {
              onCommitHistory?.();
              hasCommittedDragHistoryRef.current = true;
              if (nodeDragSessionRef.current) {
                nodeDragSessionRef.current.hasCommittedHistory = true;
              }
            }
            onChangeContours(pendingContoursRef.current, { skipHistory: true });
          }
        });
      }
      return true;
    },
    [
      isGlyphLocked,
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
      onCommitHistory,
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
      if (pendingContoursRef.current) {
        if (!hasCommittedDragHistoryRef.current && !nodeDragSessionRef.current?.hasCommittedHistory) {
          onCommitHistory?.();
          hasCommittedDragHistoryRef.current = true;
        }
        onChangeContours(pendingContoursRef.current, { skipHistory: true });
        pendingContoursRef.current = null;
      }
      hasCommittedDragHistoryRef.current = false;
      nodeDragSessionRef.current = null;
      setSelectedHandleType((prev) => (prev === null ? prev : null));
      setActiveSnapGuides?.((prev) => (prev.length === 0 ? prev : []));
      return true;
    }
    hasCommittedDragHistoryRef.current = false;
    return false;
  }, [toolMode, selectedHandleType, onChangeContours, onCommitHistory, setActiveSnapGuides]);

  // Cancel an in-progress node/handle drag (pointercancel, Escape, glyph
  // switch): drop the pending RAF update, restore the contour captured
  // at drag start, and clear the handle selection so a later hover cannot
  // move the node (H6). When the drag's RAF already committed history,
  // the top undo entry is a phantom for the restored state and is
  // discarded, mirroring cancelTransformSession.
  const handleNodeDragCancel = useCallback((): boolean => {
    const session = nodeDragSessionRef.current;
    const pending = pendingContoursRef.current;
    if (nodeDragRafRef.current != null) {
      cancelAnimationFrame(nodeDragRafRef.current);
      nodeDragRafRef.current = null;
    }
    pendingContoursRef.current = null;
    const hadCommittedHistory =
      hasCommittedDragHistoryRef.current || session?.hasCommittedHistory === true;
    hasCommittedDragHistoryRef.current = false;
    nodeDragSessionRef.current = null;
    if (session) {
      const currentContours: PathContour[] = contoursRef.current || contours;
      // Only restore when the dragged contour still belongs to the
      // current glyph: after a glyph switch its id is absent and the
      // restore is a no-op instead of touching the new glyph.
      if (currentContours.some((c) => c.id === session.initialContour.id)) {
        const restored = currentContours.map((c) =>
          c.id === session.initialContour.id ? session.initialContour : c
        );
        contoursRef.current = restored;
        onChangeContours(restored, { skipHistory: true });
        if (hadCommittedHistory) {
          onDiscardLastHistory?.([session.initialContour]);
        }
      }
    } else if (pending) {
      // No session to restore from: flush the pending contours so the
      // ref and the React state do not diverge.
      contoursRef.current = pending;
      onChangeContours(pending, { skipHistory: true });
    }
    setSelectedHandleType((prev) => (prev === null ? prev : null));
    setActiveSnapGuides?.((prev) => (prev.length === 0 ? prev : []));
    return session !== null || pending !== null;
  }, [contours, contoursRef, onChangeContours, onDiscardLastHistory, setActiveSnapGuides]);

  // Toggle smooth / corner node type (supports 'C' key toggle on selection or direct click)
  const handleToggleNodeType = useCallback(
    (contourId?: string, nodeId?: string) => {
      if (isGlyphLocked) {
        showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
        return;
      }
      const targetIds =
        nodeId && selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeId)
          ? selectedNodeIds
          : nodeId
          ? [nodeId]
          : selectedNodeIds.length > 0
          ? selectedNodeIds
          : selectedNodeId
          ? [selectedNodeId]
          : [];
      if (targetIds.length === 0) return;

      // Determine whether primary targeted node is corner or smooth
      const liveContours = contoursRef.current || contours;
      let primaryIsCorner = true;
      for (const c of liveContours) {
        const found = c.nodes.find((n) => targetIds.includes(n.id));
        if (found) {
          primaryIsCorner = found.type !== 'smooth';
          break;
        }
      }

      let count = 0;
      const updated = liveContours.map((c) => {
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
                // L8: on an open contour the end nodes have only one real
                // neighbour. Measuring against the opposite end would bend
                // the end toward it, so use only the adjacent segment.
                const len = c.nodes.length;
                const prev = !c.closed && idx === 0 ? null : c.nodes[(idx - 1 + len) % len];
                const next =
                  !c.closed && idx === len - 1 ? null : c.nodes[(idx + 1) % len];
                if (prev && next) {
                  const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
                  const hLen = Math.min(45, Math.hypot(next.x - prev.x, next.y - prev.y) * 0.25);
                  handleOut = {
                    x: Math.round(node.x + Math.cos(angle) * hLen),
                    y: Math.round(node.y + Math.sin(angle) * hLen),
                  };
                  handleIn = {
                    x: Math.round(node.x - Math.cos(angle) * hLen),
                    y: Math.round(node.y - Math.sin(angle) * hLen),
                  };
                } else if (prev || next) {
                  // Open contour endpoint: generate only the handle on the
                  // side of the real adjacent segment.
                  const other = (prev ?? next)!;
                  const angle = Math.atan2(other.y - node.y, other.x - node.x);
                  const hLen = Math.min(
                    45,
                    Math.hypot(other.x - node.x, other.y - node.y) * 0.25
                  );
                  const handle = {
                    x: Math.round(node.x + Math.cos(angle) * hLen),
                    y: Math.round(node.y + Math.sin(angle) * hLen),
                  };
                  if (prev) handleIn = handle;
                  else handleOut = handle;
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

      if (count === 0) return;
      onCommitHistory?.();
      contoursRef.current = updated;
      onChangeContours(updated, { skipHistory: true });
      if (primaryIsCorner) {
        showCanvasToast('頂点をスムーズに変換', `${count} 個の頂点`);
      } else {
        showCanvasToast('頂点をコーナーに変換', `${count} 個の頂点`);
      }
    },
    [isGlyphLocked, contours, contoursRef, selectedNodeIds, selectedNodeId, onChangeContours, onCommitHistory, showCanvasToast]
  );

  // Add node next to selected node in contour
  const handleAddNodeToSelected = useCallback(() => {
    if (isGlyphLocked) {
      showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (!selectedContourId) return;
    const liveContours = contoursRef.current || contours;
    const target = liveContours.find((c) => c.id === selectedContourId);
    if (!target || target.nodes.length < 2) return;
    let idx = target.nodes.findIndex((n) => n.id === selectedNodeId);
    if (idx === -1) idx = 0;
    // L8: on an open contour the last node has no following segment, so
    // there is nothing to split. Wrapping to the first node would insert
    // a node across the whole contour.
    if (!target.closed && idx === target.nodes.length - 1) {
      showCanvasToast('末端の頂点には追加できません', '開いたパスの端には次の区間がありません');
      return;
    }
    const nextIdx = target.closed ? (idx + 1) % target.nodes.length : idx + 1;
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
    const nextContours = liveContours.map((c) => (c.id === selectedContourId ? updated : c));
    onCommitHistory?.();
    contoursRef.current = nextContours;
    onChangeContours(nextContours, { skipHistory: true });
    setSelectedNodeIds([newNode.id]);
  }, [isGlyphLocked, selectedContourId, selectedNodeId, contours, contoursRef, onChangeContours, onCommitHistory, showCanvasToast]);

  const onDeleteSelectedContourRef = useRef(onDeleteSelectedContour);
  useEffect(() => {
    onDeleteSelectedContourRef.current = onDeleteSelectedContour;
  }, [onDeleteSelectedContour]);

  // Delete selected nodes (supports multi-selection)
  const handleDeleteSelectedNode = useCallback(() => {
    if (isGlyphLocked) {
      showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (targetIds.length === 0) return;

    const liveContours = contoursRef.current || contours;
    let anyContourCollapsed = false;
    const updated = liveContours
      .map((c) => {
        const remaining = c.nodes.filter((n) => !targetIds.includes(n.id));
        // M13: an open contour stays a valid line with 2 nodes; only a
        // closed contour needs 3. Previously an open 3-node contour lost
        // the whole contour when one node was deleted.
        const minNodes = c.closed ? 3 : 2;
        if (remaining.length < minNodes) {
          anyContourCollapsed = true;
          return null;
        }
        return { ...c, nodes: remaining };
      })
      .filter((c): c is PathContour => c !== null);

    if (anyContourCollapsed && updated.length < liveContours.length) {
      onCommitHistory?.();
      contoursRef.current = updated;
      onChangeContours(updated, { skipHistory: true });
      setSelectedNodeIds([]);
      showCanvasToast('パスを削除しました');
      return;
    }

    onCommitHistory?.();
    contoursRef.current = updated;
    onChangeContours(updated, { skipHistory: true });
    setSelectedNodeIds([]);
    showCanvasToast('選択した頂点を削除しました', `${targetIds.length} 個`);
  }, [isGlyphLocked, selectedNodeIds, selectedNodeId, contours, contoursRef, onChangeContours, onCommitHistory, showCanvasToast]);

  // Keyboard arrow nudge for selected nodes and handles
  const handleNudgeSelectedNode = useCallback(
    (dx: number, dy: number): boolean => {
      if (isGlyphLocked) {
        showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
        return false;
      }
      const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
      if (targetIds.length === 0 && !selectedHandleType) return false;

      const liveContours = contoursRef.current || contours;
      let changed = false;
      const updated = liveContours.map((c) => {
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
        // B9: consecutive nudges of the same selection within 500 ms share
        // one history entry. Only the first nudge commits history before
        // updating contours with skipHistory; later nudges in the burst
        // move only with skipHistory and no extra commit.
        const now = Date.now();
        const targetKey = `${[...targetIds].sort().join(',')}|${selectedHandleType ?? 'none'}`;
        const isContinuation =
          now - lastNudgeTimeRef.current <= 500 && lastNudgeTargetKeyRef.current === targetKey;
        lastNudgeTimeRef.current = now;
        lastNudgeTargetKeyRef.current = targetKey;
        if (!isContinuation) {
          onCommitHistory?.();
        }
        contoursRef.current = updated;
        onChangeContours(updated, { skipHistory: true });
        return true;
      }
      return false;
    },
    [isGlyphLocked, selectedNodeIds, selectedNodeId, selectedHandleType, contours, contoursRef, onChangeContours, onCommitHistory, showCanvasToast]
  );

  // Clear all node & contour selection
  const clearNodeSelection = useCallback(() => {
    setSelectedContourIds((prev) => (prev.length === 0 ? prev : []));
    setSelectedNodeIds((prev) => (prev.length === 0 ? prev : []));
    setSelectedHandleType((prev) => (prev === null ? prev : null));
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
    handleNodeDragCancel,
    handleToggleNodeType,
    handleAddNodeToSelected,
    handleDeleteSelectedNode,
    handleNudgeSelectedNode,
    clearNodeSelection,
  };
}
