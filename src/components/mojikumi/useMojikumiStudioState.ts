import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  FontProject,
  MojikumiConfig,
  MojikumiPresetId,
} from '../../types';
import { compileFont, validateFontProject, stripInvalidPixelData } from '../../utils/font';
import {
  MOJIKUMI_PRESETS,
  PRESET_BETA,
  PRESET_TSUME,
  calculateTypesettingDimensions,
  simulateTypesetting,
} from '../../utils/mojikumiEngine';
import {
  buildPreviewProject,
  isEquivalentPreviewProject,
} from '../testpreview/hooks/useTestPreviewState';
import { AOZORA_TEXTS, AozoraWork } from './aozoraTexts';
import {
  EditorialLayoutMode,
  MojikumiFontSource,
  MojikumiMobileTab,
  MojikumiSidebarTab,
} from './types';
import { useIsTopModal } from '../modals/ModalStackFrame';
// Persisted editing state lives in ./persistedState (no heavy imports) so
// AppModalsHost can hold it without pulling this hook's compileFont
// dependency into the startup bundle. Re-exported here for existing users.
import {
  createDefaultMojikumiPersistedState,
  type MojikumiPersistedState,
} from './persistedState';
export { createDefaultMojikumiPersistedState, type MojikumiPersistedState };

// ---------------------------------------------------------------------------
// M27: real advance widths / kerning for simulateTypesetting, in em units.
// buildTypesettingAdvanceOptions converts project glyph advanceWidth and
// project.kerning (font units) to em against project unitsPerEm. Characters
// with no entry keep the engine's fixed advance. openTypeFeatures
// customKerningPairs are intentionally not included.
// ---------------------------------------------------------------------------

export interface TypesettingAdvanceOptions {
  advances: Record<string, number>;
  kerningEm: Record<string, number>;
}

function parseKerningTokenToChar(token: string | undefined): string | null {
  if (!token) return null;
  if (token.startsWith('U+') || token.startsWith('0x')) {
    const code = parseInt(token.replace(/^U\+|^0x/, ''), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : null;
  }
  const code = token.codePointAt(0);
  return code === undefined ? null : String.fromCodePoint(code);
}

export function buildTypesettingAdvanceOptions(project: FontProject): TypesettingAdvanceOptions {
  const upm = project.metadata?.unitsPerEm || 1000;
  const advances: Record<string, number> = {};
  for (const glyph of Object.values(project.glyphs || {})) {
    if (!glyph?.char || !(glyph.advanceWidth > 0)) continue;
    advances[glyph.char] = glyph.advanceWidth / upm;
  }
  const kerningEm: Record<string, number> = {};
  for (const [key, value] of Object.entries(project.kerning || {})) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    let left: string | null = null;
    let right: string | null = null;
    if (key.includes(',')) {
      const parts = key.split(',');
      left = parseKerningTokenToChar(parts[0]);
      right = parseKerningTokenToChar(parts[1]);
    } else {
      const chars = [...key];
      if (chars.length === 2) {
        left = chars[0];
        right = chars[1];
      }
    }
    if (left === null || right === null) continue;
    kerningEm[`${left},${right}`] = value / upm;
  }
  return { advances, kerningEm };
}

// A single field of the lifted state. When no lifted state is supplied the
// field falls back to local useState, so the hook also works standalone.
function usePersistedField<S extends object, K extends keyof S>(
  persistedValue: S | undefined,
  persistedOnChange: React.Dispatch<React.SetStateAction<S>> | undefined,
  key: K,
  initial: S[K]
): [S[K], React.Dispatch<React.SetStateAction<S[K]>>] {
  const [internal, setInternal] = useState<S[K]>(initial);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const setPersisted = useCallback(
    (action: React.SetStateAction<S[K]>) => {
      persistedOnChange?.((prev) => {
        const currentVal = prev[key] ?? initialRef.current;
        return {
          ...prev,
          [key]:
            typeof action === 'function'
              ? (action as (prevValue: S[K]) => S[K])(currentVal)
              : action,
        };
      });
    },
    [persistedOnChange, key]
  );
  if (persistedValue === undefined || persistedOnChange === undefined) {
    return [internal, setInternal];
  }
  return [persistedValue[key] ?? initial, setPersisted];
}

interface UseMojikumiStudioStateParams {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  persistedState?: MojikumiPersistedState;
  onPersistedStateChange?: React.Dispatch<React.SetStateAction<MojikumiPersistedState>>;
  /** Commit project-level config history before saving the mojikumi config. */
  commitProjectHistory?: () => void;
}

