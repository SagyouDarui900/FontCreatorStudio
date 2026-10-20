import React from 'react';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Layers,
  Trash2,
  X,
} from 'lucide-react';

export interface SelContoursBBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type TransformHandle =
  | 'move'
  | 'rotate'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export interface TransformBoundingBoxLayerProps {
  toolMode: string;
  selectedContourIds: string[];
  selContoursBBox: SelContoursBBox | null;
  zoom: number;
  selectionColor: string;
  selectedContoursSvgPath: string | null;
  rotateDisplayAngle: number | null;
  handleTransformPointerDown: (e: React.PointerEvent, handle: TransformHandle, ids?: string[]) => void;
  handleRotateSelected: (deg: number) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleDuplicateSelected: () => void;
  handleMergeSelectedContours: () => void;
  handleDeleteSelected: () => void;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
}

export const TransformBoundingBoxLayer: React.FC<TransformBoundingBoxLayerProps> = React.memo(({
  toolMode,
  selectedContourIds,
  selContoursBBox,
  zoom,
  selectionColor,
  selectedContoursSvgPath,
  rotateDisplayAngle,
  handleTransformPointerDown,
  handleRotateSelected,
  handleFlipHSelected,
  handleFlipVSelected,
  handleDuplicateSelected,
  handleMergeSelectedContours,
  handleDeleteSelected,
  setSelectedContourIds,
  setSelectedNodeId,
  setSelectedHandleType,
}) => {
  if (toolMode !== 'select' || selectedContourIds.length === 0 || !selContoursBBox) {
    return null;
  }

  const bbox = selContoursBBox;
  const pad = 4;
  const bx = bbox.minX - pad;
  const by = bbox.minY - pad;
  const bw = Math.max(12, bbox.width + pad * 2);
  const bh = Math.max(12, bbox.height + pad * 2);
  const cx = bbox.centerX;
  const cy = bbox.centerY;

  const hs = Math.max(8, 10 / zoom); // handle size in canvas coordinates
  const rotStemDist = 32 / zoom;

  return (
    <g className="transform-bounding-box select-none">
      {/* Selected Path Outline Highlight */}
      {selectedContoursSvgPath && (
        <path
          d={selectedContoursSvgPath}
          fill="none"
          stroke={selectionColor}
          strokeWidth={2.5 / zoom}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}

      {/* Bounding Box Border & Drag-to-Move Stroke */}
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        fill="none"
        stroke={selectionColor}
        strokeWidth={1 / zoom}
        strokeDasharray="4 2"
        className="cursor-move"
        pointerEvents="stroke"
        onPointerDown={(e) => handleTransformPointerDown(e, 'move')}
      />

      {/* Floating Selection Quick Actions Toolbar */}
      <foreignObject
        x={cx - 125 / zoom}
        y={by - rotStemDist - 38 / zoom < 10 ? by + bh + 12 / zoom : by - rotStemDist - 38 / zoom}
        width={250 / zoom}
        height={38 / zoom}
        className="overflow-visible pointer-events-auto select-none z-50"
      >
        <div
          style={{ transform: `scale(${Math.max(0.6, Math.min(1.0, 1 / zoom))})`, transformOrigin: 'top center' }}
          className="flex items-center justify-center space-x-1 px-2.5 py-1 bg-stone-900/95 dark:bg-[#101b13]/95 text-white rounded-full shadow-lg border border-emerald-500/40 text-xs font-sans pointer-events-auto"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRotateSelected(45);
            }}
            className="p-1.5 rounded-full hover:bg-emerald-800/80 text-emerald-300 transition-colors"
            title="45°回転 (Rotate 45°)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFlipHSelected();
            }}
            className="p-1.5 rounded-full hover:bg-emerald-800/80 text-emerald-300 transition-colors"
            title="左右反転 (Flip Horizontal)"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFlipVSelected();
            }}
            className="p-1.5 rounded-full hover:bg-emerald-800/80 text-emerald-300 transition-colors"
            title="上下反転 (Flip Vertical)"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-emerald-500/30 my-auto" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateSelected();
            }}
            className="p-1.5 rounded-full hover:bg-emerald-800/80 text-emerald-300 transition-colors"
            title="複製 (Duplicate)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {selectedContourIds.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMergeSelectedContours();
              }}
              className="p-1.5 rounded-full hover:bg-emerald-600/90 text-white transition-colors"
              title="選択パーツを結合・融解 (Union)"
            >
              <Layers className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSelected();
            }}
            className="p-1.5 rounded-full hover:bg-rose-800/90 text-rose-300 transition-colors ml-0.5"
            title="削除 (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-emerald-500/30 my-auto" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedContourIds([]);
              setSelectedNodeId(null);
              setSelectedHandleType(null);
            }}
            className="p-1.5 rounded-full hover:bg-stone-700/90 text-stone-300 hover:text-white transition-colors"
            title="選択解除 (Deselect / Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </foreignObject>

      {/* Center Anchor Crosshair */}
      <g
        className="cursor-move group"
        onPointerDown={(e) => handleTransformPointerDown(e, 'move')}
      >
        <circle cx={cx} cy={cy} r={4 / zoom} fill={selectionColor} stroke="#ffffff" strokeWidth={1 / zoom} />
        <line x1={cx - 5 / zoom} y1={cy} x2={cx + 5 / zoom} y2={cy} stroke={selectionColor} strokeWidth={1 / zoom} />
        <line x1={cx} y1={cy - 5 / zoom} x2={cx} y2={cy + 5 / zoom} stroke={selectionColor} strokeWidth={1 / zoom} />
      </g>

      {/* Rotation Connector Stem Line */}
      <line
        x1={cx}
        y1={by}
        x2={cx}
        y2={by - rotStemDist}
        stroke={selectionColor}
        strokeWidth={1.5 / zoom}
        strokeDasharray="3 2"
        pointerEvents="none"
      />

      {/* Rotation Grip Handle (Top-Center) */}
      <g
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handleTransformPointerDown(e, 'rotate')}
      >
        {/* Larger invisible hit area for touch/mouse */}
        <circle
          cx={cx}
          cy={by - rotStemDist}
          r={14 / zoom}
          fill="transparent"
        />
        <circle
          cx={cx}
          cy={by - rotStemDist}
          r={7 / zoom}
          fill={selectionColor}
          stroke="#ffffff"
          strokeWidth={1.8 / zoom}
        />
        {/* Inner rotation ring indicator */}
        <circle
          cx={cx}
          cy={by - rotStemDist}
          r={3.5 / zoom}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.2 / zoom}
          strokeDasharray="4 2"
        />
      </g>

      {/* 8 Resize Handles (Corner & Edge) */}
      {/* NW (Top-Left) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'nw')} className="cursor-nwse-resize">
        <rect x={bx - hs} y={by - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx - hs / 2}
          y={by - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* N (Top-Center) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'n')} className="cursor-ns-resize">
        <rect x={bx + bw / 2 - hs} y={by - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx + bw / 2 - hs / 2}
          y={by - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* NE (Top-Right) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'ne')} className="cursor-nesw-resize">
        <rect x={bx + bw - hs} y={by - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx + bw - hs / 2}
          y={by - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* E (Middle-Right) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'e')} className="cursor-ew-resize">
        <rect x={bx + bw - hs} y={by + bh / 2 - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx + bw - hs / 2}
          y={by + bh / 2 - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* SE (Bottom-Right) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'se')} className="cursor-nwse-resize">
        <rect x={bx + bw - hs} y={by + bh - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx + bw - hs / 2}
          y={by + bh - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* S (Bottom-Center) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 's')} className="cursor-ns-resize">
        <rect x={bx + bw / 2 - hs} y={by + bh - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx + bw / 2 - hs / 2}
          y={by + bh - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* SW (Bottom-Left) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'sw')} className="cursor-nesw-resize">
        <rect x={bx - hs} y={by + bh - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx - hs / 2}
          y={by + bh - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* W (Middle-Left) */}
      <g onPointerDown={(e) => handleTransformPointerDown(e, 'w')} className="cursor-ew-resize">
        <rect x={bx - hs} y={by + bh / 2 - hs} width={hs * 2} height={hs * 2} fill="transparent" />
        <rect
          x={bx - hs / 2}
          y={by + bh / 2 - hs / 2}
          width={hs}
          height={hs}
          fill="#ffffff"
          stroke={selectionColor}
          strokeWidth={1.8 / zoom}
          rx={1.5 / zoom}
        />
      </g>

      {/* HUD Dimension Tooltip (Width x Height, Rotation Angle, Shift hint) */}
      <g transform={`translate(${bx}, ${by + bh + 12 / zoom})`} className="pointer-events-none">
        <rect
          x={0}
          y={0}
          width={Math.max(130 / zoom, (rotateDisplayAngle !== null ? 170 : 120) / zoom)}
          height={20 / zoom}
          rx={4 / zoom}
          fill="#0f172a"
          fillOpacity={0.9}
        />
        <text
          x={6 / zoom}
          y={14 / zoom}
          fill="#34d399"
          fontSize={10.5 / zoom}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {Math.round(bbox.width)}×{Math.round(bbox.height)}px
          {rotateDisplayAngle !== null ? ` ∡${rotateDisplayAngle}°` : ''}
        </text>
      </g>
    </g>
  );
});

TransformBoundingBoxLayer.displayName = 'TransformBoundingBoxLayer';
