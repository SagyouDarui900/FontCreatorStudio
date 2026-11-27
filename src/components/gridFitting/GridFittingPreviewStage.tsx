import React from 'react';
import { Lock } from 'lucide-react';
import { GlyphData } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { groupContoursForRendering, getSafeGlyphViewBox } from '../../utils/path';
import { CanvasMetricsMetadataInput, resolveCanvasMetrics } from '../../utils/font/constants';
import { GridFittingTab, MobilePreviewDisplay, RenderingMode, StemInfo } from './types';

interface GridFittingPreviewStageProps {
  themeClasses: ThemeClasses;
  isLight: boolean;
  activeTab: GridFittingTab;
  selectedUnicode: number;
  selectedPpem: number;
  upm: number;
  metadata?: CanvasMetricsMetadataInput;
  currentGlyph: GlyphData;
  fittedGlyph: GlyphData;
  enablePreview: boolean;
  renderingMode: RenderingMode;
  showStemOverlay: boolean;
  onToggleStemOverlay: () => void;
  detectedStems: StemInfo[];
  hoveredStemId: string | null;
  mobilePreviewDisplay: MobilePreviewDisplay;
  onChangeMobilePreviewDisplay: (mode: MobilePreviewDisplay) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const GridFittingPreviewStage: React.FC<GridFittingPreviewStageProps> = ({
  themeClasses,
  isLight,
  activeTab,
  selectedUnicode,
  selectedPpem,
  upm,
  metadata,
  currentGlyph,
  fittedGlyph,
  enablePreview,
  renderingMode,
  showStemOverlay,
  onToggleStemOverlay,
  detectedStems,
  hoveredStemId,
  mobilePreviewDisplay,
  onChangeMobilePreviewDisplay,
  canvasRef,
}) => {
  const activeContours = enablePreview ? fittedGlyph.contours : currentGlyph.contours;
  const viewBox = getSafeGlyphViewBox(activeContours, upm);
  const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);
  const resolvedMetrics = resolveCanvasMetrics(metadata, upm);
  const renderedGroups = groupContoursForRendering(activeContours);

  return (
    <div
      className={`flex-1 p-3 sm:p-5 pb-4 sm:pb-5 flex flex-col space-y-3 sm:space-y-4 overflow-y-auto overscroll-contain ${
        activeTab !== 'preview' ? 'hidden md:flex' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <span className="truncate">
            「{currentGlyph.char}」 (U+{selectedUnicode.toString(16).toUpperCase()}) — {selectedPpem}px
          </span>
          {currentGlyph.locked && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
              <Lock className="w-2.5 h-2.5" />
              ロック中
            </span>
          )}
        </h3>
        <span className={`text-[10px] sm:text-xs font-mono shrink-0 ${themeClasses.textMuted}`}>
          1px = {(upm / selectedPpem).toFixed(1)}u
        </span>
      </div>

      {/* Mobile Preview View Switcher */}
      <div className="flex md:hidden items-center justify-center space-x-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => onChangeMobilePreviewDisplay('raster')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
            mobilePreviewDisplay === 'raster'
              ? themeClasses.activeTool
              : themeClasses.textMuted
          }`}
        >
          ピクセル格子
        </button>
        <button
          onClick={() => onChangeMobilePreviewDisplay('vector')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
            mobilePreviewDisplay === 'vector'
              ? themeClasses.activeTool
              : themeClasses.textMuted
          }`}
        >
          ベクトル & ステム
        </button>
        <button
          onClick={() => onChangeMobilePreviewDisplay('both')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
            mobilePreviewDisplay === 'both'
              ? themeClasses.activeTool
              : themeClasses.textMuted
          }`}
        >
          両方表示
        </button>
      </div>

