import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontProject, GlyphData, GlyphOverlaySettings } from '../types';
import { ThemeMode, getThemeClasses } from '../utils/theme';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalFooter } from './modals/ModalFooter';
import { SliderRow } from './modals/SliderRow';

interface GlyphCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  activeChar: string;
  activeUnicode?: number;
  overlaySettings: GlyphOverlaySettings;
  onChangeOverlaySettings: React.Dispatch<React.SetStateAction<GlyphOverlaySettings>>;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Recommended paired characters for visual harmony & stroke balance check
const COMMON_COMPARE_PAIRS: Record<string, string[]> = {
  '日': ['目', '白', '田', '由', '申', '百', '旧'],
  '目': ['日', '自', '見', '耳', '月'],
  '木': ['本', '林', '森', '札', '休', '末', '未'],
  '本': ['木', '体', '札', '末'],
  '口': ['品', '呂', '員', '団', '回', '日'],
  '大': ['太', '犬', '天', '夫', '矢'],
  '人': ['入', '八', '个', '大'],
  '土': ['士', '干', '工', '王', '生'],
  '山': ['出', '川', '岩', '岸'],
  '糸': ['紙', '結', '給', '納', '終'],
  '言': ['語', '話', '記', '詰', '計'],
  '手': ['打', '押', '持', '指', '毛'],
  'あ': ['お', 'め', 'ぬ', 'ぁ', 'む'],
  'い': ['り', 'こ', 'ぃ', '八'],
  'う': ['え', 'ら', 'ぅ', 'ラ'],
  'え': ['う', 'え', 'ぇ', '元'],
  'お': ['あ', 'む', 'ぉ'],
  'か': ['が', 'わ', 'れ', '力'],
  'さ': ['き', 'ち', 'ざ'],
  'た': ['な', 'に', 'だ'],
  'は': ['ほ', 'ま', 'な', 'ば', 'ぱ'],
  'O': ['Q', 'C', 'G', 'D', '0'],
  'Q': ['O', 'C', 'G', '0'],
  'B': ['P', 'R', 'D', '8'],
  'P': ['B', 'R', 'F', 'D'],
  'R': ['B', 'P', 'K'],
  'E': ['F', 'L', 'T', 'H'],
  'F': ['E', 'P', 'T'],
  'n': ['m', 'h', 'u', 'r'],
  'm': ['n', 'w', 'u'],
  'p': ['q', 'b', 'd'],
  'b': ['d', 'p', 'q', 'h'],
  'd': ['b', 'p', 'q', 'cl'],
};

const COLOR_OPTIONS = [
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Coral Pink', hex: '#f43f5e' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
];

type OverlayRenderMode = GlyphOverlaySettings['renderMode'];

const isOverlayRenderMode = (value: string): value is OverlayRenderMode =>
  value === 'outline' || value === 'fill' || value === 'difference';