export function useMojikumiStudioState({
  isOpen,
  onClose,
  project,
  setProject,
  onShowToast,
  persistedState,
  onPersistedStateChange,
  commitProjectHistory,
}: UseMojikumiStudioStateParams) {
  const persistedDefaults = useMemo(
    () => createDefaultMojikumiPersistedState(project),
    // Only mojikumiSettings affects createDefaultMojikumiPersistedState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.mojikumiSettings]
  );
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
  // M17: true once the text differs from the selected work's text, so the
  // header and magazine headline/lead can show the custom state instead of
  // the original work's information.
  const [isCustomText, setIsCustomText] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isCustomText',
    persistedDefaults.isCustomText
  );

  // M17: while the text is edited, display the custom state instead of the
  // selected work's title / author / headline / lead.
  const displayWork = useMemo<AozoraWork>(() => {
    if (!isCustomText) return currentWork;
    return {
      ...currentWork,
      title: 'カスタムテキスト',
      author: '—',
      headline: 'カスタムテキスト',
      lead: '編集中のカスタムテキストです。',
    };
  }, [isCustomText, currentWork]);
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
  const compileVersionRef = useRef<number>(0);

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

  const isTopModal = useIsTopModal();

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented || e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, onClose]);

  const releaseCompiledFont = useCallback(() => {
    if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
      document.fonts.delete(activeFontFaceRef.current);
      activeFontFaceRef.current = null;
    }
    // L42: also remove the @font-face style tag injected when FontFace
    // is unavailable, so a stale face does not outlive the font.
    if (typeof document !== 'undefined') {
      document.getElementById('dynamic-mojikumi-font-face')?.remove();
    }
    if (compiledBlobUrlRef.current) {
      URL.revokeObjectURL(compiledBlobUrlRef.current);
      compiledBlobUrlRef.current = null;
    }
  }, []);

  // Compile only the glyphs the preview text can show (M31), mirroring
  // the test preview's buildPreviewProject / isEquivalentPreviewProject.
  // Keep the previous FontProject reference when the subset is equivalent
  // so edits to glyphs outside the preview text never re-trigger compilation,
  // without calling setState synchronously during render.
  const deferredCustomText = useDeferredValue(customText);
  const stablePreviewRef = useRef<{ text: string; preview: FontProject } | null>(null);
  const previewProject = useMemo(() => {
    const candidate = buildPreviewProject(project, deferredCustomText);
    const prev = stablePreviewRef.current;
    if (
      prev &&
      prev.text === deferredCustomText &&
      isEquivalentPreviewProject(prev.preview, candidate)
    ) {
      return prev.preview;
    }
    stablePreviewRef.current = { text: deferredCustomText, preview: candidate };
    return candidate;
  }, [project, deferredCustomText]);

  // Compile project font for live editorial preview with leak-free FontFace/URL lifecycle.
  // Debounced by 250ms (same as ExportModal and TestPreview) so continuous
  // edits do not trigger a compile on every change. When the font source is
  // a system font (mincho or gothic), the project font is not used for the
  // preview, so no compile runs and no compile error is shown.
  // The compiled project is the preview subset (M31), not the whole project.
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
    const compileVersion = ++compileVersionRef.current;

    compileTimerRef.current = setTimeout(() => {
      compileTimerRef.current = null;
      try {
        const isPixelProject = Boolean(previewProject.pixelFontSettings?.isPixelFontProject);
        const previewProjectCleaned = stripInvalidPixelData(previewProject).project;
        const validation = validateFontProject(previewProjectCleaned);
        if (!validation.valid) {
          throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
        }
        const { blobUrl } = compileFont(previewProjectCleaned, {
          scaleFactor: isPixelProject ? 1.0 : 1.35,
          balanceSideBearings: !isPixelProject,
          mergeOverlaps: !isPixelProject,
          normalizeWinding: true,
        });
        pendingBlobUrl = blobUrl;
        setCompileError(null);

        const newFontName = `CustomMojikumiFont_v${compileVersion}_${Date.now()}`;
        if (typeof FontFace !== 'undefined') {
          const ff = new FontFace(newFontName, `url('${blobUrl}')`);
          ff.load()
            .then((loaded) => {
              if (cancelled || compileVersion !== compileVersionRef.current) {
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
              if (!cancelled && compileVersion === compileVersionRef.current) {
                setCompileError('プレビュー用フォントの読み込みに失敗しました。');
              }
            });
        } else {
          // L42: FontFace が使えない環境では、試し打ちと同じ @font-face
          // の style 注入でフォールバックする。生成バイナリは OTF
          // (OTTO) のため format は opentype とする。注入せずに blob
          // URL を破棄するだけだと、フォント未設定のままシステムフォン
          // トで表示され、エラー表示も出ない。
          if (cancelled || compileVersion !== compileVersionRef.current) {
            URL.revokeObjectURL(blobUrl);
          } else {
            releaseCompiledFont();
            compiledBlobUrlRef.current = blobUrl;
            setCompiledFontName(newFontName);
            if (typeof document !== 'undefined') {
              const styleId = 'dynamic-mojikumi-font-face';
              let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
              if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = styleId;
                document.head.appendChild(styleTag);
              }
              styleTag.textContent = `
            @font-face {
              font-family: '${newFontName}';
              src: url('${blobUrl}') format('opentype');
              font-weight: normal;
              font-style: normal;
            }
          `;
            }
          }
        }
      } catch (err) {
        if (pendingBlobUrl) {
          URL.revokeObjectURL(pendingBlobUrl);
        }
        // Remove the previous preview font so a failed compile never leaves
        // stale glyphs on screen, and show the failure instead.
        releaseCompiledFont();
        if (!cancelled && compileVersion === compileVersionRef.current) {
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
  }, [isOpen, previewProject, fontSource, releaseCompiledFont]);

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

  // M17: editing the text marks it as custom; editing it back to the
  // selected work's exact text clears the custom state again.
  const handleChangeCustomText = useCallback(
    (text: string) => {
      setCustomText(text);
      const workText =
        AOZORA_TEXTS.find((w) => w.id === selectedWorkId)?.text ?? AOZORA_TEXTS[0].text;
      setIsCustomText(text !== workText);
    },
    [selectedWorkId]
  );

  const handleSelectWork = useCallback(
    (work: AozoraWork) => {
      // M16: switching works discards edited custom text, so confirm first.
      if (isCustomText && customText !== work.text) {
        if (
          !window.confirm(
            '編集中のカスタムテキストがあります。別の作品を選択すると編集内容は失われます。切り替えますか？'
          )
        ) {
          return;
        }
      }
      setSelectedWorkId(work.id);
      setCustomText(work.text);
      setIsCustomText(false);
      setIsVertical(work.defaultDirection === 'vertical');
      setLayoutMode(work.recommendedMode);
      onShowToast(`青空文庫『${work.title}』（${work.author}）を読み込みました`, 'info');
      setMobileTab('preview');
    },
    // L20: include every setter used inside, so a usePersistedField
    // setter whose identity changes is not captured stale.
    [
      onShowToast,
      isCustomText,
      customText,
      setSelectedWorkId,
      setCustomText,
      setIsCustomText,
      setIsVertical,
      setLayoutMode,
      setMobileTab,
    ]
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
    // L20: include the setter used inside (see handleSelectWork).
    [onShowToast, setCurrentConfig]
  );

  const effectiveCharsPerLine = layoutMode === 'manuscript' ? 20 : charsPerLine;

  const dimensions = useMemo(() => {
    return calculateTypesettingDimensions(fontSizeQ, lineFeedH, effectiveCharsPerLine, lineCount, isVertical);
  }, [fontSizeQ, lineFeedH, effectiveCharsPerLine, lineCount, isVertical]);

  // M21: the layouts use the deferred text, so typing only re-runs the
  // synchronous simulateTypesetting (4 times in compare mode) after React
  // settles instead of on every keystroke. The textarea itself stays
  // controlled by the raw customText, so typing echo is not delayed.
  // M27: real advance widths / kerning from the project, in em units.
  // Only apply custom glyph metrics when previewing the custom project font;
  // system fonts ('mincho' / 'gothic') use standard metric defaults.
  const advanceOptions = useMemo(
    () => (fontSource === 'custom' ? buildTypesettingAdvanceOptions(project) : undefined),
    [fontSource, project]
  );

  const currentLayout = useMemo(() => {
    return simulateTypesetting(deferredCustomText, effectiveCharsPerLine, currentConfig, {
      isVertical,
      usePalt: currentConfig.preset === 'tsume',
      trackingEm: 0,
      ...advanceOptions,
    });
  }, [deferredCustomText, effectiveCharsPerLine, currentConfig, isVertical, advanceOptions]);

  const betaLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const betaConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(deferredCustomText, charsPerLine, betaConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0,
      ...advanceOptions,
    });
  }, [layoutMode, currentLayout, deferredCustomText, charsPerLine, currentConfig, isVertical, advanceOptions]);

  const tsumeLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const tsumeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'tsume',
      table: PRESET_TSUME,
    };
    return simulateTypesetting(deferredCustomText, charsPerLine, tsumeConfig, {
      isVertical,
      usePalt: true,
      trackingEm: 0,
      ...advanceOptions,
    });
  }, [layoutMode, currentLayout, deferredCustomText, charsPerLine, currentConfig, isVertical, advanceOptions]);

  const akeLayout = useMemo(() => {
    if (layoutMode !== 'compare3') return currentLayout;
    const akeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(deferredCustomText, charsPerLine, akeConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0.15,
      ...advanceOptions,
    });
  }, [layoutMode, currentLayout, deferredCustomText, charsPerLine, currentConfig, isVertical, advanceOptions]);

  const handleSaveToProject = useCallback(() => {
    // Mojikumi config is project-level data: register it in the project
    // history before saving so Ctrl+Z can restore the previous config.
    commitProjectHistory?.();
    setProject((prev) => ({
      ...prev,
      mojikumiSettings: currentConfig,
      updatedAt: Date.now(),
    }));
    onShowToast('文字組み設定（プリセット・禁則・ぶら下がり・段落字下げ）を保存しました。Q数・H数・字詰め・行数・カスタムテキスト・レイアウト種別・縦横は保存されません', 'success');
  }, [currentConfig, onShowToast, setProject, commitProjectHistory]);

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
    displayWork,
    isCustomText,
    customText,
    setCustomText,
    handleChangeCustomText,
    previewProject,
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
