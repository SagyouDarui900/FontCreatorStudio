import React, { useState, useMemo, useEffect } from 'react';
import {
 X,
 Plus,
 Trash2,
 Sliders,
 Sparkles,
 CheckCircle2,
 Eye,
 Info,
 Maximize2,
 Minimize2,
 AlignHorizontalDistributeCenter,
 MoveHorizontal,
} from 'lucide-react';
import { FontProject } from '../types';
import {
 KERNING_PRESET_GROUPS,
 batchAdjustSidebearings,
 SidebearingBatchOptions,
 calculateAutoKernOffset,
} from '../utils/metricsHelper';
import { contoursToSvgPath, normalizeGlyphContoursWinding } from '../utils/path';

import { ThemeMode, getThemeClasses, isLightTheme } from '../utils/theme';
import { useIsTopModal } from './modals/ModalStackFrame';

interface KerningModalProps {
 isOpen: boolean;
 onClose: () => void;
 project: FontProject;
 setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
 onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
 showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
 onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
 theme: ThemeMode;
}

export const KerningModal: React.FC<KerningModalProps> = ({
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
 const [activeTab, setActiveTab] = useState<'kerning' | 'sidebearing'>('kerning');

 // Unified updater function supporting both prop styles
 const updateProject = useMemo(() => {
 if (onUpdateProject) return onUpdateProject;
 if (setProject) return setProject;
 return (_updater: (prev: FontProject) => FontProject) => {};
 }, [onUpdateProject, setProject]);

 const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
 if (showToast) {
 showToast(msg, type);
 } else if (onShowToast) {
 onShowToast(msg, type);
 }
 };

 // -------------------------------------------------------------
 // Kerning Pairs State
 // -------------------------------------------------------------
 const [selectedPairKey, setSelectedPairKey] = useState<string>('「,「');
 const [customLeft, setCustomLeft] = useState<string>('');
 const [customRight, setCustomRight] = useState<string>('');
 const [customValue, setCustomValue] = useState<number>(-100);
 const [sampleText, setSampleText] = useState<string>('「こんにちは」AVANT-GARDE 110番');

 // Fullscreen & Clear confirmation state
 const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
 const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);

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

 const kerningPairs = project.kerning || {};

 // Find or calculate current pair kerning value
 const currentPairValue = useMemo(() => {
 if (selectedPairKey in kerningPairs) {
 const v = kerningPairs[selectedPairKey];
 return typeof v === 'number' && Number.isFinite(v) ? v : 0;
 }
 // Check if preset default exists
 for (const group of KERNING_PRESET_GROUPS) {
 const match = group.pairs.find(
 (p) => `${p.left},${p.right}` === selectedPairKey
 );
 if (match) return match.defaultVal;
 }
 return 0;
 }, [selectedPairKey, kerningPairs]);

 // Selected pair character glyphs
 const pairGlyphs = useMemo(() => {
 const parts = selectedPairKey.split(',');
 const leftChar = parts[0] || '';
 const rightChar = parts[1] || '';

 const leftCode = leftChar.codePointAt(0);
 const rightCode = rightChar.codePointAt(0);

 const leftGlyph = leftCode ? project.glyphs[leftCode] : null;
 const rightGlyph = rightCode ? project.glyphs[rightCode] : null;

 return { leftChar, rightChar, leftGlyph, rightGlyph };
 }, [selectedPairKey, project.glyphs]);

 // -------------------------------------------------------------
 // Sidebearing State
 // -------------------------------------------------------------
 const [sbScope, setSbScope] = useState<SidebearingBatchOptions['scope']>('all');
 const [sbMode, setSbMode] = useState<SidebearingBatchOptions['mode']>('center');
 const [sbLsb, setSbLsb] = useState<number>(60);
 const [sbRsb, setSbRsb] = useState<number>(60);
 const [sbTargetAdvance, setSbTargetAdvance] = useState<number>(1000);
 const [sbOffsetDelta, setSbOffsetDelta] = useState<number>(0);
 const [sbPreviewChar, setSbPreviewChar] = useState<string>('あ');

 // Preview Glyph for Sidebearings
 const sbPreviewGlyph = useMemo(() => {
 const code = sbPreviewChar.codePointAt(0);
 if (!code) return null;
 return project.glyphs[code] || null;
 }, [sbPreviewChar, project.glyphs]);

 if (!isOpen) return null;

 // Add or update kerning pair
 const handleUpdateKerningValue = (val: number) => {
 const parts = selectedPairKey.split(',');
 const leftCode = parts[0]?.codePointAt(0);
 const rightCode = parts[1]?.codePointAt(0);
 if (!leftCode || !rightCode || !project.glyphs[leftCode] || !project.glyphs[rightCode]) {
 notify('対象の文字がまだ作図されていないため、カーニングを追加できません', 'warning');
 return;
 }
 updateProject((prev) => ({
 ...prev,
 kerning: {
 ...(prev.kerning || {}),
 [selectedPairKey]: val,
 },
 updatedAt: Date.now(),
 }));
 };

 // Add custom kerning pair
 const handleAddCustomPair = () => {
 const leftChar = Array.from(customLeft.trim())[0];
 const rightChar = Array.from(customRight.trim())[0];
 if (!leftChar || !rightChar) {
 notify('左文字と右文字の両方を入力してください', 'warning');
 return;
 }
 const leftCode = leftChar.codePointAt(0);
 const rightCode = rightChar.codePointAt(0);
 if (!leftCode || !rightCode || !project.glyphs[leftCode] || !project.glyphs[rightCode]) {
 notify('対象の文字がまだ作図されていないため、ペアを追加できません', 'warning');
 return;
 }
 const safeVal = Number.isFinite(customValue) ? Math.round(customValue) : 0;
 const pairKey = `${leftChar},${rightChar}`;
 updateProject((prev) => ({
 ...prev,
 kerning: {
 ...(prev.kerning || {}),
 [pairKey]: safeVal,
 },
 updatedAt: Date.now(),
 }));
 setSelectedPairKey(pairKey);
 setCustomLeft('');
 setCustomRight('');
 notify(`ペア「${pairKey}」(${safeVal}) を追加しました`, 'success');
 };

 // Remove kerning pair
 const handleRemovePair = (key: string) => {
 updateProject((prev) => {
 const next = { ...(prev.kerning || {}) };
 delete next[key];
 return {
 ...prev,
 kerning: next,
 updatedAt: Date.now(),
 };
 });
 notify(`ペア「${key}」のカーニング設定を解除しました`, 'info');
 };

 // Apply preset group
 const handleApplyPresetGroup = (group: (typeof KERNING_PRESET_GROUPS)[0]) => {
 const existingPairs = group.pairs.filter((p) => {
 const leftCode = p.left.codePointAt(0);
 const rightCode = p.right.codePointAt(0);
 return !!leftCode && !!rightCode && !!project.glyphs[leftCode] && !!project.glyphs[rightCode];
 });
 const skippedCount = group.pairs.length - existingPairs.length;
 if (existingPairs.length === 0) {
 notify('プリセットの対象文字がまだ作図されていないため、登録できません', 'warning');
 return;
 }
 updateProject((prev) => {
 const next = { ...(prev.kerning || {}) };
 for (const p of existingPairs) {
 next[`${p.left},${p.right}`] = p.defaultVal;
 }
 return {
 ...prev,
 kerning: next,
 updatedAt: Date.now(),
 };
 });
 notify(
 skippedCount > 0
 ? `プリセット「${group.name}」(${existingPairs.length}ペア) を一括登録しました（作図されていない文字の${skippedCount}ペアを除外）`
 : `プリセット「${group.name}」(${group.pairs.length}ペア) を一括登録しました`,
 skippedCount > 0 ? 'warning' : 'success'
 );
 };

 // FontForge AutoKern algorithm execution across glyphs
 const handleAutoKernAllPairs = () => {
 const glyphEntries = Object.values(project.glyphs || {});
 if (glyphEntries.length < 2) {
 notify('オートカーニングを実行するには最低2文字以上の作図が必要です', 'warning');
 return;
 }

 const nextKerning = { ...(project.kerning || {}) };
 let autoKernedCount = 0;

 const pairsToCalculate: { left: string; right: string }[] = [];
 for (const group of KERNING_PRESET_GROUPS) {
 for (const p of group.pairs) {
 pairsToCalculate.push({ left: p.left, right: p.right });
 }
 }

 for (const pair of pairsToCalculate) {
 const leftUnicode = pair.left.codePointAt(0);
 const rightUnicode = pair.right.codePointAt(0);
 if (!leftUnicode || !rightUnicode) continue;

 const leftGlyph = project.glyphs[leftUnicode];
 const rightGlyph = project.glyphs[rightUnicode];

 if (leftGlyph && rightGlyph) {
 const offset = calculateAutoKernOffset(leftGlyph, rightGlyph, 40);
 if (offset !== 0) {
 nextKerning[`${pair.left},${pair.right}`] = offset;
 autoKernedCount++;
 }
 }
 }

 if (autoKernedCount === 0) {
 notify('作図済み文字の中で大きな光学的ズレは検出されませんでした', 'info');
 return;
 }

 updateProject((prev) => ({
 ...prev,
 kerning: nextKerning,
 updatedAt: Date.now(),
 }));

 notify(`自動カーニング: ${autoKernedCount} ペアのカーニング値を光学計算しました！`, 'success');
 };

 // Execute Batch Sidebearings
 const handleExecuteSidebearingBatch = () => {
 const { updatedGlyphs, modifiedCount } = batchAdjustSidebearings(project.glyphs, {
 scope: sbScope,
 mode: sbMode,
 lsb: sbLsb,
 rsb: sbRsb,
 targetAdvance: sbTargetAdvance,
 offsetDelta: sbOffsetDelta,
 unitsPerEm: project.metadata.unitsPerEm,
 });

 if (modifiedCount === 0) {
 notify('対象となる文字がまだ作図されていません', 'warning');
 return;
 }

 updateProject((prev) => ({
 ...prev,
 glyphs: updatedGlyphs,
 updatedAt: Date.now(),
 }));

 notify(`${modifiedCount} 文字の余白・送り幅を一括調整しました！`, 'success');
 };

 return (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="カーニング & サイドベアリング調整スタジオ"
    className={`fixed inset-0 z-[60] anim-fade ${
      isFullscreen
        ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
        : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
    }`}
  >
    <div
      className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
        isFullscreen
          ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
          : `w-full h-[100dvh] sm:h-auto sm:max-w-4xl xl:max-w-5xl border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh] ${themeClasses.border}`
      }`}
    >
      {/* Modal Header */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-3.5 sm:pt-3.5 border-b shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
      >
 <div className="flex items-center gap-2.5 max-sm:min-w-0 max-sm:flex-1">
 <div className={`p-1.5 rounded-lg ${themeClasses.accentBtn}`}>
 <MoveHorizontal className="w-5 h-5" />
 </div>
 <div className="max-sm:min-w-0">
 <h2 className="text-base font-bold flex items-center gap-2 max-sm:min-w-0">
 <span className="max-sm:truncate">カーニング & サイドベアリング調整スタジオ</span>
 {isFullscreen && (
 <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${themeClasses.accentBtn}`}>
 全画面モード
 </span>
 )}
 </h2>
 <p className={`text-xs max-sm:hidden ${themeClasses.textMuted}`}>
 文字間のすきま（ペアカーニング）と左右余白（サイドベアリング）を一括調整します
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

 {/* Tabs */}
 <div
 className={`flex border-b px-3 sm:px-5 pt-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap ${themeClasses.subtoolbarBg}`}
 >
 <button
 onClick={() => setActiveTab('kerning')}
 className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
 activeTab === 'kerning'
 ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <MoveHorizontal className="w-3.5 h-3.5" />
 <span className="max-sm:hidden">ペアカーニング調整（約物・欧文・かな）</span>
 <span className="hidden max-sm:inline">ペアカーニング調整</span>
 </button>

 <button
 onClick={() => setActiveTab('sidebearing')}
 className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
 activeTab === 'sidebearing'
 ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
 <span className="max-sm:hidden">サイドベアリング（左右余白・送り幅）一括調整</span>
 <span className="hidden max-sm:inline">サイドベアリング一括調整</span>
 </button>
 </div>

 {/* Modal Content */}
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5 sm:pb-5">
 {activeTab === 'kerning' ? (
 /* ========================================================= */
 /* TAB 1: PAIR KERNING */
 /* ========================================================= */
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
 {/* Left Column: Preset Groups & Pair List */}
 <div className="lg:col-span-5 flex flex-col gap-4">
 {/* Preset Fast Loader */}
 <div
 className={`p-3.5 rounded-lg border flex flex-col gap-2 ${themeClasses.subtoolbarBg}`}
 >
 <span className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
 <span className="flex items-center gap-1.5">
 <Sparkles className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>標準カーニング一括プリセット</span>
 </span>
 <button
 type="button"
 onClick={handleAutoKernAllPairs}
 className="px-2.5 py-1 sm:px-2 sm:py-0.5 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer transition-colors"
 title="作図済みグリフの光学プロファイルからペアカーニングを自動計算"
 >
 <Sparkles className="w-3 h-3" />
 <span>自動カーニング</span>
 </button>
 </span>
 <div className="flex flex-col gap-1.5 mt-1">
 {KERNING_PRESET_GROUPS.map((group) => (
 <div
 key={group.id}
 className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${themeClasses.cardBg}`}
 >
 <div className="flex flex-col min-w-0">
 <span className="font-bold text-[11px]">{group.name}</span>
 <span className={`text-[10px] ${themeClasses.textMuted}`}>{group.description}</span>
 </div>
 <button
 onClick={() => handleApplyPresetGroup(group)}
 className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
 >
 一括登録
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Custom Pair Input */}
 <div
 className={`p-3.5 rounded-lg border flex flex-col gap-2 ${themeClasses.subtoolbarBg}`}
 >
 <span className="text-xs font-bold flex items-center gap-1.5">
 <Plus className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>自由なペアを追加</span>
 </span>
 <div className="grid grid-cols-[1fr_auto_1fr_1.3fr] sm:flex items-center gap-2 text-xs">
 <input
 type="text"
 maxLength={1}
 placeholder="左 (A)"
 value={customLeft ?? ''}
 onChange={(e) => setCustomLeft(e.target.value)}
 className={`w-full sm:w-14 p-2 sm:p-1.5 rounded-lg border text-center font-bold ${themeClasses.cardBg}`}
 />
 <span className={`font-bold ${themeClasses.textMuted}`}>+</span>
 <input
 type="text"
 maxLength={1}
 placeholder="右 (V)"
 value={customRight ?? ''}
 onChange={(e) => setCustomRight(e.target.value)}
 className={`w-full sm:w-14 p-2 sm:p-1.5 rounded-lg border text-center font-bold ${themeClasses.cardBg}`}
 />
 <input
 type="number"
 step={10}
 placeholder="-100"
 value={Number.isFinite(customValue) ? customValue : 0}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 setCustomValue(Number.isFinite(parsed) ? parsed : 0);
 }}
 className={`w-full sm:w-20 p-2 sm:p-1.5 rounded-lg border text-center font-mono font-bold ${themeClasses.cardBg}`}
 />
 <button
 onClick={handleAddCustomPair}
 className={`col-span-4 sm:col-span-1 sm:flex-1 py-2 sm:py-1.5 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
 >
 追加
 </button>
 </div>
 </div>

 {/* Registered Pairs List */}
 <div
 className={`p-3 rounded-lg border flex-1 flex flex-col min-h-48 ${themeClasses.subtoolbarBg}`}
 >
 <div className={`flex items-center justify-between text-[11px] font-bold mb-2 ${themeClasses.textMuted}`}>
 <span>登録済みペア一覧 ({Object.keys(kerningPairs).length} 件):</span>
 {Object.keys(kerningPairs).length > 0 && (
 isConfirmingClearAll ? (
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => {
 updateProject((prev) => ({ ...prev, kerning: {}, updatedAt: Date.now() }));
 setIsConfirmingClearAll(false);
 notify('登録済みのカーニングをすべて削除しました', 'info');
 }}
 className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] hover:bg-rose-700 transition-colors cursor-pointer"
 >
 本当に全削除
 </button>
 <button
 type="button"
 onClick={() => setIsConfirmingClearAll(false)}
 className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`}
 >
 キャンセル
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setIsConfirmingClearAll(true)}
 className="text-[10px] text-red-500 hover:text-red-700 transition-colors cursor-pointer"
 >
 全削除
 </button>
 )
 )}
 </div>
 <div className="flex-1 overflow-y-auto max-h-56 flex flex-col gap-1 pr-1">
 {Object.entries(kerningPairs).length === 0 ? (
 <div className={`text-center p-6 text-xs ${themeClasses.textMuted}`}>
 上のプリセットから一括登録するか、自由な文字ペアを追加してください
 </div>
 ) : (
 Object.entries(kerningPairs).map(([pairKey, val]) => (
 <div
 key={pairKey}
 onClick={() => setSelectedPairKey(pairKey)}
 className={`p-2 rounded border flex items-center justify-between text-xs cursor-pointer transition-colors ${
 selectedPairKey === pairKey
 ? `${themeClasses.activeTool} border-transparent`
 : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
 }`}
 >
 <span className="font-mono text-sm tracking-widest">{pairKey.replace(',', ' ')}</span>
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-xs">
 {Number(val) > 0 ? `+${val}` : `${val}`}
 </span>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleRemovePair(pairKey);
 }}
 className={`p-1 rounded hover:text-red-600 transition-colors cursor-pointer ${
 selectedPairKey === pairKey ? 'opacity-80 hover:opacity-100' : themeClasses.textMuted
 }`}
 title="ペアを削除"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Right Column: Live Pair Preview & Slider Controls */}
 <div className="lg:col-span-7 flex flex-col gap-4">
 {/* Active Pair Control Box */}
 <div
 className={`p-4 rounded-lg border flex flex-col gap-4 ${themeClasses.subtoolbarBg}`}
 >
 <div className="flex items-center justify-between text-xs font-bold">
 <span className="flex items-center gap-1.5">
 <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>選択ペアの字間微調整</span>
 </span>
 <span className={`font-mono text-sm ${themeClasses.accentText}`}>
 「{pairGlyphs.leftChar}」と「{pairGlyphs.rightChar}」
 </span>
 </div>

 {/* Value Slider */}
 <div className="flex flex-col gap-1.5">
 <div className="flex justify-between items-center text-xs">
 <span className={themeClasses.textMuted}>カーニング変位値 (フォント単位):</span>
 <div className="flex items-center gap-2">
 <input
 type="number"
 step={5}
 value={Number.isFinite(currentPairValue) ? currentPairValue : 0}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 handleUpdateKerningValue(Number.isFinite(parsed) ? parsed : 0);
 }}
 className={`w-20 p-1 text-center font-mono font-bold rounded border ${themeClasses.cardBg}`}
 />
 <span className={`text-xs ${themeClasses.textMuted}`}>units</span>
 </div>
 </div>
 <input
 type="range"
 min="-300"
 max="150"
 step="5"
 value={Number.isFinite(currentPairValue) ? currentPairValue : 0}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 handleUpdateKerningValue(Number.isFinite(parsed) ? parsed : 0);
 }}
 className="w-full h-2 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
 />
 <div className={`flex justify-between text-[10px] ${themeClasses.textMuted}`}>
 <span>-300 (詰める)</span>
 <span>0 (基準)</span>
 <span>+150 (広げる)</span>
 </div>
 </div>

 {/* Visual Pair Comparison */}
 <div className="flex flex-col gap-2">
 <span className={`text-[11px] font-bold ${themeClasses.textMuted}`}>
 字間比較プレビュー（上: カーニングなし / 下: カーニング適用後）:
 </span>

 {/* Compare Container */}
 <div className={`grid grid-rows-2 gap-2 p-3 rounded-lg border overflow-hidden ${themeClasses.cardBg}`}>
 {/* Row 1: Without Kerning */}
 <div className={`flex items-center gap-3 border-b pb-2 min-w-0 ${themeClasses.border}`}>
 <span className={`text-[10px] w-16 shrink-0 ${themeClasses.textMuted}`}>通常(±0)</span>
 <div className="h-16 min-w-0 flex-1 flex items-center relative overflow-hidden sm:overflow-visible">
 <svg viewBox="0 0 2000 1000" className="w-full max-w-[160px] sm:w-auto h-16 overflow-visible">
 {/* Left Glyph */}
 {pairGlyphs.leftGlyph && (
 <path
 d={contoursToSvgPath(pairGlyphs.leftGlyph.contours || [])}
 fill={isLight ? '#57534e' : '#6ee7b7'}
 opacity={0.7}
 />
 )}
 {/* Right Glyph shifted by regular advance */}
 {pairGlyphs.rightGlyph && (
 <g transform={`translate(${pairGlyphs.leftGlyph?.advanceWidth || 1000}, 0)`}>
 <path
 d={contoursToSvgPath(pairGlyphs.rightGlyph.contours || [])}
 fill={isLight ? '#57534e' : '#6ee7b7'}
 opacity={0.7}
 />
 </g>
 )}
 </svg>
 </div>
 </div>

 {/* Row 2: With Kerning */}
 <div className="flex items-center gap-3 pt-1 min-w-0">
 <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 w-16 shrink-0">
 {currentPairValue > 0 ? `+${currentPairValue}` : currentPairValue} 適用
 </span>
 <div className="h-16 min-w-0 flex-1 flex items-center relative overflow-hidden sm:overflow-visible">
 <svg viewBox="0 0 2000 1000" className="w-full max-w-[160px] sm:w-auto h-16 overflow-visible">
 {/* Left Glyph */}
 {pairGlyphs.leftGlyph && (
 <path
 d={contoursToSvgPath(pairGlyphs.leftGlyph.contours || [])}
 fill={isLight ? '#1c1917' : '#34d399'}
 />
 )}
 {/* Right Glyph shifted by regular advance + kerning offset */}
 {pairGlyphs.rightGlyph && (
 <g
 transform={`translate(${
 (pairGlyphs.leftGlyph?.advanceWidth || 1000) + currentPairValue
 }, 0)`}
 >
 <path
 d={contoursToSvgPath(pairGlyphs.rightGlyph.contours || [])}
 fill={isLight ? '#1c1917' : '#34d399'}
 />
 </g>
 )}
 </svg>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Live Sample Sentence Testing */}
 <div
 className={`p-3.5 rounded-lg border flex flex-col gap-2 ${themeClasses.subtoolbarBg}`}
 >
 <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold">
 <span className="flex items-center gap-1.5">
 <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>リアルタイム組版テスト</span>
 </span>
 <span className={`text-[10px] ${themeClasses.textMuted}`}>文字を入力してテストできます</span>
 </div>
 <input
 type="text"
 value={sampleText ?? ''}
 onChange={(e) => setSampleText(e.target.value)}
 className={`w-full p-2 text-xs rounded border ${themeClasses.cardBg}`}
 placeholder="テスト組版テキスト"
 />

 {/* Render Sample Canvas */}
 <div className={`p-4 rounded border min-h-20 flex items-center justify-center overflow-x-auto shadow-inner ${themeClasses.cardBg}`}>
 <div className="flex items-center h-20">
 <svg viewBox="0 0 5000 1000" className="h-20 overflow-visible">
 {(() => {
 const chars = [...sampleText];
 let cursorX = 50;
 return chars.map((ch, idx) => {
 const code = ch.codePointAt(0);
 const glyph = code ? project.glyphs[code] : null;
 const currentAdvance = glyph?.advanceWidth || 1000;

 // Calculate kerning with next char
 let kernOffset = 0;
 if (idx < chars.length - 1) {
 const nextChar = chars[idx + 1];
 const pairKey = `${ch},${nextChar}`;
 kernOffset = kerningPairs[pairKey] || 0;
 }

 const x = cursorX;
 cursorX += currentAdvance + kernOffset;

 if (!glyph || !glyph.contours || glyph.contours.length === 0) {
 // Missing fallback box
 return (
 <g key={idx} transform={`translate(${x}, 0)`}>
 <rect
 x={50}
 y={100}
 width={currentAdvance - 100}
 height={800}
 fill="none"
 stroke={isLight ? '#e5e7eb' : '#223126'}
 strokeDasharray="20 20"
 />
 </g>
 );
 }

 return (
 <g key={idx} transform={`translate(${x}, 0)`}>
 <path
 d={contoursToSvgPath(normalizeGlyphContoursWinding(glyph.contours))}
 fill={isLight ? '#1c1917' : '#34d399'}
 fillRule="nonzero"
 />
 </g>
 );
 });
 })()}
 </svg>
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : (
 /* ========================================================= */
 /* TAB 2: SIDEBEARINGS BATCH ADJUSTMENT */
 /* ========================================================= */
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
 {/* Left Controls */}
 <div className="lg:col-span-7 flex flex-col gap-4">
 {/* Scope Selection */}
 <div
 className={`p-3.5 rounded-lg border flex flex-col gap-3 ${themeClasses.subtoolbarBg}`}
 >
 <span className="text-xs font-bold flex items-center gap-1.5">
 <AlignHorizontalDistributeCenter className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>調整対象の文字カテゴリ</span>
 </span>
 <div className="flex flex-wrap gap-1.5">
 {(
 [
 { id: 'all', name: '全グリフ一括' },
 { id: 'hiragana', name: 'ひらがな' },
 { id: 'katakana', name: 'カタカナ' },
 { id: 'kanji', name: '漢字' },
 { id: 'latin', name: '英数字' },
 { id: 'symbols', name: '記号・約物' },
 ] as const
 ).map((sc) => (
 <button
 key={sc.id}
 onClick={() => setSbScope(sc.id)}
 className={`px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
 sbScope === sc.id
 ? `${themeClasses.activeTool} border-transparent`
 : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
 }`}
 >
 {sc.name}
 </button>
 ))}
 </div>
 </div>

 {/* Adjustment Mode Card */}
 <div
 className={`p-3.5 rounded-lg border flex flex-col gap-3.5 ${themeClasses.subtoolbarBg}`}
 >
 <span className="text-xs font-bold flex items-center gap-1.5">
 <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>サイドベアリング調整モード</span>
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
 {(
 [
 {
 id: 'center',
 title: '① 左右余白均等センタリング',
 desc: '字面枠の中央に文字を配置（LSB = RSB）',
 },
 {
 id: 'proportional',
 title: '② プロポーショナル化',
 desc: '指定の左右余白で文字幅に合わせて送り幅を再計算',
 },
 {
 id: 'uniform-advance',
 title: '③ 送り幅統一（全角/半角）',
 desc: '全角1000pxや半角500px等に送り幅を固定',
 },
 {
 id: 'offset-lsb',
 title: '④ 左余白(LSB)の加減算',
 desc: '文字の左余白を一律に左右へシフト',
 },
 ] as const
 ).map((m) => (
 <button
 key={m.id}
 onClick={() => setSbMode(m.id)}
 className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
 sbMode === m.id
 ? `${themeClasses.activeTool} border-transparent`
 : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
 }`}
 >
 <div className="text-xs font-bold">{m.title}</div>
 <div className={`text-[10px] mt-0.5 ${sbMode === m.id ? 'opacity-85' : themeClasses.textMuted}`}>
 {m.desc}
 </div>
 </button>
 ))}
 </div>

 {/* Mode Specific Inputs */}
 {sbMode === 'proportional' && (
 <div className={`grid grid-cols-2 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
 <div>
 <span className={`block mb-1 ${themeClasses.textMuted}`}>目標 左余白 (LSB):</span>
 <input
 type="number"
 value={Number.isFinite(sbLsb) ? sbLsb : 60}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 setSbLsb(Number.isFinite(parsed) ? parsed : 0);
 }}
 className={`w-full p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg}`}
 />
 </div>
 <div>
 <span className={`block mb-1 ${themeClasses.textMuted}`}>目標 右余白 (RSB):</span>
 <input
 type="number"
 value={Number.isFinite(sbRsb) ? sbRsb : 60}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 setSbRsb(Number.isFinite(parsed) ? parsed : 0);
 }}
 className={`w-full p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg}`}
 />
 </div>
 </div>
 )}

 {sbMode === 'uniform-advance' && (
 <div className={`pt-2 border-t text-xs ${themeClasses.border}`}>
 <span className={`block mb-1 ${themeClasses.textMuted}`}>送り幅 (Advance Width):</span>
 <div className="flex items-center gap-2 max-sm:flex-wrap">
 <input
 type="number"
 step={50}
 value={Number.isFinite(sbTargetAdvance) ? sbTargetAdvance : 1000}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 setSbTargetAdvance(Number.isFinite(parsed) ? parsed : 1000);
 }}
 className={`w-32 p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg}`}
 />
 <button
 onClick={() => setSbTargetAdvance(1000)}
 className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 全角 (1000)
 </button>
 <button
 onClick={() => setSbTargetAdvance(500)}
 className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 半角 (500)
 </button>
 </div>
 </div>
 )}

 {(sbMode === 'offset-lsb' || sbMode === 'offset-rsb') && (
 <div className={`pt-2 border-t text-xs ${themeClasses.border}`}>
 <div className="flex justify-between text-xs mb-1">
 <span className={themeClasses.textMuted}>オフセットシフト値:</span>
 <span className="font-mono font-bold">{sbOffsetDelta > 0 ? `+${sbOffsetDelta}` : sbOffsetDelta}px</span>
 </div>
 <input
 type="range"
 min="-150"
 max="150"
 step="5"
 value={Number.isFinite(sbOffsetDelta) ? sbOffsetDelta : 0}
 onChange={(e) => {
 const parsed = Number(e.target.value);
 setSbOffsetDelta(Number.isFinite(parsed) ? parsed : 0);
 }}
 className="w-full h-2 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
 />
 </div>
 )}
 </div>

 {/* Preview Char Selector */}
 <div
 className={`p-3 rounded-lg border flex items-center justify-between text-xs max-sm:flex-wrap max-sm:gap-2 ${themeClasses.subtoolbarBg}`}
 >
 <span className={`font-bold ${themeClasses.textMuted}`}>
 プレビューする文字:
 </span>
 <div className="flex flex-wrap items-center gap-1.5">
 {['あ', 'い', 'か', '漢', '字', 'A', '1'].map((c) => (
 <button
 key={c}
 onClick={() => setSbPreviewChar(c)}
 className={`w-9 h-9 sm:w-7 sm:h-7 rounded border text-xs font-bold transition-colors cursor-pointer ${
 sbPreviewChar === c
 ? `${themeClasses.activeTool} border-transparent`
 : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
 }`}
 >
 {c}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Right Sidebearing Preview */}
 <div className="lg:col-span-5 flex flex-col gap-3">
 <div
 className={`p-4 rounded-lg border flex flex-col items-center justify-center ${themeClasses.subtoolbarBg}`}
 >
 <div className="w-full flex items-center justify-between text-xs font-bold mb-2">
 <span className="flex items-center gap-1">
 <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>余白・送り幅プレビュー</span>
 </span>
 <span className={`font-mono ${themeClasses.textMuted}`}>「{sbPreviewChar}」</span>
 </div>

 <div className={`w-full max-w-[256px] aspect-square relative rounded-lg border flex items-center justify-center overflow-hidden shadow-inner ${themeClasses.cardBg}`}>
 {/* Visual Sidebearing Margins */}
 <div className="absolute inset-0 pointer-events-none opacity-20">
 <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
 <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
 </div>

 {sbPreviewGlyph && sbPreviewGlyph.contours && sbPreviewGlyph.contours.length > 0 ? (
 <svg viewBox="0 0 1000 1000" className="w-full h-full">
 {/* LSB guideline */}
 <line
 x1={sbPreviewGlyph.lsb || 50}
 y1={0}
 x2={sbPreviewGlyph.lsb || 50}
 y2={1000}
 stroke="#10b981"
 strokeWidth={2}
 strokeDasharray="4 4"
 />
 {/* Advance width guideline */}
 <line
 x1={sbPreviewGlyph.advanceWidth || 1000}
 y1={0}
 x2={sbPreviewGlyph.advanceWidth || 1000}
 y2={1000}
 stroke="#ef4444"
 strokeWidth={2}
 strokeDasharray="4 4"
 />
 {/* Glyph Contours */}
 <path
 d={contoursToSvgPath(normalizeGlyphContoursWinding(sbPreviewGlyph.contours))}
 fill={isLight ? '#1c1917' : '#34d399'}
 fillRule="nonzero"
 />
 </svg>
 ) : (
 <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
 文字「{sbPreviewChar}」がまだ作図されていません
 </div>
 )}
 </div>

 <div className={`mt-2 text-[10px] text-center flex items-center gap-1 ${themeClasses.textMuted}`}>
 <Info className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
 <span>緑破線: 左余白(LSB) / 赤破線: 送り幅境界</span>
 </div>
 </div>

 {/* Batch Execute Button */}
 <button
 type="button"
 onClick={handleExecuteSidebearingBatch}
 className={`w-full py-2.5 px-4 min-h-[44px] sm:min-h-0 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>選択カテゴリのサイドベアリングを一括調整</span>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};