export const GlyphCompareModal: React.FC<GlyphCompareModalProps> = ({
  isOpen,
  onClose,
  project,
  activeChar,
  activeUnicode,
  overlaySettings,
  onChangeOverlaySettings,
  theme,
  onShowToast,
}) => {
  const themeClasses = getThemeClasses(theme);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [glyphSearchQuery, setGlyphSearchQuery] = useState('');

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
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
  }, [isOpen, isTopModal, isFullscreen, onClose]);

  // Get recommendations for activeChar
  const recommendedChars = useMemo(() => {
    if (!activeChar) return ['日', '木', '口', 'あ', 'O'];
    return COMMON_COMPARE_PAIRS[activeChar] || ['日', '木', '口', 'あ', 'O'];
  }, [activeChar]);

  // List of all drawn characters in project
  const projectDrawnChars = useMemo(() => {
    const glyphList = Object.values(project.glyphs || {}) as GlyphData[];
    return glyphList
      .filter((g) => g && g.contours && g.contours.length > 0)
      .map((g) => ({
        char: g.char || String.fromCodePoint(g.unicode),
        unicode: g.unicode,
      }))
      .sort((a, b) => a.unicode - b.unicode);
  }, [project.glyphs]);

  const filteredDrawnChars = useMemo(() => {
    const query = glyphSearchQuery.trim().toLowerCase();
    const filtered = query
      ? projectDrawnChars.filter(
          (g) =>
            g.char.toLowerCase().includes(query) ||
            g.unicode.toString(16).toLowerCase().includes(query.replace(/^u\+/i, ''))
        )
      : projectDrawnChars;
    return filtered.slice(0, 240);
  }, [projectDrawnChars, glyphSearchQuery]);

  const handleSelectRefChar = (char: string, unicode?: number) => {
    onChangeOverlaySettings((prev) => ({
      ...prev,
      enabled: true,
      referenceChar: char,
      referenceUnicode: unicode ?? (char.codePointAt(0) ?? 0),
    }));
    onShowToast?.(`「${char}」を比較参照文字に設定しました`, 'info');
  };

  const handleResetTransform = () => {
    onChangeOverlaySettings((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      opacity: 0.45,
    }));
    onShowToast?.('比較レイヤーの位置とスケールをリセットしました', 'info');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="グリフ重ね合わせ比較"
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-3xl border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh] ${themeClasses.border}`
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-3 sm:pt-3 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            <div className="min-w-0 flex-1 flex flex-col lg:flex-row lg:items-baseline lg:gap-3">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="truncate">グリフ重ね合わせ比較 (Overlay Compare)</span>
                {isFullscreen && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${themeClasses.accentBtn}`}>
                    全画面モード
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold border shrink-0 ${
                    overlaySettings.enabled
                      ? themeClasses.accentBadge
                      : `${themeClasses.subtoolbarBg} ${themeClasses.textMuted}`
                  }`}
                >
                  {overlaySettings.enabled ? 'ON' : 'OFF'}
                </span>
              </h2>
              <p className={`text-xs hidden sm:block truncate ${themeClasses.textMuted}`}>
                作成中の文字に他文字を半透明・輪郭で重ね、骨格や太さのバランスを検査
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
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
              className={`p-1.5 max-sm:min-w-[40px] max-sm:min-h-[40px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Toggle + Character Pickers */}
          <div className="lg:col-span-6 space-y-3">
            {/* Master Enable Switch */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                overlaySettings.enabled
                  ? themeClasses.accentBadge
                  : themeClasses.subtoolbarBg
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div>
                  <div className="text-xs font-bold">重ね合わせ比較レイヤーを表示</div>
                  <div className={`text-[10px] ${themeClasses.textMuted}`}>
                    現在編集中の文字「{activeChar || '未選択'}」の上に半透明で重ねて表示
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(overlaySettings?.enabled)}
                  onChange={(e) =>
                    onChangeOverlaySettings((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-400/50 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Quick Recommend Pairs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <span>「{activeChar || ''}」の比較対象文字</span>
                </label>
                <span className={`text-[10px] ${themeClasses.textMuted}`}>ワンクリックで切替</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recommendedChars.map((ch) => {
                  const isSelected = overlaySettings.referenceChar === ch;
                  const isDrawn = project.glyphs[ch.codePointAt(0) ?? 0]?.contours?.length > 0;
                  return (
                    <button
                      key={ch}
                      onClick={() => handleSelectRefChar(ch)}
                      className={`w-9 h-9 rounded-xl border text-sm font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? `${themeClasses.activeTool} border-transparent ring-2 ring-emerald-500/30`
                          : isDrawn
                          ? `${themeClasses.accentBadge} ${themeClasses.activeToolHover}`
                          : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Drawn Glyphs Selector */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-bold opacity-90 tabular-nums">
                  プロジェクト内の作成済み文字から選択 ({projectDrawnChars.length}文字)
                </label>
                <input
                  type="search"
                  value={glyphSearchQuery}
                  onChange={(e) => setGlyphSearchQuery(e.target.value)}
                  placeholder="文字 / U+"
                  aria-label="作成済み文字を検索"
                  className={`w-24 sm:w-32 px-2 py-1 rounded-md border text-[11px] outline-hidden ${themeClasses.cardBg}`}
                />
              </div>
              <div className={`flex flex-wrap gap-1 max-h-28 lg:max-h-56 overflow-y-auto p-1.5 rounded-lg border ${themeClasses.subtoolbarBg}`}>
                {projectDrawnChars.length === 0 ? (
                  <div className={`text-xs p-2 ${themeClasses.textMuted}`}>まだ作成済みの文字がありません</div>
                ) : filteredDrawnChars.length === 0 ? (
                  <div className={`text-xs p-2 ${themeClasses.textMuted}`}>一致する作成済み文字がありません</div>
                ) : (
                  filteredDrawnChars.map((g) => {
                    const isSelected =
                      overlaySettings.referenceChar === g.char ||
                      overlaySettings.referenceUnicode === g.unicode;
                    return (
                      <button
                        key={g.unicode}
                        onClick={() => handleSelectRefChar(g.char, g.unicode)}
                        className={`px-2.5 py-1.5 sm:px-2 sm:py-0.5 rounded-md border text-xs font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? `${themeClasses.activeTool} border-transparent`
                            : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        {g.char}
                      </button>
                    );
                  })
                )}
              </div>
              {filteredDrawnChars.length < projectDrawnChars.length && (
                <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>
                  {filteredDrawnChars.length}件を表示中。検索で絞り込めます。
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Appearance & Fine Offsets */}
          <div className="lg:col-span-6 space-y-3">
            {/* Render Mode & Color Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Render Mode */}
              <div className={`p-3 rounded-lg border ${themeClasses.subtoolbarBg}`}>
                <label className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <span>表示モード</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'outline', label: '輪郭線', short: '輪郭線' },
                    { id: 'fill', label: '半透明塗り', short: '塗り' },
                    { id: 'difference', label: '差分強調', short: '差分' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        onChangeOverlaySettings((prev) =>
                          isOverlayRenderMode(m.id) ? { ...prev, renderMode: m.id } : prev
                        )
                      }
                      className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                        overlaySettings.renderMode === m.id
                          ? `${themeClasses.activeTool} border-transparent`
                          : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      <span className="sm:hidden">{m.short}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className={`p-3 rounded-lg border ${themeClasses.subtoolbarBg}`}>
                <label className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <span>比較色</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = overlaySettings.color === c.hex;
                    return (
                      <button
                        key={c.hex}
                        onClick={() =>
                          onChangeOverlaySettings((prev) => ({ ...prev, color: c.hex }))
                        }
                        title={c.name}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                          isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-105'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          {/* Opacity & Fine Offset Sliders */}
          <div className={`p-3 rounded-lg border space-y-2.5 ${themeClasses.subtoolbarBg}`}>
            <SliderRow
              label="不透明度 (Opacity)"
              value={Math.round((overlaySettings.opacity ?? 0.45) * 100)}
              min={10}
              max={100}
              step={5}
              unit="%"
              onChange={(v) =>
                onChangeOverlaySettings((prev) => ({ ...prev, opacity: v / 100 }))
              }
              theme={theme}
              themeClasses={themeClasses}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <SliderRow
                label="横位置オフセット (X)"
                value={overlaySettings.offsetX ?? 0}
                min={-250}
                max={250}
                step={5}
                unit="px"
                onChange={(v) =>
                  onChangeOverlaySettings((prev) => ({ ...prev, offsetX: v }))
                }
                theme={theme}
                themeClasses={themeClasses}
              />
              <SliderRow
                label="縦位置オフセット (Y)"
                value={overlaySettings.offsetY ?? 0}
                min={-250}
                max={250}
                step={5}
                unit="px"
                onChange={(v) =>
                  onChangeOverlaySettings((prev) => ({ ...prev, offsetY: v }))
                }
                theme={theme}
                themeClasses={themeClasses}
              />
            </div>

            {/* Show Metrics toggle */}
            <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${themeClasses.border}`}>
              <label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(overlaySettings?.showMetrics)}
                  onChange={(e) =>
                    onChangeOverlaySettings((prev) => ({
                      ...prev,
                      showMetrics: e.target.checked,
                    }))
                  }
                  className="rounded accent-emerald-600"
                />
                <span>比較文字の送り幅・LSBガイド線も表示</span>
              </label>

              <button
                onClick={handleResetTransform}
                className={`text-xs flex items-center gap-1 transition-colors cursor-pointer ${themeClasses.textMuted} hover:opacity-100`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>位置リセット</span>
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <ModalFooter
          primaryLabel="完了 (キャンバスに反映)"
          onPrimary={onClose}
          onCancel={onClose}
          cancelLabel="キャンセル"
          leftInfo={
            <span className={`text-xs ${themeClasses.textMuted}`}>
              選択中: 「<strong className={themeClasses.accentText}>{overlaySettings.referenceChar || '未設定'}</strong>」
            </span>
          }
          theme={theme}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};
