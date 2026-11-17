import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Check,
  PenTool,
  Paintbrush,
  Maximize2,
  Minimize2,
  Edit2,
  Shuffle,
  Activity,
  Settings,
  Circle,
  Diamond,
  Flame,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  UserPenPreset,
  PressureCurveConfig,
} from '../../types';
import {
  DEFAULT_PRESSURE_CURVES,
  saveUserPenPresets,
  validateImportedPenPresets,
  makeUniquePresetName,
  clampBrushWidth,
} from '../../utils/presetData';
import { ThemeMode, isLightTheme } from '../../utils/theme';
import { PenPresetsModalProps, StudioTab } from './types';
import { PenPreviewSection } from './PenPreviewSection';
import { PenScratchpad } from './PenScratchpad';
import { PenPresetsSidebar } from './PenPresetsSidebar';
import { BasicTab } from './tabs/BasicTab';
import { TaperTab } from './tabs/TaperTab';
import { ShapeTab } from './tabs/ShapeTab';
import { RandomTab } from './tabs/RandomTab';
import { TypeTab } from './tabs/TypeTab';
import { DynamicTab } from './tabs/DynamicTab';
import { TextureTab } from './tabs/TextureTab';
import { SettingsTab } from './tabs/SettingsTab';

function createCleanDefaultPreset(): UserPenPreset {
  return {
    id: 'default-brush',
    name: '標準毛筆ペン',
    isCustom: false,
    brushStyle: 'brush',
    brushWidth: 38,
    pressureSensitivity: 'high',
    pressureCurve: DEFAULT_PRESSURE_CURVES.soft,
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 55,
    taperStartLength: 0,
    taperEndLength: 0,
    taperStartWidth: 100,
    taperEndWidth: 100,
    taperStartOpacity: 100,
    taperEndOpacity: 100,
    taperStartTime: 100,
    taperEndTime: 100,
    forceTaper: false,
    forceTaperEnd: false,
    taperTipShape: 'round',
    nibAngle: 0,
    nibAspectRatio: 0,
    nibFollowDirection: false,
    nibSpacing: 1,
    constantWidth: false,
    antiAlias: true,
    jitterPosition: 0,
    jitterConstrainPerp: true,
    jitterSize: 0,
    jitterOpacity: 0,
    jitterAngle: 0,
    jitterSpacing: 0,
    speedWidthFactor: 0,
    speedOpacityFactor: 0,
    speedFeatherFactor: 0,
    pressureWidthFactor: 0,
    pressureOpacityFactor: 0,
    pressureFeatherFactor: 0,
    stabilizationMethod: 'pre',
    speedStabilization: 0,
    legacyStabilization: false,
    inkBleed: 0,
    axisSlant: 0,
    edgeRoughness: 0,
    tipSharpness: 0,
    pressureGamma: 1.0,
  };
}

