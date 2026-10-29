import React from 'react';
import { FontProject, GlyphData } from '../../types';
import { TargetScope } from './types';

export interface BatchPreviewSectionProps {
  isLight: boolean;
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
}

export const BatchPreviewSection: React.FC<BatchPreviewSectionProps> = React.memo(({
  isLight,
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
}) => {
  const upm = project?.metadata?.unitsPerEm || 1000;
  const baselineY = Math.round(upm * 0.8);
  const half = upm / 2;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
      {/* Preview Box (5 cols) */}
      <div
        className={`sm:col-span-5 p-3 rounded-lg border flex flex-col items-center justify-center space-y-2 ${
          isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
        }`}
      >
        <div className="w-full flex items-center justify-between text-[11px] font-semibold">
          <span>プレビュー確認</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            「{previewGlyph?.char || 'あ'}」
          </span>
        </div>

        {/* SVG Stage */}
        <div className="relative w-44 h-44 border rounded bg-white overflow-hidden shadow-inner flex items-center justify-center">
          <svg viewBox={`0 0 ${upm} ${upm}`} className="absolute inset-0 w-full h-full pointer-events-none">
            {/* EM Box Boundary */}
            <rect x="0" y="0" width={upm} height={upm} fill="#fafafa" stroke="#e0e0e0" strokeWidth={upm * 0.006} />
            {/* Baseline */}
            <line x1="0" y1={baselineY} x2={upm} y2={baselineY} stroke="#f87171" strokeWidth={upm * 0.004} strokeDasharray="10 10" />
            {/* Center lines */}
            <line x1={half} y1="0" x2={half} y2={upm} stroke="#93c5fd" strokeWidth={upm * 0.003} strokeDasharray="8 8" />
            <line x1="0" y1={half} x2={upm} y2={half} stroke="#93c5fd" strokeWidth={upm * 0.003} strokeDasharray="8 8" />

            {/* Target frame box */}
            <rect
              x={(upm - targetWidth) / 2}
              y={(upm - targetHeight) / 2}
              width={targetWidth}
              height={targetHeight}
              fill="none"
              stroke="#10b981"
              strokeWidth={upm * 0.003}
              strokeDasharray="6 6"
            />

            {/* Original (Faint Red) */}
            {origSvg && <path d={origSvg} fill="#fca5a5" opacity="0.45" fillRule="nonzero" />}

            {/* Normalized (Crisp Emerald) */}
            {normSvg && <path d={normSvg} fill="#047857" opacity="0.9" fillRule="nonzero" />}
          </svg>
        </div>

        <div className="w-full text-[10px] flex justify-between font-mono text-stone-500 dark:text-emerald-400/80">
          <span>元: {Math.round(origBbox.width)}×{Math.round(origBbox.height)}px</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
            後: {Math.round(normBbox.width)}×{Math.round(normBbox.height)}px
          </span>
        </div>
      </div>

      {/* Scope Selection (7 cols) */}
      <div className="sm:col-span-7 space-y-2.5">
        <label className="font-semibold block text-xs">① 処理対象の文字グループ</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {[
            { id: 'all', label: '全文字一括', desc: '全体を均一に' },
            { id: 'hiragana', label: 'ひらがな', desc: 'かな文字のみ' },
            { id: 'katakana', label: 'カタカナ', desc: 'カナ文字のみ' },
            { id: 'kanji', label: '漢字', desc: '漢字のみ' },
            { id: 'latin', label: '英数字', desc: 'ASCII英数' },
            { id: 'current', label: '現在の文字', desc: `「${previewGlyph?.char || ''}」のみ` },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id as TargetScope)}
              className={`p-2 rounded border text-left flex flex-col min-w-0 transition-all ${
                scope === s.id
                  ? isLight
                    ? 'bg-emerald-100/70 border-emerald-600 text-emerald-950 font-bold '
                    : 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold '
                  : isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-stone-50'
                  : 'bg-[#101813] border-[#25362b] text-emerald-300/80 hover:bg-[#18231c]'
              }`}
            >
              <span className="text-xs truncate w-full">{s.label}</span>
              <span className="text-[9px] opacity-70 truncate w-full">{s.desc}</span>
            </button>
          ))}
        </div>

        <div
          className={`p-2 rounded border flex items-center justify-between text-[11px] ${
            isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}
        >
          <span>選択中の対象文字数:</span>
          <span className="font-bold font-mono text-xs">{targetGlyphsCount} 文字</span>
        </div>
      </div>
    </div>
  );
});

BatchPreviewSection.displayName = 'BatchPreviewSection';
