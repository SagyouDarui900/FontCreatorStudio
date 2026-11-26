import React from 'react';
import { Sliders, ShieldCheck, Layers, MoveHorizontal } from 'lucide-react';
import {
  AlignHorizontal,
  AlignVertical,
  SizePreset,
  TargetScope,
  isSizePreset,
} from './types';
import { getThemeClasses, ThemeClasses } from '../../utils/theme';
import { ModalSection } from '../modals/ModalSection';
import { SliderRow } from '../modals/SliderRow';

export interface BatchOptionsSectionProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
  scope?: TargetScope;
  setScope?: (scope: TargetScope) => void;
  targetGlyphsCount?: number;
  previewChar?: string;
  sizePreset: SizePreset;
  setSizePreset: (preset: SizePreset) => void;
  handlePresetChange: (preset: SizePreset) => void;
  targetWidth: number;
  setTargetWidth: (w: number) => void;
  targetHeight: number;
  setTargetHeight: (h: number) => void;
  weightDelta: number;
  setWeightDelta: (d: number) => void;
  alignH: AlignHorizontal;
  setAlignH: (a: AlignHorizontal) => void;
  alignV: AlignVertical;
  setAlignV: (a: AlignVertical) => void;
  unifyAdvance: boolean;
  setUnifyAdvance: (u: boolean) => void;
  advanceWidth: number;
  setAdvanceWidth: (w: number) => void;
  optimizePoints: boolean;
  setOptimizePoints: (o: boolean) => void;
  normalizeWinding: boolean;
  setNormalizeWinding: (w: boolean) => void;
}

