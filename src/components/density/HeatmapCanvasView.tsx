import React from 'react';
import { ZoomIn, ZoomOut, X, Zap } from 'lucide-react';
import { PathContour } from '../../types';
import { contoursToSvgPath } from '../../utils/pathUtils';
import { GlyphDensityAnalysis, NodeDensityInfo } from '../../utils/qualityChecker';

export interface HeatmapCanvasViewProps {
  isLight: boolean;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  showHeatmapNodes: boolean;
  setShowHeatmapNodes: React.Dispatch<React.SetStateAction<boolean>>;
  showHotspots: boolean;
  setShowHotspots: React.Dispatch<React.SetStateAction<boolean>>;
  showMetricsGuides: boolean;
  setShowMetricsGuides: React.Dispatch<React.SetStateAction<boolean>>;
  selectedNode: NodeDensityInfo | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<NodeDensityInfo | null>>;
  selectedContourIndex: number | null;
  setSelectedContourIndex: React.Dispatch<React.SetStateAction<number | null>>;
  hoveredContourIndex: number | null;
  setHoveredContourIndex: React.Dispatch<React.SetStateAction<number | null>>;
  contours: PathContour[];
  densityAnalysis: GlyphDensityAnalysis;
  handleSimplifyContour: (contourIndex: number) => void;
  handleSimplifyNodeCluster: (node: NodeDensityInfo) => void;
}

