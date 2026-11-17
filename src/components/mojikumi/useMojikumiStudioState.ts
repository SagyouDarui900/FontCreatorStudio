import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FontProject,
  MojikumiConfig,
  MojikumiPresetId,
} from '../../types';
import { compileFont, validateFontProject } from '../../utils/font';
import {
  MOJIKUMI_PRESETS,
  PRESET_BETA,
  PRESET_TSUME,
  calculateTypesettingDimensions,
  simulateTypesetting,
} from '../../utils/mojikumiEngine';
import { AOZORA_TEXTS, AozoraWork } from './aozoraTexts';
import {
  EditorialLayoutMode,
  MojikumiFontSource,
  MojikumiMobileTab,
  MojikumiSidebarTab,
} from './types';
// Persisted editing state lives in ./persistedState (no heavy imports) so
// AppModalsHost can hold it without pulling this hook's compileFont
// dependency into the startup bundle. Re-exported here for existing users.
import {
  createDefaultMojikumiPersistedState,
  type MojikumiPersistedState,
} from './persistedState';
export { createDefaultMojikumiPersistedState, type MojikumiPersistedState };

// A single field of the lifted state. When no lifted state is supplied the
// field falls back to local useState, so the hook also works standalone.
function usePersistedField<S extends object, K extends keyof S>(
  persistedValue: S | undefined,
  persistedOnChange: React.Dispatch<React.SetStateAction<S>> | undefined,
  key: K,
  initial: S[K]
): [S[K], React.Dispatch<React.SetStateAction<S[K]>>] {
  const [internal, setInternal] = useState<S[K]>(initial);
  const setPersisted = useCallback(
    (action: React.SetStateAction<S[K]>) => {
      persistedOnChange?.((prev) => ({
        ...prev,
        [key]:
          typeof action === 'function'
            ? (action as (prevValue: S[K]) => S[K])(prev[key])
            : action,
      }));
    },
    [persistedOnChange, key]
  );
  if (persistedValue === undefined || persistedOnChange === undefined) {
    return [internal, setInternal];
  }
  return [persistedValue[key], setPersisted];
}

interface UseMojikumiStudioStateParams {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  persistedState?: MojikumiPersistedState;
  onPersistedStateChange?: React.Dispatch<React.SetStateAction<MojikumiPersistedState>>;
}

