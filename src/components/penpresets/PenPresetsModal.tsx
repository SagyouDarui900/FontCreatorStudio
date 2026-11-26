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
import { ThemeMode, isLightTheme, getThemeClasses } from '../../utils/theme';
import { PenPresetsModalProps, StudioTab } from './types';
import { PenPreviewSection } from './PenPreviewSection';
import { PenScratchpad } from './PenScratchpad';
import { PenPresetsSidebar } from './PenPresetsSidebar';
import { BasicTab } from './tabs/BasicTab';
import { useIsTopModal } from '../modals/ModalStackFrame';
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
  const themeClasses = getThemeClasses(theme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('basic');
  const [mobileView, setMobileView] = useState<'params' | 'scratchpad'>('params');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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
        brushStyle: currentParams.brushStyle ?? prev.brushStyle,
        brushWidth: clampBrushWidth(currentParams.brushWidth),
        pressureSensitivity: currentParams.pressureSensitivity ?? prev.pressureSensitivity,
        pressureCurve: currentParams.pressureCurve || prev.pressureCurve,
        autoSmoothBrush: currentParams.autoSmoothBrush ?? prev.autoSmoothBrush,
        smoothStrength: currentParams.smoothStrength ?? prev.smoothStrength,
        smoothPreserveCorners: currentParams.smoothPreserveCorners ?? prev.smoothPreserveCorners,
        autoUnionBrush: currentParams.autoUnionBrush ?? prev.autoUnionBrush,
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
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
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

  const isTopModal = useIsTopModal();

  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented || e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingDeletePreset) {
          setPendingDeletePreset(null);
        } else if (isRenaming) {
          setIsRenaming(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, pendingDeletePreset, isRenaming, onClose]);

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
    const base = createCleanDefaultPreset();
    setWorkingPreset({
      ...base,
      ...p,
      name: p.name || base.name,
      brushWidth: clampBrushWidth(p.brushWidth),
      pressureCurve: p.pressureCurve || base.pressureCurve,
    });
    setRenameInput(p.name || base.name);
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
      const base = createCleanDefaultPreset();
      const fallback = next[0] ? { ...base, ...next[0], brushWidth: clampBrushWidth(next[0].brushWidth) } : base;
      setWorkingPreset(fallback);
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ブラシ・ペン設定"
      className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center bg-black/75 anim-fade select-none p-0 sm:p-4"
    >
      <div
        className={`relative flex flex-col min-h-0 overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full ${showPresetDrawer ? 'sm:max-w-5xl xl:max-w-7xl' : 'sm:max-w-4xl xl:max-w-6xl'} h-[100dvh] sm:h-[88vh] sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border ${themeClasses.border} shadow-none sm:shadow-2xl`
        }`}
      >
        {/* Header */}
        <div className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}>
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowPresetDrawer((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="プリセット一覧を開く"
            >
              <span className="text-xs font-bold">ブラシ ({presets.length})</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPresetDrawer ? 'rotate-90' : ''}`} />
            </button>

            <div className={`h-4 border-l shrink-0 ${themeClasses.border}`} />

            {/* Editable Brush Name */}
            {isRenaming ? (
              <div className="flex items-center space-x-1 min-w-0">
                <input
                  type="text"
                  value={renameInput ?? ''}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className={`px-2 py-0.5 text-xs border rounded-md font-bold focus:outline-none min-w-0 max-w-[140px] sm:max-w-none ${themeClasses.cardBg} ${themeClasses.textPrimary} ${themeClasses.accentBorder}`}
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
                  className={`p-1 rounded-md cursor-pointer shrink-0 ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className={`text-xs font-bold truncate ${themeClasses.textPrimary}`}>{workingPreset.name}</span>
                {!isDefaultPreset && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameInput(workingPreset.name);
                      setIsRenaming(true);
                    }}
                    className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
                    title="ブラシ名を変更"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Mobile View Switcher */}
            <div className={`flex md:hidden items-center rounded-lg border p-0.5 text-xs ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
              <button
                type="button"
                onClick={() => setMobileView('params')}
                className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  mobileView === 'params'
                    ? `${themeClasses.cardBg} ${themeClasses.accentText}`
                    : themeClasses.textMuted
                }`}
              >
                パラメータ
              </button>
              <button
                type="button"
                onClick={() => setMobileView('scratchpad')}
                className={`px-2 py-1 rounded-md font-bold transition-colors flex items-center space-x-1 cursor-pointer ${
                  mobileView === 'scratchpad'
                    ? `${themeClasses.cardBg} ${themeClasses.accentText}`
                    : themeClasses.textMuted
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
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className={`p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`}
              title="閉じる (Esc)"
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
        <div className={`flex border-b overflow-x-auto shrink-0 no-scrollbar touch-scroll-x ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
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
                className={`flex-1 shrink-0 min-w-[60px] sm:min-w-[72px] py-2 sm:py-1.5 px-2 flex flex-row items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${themeClasses.accentBorder} ${themeClasses.accentText} ${themeClasses.modalBg}`
                    : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? themeClasses.accentText : 'opacity-70'}`} />
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
          <div className={`flex-1 overflow-y-auto min-h-0 min-w-0 p-3.5 sm:p-4 space-y-3 overscroll-contain ${mobileView === 'scratchpad' ? 'hidden md:block' : 'block'}`}>
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
        <div className={`px-3.5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3 sm:pb-3 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}>
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
            className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            初期値に戻す
          </button>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {isExistingCustomPreset && (
              <button
                type="button"
                onClick={handleOverwritePreset}
                className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer ${themeClasses.accentBtn}`}
                title="選択中のプリセットに現在の設定を上書き保存します"
              >
                <span>上書き保存</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAsNewPreset}
              className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
            >
              {isExistingCustomPreset ? '別名で新規保存' : '新規保存'}
            </button>
            <button
              type="button"
              onClick={handleApplyCurrentAndClose}
              className={`px-4 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${themeClasses.accentBtn}`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>このペンを適用して閉じる</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-stone-900/95 text-white text-xs font-medium border border-stone-700 pointer-events-none z-50">
            {toastMessage}
          </div>
        )}

        {/* Delete confirmation dialog */}
        {pendingDeletePreset && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label="プリセットの削除確認"
              className={`w-full max-w-xs rounded-xl border p-4 shadow-2xl ${themeClasses.modalBg} ${themeClasses.border}`}
            >
              <div className={`text-sm font-bold ${themeClasses.textPrimary}`}>プリセットを削除しますか？</div>
              <p className={`mt-1 text-xs ${themeClasses.textMuted}`}>
                「{pendingDeletePreset.name}」を削除します。削除されたプリセットは復元できません。
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeletePreset(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
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
