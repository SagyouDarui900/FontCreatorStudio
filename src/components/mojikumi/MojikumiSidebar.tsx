import React from 'react';
import { Bookmark, Check, Sparkles } from 'lucide-react';
import {
  BurasagariMode,
  KinsokuAdjustMode,
  KinsokuSetId,
  MojikumiConfig,
  MojikumiPresetId,
  ParagraphIndentPresetId,
} from '../../types';
import { MOJIKUMI_PRESETS, TypesettingDimensions } from '../../utils/mojikumiEngine';
import { ThemeClasses } from '../../utils/theme';
import { AOZORA_TEXTS, AozoraWork } from './aozoraTexts';
import { MojikumiMobileTab, MojikumiSidebarTab } from './types';

interface MojikumiSidebarProps {
  isLight: boolean;
  themeClasses: ThemeClasses;
  mobileTab: MojikumiMobileTab;
  onChangeMobileTab: (tab: MojikumiMobileTab) => void;
  sidebarTab: MojikumiSidebarTab;
  onChangeSidebarTab: (tab: MojikumiSidebarTab) => void;
  selectedWorkId: string;
  onSelectWork: (work: AozoraWork) => void;
  customText: string;
  onChangeCustomText: (text: string) => void;
  fontSizeQ: number;
  onChangeFontSizeQ: (value: number) => void;
  lineFeedH: number;
  onChangeLineFeedH: (value: number) => void;
  charsPerLine: number;
  onChangeCharsPerLine: (value: number) => void;
  lineCount: number;
  onChangeLineCount: (value: number) => void;
  dimensions: TypesettingDimensions;
  currentConfig: MojikumiConfig;
  onSelectPreset: (presetId: MojikumiPresetId) => void;
  onChangeKinsoku: (kinsoku: KinsokuSetId) => void;
  onChangeBurasagari: (burasagari: BurasagariMode) => void;
  // M18: paragraph indent and kinsoku adjust had no UI; the current value
  // is shown here and changed here.
  onChangeParagraphIndent: (indent: ParagraphIndentPresetId) => void;
  onChangeKinsokuAdjust: (adjust: KinsokuAdjustMode) => void;
  // M17: while the text is edited, no work card is highlighted.
  isCustomText?: boolean;
  isManuscriptMode?: boolean;
}

const SIDEBAR_TABS: { id: MojikumiSidebarTab; label: string }[] = [
  { id: 'text', label: '文学作品' },
  { id: 'dimensions', label: 'Q・H設計' },
  { id: 'mojikumi', label: 'アキ量' },
  { id: 'kinsoku', label: '禁則設定' },
];

const KINSOKU_OPTIONS: { id: KinsokuSetId; name: string }[] = [
  { id: 'weak_v2', name: '弱い禁則 v2 (推奨)' },
  { id: 'strong', name: '強い禁則' },
  { id: 'weak', name: '弱い禁則' },
  { id: 'none', name: '禁則なし' },
];

const BURASAGARI_OPTIONS: { id: BurasagariMode; name: string }[] = [
  { id: 'standard', name: 'あり (標準)' },
  { id: 'forced', name: '強制ぶら下がり' },
  { id: 'none', name: 'なし' },
];

const PARAGRAPH_INDENT_OPTIONS: { id: ParagraphIndentPresetId; name: string }[] = [
  { id: 'visual_half', name: '見た目半角下がり（既定）' },
  { id: 'visual_full', name: '見た目全角下がり' },
  { id: 'visual_full_half', name: '見た目全角半下がり' },
  { id: 'none', name: 'なし' },
];

const KINSOKU_ADJUST_OPTIONS: { id: KinsokuAdjustMode; name: string }[] = [
  { id: 'push_out', name: '追い出し' },
  { id: 'push_in', name: '追い込み' },
];

