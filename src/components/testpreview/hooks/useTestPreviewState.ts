import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FontProject, PathContour, Point } from '../../../types';
import { compileFont, balanceProjectGlyphMargins, validateFontProject, stripInvalidPixelData } from '../../../utils/font';
import { getContoursBoundingBox } from '../../../utils/path';
import { ThemeMode, isLightTheme } from '../../../utils/theme';
import { TestPreviewModalProps, SelectedCharInfo, WritingMode, TextAlignMode } from '../types';
import { transformGlyphContours } from '../previewUtils';
import { useIsTopModal } from '../../modals/ModalStackFrame';
// Persisted editing state lives in ./persistedState (no heavy imports) so
// AppModalsHost can hold it without pulling this hook's compileFont
// dependency into the startup bundle. Re-exported here for existing users.
import {
  createDefaultTestPreviewPersistedState,
  type TestPreviewPersistedState,
} from '../persistedState';
export { createDefaultTestPreviewPersistedState, type TestPreviewPersistedState };

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
      persistedOnChange?.((prev) => {
        const currentVal = prev[key] ?? initial;
        return {
          ...prev,
          [key]:
            typeof action === 'function'
              ? (action as (prevValue: S[K]) => S[K])(currentVal)
              : action,
        };
      });
    },
    [persistedOnChange, key, initial]
  );
  if (persistedValue === undefined || persistedOnChange === undefined) {
    return [internal, setInternal];
  }
  return [persistedValue[key] ?? initial, setPersisted];
}

