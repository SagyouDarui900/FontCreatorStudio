import React, { useState } from 'react';
import { FontProject, GlyphData } from '../../types';
import { getSafeGlyphViewBox } from '../../utils/path';
import { getThemeClasses, ThemeClasses } from '../../utils/theme';
import { TargetScope } from './types';
import { Eye, Layers, Columns2 } from 'lucide-react';

export interface BatchPreviewSectionProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
  project: FontProject;
  previewGlyph: GlyphData | null;
  origSvg: string;
  normSvg: string;
  origBbox: { width: number; height: number };
  normBbox: { width: number; height: number };
  targetWidth: number;
  targetHeight: number;
  scope: TargetScope;
  setScope: (scope: TargetScope) => void;
  targetGlyphsCount: number;
  targetGlyphs?: GlyphData[];
  onSelectPreviewGlyph?: (glyph: GlyphData) => void;
}

export const BatchPreviewSection: React.FC<BatchPreviewSectionProps> = React.memo(({
  isLight,
  themeClasses: propThemeClasses,
  project,
  previewGlyph,
  origSvg,
  normSvg,
  origBbox,
  normBbox,
  targetWidth,
  targetHeight,
  scope,
  setScope,
  targetGlyphsCount,
  targetGlyphs = [],
  onSelectPreviewGlyph,
}) => {
  const themeClasses = propThemeClasses || getThemeClasses(isLight ? 'light' : 'dark');
  const [viewMode, setViewMode] = useState<'overlay' | 'side' | 'norm'>('overlay');

  const upm = project?.metadata?.unitsPerEm || 1000;
  const baselineY = Math.round(upm * 0.8);
  const half = upm / 2;

  // Extract a few sample glyphs from targetGlyphs for quick switching
  const quickSampleGlyphs = React.useMemo(() => {
    if (!targetGlyphs || targetGlyphs.length === 0) {
      return previewGlyph ? [previewGlyph] : [];
    }
    const samples: GlyphData[] = [];
    const seen = new Set<string>();

    // Add current preview glyph first
    if (previewGlyph) {
      samples.push(previewGlyph);
      seen.add(previewGlyph.char);
    }

    // Pick diverse candidates: kana, kanji, latin
    for (const g of targetGlyphs) {
      if (samples.length >= 6) break;
      if (!seen.has(g.char) && g.contours && g.contours.length > 0) {
        samples.push(g);
        seen.add(g.char);
      }
    }
    return samples;
  }, [targetGlyphs, previewGlyph]);

  const scaleRatioX = origBbox.width > 0 ? (normBbox.width / origBbox.width) * 100 : 100;
  const scaleRatioY = origBbox.height > 0 ? (normBbox.height / origBbox.height) * 100 : 100;

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 ${themeClasses.cardBg} ${themeClasses.border}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-xs tracking-tight flex items-center gap-1.5">
            <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>プレビュー確認</span>
          </span>
          <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${themeClasses.accentBadge}`}>
            「{previewGlyph?.char || 'あ'}」
          </span>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-semibold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'overlay'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} hover:opacity-80`
            }`}
            title="元字形と調整後を重ね合わせて比較"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">重ね合わせ</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'side'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} hover:opacity-80`
            }`}
            title="調整前と調整後を横並びで比較"
          >
            <Columns2 className="w-3 h-3" />
            <span className="hidden sm:inline">横並び</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('norm')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'norm'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} hover:opacity-80`
            }`}
            title="正規化後の形状のみを表示"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">調整後のみ</span>
          </button>
        </div>
      </div>

      {/* Quick Character Picker */}
      {quickSampleGlyphs.length > 1 && (
        <div className="flex items-center justify-between text-[11px] gap-2">
          <span className={`text-[10px] font-medium shrink-0 ${themeClasses.textMuted}`}>
            確認文字を切替:
          </span>
          <div className="flex items-center gap-1.5 sm:gap-1 overflow-x-auto custom-scrollbar pb-0.5">
            {quickSampleGlyphs.map((g) => (
              <button
                key={g.unicode}
                type="button"
                onClick={() => onSelectPreviewGlyph?.(g)}
                className={`w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md text-xs font-bold shrink-0 border transition-colors cursor-pointer flex items-center justify-center ${
                  previewGlyph?.unicode === g.unicode
                    ? themeClasses.accentBtn
                    : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                }`}
              >
                {g.char}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main SVG Preview Stage */}
      {viewMode === 'side' ? (
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Before */}
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-bold mb-1 ${themeClasses.textMuted}`}>【調整前】</span>
            <div className={`relative w-full aspect-square max-w-[200px] border rounded-xl overflow-hidden flex items-center justify-center ${isLight ? 'bg-stone-50' : 'bg-black/30'} ${themeClasses.border}`}>
              <svg viewBox={getSafeGlyphViewBox(previewGlyph?.contours, upm)} className="absolute inset-0 w-full h-full pointer-events-none p-1.5">
                <rect x="0" y="0" width={upm} height={upm} fill="none" stroke="#94a3b8" strokeWidth={upm * 0.005} strokeDasharray="4 4" opacity={0.3} />
                <line x1="0" y1={baselineY} x2={upm} y2={baselineY} stroke="#ef4444" strokeWidth={upm * 0.004} strokeDasharray="8 8" opacity={0.4} />
                {origSvg && <path d={origSvg} fill={isLight ? '#475569' : '#94a3b8'} opacity="0.85" fillRule="nonzero" />}
              </svg>
            </div>
            <span className={`text-[10px] font-mono mt-1 ${themeClasses.textMuted}`}>
              {Math.round(origBbox.width)}×{Math.round(origBbox.height)}px
            </span>
          </div>

          {/* After */}
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-bold mb-1 ${themeClasses.accentText}`}>【調整後】</span>
            <div className={`relative w-full aspect-square max-w-[200px] border rounded-xl overflow-hidden flex items-center justify-center ${isLight ? 'bg-emerald-50/30' : 'bg-emerald-950/20'} ${themeClasses.border}`}>
              <svg viewBox={getSafeGlyphViewBox(previewGlyph?.contours, upm)} className="absolute inset-0 w-full h-full pointer-events-none p-1.5">
                <rect x={(upm - targetWidth) / 2} y={(upm - targetHeight) / 2} width={targetWidth} height={targetHeight} fill="none" stroke="#10b981" strokeWidth={upm * 0.004} strokeDasharray="6 6" />
                <line x1="0" y1={baselineY} x2={upm} y2={baselineY} stroke="#ef4444" strokeWidth={upm * 0.004} strokeDasharray="8 8" opacity={0.4} />
                {normSvg && <path d={normSvg} fill="#059669" opacity="0.95" fillRule="nonzero" />}
              </svg>
            </div>
            <span className={`text-[10px] font-mono font-bold mt-1 ${themeClasses.accentText}`}>
              {Math.round(normBbox.width)}×{Math.round(normBbox.height)}px
            </span>
          </div>
        </div>
      ) : (
        /* Overlay or Normalized Only Stage */
        <div className={`relative w-full aspect-square max-w-[280px] mx-auto border rounded-2xl overflow-hidden flex items-center justify-center ${isLight ? 'bg-stone-50' : 'bg-black/30'} ${themeClasses.border}`}>
          <svg viewBox={getSafeGlyphViewBox(previewGlyph?.contours, upm)} className="absolute inset-0 w-full h-full pointer-events-none p-2">
            {/* EM Box Boundary */}
            <rect x="0" y="0" width={upm} height={upm} fill="none" stroke="#94a3b8" strokeWidth={upm * 0.005} strokeDasharray="6 6" opacity={0.35} />
            {/* Baseline */}
            <line x1="0" y1={baselineY} x2={upm} y2={baselineY} stroke="#f87171" strokeWidth={upm * 0.004} strokeDasharray="10 10" opacity={0.5} />
            {/* Center crosshair */}
            <line x1={half} y1="0" x2={half} y2={upm} stroke="#38bdf8" strokeWidth={upm * 0.003} strokeDasharray="6 6" opacity={0.4} />
            <line x1="0" y1={half} x2={upm} y2={half} stroke="#38bdf8" strokeWidth={upm * 0.003} strokeDasharray="6 6" opacity={0.4} />

            {/* Target frame box (Dashed Emerald) */}
            <rect
              x={(upm - targetWidth) / 2}
              y={(upm - targetHeight) / 2}
              width={targetWidth}
              height={targetHeight}
              fill="none"
              stroke="#10b981"
              strokeWidth={upm * 0.004}
              strokeDasharray="6 6"
            />

            {/* Original Shape (Ghost Pink/Slate, only in overlay mode) */}
            {viewMode === 'overlay' && origSvg && (
              <path d={origSvg} fill="#f87171" opacity="0.35" fillRule="nonzero" />
            )}

            {/* Normalized Shape (Crisp Emerald) */}
            {normSvg && (
              <path d={normSvg} fill="#059669" opacity="0.92" fillRule="nonzero" />
            )}
          </svg>

          {/* Floating Canvas Legend */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[9px] font-mono pointer-events-none">
            {viewMode === 'overlay' && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
                ■ 元形状
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
              ■ 調整後
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
              □ 目標枠 ({targetWidth}px)
            </span>
          </div>
        </div>
      )}

      {/* Metrics Summary Card */}
      <div className={`p-2.5 rounded-xl border grid grid-cols-3 gap-2 text-center ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
        <div className="flex flex-col">
          <span className={`text-[10px] ${themeClasses.textMuted}`}>元の字面</span>
          <span className="font-mono text-xs font-bold">
            {Math.round(origBbox.width)}×{Math.round(origBbox.height)}
          </span>
        </div>
        <div className="flex flex-col border-x border-current/10">
          <span className={`text-[10px] ${themeClasses.textMuted}`}>目標字面枠</span>
          <span className={`font-mono text-xs font-bold ${themeClasses.accentText}`}>
            {targetWidth}×{targetHeight}
          </span>
        </div>
        <div className="flex flex-col">
          <span className={`text-[10px] ${themeClasses.textMuted}`}>倍率推移</span>
          <span className="font-mono text-xs font-bold">
            {Math.round(scaleRatioX)}%
          </span>
        </div>
      </div>
    </div>
  );
});

BatchPreviewSection.displayName = 'BatchPreviewSection';
