import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FontProject,
  MojikumiConfig,
  MojikumiPresetId,
} from '../../types';
import { compileFont } from '../../utils/font';
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

interface UseMojikumiStudioStateParams {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useMojikumiStudioState({
  isOpen,
  onClose,
  project,
  setProject,
  onShowToast,
}: UseMojikumiStudioStateParams) {
  const [layoutMode, setLayoutMode] = useState<EditorialLayoutMode>('book_spread');
  const [mobileTab, setMobileTab] = useState<MojikumiMobileTab>('preview');
  const [sidebarTab, setSidebarTab] = useState<MojikumiSidebarTab>('text');

  const [selectedWorkId, setSelectedWorkId] = useState<string>(AOZORA_TEXTS[0].id);
  const currentWork = useMemo(() => {
    return AOZORA_TEXTS.find((w) => w.id === selectedWorkId) || AOZORA_TEXTS[0];
  }, [selectedWorkId]);

  const [customText, setCustomText] = useState<string>(AOZORA_TEXTS[0].text);
  const [isVertical, setIsVertical] = useState<boolean>(true);
  const [fontSource, setFontSource] = useState<MojikumiFontSource>('custom');
  const [compiledFontName, setCompiledFontName] = useState<string>('CustomMojikumiFont');

  const compiledBlobUrlRef = useRef<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [fontSizeQ, setFontSizeQ] = useState<number>(14);
  const [lineFeedH, setLineFeedH] = useState<number>(24);
  const [charsPerLine, setCharsPerLine] = useState<number>(20);
  const [lineCount, setLineCount] = useState<number>(14);
  const [showBodyGrid, setShowBodyGrid] = useState<boolean>(false);

  const initialConfig: MojikumiConfig = useMemo(() => {
    return (
      project.mojikumiSettings || {
        preset: 'beta',
        table: PRESET_BETA,
        kinsoku: 'weak_v2',
        kinsokuAdjust: 'push_out',
        burasagari: 'standard',
        paragraphIndent: 'visual_half',
      }
    );
  }, [project.mojikumiSettings]);

  const [currentConfig, setCurrentConfig] = useState<MojikumiConfig>(initialConfig);

  // Sync draft mojikumi config when opening modal or loading a different project
  useEffect(() => {
    if (!isOpen) return;
    setCurrentConfig(initialConfig);
  }, [isOpen, project.id, initialConfig]);

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

  // Compile project font for live editorial preview with leak-free FontFace/URL lifecycle
  useEffect(() => {
    if (!isOpen) {
      releaseCompiledFont();
      return;
    }

    let cancelled = false;
    let pendingBlobUrl: string | null = null;

    try {
      const { blobUrl } = compileFont(project, {
        mergeOverlaps: true,
        normalizeWinding: true,
      });
      pendingBlobUrl = blobUrl;

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
          });
      } else {
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      if (pendingBlobUrl) {
        URL.revokeObjectURL(pendingBlobUrl);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, project.updatedAt, releaseCompiledFont]);

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