export function useTestPreviewState(
  props: TestPreviewModalProps & {
    persistedState?: TestPreviewPersistedState;
    onPersistedStateChange?: React.Dispatch<React.SetStateAction<TestPreviewPersistedState>>;
  }
) {
  const {
    isOpen,
    onClose,
    project,
    setProject,
    onSelectGlyphForEdit,
    theme,
    onShowToast,
    onOpenMojikumiStudio,
    persistedState,
    onPersistedStateChange,
  } = props;

  const persistedDefaults = useMemo(() => createDefaultTestPreviewPersistedState(), []);

const [testText, setTestText] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'testText',
    persistedDefaults.testText
  );
  const [writingMode, setWritingMode] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'writingMode',
    persistedDefaults.writingMode
  );
  const [fontSize, setFontSize] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontSize',
    persistedDefaults.fontSize
  );
  const [lineHeight, setLineHeight] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'lineHeight',
    persistedDefaults.lineHeight
  );
  const [letterSpacing, setLetterSpacing] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'letterSpacing',
    persistedDefaults.letterSpacing
  ); // in em
  const [textAlign, setTextAlign] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'textAlign',
    persistedDefaults.textAlign
  );
  const [useTsume, setUseTsume] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'useTsume',
    persistedDefaults.useTsume
  ); // OpenType palt / proportional
  const [showSpaceMarkers, setShowSpaceMarkers] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showSpaceMarkers',
    persistedDefaults.showSpaceMarkers
  ); // Highlight 全角/半角空白
  const [showGenkoGrid, setShowGenkoGrid] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showGenkoGrid',
    persistedDefaults.showGenkoGrid
  ); // 原稿用紙マス目
  const [showCharBoxes, setShowCharBoxes] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showCharBoxes',
    persistedDefaults.showCharBoxes
  ); // 仮想ボディ枠 (1em)
  const [showNotebookGuides, setShowNotebookGuides] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showNotebookGuides',
    persistedDefaults.showNotebookGuides
  ); // ノート風ガイド罫線 (ベースライン・中心軸・高さ上限下限)
  const [autoBalanceMargins, setAutoBalanceMargins] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'autoBalanceMargins',
    persistedDefaults.autoBalanceMargins
  ); // デフォルト: ガイド枠の手書き位置優先 (1:1描画位置)
  const [fontScaleMultiplier, setFontScaleMultiplier] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontScaleMultiplier',
    persistedDefaults.fontScaleMultiplier
  ); // 1.0x (原寸キャンバス通り) or 1.35x (拡大)
  const [isWaterfall, setIsWaterfall] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isWaterfall',
    persistedDefaults.isWaterfall
  );
  const [fontFamilyName, setFontFamilyName] = useState<string>('CustomTestFont');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected character for quick coordinate/scale/aspect adjustment and main editor jump
  const [selectedCharInfo, setSelectedCharInfo] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'selectedCharInfo',
    persistedDefaults.selectedCharInfo
  );
  const [adjustDx, setAdjustDx] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustDx',
    persistedDefaults.adjustDx
  );
  const [adjustDy, setAdjustDy] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustDy',
    persistedDefaults.adjustDy
  );
  const [adjustScaleX, setAdjustScaleX] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustScaleX',
    persistedDefaults.adjustScaleX
  );
  const [adjustScaleY, setAdjustScaleY] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustScaleY',
    persistedDefaults.adjustScaleY
  );
  const [isAspectLocked, setIsAspectLocked] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isAspectLocked',
    persistedDefaults.isAspectLocked
  );

  // Handle mouse wheel scrolling horizontally in vertical writing mode
  const handleVerticalWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (writingMode === 'vertical' && !isWaterfall) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.1) {
          const target = e.currentTarget;
          const prevLeft = target.scrollLeft;
          // In RTL / vertical-rl columns advance to the left
          target.scrollLeft -= e.deltaY;
          if (target.scrollLeft === prevLeft) {
            target.scrollLeft += e.deltaY;
          }
        }
      }
    },
    [writingMode, isWaterfall]
  );

  // Variable Width & Collapsible Panel States (可変式UI)
  const [isSideAdjusterOpen, setIsSideAdjusterOpen] = useState<boolean>(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(280);
  const [rightAdjusterWidth, setRightAdjusterWidth] = useState<number>(300);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  const handleLeftResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleLeftResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingLeft || !mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = Math.max(180, Math.min(480, e.clientX - rect.left));
    setLeftSidebarWidth(newWidth);
  };

  const handleLeftResizePointerUp = (e: React.PointerEvent) => {
    if (isResizingLeft) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizingLeft(false);
    }
  };

  const handleRightResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleRightResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingRight || !mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = Math.max(200, Math.min(520, rect.right - e.clientX));
    setRightAdjusterWidth(newWidth);
  };

  const handleRightResizePointerUp = (e: React.PointerEvent) => {
    if (isResizingRight) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizingRight(false);
    }
  };

  // Floating / Docked adjustment panel state (default: docked as right sidebar)
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>({ x: 720, y: 60 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPosX: number; initialPosY: number } | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);
  const fontVersionRef = useRef<number>(0);
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = (e: React.PointerEvent) => {
    if (isDocked) return;
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: floatingPos.x,
      initialPosY: floatingPos.y,
    };
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || isDocked) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const nextX = Math.max(8, Math.min(window.innerWidth - 330, dragStartRef.current.initialPosX + dx));
    const nextY = Math.max(8, Math.min(window.innerHeight - 200, dragStartRef.current.initialPosY + dy));

    setFloatingPos({ x: nextX, y: nextY });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  // Hovered glyph info for inspection
  const [hoveredGlyphInfo, setHoveredGlyphInfo] = useState<{
    char: string;
    unicode: number;
    adv: number;
    lsb: number;
    rsb: number;
    diff: number;
  } | null>(null);
  // Layout mode: 'split' (side-by-side with full-height paper, recommended) or 'top' (classic stacked)
  const [layoutMode, setLayoutMode] = useState<'split' | 'top'>('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isTopControlsCollapsed, setIsTopControlsCollapsed] = useState<boolean>(false);
  const [showHintBanner, setShowHintBanner] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'settings' | 'adjust' | 'preview'>('settings');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLight = isLightTheme(theme);
  const isTopModal = useIsTopModal();

  // Handle keyboard shortcuts (Escape to exit fullscreen / close, F for fullscreen, Z for Zen/collapse)
  useEffect(() => {
    if (!isOpen || !isTopModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, don't trigger shortcut
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        } else {
          e.preventDefault();
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if ((e.key === 'z' || e.key === 'Z') && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (layoutMode === 'split') {
          setIsSidebarOpen((prev) => !prev);
        } else {
          setIsTopControlsCollapsed((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, layoutMode, onClose]);

  const cleanupActivePreviewFont = useCallback(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
      compileTimerRef.current = null;
    }
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {}
      activeBlobUrlRef.current = null;
    }
    if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
      try {
        document.fonts.delete(activeFontFaceRef.current);
      } catch {}
      activeFontFaceRef.current = null;
    }
    if (typeof document !== 'undefined') {
      const styleTag = document.getElementById('dynamic-preview-font-face');
      if (styleTag) {
        styleTag.remove();
      }
    }
  }, []);

  // Cleanup font resources when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanupActivePreviewFont();
    }
  }, [isOpen, cleanupActivePreviewFont]);

  // Cleanup font resources on unmount
  useEffect(() => {
    return () => {
      cleanupActivePreviewFont();
    };
  }, [cleanupActivePreviewFont]);

  // Compile font dynamically and create @font-face style rule with FontFace API
  useEffect(() => {
    if (!isOpen) {
      cleanupActivePreviewFont();
      return;
    }

    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
    }

    const compileVersion = ++fontVersionRef.current;
    // Set when the effect is cleaned up (modal closed or deps changed) so a
    // FontFace load that resolves afterwards is discarded instead of being
    // added to document.fonts and leaking its blob URL and style tag.
    let cancelled = false;
    const removeStyleTagForUrl = (url: string) => {
      if (typeof document === 'undefined') return;
      const styleTag = document.getElementById('dynamic-preview-font-face');
      if (styleTag && styleTag.textContent?.includes(url)) {
        styleTag.remove();
      }
    };
    compileTimerRef.current = setTimeout(() => {
      compileTimerRef.current = null;
      try {
        // Pixel projects preview at 1.0 with no centering or overlap
        // merging, matching the pixel studio export. Broken pixelData is
        // stripped first so one broken glyph does not stop the preview.
        const isPixelProject = Boolean(project.pixelFontSettings?.isPixelFontProject);
        const previewProject = stripInvalidPixelData(project).project;
        const validation = validateFontProject(previewProject);
        if (!validation.valid) {
          throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
        }
        const { blobUrl } = compileFont(previewProject, {
          scaleFactor: isPixelProject ? 1.0 : fontScaleMultiplier,
          balanceSideBearings: isPixelProject ? false : autoBalanceMargins,
          mergeOverlaps: isPixelProject ? false : true,
          normalizeWinding: true,
        });
        const newFontName = `CustomTestFont_v${compileVersion}_${Date.now()}`;

        if (typeof FontFace !== 'undefined') {
          const ff = new FontFace(newFontName, `url('${blobUrl}')`);
          ff.load()
            .then((loadedFace) => {
              if (cancelled || compileVersion !== fontVersionRef.current) {
                URL.revokeObjectURL(blobUrl);
                removeStyleTagForUrl(blobUrl);
                return;
              }
              // Delete old FontFace from document.fonts before adding the new face
              if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
                try {
                  document.fonts.delete(activeFontFaceRef.current);
                } catch {}
              }
              document.fonts.add(loadedFace);
              activeFontFaceRef.current = loadedFace;
              setFontFamilyName(newFontName);

              // Revoke previous blob URL
              if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
                URL.revokeObjectURL(activeBlobUrlRef.current);
              }
              activeBlobUrlRef.current = blobUrl;
            })
            .catch(() => {
              URL.revokeObjectURL(blobUrl);
              if (!cancelled && compileVersion === fontVersionRef.current) {
                setErrorMsg('プレビュー用フォントの読み込みに失敗しました。');
              }
            });
        } else {
          setFontFamilyName(newFontName);
          if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          }
          activeBlobUrlRef.current = blobUrl;
        }

        const styleId = 'dynamic-preview-font-face';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = `
          @font-face {
            font-family: '${newFontName}';
            src: url('${blobUrl}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
        `;
        setErrorMsg(null);
      } catch (err) {
        console.error('Error compiling test font:', err);
        // Remove the previous preview font so a failed compile never leaves
        // stale glyphs on screen.
        cleanupActivePreviewFont();
        setErrorMsg(
          err instanceof Error && err.message
            ? err.message
            : 'フォントの生成中にエラーが発生しました。パスの構造を確認してください。'
        );
      }
    }, 250);

    return () => {
      cancelled = true;
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
        compileTimerRef.current = null;
      }
    };
  }, [isOpen, project.updatedAt, autoBalanceMargins, fontScaleMultiplier, cleanupActivePreviewFont]);

  // Handle batch centering all glyphs in project
  const handleBatchCenterAll = () => {
    if (!setProject) return;
    const { project: updatedProj, modifiedCount } = balanceProjectGlyphMargins(project);
    setProject(updatedProj);
    if (onShowToast) {
      onShowToast(`${modifiedCount} 文字の左右余白を中央に整列しました`, 'success');
    }
  };

  // Helper to get glyph metric info
  const getGlyphMetric = (char: string) => {
    const code = char.codePointAt(0) ?? 0;
    const g = project.glyphs[code];
    if (!g || !g.contours || g.contours.length === 0) return null;
    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.width <= 0) return null;
    const adv = g.advanceWidth || (code > 255 ? (project.metadata.unitsPerEm || 1000) : 500);
    const lsb = Math.round(bbox.minX);
    const rsb = Math.round(adv - bbox.maxX);
    const diff = lsb - rsb;
    return { char, unicode: code, adv, lsb, rsb, diff };
  };

  // Apply vector transform directly to glyph contour in project
  const handleApplyTransformToGlyph = () => {
    if (!selectedCharInfo || !setProject) return;
    const unicode = selectedCharInfo.unicode;
    const g = project.glyphs[unicode];
    if (!g || !g.contours || g.contours.length === 0) {
      if (onShowToast) onShowToast(`「${selectedCharInfo.char}」の輪郭データが見つかりません`, 'info');
      return;
    }

    const scaleXMult = adjustScaleX / 100;
    const scaleYMult = adjustScaleY / 100;

    const transformedContours = transformGlyphContours(
      g.contours,
      adjustDx,
      adjustDy,
      scaleXMult,
      scaleYMult
    );

    const newBbox = getContoursBoundingBox(transformedContours);
    const newLsb = Math.max(0, Math.round(newBbox.minX));

    setProject((prev) => {
      const prevG = prev.glyphs[unicode];
      if (!prevG) return prev;
      return {
        ...prev,
        updatedAt: Date.now(),
        glyphs: {
          ...prev.glyphs,
          [unicode]: {
            ...prevG,
            contours: transformedContours,
            lsb: newLsb,
            updatedAt: Date.now(),
          },
        },
      };
    });

    if (onShowToast) {
      onShowToast(
        `「${selectedCharInfo.char}」のグリフ輪郭（位置 X:${adjustDx}, Y:${adjustDy}, 拡縮 ${adjustScaleX}%×${adjustScaleY}%）を永続保存しました`,
        'success'
      );
    }

    setAdjustDx(0);
    setAdjustDy(0);
    setAdjustScaleX(100);
    setAdjustScaleY(100);
  };

  const handleJumpToMainEditor = () => {
    if (!selectedCharInfo) return;
    if (onSelectGlyphForEdit) {
      onSelectGlyphForEdit(selectedCharInfo.unicode);
    } else if (onClose) {
      onClose();
    }
  };

  // Center selected character in EM Box
  const handleAutoCenterGlyph = () => {
    if (!selectedCharInfo || !setProject) return;
    const unicode = selectedCharInfo.unicode;
    const g = project.glyphs[unicode];
    if (!g || !g.contours || g.contours.length === 0) return;
    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.width <= 0) return;

    const adv = g.advanceWidth || (unicode > 255 ? (project.metadata.unitsPerEm || 1000) : 500);
    const targetLsb = Math.round((adv - bbox.width) / 2);
    const deltaX = targetLsb - bbox.minX;

    setAdjustDx(deltaX);
    if (onShowToast) {
      onShowToast(`「${selectedCharInfo.char}」をEM枠中央に自動配置しました (X:${deltaX}px)`, 'info');
    }
  };