export const PenPresetsModal: React.FC<PenPresetsModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  onApplyPreset,
  onChangePressureCurve,
  presets,
  onUpdatePresets,
  theme = 'dark' as ThemeMode,
  activePenPreset,
  onClearActivePenPreset,
  onResetCanvasPrefs,
}) => {
  const isLight = isLightTheme(theme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('basic');
  const [mobileView, setMobileView] = useState<'params' | 'scratchpad'>('params');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Working Preset State
  const [workingPreset, setWorkingPreset] = useState<UserPenPreset>(() => {
    return {
      id: `custom-pen-${Date.now()}`,
      name: 'デジタルペン',
      isCustom: true,
      brushStyle: currentParams.brushStyle || 'brush',
      brushWidth: currentParams.brushWidth || 36,
      pressureSensitivity: currentParams.pressureSensitivity || 'high',
      pressureCurve: currentParams.pressureCurve || DEFAULT_PRESSURE_CURVES.soft,
      autoSmoothBrush: currentParams.autoSmoothBrush ?? true,
      smoothStrength: currentParams.smoothStrength || 'standard',
      smoothPreserveCorners: currentParams.smoothPreserveCorners ?? true,
      autoUnionBrush: currentParams.autoUnionBrush ?? true,
      smoothingIntensity: currentParams.smoothingIntensity ?? 55,
      taperStartLength: currentParams.taperStartLength ?? 0,
      taperEndLength: currentParams.taperEndLength ?? 0,
      taperStartWidth: currentParams.taperStartWidth ?? 100,
      taperEndWidth: currentParams.taperEndWidth ?? 100,
      taperStartOpacity: currentParams.taperStartOpacity ?? 100,
      taperEndOpacity: currentParams.taperEndOpacity ?? 100,
      taperStartTime: currentParams.taperStartTime ?? 100,
      taperEndTime: currentParams.taperEndTime ?? 100,
      forceTaper: currentParams.forceTaper ?? false,
      forceTaperEnd: currentParams.forceTaperEnd ?? false,
      taperTipShape: currentParams.taperTipShape || 'round',
      nibAngle: currentParams.nibAngle ?? 0,
      nibAspectRatio: currentParams.nibAspectRatio ?? 0,
      nibFollowDirection: currentParams.nibFollowDirection ?? false,
      nibSpacing: currentParams.nibSpacing ?? 1,
      constantWidth: currentParams.constantWidth ?? false,
      antiAlias: currentParams.antiAlias ?? true,
      jitterPosition: currentParams.jitterPosition ?? 0,
      jitterConstrainPerp: currentParams.jitterConstrainPerp ?? true,
      jitterSize: currentParams.jitterSize ?? 0,
      jitterOpacity: currentParams.jitterOpacity ?? 0,
      jitterAngle: currentParams.jitterAngle ?? 0,
      jitterSpacing: currentParams.jitterSpacing ?? 0,
      speedWidthFactor: currentParams.speedWidthFactor ?? 0,
      speedOpacityFactor: currentParams.speedOpacityFactor ?? 0,
      speedFeatherFactor: currentParams.speedFeatherFactor ?? 0,
      pressureWidthFactor: currentParams.pressureWidthFactor ?? 0,
      pressureOpacityFactor: currentParams.pressureOpacityFactor ?? 0,
      pressureFeatherFactor: currentParams.pressureFeatherFactor ?? 0,
      stabilizationMethod: currentParams.stabilizationMethod || 'pre',
      speedStabilization: currentParams.speedStabilization ?? 0,
      legacyStabilization: currentParams.legacyStabilization ?? false,
      inkBleed: currentParams.inkBleed ?? 0,
      axisSlant: currentParams.axisSlant ?? 0,
      edgeRoughness: currentParams.edgeRoughness ?? 0,
      tipSharpness: currentParams.tipSharpness ?? 0,
      pressureGamma: currentParams.pressureGamma ?? 1.0,
    };
  });

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setWorkingPreset((prev) => ({
        ...prev,
        brushStyle: currentParams.brushStyle,
        brushWidth: clampBrushWidth(currentParams.brushWidth),
        pressureSensitivity: currentParams.pressureSensitivity,
        pressureCurve: currentParams.pressureCurve || prev.pressureCurve,
        autoSmoothBrush: currentParams.autoSmoothBrush,
        smoothStrength: currentParams.smoothStrength,
        smoothPreserveCorners: currentParams.smoothPreserveCorners,
        autoUnionBrush: currentParams.autoUnionBrush,
        smoothingIntensity: currentParams.smoothingIntensity ?? prev.smoothingIntensity,
        taperStartLength: currentParams.taperStartLength ?? prev.taperStartLength,
        taperEndLength: currentParams.taperEndLength ?? prev.taperEndLength,
        taperStartWidth: currentParams.taperStartWidth ?? prev.taperStartWidth,
        taperEndWidth: currentParams.taperEndWidth ?? prev.taperEndWidth,
        taperStartOpacity: currentParams.taperStartOpacity ?? prev.taperStartOpacity,
        taperEndOpacity: currentParams.taperEndOpacity ?? prev.taperEndOpacity,
        taperStartTime: currentParams.taperStartTime ?? prev.taperStartTime,
        taperEndTime: currentParams.taperEndTime ?? prev.taperEndTime,
        forceTaper: currentParams.forceTaper ?? prev.forceTaper,
        forceTaperEnd: currentParams.forceTaperEnd ?? prev.forceTaperEnd,
        taperTipShape: currentParams.taperTipShape ?? prev.taperTipShape,
        nibAngle: currentParams.nibAngle ?? prev.nibAngle,
        nibAspectRatio: currentParams.nibAspectRatio ?? prev.nibAspectRatio,
        nibFollowDirection: currentParams.nibFollowDirection ?? prev.nibFollowDirection,
        nibSpacing: currentParams.nibSpacing ?? prev.nibSpacing,
        constantWidth: currentParams.constantWidth ?? prev.constantWidth,
        antiAlias: currentParams.antiAlias ?? prev.antiAlias,
        jitterPosition: currentParams.jitterPosition ?? prev.jitterPosition,
        jitterConstrainPerp: currentParams.jitterConstrainPerp ?? prev.jitterConstrainPerp,
        jitterSize: currentParams.jitterSize ?? prev.jitterSize,
        jitterOpacity: currentParams.jitterOpacity ?? prev.jitterOpacity,
        jitterAngle: currentParams.jitterAngle ?? prev.jitterAngle,
        jitterSpacing: currentParams.jitterSpacing ?? prev.jitterSpacing,
        speedWidthFactor: currentParams.speedWidthFactor ?? prev.speedWidthFactor,
        speedOpacityFactor: currentParams.speedOpacityFactor ?? prev.speedOpacityFactor,
        speedFeatherFactor: currentParams.speedFeatherFactor ?? prev.speedFeatherFactor,
        pressureWidthFactor: currentParams.pressureWidthFactor ?? prev.pressureWidthFactor,
        pressureOpacityFactor: currentParams.pressureOpacityFactor ?? prev.pressureOpacityFactor,
        pressureFeatherFactor: currentParams.pressureFeatherFactor ?? prev.pressureFeatherFactor,
        stabilizationMethod: currentParams.stabilizationMethod ?? prev.stabilizationMethod,
        speedStabilization: currentParams.speedStabilization ?? prev.speedStabilization,
        legacyStabilization: currentParams.legacyStabilization ?? prev.legacyStabilization,
        inkBleed: currentParams.inkBleed ?? prev.inkBleed,
        axisSlant: currentParams.axisSlant ?? prev.axisSlant,
        edgeRoughness: currentParams.edgeRoughness ?? prev.edgeRoughness,
        tipSharpness: currentParams.tipSharpness ?? prev.tipSharpness,
        pressureGamma: currentParams.pressureGamma ?? prev.pressureGamma,
      }));
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentParams]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState(workingPreset.name);
  const [showPresetDrawer, setShowPresetDrawer] = useState(false);
  const [previewPattern, setPreviewPattern] = useState<'scurve' | 'straight' | 'loop'>('scurve');
  const [showWireframe, setShowWireframe] = useState<boolean>(false);

  const isExistingCustomPreset = useMemo(() => {
    return presets.some((p) => p.id === workingPreset.id && p.isCustom);
  }, [presets, workingPreset.id]);

  // Delete confirmation state. The delete itself runs only after the
  // user confirms in the dialog below, following the pattern used for
  // part deletion in the radicals drawer.
  const [pendingDeletePreset, setPendingDeletePreset] = useState<UserPenPreset | null>(null);

  const isDefaultPreset = workingPreset.isCustom === false;

  const handleOverwritePreset = () => {
    const next = presets.map((p) =>
      p.id === workingPreset.id ? { ...workingPreset, name: workingPreset.name.trim() || p.name } : p
    );
    if (!saveUserPenPresets(next)) {
      showToast('プリセットの保存に失敗しました');
      return;
    }
    onUpdatePresets(next);
    onApplyPreset(workingPreset);
    if (workingPreset.pressureCurve) {
      onChangePressureCurve?.(workingPreset.pressureCurve);
    }
    showToast(`「${workingPreset.name}」の設定を上書き保存しました`);
  };

  const handleSaveAsNewPreset = () => {
    const uniqueName = makeUniquePresetName(
      workingPreset.name.trim() || `カスタムペン ${presets.length + 1}`,
      new Set(presets.map((p) => p.name))
    );
    const newP: UserPenPreset = {
      ...workingPreset,
      id: `preset-custom-${Date.now()}`,
      name: uniqueName,
      brushWidth: clampBrushWidth(workingPreset.brushWidth),
      isCustom: true,
      createdAt: Date.now(),
    };
    const next = [newP, ...presets];
    if (!saveUserPenPresets(next)) {
      showToast('プリセットの保存に失敗しました');
      return;
    }
    onUpdatePresets(next);
    onApplyPreset(newP);
    if (newP.pressureCurve) {
      onChangePressureCurve?.(newP.pressureCurve);
    }
    setWorkingPreset(newP);
    setRenameInput(uniqueName);
    showToast(`「${uniqueName}」を新規プリセットとして保存し、作図ペンとして適用しました`);
  };

  const handleApplyCurrentAndClose = () => {
    const applied: UserPenPreset = {
      ...workingPreset,
      brushWidth: clampBrushWidth(workingPreset.brushWidth),
    };
    onApplyPreset(applied);
    // The pressure curve is applied only here, not while editing in the
    // modal, so closing without applying leaves the app curve unchanged.
    if (applied.pressureCurve) {
      onChangePressureCurve?.(applied.pressureCurve);
    }
    showToast(`「${workingPreset.name}」を作字ペンとして適用しました`);
    onClose();
  };

  const handleSelectPreset = (p: UserPenPreset) => {
    setWorkingPreset({
      ...p,
      name: p.name,
      brushWidth: clampBrushWidth(p.brushWidth),
    });
    setRenameInput(p.name);
    showToast(`「${p.name}」をロードしました`);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = presets.find((p) => p.id === id);
    if (!target) return;
    setPendingDeletePreset(target);
  };

  const confirmDeletePreset = () => {
    if (!pendingDeletePreset) return;
    const target = pendingDeletePreset;
    setPendingDeletePreset(null);
    const next = presets.filter((p) => p.id !== target.id);
    if (!saveUserPenPresets(next)) {
      showToast('プリセットの削除を保存できませんでした');
      return;
    }
    onUpdatePresets(next);
    if (activePenPreset && activePenPreset.id === target.id) {
      onClearActivePenPreset?.();
    }
    if (workingPreset.id === target.id) {
      const fallback = next[0] ?? createCleanDefaultPreset();
      setWorkingPreset({ ...fallback });
      setRenameInput(fallback.name);
    }
    showToast('プリセットを削除しました');
  };

  const handleDuplicatePreset = (p: UserPenPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const uniqueName = makeUniquePresetName(
      `${p.name} (コピー)`,
      new Set(presets.map((preset) => preset.name))
    );
    const dup: UserPenPreset = {
      ...p,
      id: `preset-copy-${Date.now()}`,
      name: uniqueName,
      isCustom: true,
      createdAt: Date.now(),
    };
    const next = [dup, ...presets];
    if (!saveUserPenPresets(next)) {
      showToast('プリセットの保存に失敗しました');
      return;
    }
    onUpdatePresets(next);
    showToast(`「${uniqueName}」を複製しました`);
  };

  const handleExportPresets = () => {
    const jsonStr = JSON.stringify(presets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `font_pen_presets_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('プリセットをJSONファイルとして保存しました');
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          showToast('JSONファイルの形式が正しくありません。プリセットの配列が必要です');
          return;
        }
        const { valid, invalidCount, remappedCount } = validateImportedPenPresets(
          parsed,
          new Set(presets.map((p) => p.id))
        );
        if (valid.length === 0) {
          showToast('読み込めるプリセットがありませんでした');
          return;
        }
        const next = [...valid, ...presets];
        if (!saveUserPenPresets(next)) {
          showToast('プリセットの保存に失敗しました');
          return;
        }
        onUpdatePresets(next);
        const notes: string[] = [];
        if (invalidCount > 0) notes.push(`${invalidCount} 個の不正な要素を除外しました`);
        if (remappedCount > 0) notes.push(`${remappedCount} 個の重複する id を振り直しました`);
        showToast(
          `${valid.length} 個のプリセットを読み込みました${notes.length > 0 ? ` (${notes.join('、')})` : ''}`
        );
      } catch {
        showToast('JSONファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyRename = (rawName: string) => {
    if (isDefaultPreset) {
      showToast('既定プリセットの名前は変更できません');
      setIsRenaming(false);
      return;
    }
    const uniqueName = makeUniquePresetName(
      rawName.trim() || workingPreset.name,
      new Set(presets.map((p) => p.name)),
      workingPreset.id,
      presets
    );
    setWorkingPreset((prev) => ({ ...prev, name: uniqueName }));
    setIsRenaming(false);
    if (presets.some((p) => p.id === workingPreset.id)) {
      const next = presets.map((p) => (p.id === workingPreset.id ? { ...p, name: uniqueName } : p));
      if (!saveUserPenPresets(next)) {
        showToast('プリセット名の保存に失敗しました');
        return;
      }
      onUpdatePresets(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 anim-fade p-1.5 sm:p-3">
      <div
        className={`flex flex-col min-h-0 bg-white dark:bg-[#18231c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-800 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full'
            : `w-full ${showPresetDrawer ? 'max-w-5xl' : 'max-w-4xl'} h-[86vh] max-h-[720px] rounded-xl shadow-2xl`
        }`}
      >
        {/* Header */}
        <div className="px-3 py-1.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-[#121c16] shrink-0">
          <div className="flex items-center space-x-3 max-sm:min-w-0 max-sm:flex-1">
            <button
              type="button"
              onClick={() => setShowPresetDrawer((prev) => !prev)}
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors flex items-center space-x-1 cursor-pointer"
              title="プリセット一覧を開く"
            >
              <span className="text-xs font-bold">ブラシ ({presets.length})</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPresetDrawer ? 'rotate-90' : ''}`} />
            </button>

            <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />

            {/* Editable Brush Name */}
            {isRenaming ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-white dark:bg-stone-900 border border-emerald-500 rounded-sm text-stone-900 dark:text-stone-100 font-bold focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyRename(renameInput);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => applyRename(renameInput)}
                  className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 max-sm:min-w-0">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 max-sm:truncate max-sm:max-w-[120px]">{workingPreset.name}</span>
                {!isDefaultPreset && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameInput(workingPreset.name);
                      setIsRenaming(true);
                    }}
                    className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                    title="ブラシ名を変更"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Mobile View Switcher */}
            <div className="flex md:hidden items-center bg-stone-200/80 dark:bg-stone-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMobileView('params')}
                className={`px-2 py-0.5 font-bold transition-colors cursor-pointer ${
                  mobileView === 'params'
                    ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                パラメータ
              </button>
              <button
                type="button"
                onClick={() => setMobileView('scratchpad')}
                className={`px-2 py-0.5 font-bold transition-colors flex items-center space-x-1 cursor-pointer ${
                  mobileView === 'scratchpad'
                    ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>試し書き</span>
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors cursor-pointer"
              title={isFullscreen ? '元に戻す' : '最大化'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top: Live Brush Preview Banner */}
        <PenPreviewSection
          workingPreset={workingPreset}
          previewPattern={previewPattern}
          setPreviewPattern={setPreviewPattern}
          showWireframe={showWireframe}
          setShowWireframe={setShowWireframe}
          isLight={isLight}
        />

        {/* 8-Tab Navigation Bar */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#152019] overflow-x-auto shrink-0 scrollbar-thin touch-scroll-x">
          {[
            { id: 'basic' as StudioTab, label: '基本', icon: Paintbrush },
            { id: 'taper' as StudioTab, label: '入り抜き', icon: Diamond },
            { id: 'shape' as StudioTab, label: '形状', icon: Circle },
            { id: 'random' as StudioTab, label: 'ランダム', icon: Shuffle },
            { id: 'type' as StudioTab, label: 'タイプ', icon: Layers },
            { id: 'dynamic' as StudioTab, label: '動的', icon: Activity },
            { id: 'texture' as StudioTab, label: '質感', icon: Flame },
            { id: 'settings' as StudioTab, label: '設定', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 shrink-0 min-w-[60px] max-sm:min-w-[44px] sm:min-w-[72px] py-1.5 px-2 flex flex-row items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#18231c]'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/50 dark:hover:bg-stone-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70'}`} />
                <span className="text-[11px] whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 min-w-0">
          {/* Preset Sidebar */}
          {showPresetDrawer && (
            <PenPresetsSidebar
              presets={presets}
              workingPreset={workingPreset}
              onSelectPreset={handleSelectPreset}
              onDuplicatePreset={handleDuplicatePreset}
              onDeletePreset={handleDeletePreset}
              onExportPresets={handleExportPresets}
              onImportPresets={handleImportPresets}
            />
          )}

          {/* Left: Tab Control Panels */}
          <div className={`flex-1 overflow-y-auto min-h-0 min-w-0 p-2.5 sm:p-3 space-y-2.5 overscroll-contain ${mobileView === 'scratchpad' ? 'hidden md:block' : 'block'}`}>
            {activeTab === 'basic' && (
              <BasicTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'taper' && (
              <TaperTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'shape' && (
              <ShapeTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'random' && (
              <RandomTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'type' && (
              <TypeTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'dynamic' && (
              <DynamicTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'texture' && (
              <TextureTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                workingPreset={workingPreset}
                setWorkingPreset={setWorkingPreset}
              />
            )}
          </div>

          {/* Right: Live Scratchpad */}
          <PenScratchpad
            workingPreset={workingPreset}
            isLight={isLight}
            mobileView={mobileView}
            showToast={showToast}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-3 py-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#121c16] flex items-center justify-between shrink-0 max-sm:flex-wrap max-sm:gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('mojisaku_sticky_brush_configs');
                // Drawing-side smoothing keys and the pen stroke width are
                // reset through the canvas as well, so the reset is visible
                // in drawing immediately instead of only after a restart.
                localStorage.removeItem('fcs_auto_smooth_brush');
                localStorage.removeItem('fcs_smooth_strength');
                localStorage.removeItem('fcs_smooth_preserve_corners');
                localStorage.removeItem('fcs_auto_union_brush');
                localStorage.removeItem('fcs_auto_resolve_brush_overlap');
                localStorage.removeItem('glyph_pen_stroke_width');
                localStorage.removeItem('fcs_pen_stroke_width');
              } catch (_) {}
              onResetCanvasPrefs?.();
              const cleanDefault = createCleanDefaultPreset();
              setWorkingPreset(cleanDefault);
              setRenameInput(cleanDefault.name);
              onApplyPreset(cleanDefault);
              if (cleanDefault.pressureCurve) {
                onChangePressureCurve?.(cleanDefault.pressureCurve);
              }
              showToast('ペン設定を完全な初期状態（標準筆）にリセットしました');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer border border-transparent"
          >
            初期値に戻す
          </button>

          <div className="flex items-center space-x-2">
            {isExistingCustomPreset && (
              <button
                type="button"
                onClick={handleOverwritePreset}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center space-x-1 cursor-pointer border border-emerald-600"
                title="選択中のプリセットに現在の設定を上書き保存します"
              >
                <span>上書き保存</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAsNewPreset}
              className="px-3 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
            >
              {isExistingCustomPreset ? '別名で新規保存' : '新規保存'}
            </button>
            <button
              type="button"
              onClick={handleApplyCurrentAndClose}
              className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1.5 cursor-pointer border border-emerald-500"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">このペンを適用して閉じる</span>
              <span className="hidden max-sm:inline">適用して閉じる</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-900/95 text-white text-xs font-medium border border-stone-700 pointer-events-none z-50">
            {toastMessage}
          </div>
        )}

        {/* Delete confirmation dialog */}
        {pendingDeletePreset && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-2xl">
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">プリセットを削除しますか？</div>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                「{pendingDeletePreset.name}」を削除します。削除されたプリセットは復元できません。
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeletePreset(null)}
                  className="px-3 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePreset}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
