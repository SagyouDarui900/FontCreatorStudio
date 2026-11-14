import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Sliders,
  Eye,
  Layers,
  Wand2,
  RotateCcw,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontProject, GlyphData, PathContour } from '../types';
import {
  DAKUTEN_MAPPINGS,
  DakutenStyle,
  HandakutenStyle,
  batchSynthesizeDakuten,
  synthesizeDakutenContours,
} from '../utils/dakutenHelper';
import { KANA_PAIRS } from '../data/unicodeTables';
import {
  createSmallKanaContours,
  SmallKanaOptions,
  contoursToSvgPath,
  normalizeGlyphContoursWinding,
} from '../utils/path';
import { batchGenerateSmallKana } from '../utils/kanaHelper';

import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';

interface GlyphSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeMode;
}

export const GlyphSynthesisModal: React.FC<GlyphSynthesisModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
  showToast,
  onShowToast,
  theme,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const [activeTab, setActiveTab] = useState<'dakuten' | 'smallKana'>('dakuten');

  // Unified updater function supporting both prop styles
  const updateProject = useMemo(() => {
    if (onUpdateProject) return onUpdateProject;
    if (setProject) return setProject;
    return (_updater: any) => {};
  }, [onUpdateProject, setProject]);

  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    } else if (onShowToast) {
      onShowToast(msg, type);
    }
  };

  // -------------------------------------------------------------
  // Dakuten State
  // -------------------------------------------------------------
  const [dakuScope, setDakuScope] = useState<'all' | 'hiragana' | 'katakana'>('all');
  const [dakuStyle, setDakuStyle] = useState<DakutenStyle>('standard');
  const [handakuStyle, setHandakuStyle] = useState<HandakutenStyle>('standard');
  const [dakuOffsetX, setDakuOffsetX] = useState<number>(0);
  const [dakuOffsetY, setDakuOffsetY] = useState<number>(0);
  const [dakuScale, setDakuScale] = useState<number>(1.0);
  const [dakuOverwrite, setDakuOverwrite] = useState<boolean>(false);
  const [dakuPreviewChar, setDakuPreviewChar] = useState<string>('か');

  // -------------------------------------------------------------
  // Small Kana State
  // -------------------------------------------------------------
  const [smallScope, setSmallScope] = useState<'all' | 'hiragana' | 'katakana'>('all');
  const [smallScale, setSmallScale] = useState<number>(0.72);
  const [smallPlacement, setSmallPlacement] = useState<SmallKanaOptions['placement']>('bottom-left');
  const [smallOffsetX, setSmallOffsetX] = useState<number>(0);
  const [smallOffsetY, setSmallOffsetY] = useState<number>(0);
  const [smallWeightBoost, setSmallWeightBoost] = useState<number>(4); // Optical weight boost
  const [smallOverwrite, setSmallOverwrite] = useState<boolean>(false);
  const [smallPreviewChar, setSmallPreviewChar] = useState<string>('つ');

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Available source characters for dakuten
  const availableDakutenSources = useMemo(() => {
    return Object.entries(DAKUTEN_MAPPINGS)
      .filter(([_, info]) => info.type === 'seion')
      .map(([char, info]) => {
        const code = char.codePointAt(0) || 0;
        const glyph = project.glyphs[code];
        const hasContours = !!(glyph && glyph.contours && glyph.contours.length > 0);
        return {
          char,
          code,
          daku: info.daku,
          handaku: info.handaku,
          hasContours,
        };
      });
  }, [project.glyphs]);

  // Available source characters for small kana
  const availableSmallSources = useMemo(() => {
    return Object.entries(KANA_PAIRS).map(([char, pair]) => {
      const code = char.codePointAt(0) || 0;
      const glyph = project.glyphs[code];
      const hasContours = !!(glyph && glyph.contours && glyph.contours.length > 0);
      return {
        char,
        code,
        smallChar: pair.smallChar,
        smallUnicode: pair.smallUnicode,
        hasContours,
      };
    });
  }, [project.glyphs]);

  // Selected Dakuten Preview Contours
  const dakutenPreviewContours = useMemo(() => {
    const code = dakuPreviewChar.codePointAt(0);
    if (!code) return { base: [], synthesized: [] };
    const glyph = project.glyphs[code];
    const baseContours = glyph?.contours || [];
    if (baseContours.length === 0) return { base: [], synthesized: [] };

    const info = DAKUTEN_MAPPINGS[dakuPreviewChar];
    const isHandaku = !!(!info?.daku && info?.handaku);

    const synthesized = synthesizeDakutenContours(baseContours, isHandaku, {
      offsetX: dakuOffsetX,
      offsetY: dakuOffsetY,
      scale: dakuScale,
      dakuStyle,
      handakuStyle,
    });

    return { base: baseContours, synthesized };
  }, [dakuPreviewChar, project.glyphs, dakuOffsetX, dakuOffsetY, dakuScale, dakuStyle, handakuStyle]);

  // Selected Small Kana Preview Contours
  const smallKanaPreviewContours = useMemo(() => {
    const code = smallPreviewChar.codePointAt(0);
    if (!code) return { base: [], small: [] };
    const glyph = project.glyphs[code];
    const baseContours = glyph?.contours || [];
    if (baseContours.length === 0) return { base: [], small: [] };

    const small = createSmallKanaContours(baseContours, {
      scale: smallScale,
      placement: smallPlacement,
      offsetX: smallOffsetX,
      offsetY: smallOffsetY,
      weightDelta: smallWeightBoost,
    });

    return { base: baseContours, small };
  }, [smallPreviewChar, project.glyphs, smallScale, smallPlacement, smallOffsetX, smallOffsetY, smallWeightBoost]);

  if (!isOpen) return null;

  // Handle Execute Dakuten Batch
  const handleExecuteDakutenBatch = () => {
    const { updatedGlyphs, generatedCount, details } = batchSynthesizeDakuten(project.glyphs, {
      scope: dakuScope,
      overwriteExisting: dakuOverwrite,
      dakuStyle,
      handakuStyle,
      offsetX: dakuOffsetX,
      offsetY: dakuOffsetY,
      scale: dakuScale,
    });

    if (generatedCount === 0) {
      notify('合成対象の親文字（清音）がまだ作成されていないか、既に全文字作成済みです', 'warning');
      return;
    }

    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`濁音・半濁音 ${generatedCount} 文字を一括自動合成しました！`, 'success');
    onClose();
  };

  // Handle Execute Small Kana Batch
  const handleExecuteSmallKanaBatch = () => {
    const { updatedGlyphs, generatedCount } = batchGenerateSmallKana(project.glyphs, {
      scope: smallScope,
      overwriteExisting: smallOverwrite,
      scale: smallScale,
      placement: smallPlacement,
      offsetX: smallOffsetX,
      offsetY: smallOffsetY,
      weightDelta: smallWeightBoost,
    });

    if (generatedCount === 0) {
      notify('生成対象の親文字（通常かな）がまだ作成されていないか、既に全文字作成済みです', 'warning');
      return;
    }

    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`小書き文字 ${generatedCount} 文字を一括自動スケール生成しました！`, 'success');
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[60] ${
        isFullscreen
          ? 'p-0 w-screen h-screen bg-black/85 flex flex-col'
          : 'flex items-center justify-center p-4 bg-black/75 anim-fade'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-screen rounded-none border-none shadow-none'
            : `w-full max-w-4xl xl:max-w-5xl max-h-[92vh] rounded-2xl border shadow-2xl ${themeClasses.border}`
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-700 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                <span>かな自動合成</span>
                {isFullscreen && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-700 text-white shrink-0">
                    全画面
                  </span>
                )}
              </h2>
              <p className={`text-xs truncate ${themeClasses.textMuted}`}>
                清音から濁音・半濁音、通常かなから小書き文字を一括生成
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">全画面</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b px-3 sm:px-5 pt-1.5 gap-1.5 text-xs font-bold shrink-0 overflow-x-auto scrollbar-none whitespace-nowrap ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            onClick={() => setActiveTab('dakuten')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'dakuten'
                ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
                : `border-transparent ${themeClasses.textMuted} hover:opacity-80`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>濁点・半濁点合成 (が・ざ・だ・ば・ぱ等)</span>
          </button>

          <button
            onClick={() => setActiveTab('smallKana')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'smallKana'
                ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
                : `border-transparent ${themeClasses.textMuted} hover:opacity-80`
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>小書き文字合成 (っ・ゃ・ゅ・ょ・ぁ等)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {activeTab === 'dakuten' ? (
            /* ========================================================= */
            /* TAB 1: DAKUTEN / HANDAKUTEN                               */
            /* ========================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Left Controls */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                {/* Scope & Overwrite Card */}
                <div
                  className={`p-3.5 rounded-lg border flex flex-col gap-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                      <span>対象範囲</span>
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
                      {(['all', 'hiragana', 'katakana'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setDakuScope(s)}
                          className={`px-2.5 py-1 text-[11px] rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            dakuScope === s
                              ? themeClasses.accentBtn
                              : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                          }`}
                        >
                          {s === 'all' ? 'ひらがな＋カタカナ' : s === 'hiragana' ? 'ひらがな' : 'カタカナ'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs cursor-pointer pt-1 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-stone-600 dark:text-emerald-400">作成済みの濁音・半濁音を上書き</span>
                    <input
                      type="checkbox"
                      checked={dakuOverwrite}
                      onChange={(e) => setDakuOverwrite(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                {/* Style Options */}
                <div
                  className={`p-3.5 rounded-lg border flex flex-col gap-3.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span>濁点・半濁点のスタイル</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                        濁点「゛」スタイル
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            { id: 'standard', name: '標準' },
                            { id: 'brush', name: '毛筆' },
                            { id: 'round', name: '丸' },
                            { id: 'square', name: '四角' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setDakuStyle(st.id)}
                            className={`p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
                              dakuStyle === st.id
                                ? `${themeClasses.accentBadge} font-bold`
                                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                            }`}
                          >
                            {st.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                        半濁点「゜」スタイル
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'standard', name: '標準' },
                            { id: 'brush', name: '手書き' },
                            { id: 'solid', name: '塗り丸' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setHandakuStyle(st.id)}
                            className={`p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
                              handakuStyle === st.id
                                ? `${themeClasses.accentBadge} font-bold`
                                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                            }`}
                          >
                            {st.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Position Fine Tuning */}
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={themeClasses.textMuted}>左右位置 (X):</span>
                        <span className="font-mono font-bold">{dakuOffsetX > 0 ? `+${dakuOffsetX}` : dakuOffsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="5"
                        value={dakuOffsetX}
                        onChange={(e) => setDakuOffsetX(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={themeClasses.textMuted}>上下位置 (Y):</span>
                        <span className="font-mono font-bold">{dakuOffsetY > 0 ? `+${dakuOffsetY}` : dakuOffsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="5"
                        value={dakuOffsetY}
                        onChange={(e) => setDakuOffsetY(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={themeClasses.textMuted}>濁点サイズ:</span>
                        <span className="font-mono font-bold">{Math.round(dakuScale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.5"
                        step="0.05"
                        value={dakuScale}
                        onChange={(e) => setDakuScale(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setDakuOffsetX(0);
                        setDakuOffsetY(0);
                        setDakuScale(1.0);
                      }}
                      className={`text-[11px] flex items-center gap-1 cursor-pointer ${themeClasses.textMuted} hover:opacity-80`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>位置リセット</span>
                    </button>
                  </div>
                </div>

                {/* Parent Char Quick Selectors */}
                <div
                  className={`p-3 rounded-lg border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className={`flex items-center justify-between text-[11px] mb-2 font-bold ${themeClasses.textMuted}`}>
                    <span>対象文字プレビュー:</span>
                    <span className={themeClasses.accentText}>
                      作成済: {availableDakutenSources.filter((s) => s.hasContours).length} / {availableDakutenSources.length}字
                    </span>
                  </div>
                  <div className={`flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}>
                    {availableDakutenSources.map((item) => (
                      <button
                        key={item.char}
                        onClick={() => setDakuPreviewChar(item.char)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                          dakuPreviewChar === item.char
                            ? `${themeClasses.accentBtn} ring-2 ring-emerald-500`
                            : item.hasContours
                            ? `${themeClasses.accentBadge} cursor-pointer hover:opacity-90`
                            : 'bg-black/5 dark:bg-white/5 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                        }`}
                        title={`「${item.char}」→ 濁音:「${item.daku || ''}」${
                          item.handaku ? ` 半濁音:「${item.handaku}」` : ''
                        }${item.hasContours ? ' (作図済)' : ' (未作図)'}`}
                      >
                        {item.char}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Live Preview Box */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div
                  className={`p-3.5 sm:p-4 rounded-lg border flex flex-col items-center justify-center ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className="w-full flex items-center justify-between text-xs font-bold mb-2">
                    <span className="flex items-center gap-1">
                      <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                      <span>合成プレビュー</span>
                    </span>
                    <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>
                      「{dakuPreviewChar}」⇒「{DAKUTEN_MAPPINGS[dakuPreviewChar]?.daku || DAKUTEN_MAPPINGS[dakuPreviewChar]?.handaku || ''}」
                    </span>
                  </div>

                  <div className={`w-52 h-52 sm:w-60 sm:h-60 relative rounded-lg border flex items-center justify-center overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}>
                    {/* Em box crosshairs */}
                    <div className="absolute inset-0 pointer-events-none opacity-15">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
                      <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
                      <div className="absolute inset-4 border border-dashed border-current opacity-40" />
                    </div>

                    {dakutenPreviewContours.synthesized.length > 0 ? (
                      <svg viewBox="0 0 1000 1000" className="w-full h-full">
                        {/* Synthesized Glyph Path */}
                        <path
                          d={contoursToSvgPath(normalizeGlyphContoursWinding(dakutenPreviewContours.synthesized))}
                          fill={isLight ? '#1c1917' : '#34d399'}
                          fillRule="nonzero"
                        />
                      </svg>
                    ) : (
                      <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
                        親文字「{dakuPreviewChar}」がまだ作成されていません
                      </div>
                    )}
                  </div>

                  <div className={`mt-2 text-[11px] text-center flex items-center gap-1 ${themeClasses.textMuted}`}>
                    <Info className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                    <span>親文字に選択した濁点・半濁点を合成します</span>
                  </div>
                </div>

                {/* Batch Action Button */}
                <button
                  onClick={handleExecuteDakutenBatch}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer ${themeClasses.accentBtn}`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>濁音・半濁点を一括合成</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* TAB 2: SMALL KANA AUTO SCALE                              */
            /* ========================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Left Controls */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                {/* Scope & Overwrite Card */}
                <div
                  className={`p-3.5 rounded-lg border flex flex-col gap-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                      <span>対象範囲</span>
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
                      {(['all', 'hiragana', 'katakana'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSmallScope(s)}
                          className={`px-2.5 py-1 text-[11px] rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            smallScope === s
                              ? themeClasses.accentBtn
                              : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                          }`}
                        >
                          {s === 'all' ? 'ひらがな＋カタカナ' : s === 'hiragana' ? 'ひらがな' : 'カタカナ'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs cursor-pointer pt-1 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-stone-600 dark:text-emerald-400">作成済みの小書き文字を上書き</span>
                    <input
                      type="checkbox"
                      checked={smallOverwrite}
                      onChange={(e) => setSmallOverwrite(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                {/* Scale & Placement Options */}
                <div
                  className={`p-3.5 rounded-lg border flex flex-col gap-3.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span>スケール・配置・太さ補正</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={`${themeClasses.textMuted} font-bold`}>縮小倍率:</span>
                        <span className={`font-mono font-bold ${themeClasses.accentText}`}>
                          {Math.round(smallScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.60"
                        max="0.85"
                        step="0.02"
                        value={smallScale}
                        onChange={(e) => setSmallScale(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                      <div className={`flex justify-between text-[9px] mt-0.5 ${themeClasses.textMuted}`}>
                        <span>60% (小さめ)</span>
                        <span>72% (標準)</span>
                        <span>85% (大きめ)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={`${themeClasses.textMuted} font-bold`}>太さ補正:</span>
                        <span className={`font-mono font-bold ${themeClasses.accentText}`}>
                          +{smallWeightBoost}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={smallWeightBoost}
                        onChange={(e) => setSmallWeightBoost(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                      <div className={`flex justify-between text-[9px] mt-0.5 ${themeClasses.textMuted}`}>
                        <span>0px</span>
                        <span>+4px (標準)</span>
                        <span>+12px</span>
                      </div>
                    </div>
                  </div>

                  {/* Placement Mode */}
                  <div className="text-xs">
                    <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                      配置位置
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'bottom-left', name: '左下 (標準)' },
                          { id: 'center', name: '中央' },
                          { id: 'bottom-center', name: '下中央' },
                          { id: 'baseline', name: 'ベースライン' },
                        ] as const
                      ).map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => setSmallPlacement(pl.id)}
                          className={`p-1.5 text-[10px] rounded border font-medium text-center transition-colors cursor-pointer ${
                            smallPlacement === pl.id
                              ? `${themeClasses.accentBadge} font-bold`
                              : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                          }`}
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Fine Tuning */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={themeClasses.textMuted}>左右オフセット (X):</span>
                        <span className="font-mono font-bold">{smallOffsetX > 0 ? `+${smallOffsetX}` : smallOffsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="5"
                        value={smallOffsetX}
                        onChange={(e) => setSmallOffsetX(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={themeClasses.textMuted}>上下オフセット (Y):</span>
                        <span className="font-mono font-bold">{smallOffsetY > 0 ? `+${smallOffsetY}` : smallOffsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="5"
                        value={smallOffsetY}
                        onChange={(e) => setSmallOffsetY(Number(e.target.value))}
                        className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Source Kana Grid */}
                <div
                  className={`p-3 rounded-lg border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className={`flex items-center justify-between text-[11px] mb-2 font-bold ${themeClasses.textMuted}`}>
                    <span>対象文字プレビュー:</span>
                    <span className={themeClasses.accentText}>
                      作成済: {availableSmallSources.filter((s) => s.hasContours).length} / {availableSmallSources.length}字
                    </span>
                  </div>
                  <div className={`flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}>
                    {availableSmallSources.map((item) => (
                      <button
                        key={item.char}
                        onClick={() => setSmallPreviewChar(item.char)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                          smallPreviewChar === item.char
                            ? `${themeClasses.accentBtn} ring-2 ring-emerald-500`
                            : item.hasContours
                            ? `${themeClasses.accentBadge} cursor-pointer hover:opacity-90`
                            : 'bg-black/5 dark:bg-white/5 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                        }`}
                        title={`「${item.char}」⇒ 小文字「${item.smallChar}」${
                          item.hasContours ? ' (作図済)' : ' (未作図)'
                        }`}
                      >
                        {item.char}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Live Preview Box */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div
                  className={`p-3.5 sm:p-4 rounded-lg border flex flex-col items-center justify-center ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className="w-full flex items-center justify-between text-xs font-bold mb-2">
                    <span className="flex items-center gap-1">
                      <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                      <span>配置プレビュー</span>
                    </span>
                    <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>
                      「{smallPreviewChar}」⇒「{KANA_PAIRS[smallPreviewChar]?.smallChar || ''}」
                    </span>
                  </div>

                  <div className={`w-52 h-52 sm:w-60 sm:h-60 relative rounded-lg border flex items-center justify-center overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}>
                    {/* Em box crosshairs & baseline */}
                    <div className="absolute inset-0 pointer-events-none opacity-15">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
                      <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
                      <div className="absolute top-[78%] left-0 right-0 h-px border-b border-emerald-500 opacity-60" />
                      <div className="absolute inset-4 border border-dashed border-current opacity-40" />
                    </div>

                    {smallKanaPreviewContours.base.length > 0 ? (
                      <svg viewBox="0 0 1000 1000" className="w-full h-full">
                        {/* Ghost Base Character */}
                        <path
                          d={contoursToSvgPath(normalizeGlyphContoursWinding(smallKanaPreviewContours.base))}
                          fill={isLight ? '#e5e7eb' : '#1f2d24'}
                          opacity={0.6}
                          fillRule="nonzero"
                        />
                        {/* Small Kana Generated Path */}
                        <path
                          d={contoursToSvgPath(normalizeGlyphContoursWinding(smallKanaPreviewContours.small))}
                          fill={isLight ? '#1c1917' : '#34d399'}
                          fillRule="nonzero"
                        />
                      </svg>
                    ) : (
                      <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
                        親文字「{smallPreviewChar}」がまだ作成されていません
                      </div>
                    )}
                  </div>

                  <div className={`mt-2 text-[11px] text-center flex items-center gap-1 ${themeClasses.textMuted}`}>
                    <Info className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                    <span>背景の薄い文字は原字（通常サイズ）です</span>
                  </div>
                </div>

                {/* Batch Action Button */}
                <button
                  onClick={handleExecuteSmallKanaBatch}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer ${themeClasses.accentBtn}`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>小書き文字を一括生成</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