export const HeatmapCanvasView: React.FC<HeatmapCanvasViewProps> = React.memo(({
  isLight,
  zoomLevel,
  setZoomLevel,
  showHeatmapNodes,
  setShowHeatmapNodes,
  showHotspots,
  setShowHotspots,
  showMetricsGuides,
  setShowMetricsGuides,
  selectedNode,
  setSelectedNode,
  selectedContourIndex,
  setSelectedContourIndex,
  hoveredContourIndex,
  setHoveredContourIndex,
  contours,
  densityAnalysis,
  handleSimplifyContour,
  handleSimplifyNodeCluster,
}) => {
  return (
    <div className="flex-1 min-h-[380px] lg:min-h-0 relative flex flex-col p-4 bg-stone-900/5 dark:bg-black/30">
      {/* Floating Overlay Controls & Legend */}
      <div className="absolute top-6 left-6 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div
          className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-3 ${
            isLight ? 'bg-white/90 border-stone-200 text-stone-800' : 'bg-[#101912]/90 border-[#223528] text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse"></span>
            <span>過密 (&lt;14px)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
            <span>密集 (&lt;30px)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span>
            <span>中度 (&lt;65px)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <span>最適</span>
          </div>
        </div>

        {/* View Toggles */}
        <div
          className={`p-1 rounded-xl border shadow-md flex items-center gap-1 ${
            isLight ? 'bg-white/90 border-stone-200' : 'bg-[#101912]/90 border-[#223528]'
          }`}
        >
          <button
            onClick={() => setShowHeatmapNodes(!showHeatmapNodes)}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
              showHeatmapNodes
                ? isLight
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-amber-900/60 text-amber-200'
                : 'text-stone-400'
            }`}
            title="アンカー点のヒートマップ色表示切替"
          >
            アンカー表示
          </button>
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
              showHotspots
                ? isLight
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-rose-900/60 text-rose-200'
                : 'text-stone-400'
            }`}
            title="密集ホットスポットのレーダー強調切替"
          >
            ホットスポット
          </button>
          <button
            onClick={() => setShowMetricsGuides(!showMetricsGuides)}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
              showMetricsGuides
                ? isLight
                  ? 'bg-stone-200 text-stone-900'
                  : 'bg-stone-800 text-stone-200'
                : 'text-stone-400'
            }`}
            title="ベースライン・仮想ボディ等のガイド表示切替"
          >
            ガイド線
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-1 border rounded-xl p-1 shadow-md bg-white/90 dark:bg-[#101912]/90 border-stone-200 dark:border-[#223528]">
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.2) * 10) / 10))}
          className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-[#1e3023] text-stone-700 dark:text-emerald-200"
          title="縮小"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono px-1 font-bold min-w-10 text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => setZoomLevel((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
          className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-[#1e3023] text-stone-700 dark:text-emerald-200"
          title="拡大"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoomLevel(1.0)}
          className="px-2 py-1 rounded text-[10px] font-semibold hover:bg-stone-200 dark:hover:bg-[#1e3023] text-stone-600 dark:text-emerald-300"
          title="100%リセット"
        >
          Reset
        </button>
      </div>

      {/* Selected Node / Contextual Inspector Popover */}
      {selectedNode && (
        <div
          className={`absolute bottom-6 right-6 z-20 p-3.5 rounded-2xl border shadow-xl max-w-xs animate-slide-up ${
            isLight ? 'bg-white/95 border-amber-300 text-stone-800' : 'bg-[#132017]/95 border-amber-600/80 text-emerald-100'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#243a2b] mb-2">
            <div className="flex items-center space-x-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              ></span>
              <span className="font-bold text-xs">
                輪郭 #{selectedNode.contourIndex + 1} • 点 #{selectedNode.nodeIndex + 1}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-[#203425] text-stone-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] mb-3">
            <div className="flex justify-between">
              <span className="text-stone-500">座標:</span>
              <span className="font-mono font-semibold">
                X: {Math.round(selectedNode.x)}, Y: {Math.round(selectedNode.y)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">局所スパン (間隔):</span>
              <span className="font-mono font-semibold">{selectedNode.span} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">近傍密集ノード数 (R=40):</span>
              <span className="font-mono font-semibold">{selectedNode.clusterCount} 個</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">過密度スコア:</span>
              <span className="font-mono font-bold" style={{ color: selectedNode.color }}>
                {selectedNode.densityScore} / 100 ({selectedNode.level === 'critical' ? '極度過密' : selectedNode.level === 'dense' ? '密集' : selectedNode.level === 'moderate' ? '中度' : '適正'})
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleSimplifyContour(selectedNode.contourIndex)}
              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 border ${
                isLight
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>この輪郭全体を単純化</span>
            </button>
            <button
              onClick={() => handleSimplifyNodeCluster(selectedNode)}
              className={`w-full py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 border ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                  : 'bg-[#1a281f] hover:bg-[#24382c] text-emerald-200 border-[#293e2f]'
              }`}
            >
              <span>この密集クラスタのみ単純化</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive SVG Stage */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
        <div
          className="relative rounded-2xl border shadow-inner flex items-center justify-center transition-transform"
          style={{
            width: 'min(100%, 540px)',
            aspectRatio: '1 / 1',
            transform: `scale(${zoomLevel})`,
            backgroundColor: isLight ? '#fcfbf9' : '#0a100c',
            borderColor: isLight ? '#e7e5e4' : '#1e3024',
          }}
        >
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full select-none"
            style={{ touchAction: 'none' }}
          >
            <defs>
              {/* Radial heat glow filters */}
              <radialGradient id="heatGlowRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatGlowOrange" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#f97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Metrics and Guide Lines */}
            {showMetricsGuides && (
              <g className="opacity-60 pointer-events-none">
                {/* Em-box boundary (0,0 to 1000,1000) */}
                <rect
                  x="30"
                  y="30"
                  width="940"
                  height="940"
                  fill="none"
                  stroke={isLight ? '#d6d3d1' : '#1d3123'}
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
                {/* Baseline Y = 800 */}
                <line
                  x1="0"
                  y1="800"
                  x2="1000"
                  y2="800"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray="12 12"
                />
                <text
                  x="980"
                  y="792"
                  fill="#ef4444"
                  fontSize="22"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Baseline (800)
                </text>

                {/* Ascender Y = 200 */}
                <line
                  x1="0"
                  y1="200"
                  x2="1000"
                  y2="200"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
                <text
                  x="980"
                  y="192"
                  fill="#0ea5e9"
                  fontSize="20"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Ascender (200)
                </text>

                {/* Center guidelines */}
                <line
                  x1="500"
                  y1="0"
                  x2="500"
                  y2="1000"
                  stroke={isLight ? '#e7e5e4' : '#192b1f'}
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <line
                  x1="0"
                  y1="500"
                  x2="1000"
                  y2="500"
                  stroke={isLight ? '#e7e5e4' : '#192b1f'}
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
              </g>
            )}

            {/* Render Main Contours */}
            {contours.map((c, cIdx) => {
              const isSelected = selectedContourIndex === cIdx;
              const isHovered = hoveredContourIndex === cIdx;
              const cPath = contoursToSvgPath([c]);
              const cAnalysis = densityAnalysis.contours[cIdx];
              const isOverloaded = cAnalysis && (cAnalysis.densityScore >= 50 || cAnalysis.criticalCount > 0);

              return (
                <g
                  key={c.id || cIdx}
                  className="cursor-pointer transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContourIndex(cIdx);
                  }}
                  onMouseEnter={() => setHoveredContourIndex(cIdx)}
                  onMouseLeave={() => setHoveredContourIndex(null)}
                >
                  {/* Contour Fill & Stroke */}
                  <path
                    d={cPath}
                    fill={
                      isSelected
                        ? isLight
                          ? '#292524'
                          : '#ecfdf5'
                        : isHovered
                        ? isLight
                          ? '#44403c'
                          : '#d1fae5'
                        : isLight
                        ? '#1c1917'
                        : '#a7f3d0'
                    }
                    fillRule="nonzero"
                    opacity={selectedContourIndex !== null && !isSelected ? 0.45 : 0.9}
                    stroke={
                      isSelected
                        ? '#3b82f6'
                        : isHovered
                        ? '#f59e0b'
                        : isOverloaded
                        ? '#f97316'
                        : 'transparent'
                    }
                    strokeWidth={isSelected ? 6 : isHovered ? 4 : isOverloaded ? 3 : 0}
                    className="transition-all"
                  />
                </g>
              );
            })}

            {/* Hotspots Radar Rings */}
            {showHotspots &&
              densityAnalysis.hotspots.map((h, hIdx) => (
                <g key={`hotspot-${hIdx}`} className="pointer-events-none">
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={h.level === 'critical' ? 36 : 26}
                    fill={h.level === 'critical' ? 'url(#heatGlowRed)' : 'url(#heatGlowOrange)'}
                  />
                  {h.level === 'critical' && (
                    <circle
                      cx={h.x}
                      cy={h.y}
                      r="28"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      className="animate-spin"
                      style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                    />
                  )}
                </g>
              ))}

            {/* Heatmap Nodes Overlay */}
            {showHeatmapNodes &&
              densityAnalysis.contours.map((cAnalysis, cIdx) => {
                const isContourSelected = selectedContourIndex === cIdx;
                const dimOther = selectedContourIndex !== null && !isContourSelected;

                return (
                  <g key={`nodes-c-${cIdx}`} opacity={dimOther ? 0.35 : 1}>
                    {cAnalysis.nodes.map((nInfo, nIdx) => {
                      const isSelected = selectedNode?.nodeId === nInfo.nodeId;
                      const isCritical = nInfo.level === 'critical';
                      const isDense = nInfo.level === 'dense';

                      const radius = isSelected
                        ? 12
                        : isCritical
                        ? 9
                        : isDense
                        ? 7.5
                        : nInfo.level === 'moderate'
                        ? 6
                        : 4.5;

                      return (
                        <g
                          key={`n-${cIdx}-${nIdx}`}
                          className="cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContourIndex(cIdx);
                            setSelectedNode(nInfo);
                          }}
                        >
                          {/* Active Selection Halo */}
                          {isSelected && (
                            <circle
                              cx={nInfo.x}
                              cy={nInfo.y}
                              r={radius + 8}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="4"
                            />
                          )}

                          {/* Critical pulsing halo */}
                          {isCritical && !isSelected && (
                            <circle
                              cx={nInfo.x}
                              cy={nInfo.y}
                              r={radius + 5}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2.5"
                              opacity="0.75"
                            />
                          )}

                          {/* Main Anchor Point Circle */}
                          <circle
                            cx={nInfo.x}
                            cy={nInfo.y}
                            r={radius}
                            fill={nInfo.color}
                            stroke={isSelected ? '#ffffff' : '#1c1917'}
                            strokeWidth={isSelected ? 3.5 : 2}
                            className="transition-transform group-hover:scale-125"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    </div>
  );
});

HeatmapCanvasView.displayName = 'HeatmapCanvasView';