      {/* Display Visual Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1">
        {/* 1. Vector Path & Stem Guide Overlay */}
        <div
          className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-between space-y-2 sm:space-y-3 relative overflow-hidden ${
            mobilePreviewDisplay === 'raster' ? 'hidden md:flex' : 'flex'
          } ${themeClasses.subtoolbarBg}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold flex items-center space-x-1 ${themeClasses.textMuted}`}>
              <span>ベクトルパス & ステムガイド</span>
            </span>
            <button
              onClick={onToggleStemOverlay}
              className={`text-[10px] px-2 py-0.5 rounded-md font-bold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted}`}
            >
              ステム: {showStemOverlay ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* SVG Vector Contour Display */}
          <div className="w-full h-48 sm:h-72 border rounded-xl relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#070d08]">
            <svg
              viewBox={viewBox}
              className="w-full h-full max-w-[220px] sm:max-w-[280px] max-h-[220px] sm:max-h-[280px]"
            >
              <line x1={vbX} y1={resolvedMetrics.capHeightY} x2={vbX + vbW} y2={resolvedMetrics.capHeightY} stroke="#f59e0b" strokeDasharray="8,8" strokeWidth="4" opacity="0.5" />
              <line x1={vbX} y1={resolvedMetrics.xHeightY} x2={vbX + vbW} y2={resolvedMetrics.xHeightY} stroke="#0ea5e9" strokeDasharray="6,8" strokeWidth="3" opacity="0.35" />
              <line x1={vbX} y1={resolvedMetrics.baselineY} x2={vbX + vbW} y2={resolvedMetrics.baselineY} stroke="#10b981" strokeDasharray="8,8" strokeWidth="4" opacity="0.55" />

              {showStemOverlay &&
                detectedStems.map((stem) => {
                  const isHovered = hoveredStemId === stem.id;
                  if (stem.type === 'v') {
                    return (
                      <rect
                        key={stem.id}
                        x={stem.pos - stem.width / 2}
                        y={vbY}
                        width={stem.width}
                        height={vbH}
                        fill="#06b6d4"
                        opacity={isHovered ? '0.45' : '0.2'}
                      />
                    );
                  }
                  return (
                    <rect
                      key={stem.id}
                      x={vbX}
                      y={stem.pos - stem.width / 2}
                      width={vbW}
                      height={stem.width}
                      fill="#10b981"
                      opacity={isHovered ? '0.45' : '0.2'}
                    />
                  );
                })}

              {renderedGroups.map((group) => (
                <path
                  key={group.id}
                  d={group.d}
                  fill={isLight ? '#1c1917' : '#34d399'}
                  fillRule={group.fillRule}
                  opacity={enablePreview ? '0.9' : '1.0'}
                />
              ))}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              <span>縦</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ml-2" />
              <span>横</span>
            </span>
            <span className="font-mono text-[10px]">UPM: {upm}</span>
          </div>
        </div>

        {/* 2. Low-Res Raster Simulation Canvas */}
        <div
          className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-between space-y-2 sm:space-y-3 relative overflow-hidden ${
            mobilePreviewDisplay === 'vector' ? 'hidden md:flex' : 'flex'
          } ${themeClasses.subtoolbarBg}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold flex items-center space-x-1 ${themeClasses.textMuted}`}>
              <span>{selectedPpem}px ラスタライズ結果</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${themeClasses.accentBadge}`}>
              {renderingMode}
            </span>
          </div>

          {/* Canvas Pixel Display */}
          <div className={`w-full h-48 sm:h-72 border rounded-xl flex items-center justify-center p-2 sm:p-3 overflow-hidden ${themeClasses.cardBg}`}>
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className={`max-w-[200px] sm:max-w-[280px] max-h-[200px] sm:max-h-[280px] rounded-lg border shadow-inner ${themeClasses.border}`}
            />
          </div>

          {/* Actual Size 1x Preview using compiled vector path */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className={`text-[10px] sm:text-[11px] font-bold ${themeClasses.textMuted}`}>原寸 ({selectedPpem}px):</span>
              <div className={`p-1.5 sm:p-2 rounded-lg border inline-flex items-center justify-center min-w-[32px] min-h-[32px] ${themeClasses.cardBg}`}>
                {renderedGroups.length > 0 ? (
                  <svg
                    viewBox={viewBox}
                    width={selectedPpem}
                    height={selectedPpem}
                    shapeRendering={renderingMode === 'mono' ? 'crispEdges' : 'geometricPrecision'}
                    aria-label={`${currentGlyph.char} 原寸プレビュー`}
                  >
                    {renderedGroups.map((group) => (
                      <path
                        key={group.id}
                        d={group.d}
                        fill={isLight ? '#1c1917' : '#34d399'}
                        fillRule={group.fillRule}
                      />
                    ))}
                  </svg>
                ) : (
                  <span
                    style={{ fontSize: `${selectedPpem}px`, lineHeight: '1' }}
                    className="font-bold opacity-35"
                  >
                    {currentGlyph.char}
                  </span>
                )}
              </div>
            </div>

            <span className={`text-[10px] font-mono ${themeClasses.textMuted}`}>
              {selectedPpem}x{selectedPpem}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