export function useMojikumiStudioState({
  isOpen,
  onClose,
  project,
  setProject,
  onShowToast,
  persistedState,
  onPersistedStateChange,
}: UseMojikumiStudioStateParams) {
  const persistedDefaults = useMemo(() => createDefaultMojikumiPersistedState(project), [project]);
  const [layoutMode, setLayoutMode] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'layoutMode',
    persistedDefaults.layoutMode
  );
  const [mobileTab, setMobileTab] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'mobileTab',
    persistedDefaults.mobileTab
  );
  const [sidebarTab, setSidebarTab] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'sidebarTab',
    persistedDefaults.sidebarTab
  );

  const [selectedWorkId, setSelectedWorkId] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'selectedWorkId',
    persistedDefaults.selectedWorkId
  );
  const currentWork = useMemo(() => {
    return AOZORA_TEXTS.find((w) => w.id === selectedWorkId) || AOZORA_TEXTS[0];
  }, [selectedWorkId]);

  const [customText, setCustomText] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'customText',
    persistedDefaults.customText
  );
  const [isVertical, setIsVertical] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isVertical',
    persistedDefaults.isVertical
  );
  const [fontSource, setFontSource] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontSource',
    persistedDefaults.fontSource
  );
  const [compiledFontName, setCompiledFontName] = useState<string>('CustomMojikumiFont');
  const [compileError, setCompileError] = useState<string | null>(null);

  const compiledBlobUrlRef = useRef<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [zoom, setZoom] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'zoom',
    persistedDefaults.zoom
  );
  const [fontSizeQ, setFontSizeQ] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontSizeQ',
    persistedDefaults.fontSizeQ
  );
  const [lineFeedH, setLineFeedH] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'lineFeedH',
    persistedDefaults.lineFeedH
  );
  const [charsPerLine, setCharsPerLine] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'charsPerLine',
    persistedDefaults.charsPerLine
  );
  const [lineCount, setLineCount] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'lineCount',
    persistedDefaults.lineCount
  );
  const [showBodyGrid, setShowBodyGrid] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showBodyGrid',
    persistedDefaults.showBodyGrid
  );

  const [currentConfig, setCurrentConfig] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'currentConfig',
    persistedDefaults.currentConfig
  );

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const releaseCompiledFont = useCallback(() => {
    if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
      document.fonts.delete(activeFontFaceRef.current);
      activeFontFaceRef.current = null;
    }
    if (compiledBlobUrlRef.current) {
      URL.revokeObjectURL(compiledBlobUrlRef.current);
      compiledBlobUrlRef.current = null;
    }
  }, []);

  // Compile project font for live editorial preview with leak-free FontFace/URL lifecycle.
  // Debounced by 250ms (same as ExportModal and TestPreview) so continuous
  // edits do not trigger a compile on every change. When the font source is
  // a system font (mincho or gothic), the project font is not used for the
  // preview, so no compile runs and no compile error is shown.
  useEffect(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
      compileTimerRef.current = null;
    }
    if (!isOpen || fontSource !== 'custom') {
      releaseCompiledFont();
      setCompileError(null);
      return;
    }

    let cancelled = false;
    let pendingBlobUrl: string | null = null;

    compileTimerRef.current = setTimeout(() => {
      compileTimerRef.current = null;
      try {
        const validation = validateFontProject(project);
        if (!validation.valid) {
          throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
        }
        const { blobUrl } = compileFont(project, {
          mergeOverlaps: true,
          normalizeWinding: true,
        });
        pendingBlobUrl = blobUrl;
        setCompileError(null);

        if (typeof FontFace !== 'undefined') {
          const newFontName = `CustomMojikumiFont_${Date.now()}`;
          const ff = new FontFace(newFontName, `url('${blobUrl}')`);
          ff.load()
            .then((loaded) => {
              if (cancelled) {
                URL.revokeObjectURL(blobUrl);
                return;
              }
              releaseCompiledFont();
              document.fonts.add(loaded);
              activeFontFaceRef.current = loaded;
              compiledBlobUrlRef.current = blobUrl;
              setCompiledFontName(newFontName);
            })
            .catch(() => {
              URL.revokeObjectURL(blobUrl);
              if (!cancelled) {
                setCompileError('プレビュー用フォントの読み込みに失敗しました。');
              }
            });
        } else {
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        if (pendingBlobUrl) {
          URL.revokeObjectURL(pendingBlobUrl);
        }
        // Remove the previous preview font so a failed compile never leaves
        // stale glyphs on screen, and show the failure instead.
        releaseCompiledFont();
        if (!cancelled) {
          setCompileError(
            err instanceof Error && err.message
              ? err.message
              : 'フォントの生成中にエラーが発生しました。パスの構造を確認してください。'
          );
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
        compileTimerRef.current = null;
      }
    };
  }, [isOpen, project.updatedAt, fontSource, releaseCompiledFont]);

  useEffect(() => {
    return () => {
      releaseCompiledFont();
    };
  }, [releaseCompiledFont]);

  const effectiveFontFamily = useMemo(() => {
    if (fontSource === 'custom') {
      return `'${compiledFontName}', 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif`;
    }
    if (fontSource === 'mincho') {
      return `'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif`;
    }
    return `'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif`;
  }, [fontSource, compiledFontName]);

  const drawnGlyphsCount = useMemo(() => {
    return Object.values(project.glyphs || {}).filter(
      (g) =>
        (g.contours && g.contours.length > 0) ||
        (g.pixelData?.data && g.pixelData.data.some((p: number) => p === 1))
    ).length;
  }, [project.glyphs]);

  const handleSelectWork = useCallback(
    (work: AozoraWork) => {
      setSelectedWorkId(work.id);
      setCustomText(work.text);
      setIsVertical(work.defaultDirection === 'vertical');
      setLayoutMode(work.recommendedMode);
      onShowToast(`青空文庫『${work.title}』（${work.author}）を読み込みました`, 'info');
      setMobileTab('preview');
    },
    [onShowToast]
  );

  const handleSelectPreset = useCallback(
    (presetId: MojikumiPresetId) => {
      const table = MOJIKUMI_PRESETS[presetId].table;
      setCurrentConfig((prev) => ({
        ...prev,
        preset: presetId,
        table: { ...table },
      }));
      onShowToast(`文字組みアキ量「${MOJIKUMI_PRESETS[presetId].name}」を適用しました`, 'info');
    },
    [onShowToast]
  );

  const dimensions = useMemo(() => {
    return calculateTypesettingDimensions(fontSizeQ, lineFeedH, charsPerLine, lineCount, isVertical);
  }, [fontSizeQ, lineFeedH, charsPerLine, lineCount, isVertical]);

  const currentLayout = useMemo(() => {
    return simulateTypesetting(customText, charsPerLine, currentConfig, {
      isVertical,
      usePalt: currentConfig.preset === 'tsume',
      trackingEm: 0,
    });
  }, [customText, charsPerLine, currentConfig, isVertical]);

  const betaLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const betaConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(customText, charsPerLine, betaConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0,
    });
  }, [layoutMode, currentLayout, customText, charsPerLine, currentConfig, isVertical]);

  const tsumeLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const tsumeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'tsume',
      table: PRESET_TSUME,
    };
    return simulateTypesetting(customText, charsPerLine, tsumeConfig, {
      isVertical,
      usePalt: true,
      trackingEm: 0,
    });
  }, [layoutMode, currentLayout, customText, charsPerLine, currentConfig, isVertical]);

  const akeLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const akeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(customText, charsPerLine, akeConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0.15,
    });
  }, [layoutMode, currentLayout, customText, charsPerLine, currentConfig, isVertical]);

  const handleSaveToProject = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      mojikumiSettings: currentConfig,
      updatedAt: Date.now(),
    }));
    onShowToast('フォントプロジェクトに文字組み設定を保存しました', 'success');
  }, [currentConfig, onShowToast, setProject]);

  const handleExportJson = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${project.name || 'font'}_mojikumi_settings.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    onShowToast('文字組み設定JSONをエクスポートしました', 'success');
  }, [currentConfig, onShowToast, project.name]);

  return {
    layoutMode,
    setLayoutMode,
    mobileTab,
    setMobileTab,
    sidebarTab,
    setSidebarTab,
    selectedWorkId,
    currentWork,
    customText,
    setCustomText,
    isVertical,
    setIsVertical,
    fontSource,
    setFontSource,
    effectiveFontFamily,
    compileError,
    drawnGlyphsCount,
    zoom,
    setZoom,
    fontSizeQ,
    setFontSizeQ,
    lineFeedH,
    setLineFeedH,
    charsPerLine,
    setCharsPerLine,
    lineCount,
    setLineCount,
    showBodyGrid,
    setShowBodyGrid,
    currentConfig,
    setCurrentConfig,
    dimensions,
    currentLayout,
    betaLayout,
    tsumeLayout,
    akeLayout,
    handleSelectWork,
    handleSelectPreset,
    handleSaveToProject,
    handleExportJson,
  };
}
