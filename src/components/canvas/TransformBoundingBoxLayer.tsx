import React from 'react';

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
  isGlyphLocked?: boolean;
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
  isGlyphLocked = false,
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
        className={isGlyphLocked ? 'cursor-default' : 'cursor-move'}
        pointerEvents={isGlyphLocked ? 'none' : 'stroke'}
        onPointerDown={(e) => {
          if (isGlyphLocked) return;
          handleTransformPointerDown(e, 'move');
        }}
      />

      {/* Center Anchor Crosshair */}
      <g
        className={isGlyphLocked ? 'cursor-default' : 'cursor-move group'}
        onPointerDown={(e) => {
          if (isGlyphLocked) return;
          handleTransformPointerDown(e, 'move');
        }}
      >
        <circle cx={cx} cy={cy} r={4 / zoom} fill={selectionColor} stroke="#ffffff" strokeWidth={1 / zoom} />
        <line x1={cx - 5 / zoom} y1={cy} x2={cx + 5 / zoom} y2={cy} stroke={selectionColor} strokeWidth={1 / zoom} />
        <line x1={cx} y1={cy - 5 / zoom} x2={cx} y2={cy + 5 / zoom} stroke={selectionColor} strokeWidth={1 / zoom} />
      </g>

      {!isGlyphLocked && (
        <>
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
        </>
      )}

      {/* HUD Dimension Tooltip (Width x Height, Rotation Angle) */}
      <g transform={`translate(${bx}, ${by + bh + 16 / zoom})`} className="pointer-events-none">
        <rect
          x={0}
          y={0}
          width={(rotateDisplayAngle !== null ? 156 : 108) / zoom}
          height={18 / zoom}
          rx={4 / zoom}
          fill="#0f172a"
          fillOpacity={0.85}
        />
        <text
          x={6 / zoom}
          y={12.5 / zoom}
          fill="#34d399"
          fontSize={10 / zoom}
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