export const MojikumiSidebar: React.FC<MojikumiSidebarProps> = ({
  isLight,
  themeClasses,
  mobileTab,
  onChangeMobileTab,
  sidebarTab,
  onChangeSidebarTab,
  selectedWorkId,
  onSelectWork,
  customText,
  onChangeCustomText,
  fontSizeQ,
  onChangeFontSizeQ,
  lineFeedH,
  onChangeLineFeedH,
  charsPerLine,
  onChangeCharsPerLine,
  lineCount,
  onChangeLineCount,
  dimensions,
  currentConfig,
  onSelectPreset,
  onChangeKinsoku,
  onChangeBurasagari,
  onChangeParagraphIndent,
  onChangeKinsokuAdjust,
  isCustomText = false,
  isManuscriptMode = false,
}) => {
  return (
    <aside
      className={`${
        mobileTab === 'preview' ? 'hidden md:flex' : 'flex'
      } w-full md:w-[360px] xl:w-[400px] flex-col border-r shrink-0 min-h-0 overflow-hidden ${themeClasses.sidebarBg}`}
    >
      {/* Sidebar Navigation Tabs */}
      <div
        className={`grid grid-cols-4 items-center px-2 py-2 border-b text-xs font-bold gap-1 shrink-0 ${themeClasses.headerBg}`}
      >
        {SIDEBAR_TABS.map((tab) => {
          const isSel = sidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSidebarTab(tab.id)}
              className={`py-1.5 min-h-[44px] sm:min-h-0 px-1 rounded-md text-[11px] text-center transition-colors duration-150 truncate ${
                isSel
                  ? isLight
                    ? 'bg-white text-emerald-900 shadow-xs border border-stone-200 font-bold'
                    : 'bg-emerald-800 text-white font-bold shadow-xs'
                  : isLight
                  ? 'text-stone-500 hover:text-stone-900'
                  : `${themeClasses.textMuted} hover:text-stone-100`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sidebar Scrollable Body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-4 custom-scrollbar text-xs"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* TAB 1: 青空文庫 文学作品セレクター */}
        {sidebarTab === 'text' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className={`font-bold flex items-center justify-between ${themeClasses.textPrimary}`}>
                <span>青空文庫 著作権満了名作</span>
                <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </label>

              <div className="space-y-1.5 md:max-h-[240px] md:overflow-y-auto custom-scrollbar md:pr-1">
                {AOZORA_TEXTS.map((work) => {
                  // M17: while the text is edited, no work is highlighted.
                  const isSelected = work.id === selectedWorkId && !isCustomText;
                  return (
                    <div
                      key={work.id}
                      onClick={() => onSelectWork(work)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? isLight
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500'
                            : 'bg-emerald-950/60 border-emerald-500 text-emerald-100 font-medium ring-1 ring-emerald-500'
                          : isLight
                          ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                          : `${themeClasses.cardBg} hover:opacity-90`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">『{work.title}』</span>
                        <span className="text-[10px] font-mono opacity-60 shrink-0 ml-1">
                          {work.author}
                        </span>
                      </div>
                      <div className={`text-[10px] ${themeClasses.textMuted} pt-0.5 line-clamp-1`}>
                        {work.genreName} · {work.publishedYear} · {work.summary}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Text Area */}
            <div className={`space-y-1.5 pt-2.5 border-t ${themeClasses.border}`}>
              <label className={`font-bold flex items-center justify-between ${themeClasses.textPrimary}`}>
                <span>組版テキストの編集</span>
                <span className={`text-[10px] font-mono tabular-nums ${themeClasses.textMuted}`}>
                  {isCustomText ? 'カスタム編集中 · ' : ''}{customText.length} 文字
                </span>
              </label>
              {/* M16: custom text is not saved to the project, so say so here. */}
              {isCustomText && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  ※ カスタムテキストはプロジェクトに保存されません。再読み込みで失われます。
                </div>
              )}
              <textarea
                value={customText}
                onChange={(e) => onChangeCustomText(e.target.value)}
                rows={6}
                className={`w-full p-2.5 rounded-lg border text-xs resize-y min-h-[112px] font-sans leading-relaxed ${
                  isLight
                    ? 'bg-white border-stone-300 text-stone-900 focus:ring-1 focus:ring-emerald-500'
                    : `${themeClasses.cardBg} focus:ring-1 focus:ring-emerald-400`
                }`}
                placeholder="組版を検証する文章を入力..."
              />
            </div>
          </div>
        )}

        {/* TAB 2: Q・H寸法設計 */}
        {sidebarTab === 'dimensions' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">文字サイズ（Q数）</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="文字サイズを0.5Q下げる"
                    onClick={() => onChangeFontSizeQ(Math.max(8, Number((fontSizeQ - 0.5).toFixed(1))))}
                    className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    -
                  </button>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-[11px] min-w-[110px] text-center">
                    {fontSizeQ}Q ({dimensions.fontSizePt}pt / {(fontSizeQ * 0.25).toFixed(2)}mm)
                  </span>
                  <button
                    type="button"
                    aria-label="文字サイズを0.5Q上げる"
                    onClick={() => onChangeFontSizeQ(Math.min(40, Number((fontSizeQ + 0.5).toFixed(1))))}
                    className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="0.5"
                value={fontSizeQ}
                onChange={(e) => onChangeFontSizeQ(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="text-[10px] text-stone-400 flex justify-between">
                <span>最小: 8Q (本文小注)</span>
                <span>標準: 13〜15Q (書籍本文)</span>
                <span>最大: 40Q</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">行送り（歯数 / H）</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="行送りを0.5H下げる"
                    onClick={() => onChangeLineFeedH(Math.max(12, Number((lineFeedH - 0.5).toFixed(1))))}
                    className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    -
                  </button>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-[11px] min-w-[110px] text-center">
                    {lineFeedH}H ({dimensions.lineFeedPt}pt / {(lineFeedH * 0.25).toFixed(2)}mm)
                  </span>
                  <button
                    type="button"
                    aria-label="行送りを0.5H上げる"
                    onClick={() => onChangeLineFeedH(Math.min(60, Number((lineFeedH + 0.5).toFixed(1))))}
                    className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="12"
                max="60"
                step="0.5"
                value={lineFeedH}
                onChange={(e) => onChangeLineFeedH(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="text-[10px] text-stone-400 flex justify-between tabular-nums">
                <span>
                  行間: {Math.max(0, dimensions.lineGapH)}H (
                  {(Math.max(0, dimensions.lineGapH) * 0.25).toFixed(2)}mm)
                </span>
                <span>行送り比率: {Math.round((lineFeedH / fontSizeQ) * 100)}%</span>
              </div>
              {lineFeedH < fontSizeQ && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  ※ 行送りが文字サイズ未満です（行同士が重なる設定）
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">1行字詰め（字数）</span>
                <div className="flex items-center gap-1">
                  {!isManuscriptMode && (
                    <button
                      type="button"
                      aria-label="1行字詰めを1字減らす"
                      onClick={() => onChangeCharsPerLine(Math.max(10, charsPerLine - 1))}
                      className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                    >
                      -
                    </button>
                  )}
                  <span className="font-mono tabular-nums font-bold text-[11px]">
                    {isManuscriptMode ? '20 文字 (原稿用紙固定)' : `${charsPerLine} 文字`}
                  </span>
                  {!isManuscriptMode && (
                    <button
                      type="button"
                      aria-label="1行字詰めを1字増やす"
                      onClick={() => onChangeCharsPerLine(Math.min(45, charsPerLine + 1))}
                      className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={isManuscriptMode ? 20 : charsPerLine}
                disabled={isManuscriptMode}
                onChange={(e) => onChangeCharsPerLine(Number(e.target.value))}
                className="w-full accent-emerald-600 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">1ページ行数</span>
                <div className="flex items-center gap-1">
                  {!isManuscriptMode && (
                    <button
                      type="button"
                      aria-label="1ページ行数を1行減らす"
                      onClick={() => onChangeLineCount(Math.max(4, lineCount - 1))}
                      className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                    >
                      -
                    </button>
                  )}
                  <span className="font-mono tabular-nums font-bold text-[11px]">
                    {isManuscriptMode ? '20 行 (原稿用紙固定)' : `${lineCount} 行`}
                  </span>
                  {!isManuscriptMode && (
                    <button
                      type="button"
                      aria-label="1ページ行数を1行増やす"
                      onClick={() => onChangeLineCount(Math.min(24, lineCount + 1))}
                      className={`w-8 h-8 md:w-7 md:h-7 rounded border text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="1"
                value={isManuscriptMode ? 20 : lineCount}
                disabled={isManuscriptMode}
                onChange={(e) => onChangeLineCount(Number(e.target.value))}
                className="w-full accent-emerald-600 disabled:opacity-50"
              />
            </div>

            {/* Calculated Box Dimensions Card */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isLight
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              }`}
            >
              <div className="font-bold text-xs flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>JIS X 4051 規範版面寸法計算</span>
              </div>
              <div className="space-y-1 font-mono tabular-nums text-[11px]">
                <div>
                  <span className="font-sans text-stone-500">版面幅: </span>
                  <strong>{dimensions.widthMm} mm</strong>
                </div>
                <div>
                  <span className="font-sans text-stone-500">版面高: </span>
                  <strong>{dimensions.heightMm} mm</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 文字組みアキ量プリセット */}
        {sidebarTab === 'mojikumi' && (
          <div className="space-y-4">
            <label className="font-bold text-stone-700 dark:text-stone-300">
              JIS &amp; DTP準拠アキ量プリセット
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(MOJIKUMI_PRESETS) as MojikumiPresetId[]).map((pid) => {
                const p = MOJIKUMI_PRESETS[pid];
                const isSelected = currentConfig.preset === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => onSelectPreset(pid)}
                    className={`p-2.5 rounded-lg border text-left transition-colors duration-150 ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500'
                        : isLight
                        ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                        : `${themeClasses.cardBg} hover:opacity-90`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{p.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <p className={`text-[11px] ${themeClasses.textMuted} pt-0.5 line-clamp-1`}>
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: 禁則処理 & ぶら下がり */}
        {sidebarTab === 'kinsoku' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={`font-bold ${themeClasses.textPrimary}`}>
                禁則処理セット（JIS基準）
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {KINSOKU_OPTIONS.map((ks) => (
                  <button
                    key={ks.id}
                    type="button"
                    onClick={() => onChangeKinsoku(ks.id)}
                    className={`p-2 rounded-lg border text-left text-xs transition-colors duration-150 ${
                      currentConfig.kinsoku === ks.id
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                        : isLight
                        ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                        : `${themeClasses.cardBg} hover:opacity-90`
                    }`}
                  >
                    {ks.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={`space-y-1.5 pt-2 border-t ${themeClasses.border}`}>
              <label className={`font-bold ${themeClasses.textPrimary}`}>
                句読点ぶら下がり設定
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {BURASAGARI_OPTIONS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onChangeBurasagari(bg.id)}
                    className={`p-2 rounded-lg border text-center text-xs transition-colors duration-150 ${
                      currentConfig.burasagari === bg.id
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                        : isLight
                        ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                        : `${themeClasses.cardBg} hover:opacity-90`
                    }`}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* M18: paragraph indent */}
            <div className={`space-y-1.5 pt-2 border-t ${themeClasses.border}`}>
              <label className={`font-bold ${themeClasses.textPrimary}`}>
                段落字下げ
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PARAGRAPH_INDENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={currentConfig.paragraphIndent === opt.id}
                    onClick={() => onChangeParagraphIndent(opt.id)}
                    className={`p-2 rounded-lg border text-left text-xs transition-colors duration-150 ${
                      currentConfig.paragraphIndent === opt.id
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                        : isLight
                        ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                        : `${themeClasses.cardBg} hover:opacity-90`
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
              <div className={`text-[10px] ${themeClasses.textMuted}`}>
                現在：{PARAGRAPH_INDENT_OPTIONS.find((o) => o.id === currentConfig.paragraphIndent)?.name}
                。プリセット変更ではこの値は変わりません。
              </div>
            </div>

            {/* M18: kinsoku adjust (push out / push in) */}
            <div className={`space-y-1.5 pt-2 border-t ${themeClasses.border}`}>
              <label className={`font-bold ${themeClasses.textPrimary}`}>
                禁則の追い出し・追い込み
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {KINSOKU_ADJUST_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={currentConfig.kinsokuAdjust === opt.id}
                    onClick={() => onChangeKinsokuAdjust(opt.id)}
                    className={`p-2 rounded-lg border text-center text-xs transition-colors duration-150 ${
                      currentConfig.kinsokuAdjust === opt.id
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                        : isLight
                        ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                        : `${themeClasses.cardBg} hover:opacity-90`
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
              <div className={`text-[10px] ${themeClasses.textMuted}`}>
                現在：{currentConfig.kinsokuAdjust === 'push_out' ? '追い出し' : '追い込み'}
                。プリセット変更ではこの値は変わりません。
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Done / Close drawer button */}
      <div className={`p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t ${themeClasses.border} md:hidden ${themeClasses.headerBg}`}>
        <button
          type="button"
          onClick={() => onChangeMobileTab('preview')}
          className="w-full min-h-[42px] py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm transition-colors duration-150 cursor-pointer"
        >
          <span>プレビューに戻る</span>
        </button>
      </div>
    </aside>
  );
};