export const BatchOptionsSection: React.FC<BatchOptionsSectionProps> = React.memo(({
  isLight,
  themeClasses: propThemeClasses,
  scope = 'all',
  setScope,
  targetGlyphsCount = 0,
  previewChar = 'あ',
  sizePreset,
  setSizePreset,
  handlePresetChange,
  targetWidth,
  setTargetWidth,
  targetHeight,
  setTargetHeight,
  weightDelta,
  setWeightDelta,
  alignH,
  setAlignH,
  alignV,
  setAlignV,
  unifyAdvance,
  setUnifyAdvance,
  advanceWidth,
  setAdvanceWidth,
  optimizePoints,
  setOptimizePoints,
  normalizeWinding,
  setNormalizeWinding,
}) => {
  const themeClasses = propThemeClasses || getThemeClasses(isLight ? 'light' : 'dark');

  const SCOPE_ITEMS: { id: TargetScope; label: string; sub: string }[] = [
    { id: 'all', label: '全文字一括', sub: '全体均一' },
    { id: 'hiragana', label: 'ひらがな', sub: 'かな文字' },
    { id: 'katakana', label: 'カタカナ', sub: 'カナ文字' },
    { id: 'kanji', label: '漢字', sub: '漢字のみ' },
    { id: 'latin', label: '英数字', sub: 'ASCII英数' },
    { id: 'current', label: '現在の文字', sub: `「${previewChar}」のみ` },
  ];

  const PRESET_ITEMS: { id: SizePreset; label: string; size: string; desc: string }[] = [
    { id: 'standard', label: '標準', size: '820px', desc: '推奨バランス' },
    { id: 'large', label: '大振り', size: '890px', desc: '見出し・漢字' },
    { id: 'kana', label: 'かな', size: '780px', desc: '自然な字間' },
    { id: 'compact', label: '小振り', size: '740px', desc: '長文・本文' },
    { id: 'custom', label: 'カスタム', size: '自由設定', desc: 'スライダー指定' },
  ];

  return (
    <div className="space-y-3">
      {/* 1. Target Scope Selection */}
      {setScope && (
        <ModalSection
          title="処理対象の文字グループ"
          step={1}
          icon={<Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          themeClasses={themeClasses}
          badge={
            <span className={`text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md border ${themeClasses.accentBadge}`}>
              対象: {targetGlyphsCount} 文字
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {SCOPE_ITEMS.map((s) => {
              const isSelected = scope === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  <div className="text-xs font-bold truncate w-full">{s.label}</div>
                  <div className={`text-[9.5px] truncate w-full opacity-75`}>
                    {s.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </ModalSection>
      )}

      {/* 2. Size & Bounding Frame Presets */}
      <ModalSection
        title="字面枠サイズ設定"
        step={2}
        icon={<Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
        themeClasses={themeClasses}
        badge={
          <span className={`text-[11px] font-mono tabular-nums ${themeClasses.textMuted}`}>
            UPM: 1000基準
          </span>
        }
      >
        <div className="space-y-2.5">
          {/* Preset Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {PRESET_ITEMS.map((p) => {
              const isSelected = sizePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (isSizePreset(p.id)) {
                      handlePresetChange(p.id);
                    }
                  }}
                  className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-colors cursor-pointer last:max-sm:col-span-2 ${
                    isSelected
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  <div className="text-xs font-bold truncate w-full">{p.label}</div>
                  <div className="text-[10px] font-mono tabular-nums opacity-80">{p.size}</div>
                </button>
              );
            })}
          </div>

          {/* Width & Height Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className={`p-2 rounded-xl border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
              <SliderRow
                label="目標幅 (Width)"
                value={targetWidth}
                min={500}
                max={960}
                step={10}
                unit="px"
                showNumberInput
                onChange={(v) => {
                  setTargetWidth(v);
                  setSizePreset('custom');
                }}
                themeClasses={themeClasses}
              />
            </div>

            <div className={`p-2 rounded-xl border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
              <SliderRow
                label="目標高さ (Height)"
                value={targetHeight}
                min={500}
                max={960}
                step={10}
                unit="px"
                showNumberInput
                onChange={(v) => {
                  setTargetHeight(v);
                  setSizePreset('custom');
                }}
                themeClasses={themeClasses}
              />
            </div>
          </div>
        </div>
      </ModalSection>

      {/* 3. Stroke Weight Normalization Slider */}
      <ModalSection
        title="線の太さ（ウェイト）微調整"
        step={3}
        themeClasses={themeClasses}
      >
        <div className="space-y-1.5">
          <SliderRow
            label="線の太さ"
            value={weightDelta}
            min={-20}
            max={20}
            step={2}
            onChange={setWeightDelta}
            formatValue={(v) =>
              v > 0 ? `+${v}px (太く)` : v < 0 ? `${v}px (細く)` : '±0px (維持)'
            }
            themeClasses={themeClasses}
          />
          <div className={`flex justify-between text-[10px] font-mono tabular-nums ${themeClasses.textMuted}`}>
            <span>-20px (スリム化)</span>
            <button
              type="button"
              onClick={() => setWeightDelta(0)}
              className={`hover:underline cursor-pointer ${weightDelta === 0 ? 'font-bold text-current' : ''}`}
            >
              ±0px (リセット)
            </button>
            <span>+20px (ボールド化)</span>
          </div>
        </div>
      </ModalSection>

      {/* 4. Alignment & Advance Width */}
      <ModalSection
        title="位置揃え & 送り幅 (Advance Width)"
        step={4}
        icon={<MoveHorizontal className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
        themeClasses={themeClasses}
      >
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Horizontal Align */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium block ${themeClasses.textMuted}`}>
                水平揃え (X軸)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAlignH('center')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    alignH === 'center'
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  中央揃え (推奨)
                </button>
                <button
                  type="button"
                  onClick={() => setAlignH('keep')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    alignH === 'keep'
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  位置を維持
                </button>
              </div>
            </div>

            {/* Vertical Align */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium block ${themeClasses.textMuted}`}>
                垂直揃え (Y軸)
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setAlignV('center')}
                  className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                    alignV === 'center'
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  中央 (全角)
                </button>
                <button
                  type="button"
                  onClick={() => setAlignV('baseline')}
                  className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                    alignV === 'baseline'
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  ベースライン
                </button>
                <button
                  type="button"
                  onClick={() => setAlignV('keep')}
                  className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                    alignV === 'keep'
                      ? themeClasses.activeTool
                      : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                  }`}
                >
                  維持
                </button>
              </div>
            </div>
          </div>

          {/* Advance Width Checkbox & Input */}
          <div className={`p-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
            <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px] sm:min-h-0">
              <input
                type="checkbox"
                checked={unifyAdvance}
                onChange={(e) => setUnifyAdvance(e.target.checked)}
                className="rounded accent-emerald-600 w-4 h-4 shrink-0"
              />
              <span className="text-xs font-semibold">送り幅 (advanceWidth) を統一</span>
            </label>
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                disabled={!unifyAdvance}
                value={advanceWidth}
                onChange={(e) => setAdvanceWidth(Number(e.target.value))}
                className={`w-20 border rounded-lg p-1 text-right font-mono tabular-nums text-xs font-bold ${
                  themeClasses.cardBg
                } ${themeClasses.border} ${!unifyAdvance && 'opacity-40 cursor-not-allowed'}`}
              />
              <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>px</span>
            </div>
          </div>
        </div>
      </ModalSection>

      {/* 5. Quality & File Size Optimization */}
      <ModalSection
        title="輪郭・データ最適化"
        step={5}
        icon={<ShieldCheck className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
        themeClasses={themeClasses}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Point Optimization Toggle */}
          <label className={`p-2 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
            optimizePoints ? themeClasses.subtoolbarBg : `${themeClasses.cardBg} opacity-60`
          } ${themeClasses.border}`}>
            <input
              type="checkbox"
              checked={optimizePoints}
              onChange={(e) => setOptimizePoints(e.target.checked)}
              className="mt-0.5 rounded accent-emerald-600 w-4 h-4 shrink-0"
            />
            <div className="min-w-0">
              <span className="font-bold block text-xs">近接・重複アンカーの整理</span>
              <span className={`text-[10px] block leading-snug mt-0.5 ${themeClasses.textMuted}`}>
                微小な制御点の統合と整数座標への丸めを行います。
              </span>
            </div>
          </label>

          {/* Winding Normalization Toggle */}
          <label className={`p-2 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
            normalizeWinding ? themeClasses.subtoolbarBg : `${themeClasses.cardBg} opacity-60`
          } ${themeClasses.border}`}>
            <input
              type="checkbox"
              checked={normalizeWinding}
              onChange={(e) => setNormalizeWinding(e.target.checked)}
              className="mt-0.5 rounded accent-emerald-600 w-4 h-4 shrink-0"
            />
            <div className="min-w-0">
              <span className="font-bold block text-xs">輪郭の向き（ワインディング）の統一</span>
              <span className={`text-[10px] block leading-snug mt-0.5 ${themeClasses.textMuted}`}>
                外枠を時計回り、くり抜き穴を反時計回りに統一します。
              </span>
            </div>
          </label>
        </div>
      </ModalSection>
    </div>
  );
});

BatchOptionsSection.displayName = 'BatchOptionsSection';