// Live SVG Preview calculation for active selected character
  const activeGlyph = selectedCharInfo ? project.glyphs[selectedCharInfo.unicode] : null;
  const livePreviewContours = useMemo(() => {
    if (!activeGlyph || !activeGlyph.contours) return [];
    if (adjustDx === 0 && adjustDy === 0 && adjustScaleX === 100 && adjustScaleY === 100) {
      return activeGlyph.contours;
    }
    return transformGlyphContours(
      activeGlyph.contours,
      adjustDx,
      adjustDy,
      adjustScaleX / 100,
      adjustScaleY / 100
    );
  }, [activeGlyph, adjustDx, adjustDy, adjustScaleX, adjustScaleY]);

  // All available glyph entries in project for dropdown selection
  const glyphEntries = useMemo(() => {
    return Object.keys(project.glyphs)
      .map((codeStr) => {
        const u = Number(codeStr);
        const g = project.glyphs[u];
        const ch = g?.char || String.fromCodePoint(u);
        return { unicode: u, char: ch, name: g?.name || ch };
      })
      .filter((item) => item.char && item.char.trim().length > 0);
  }, [project.glyphs]);

  const [showLivePreviewBox, setShowLivePreviewBox] = useState<boolean>(false);

  return {
    testText,
    setTestText,
    writingMode,
    setWritingMode,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    textAlign,
    setTextAlign,
    useTsume,
    setUseTsume,
    showSpaceMarkers,
    setShowSpaceMarkers,
    showGenkoGrid,
    setShowGenkoGrid,
    showCharBoxes,
    setShowCharBoxes,
    showNotebookGuides,
    setShowNotebookGuides,
    autoBalanceMargins,
    setAutoBalanceMargins,
    fontScaleMultiplier,
    setFontScaleMultiplier,
    isWaterfall,
    setIsWaterfall,
    fontFamilyName,
    errorMsg,
    selectedCharInfo,
    setSelectedCharInfo,
    adjustDx,
    setAdjustDx,
    adjustDy,
    setAdjustDy,
    adjustScaleX,
    setAdjustScaleX,
    adjustScaleY,
    setAdjustScaleY,
    isAspectLocked,
    setIsAspectLocked,
    handleVerticalWheel,
    isSideAdjusterOpen,
    setIsSideAdjusterOpen,
    leftSidebarWidth,
    setLeftSidebarWidth,
    rightAdjusterWidth,
    setRightAdjusterWidth,
    mainContainerRef,
    isResizingLeft,
    isResizingRight,
    handleLeftResizePointerDown,
    handleLeftResizePointerMove,
    handleLeftResizePointerUp,
    handleRightResizePointerDown,
    handleRightResizePointerMove,
    handleRightResizePointerUp,
    isDocked,
    setIsDocked,
    floatingPos,
    setFloatingPos,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    hoveredGlyphInfo,
    setHoveredGlyphInfo,
    layoutMode,
    setLayoutMode,
    isSidebarOpen,
    setIsSidebarOpen,
    isTopControlsCollapsed,
    setIsTopControlsCollapsed,
    showHintBanner,
    setShowHintBanner,
    isFullscreen,
    setIsFullscreen,
    mobileTab,
    setMobileTab,
    isMobileScreen,
    isLight,
    handleBatchCenterAll,
    getGlyphMetric,
    handleApplyTransformToGlyph,
    handleJumpToMainEditor,
    handleAutoCenterGlyph,
    activeGlyph,
    livePreviewContours,
    glyphEntries,
    showLivePreviewBox,
    setShowLivePreviewBox,
  };
}

export type TestPreviewState = ReturnType<typeof useTestPreviewState>;
