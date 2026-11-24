import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Type, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { BundledFontsModal } from './BundledFontsModal';
import { BatchRadicalModal } from './radicalStudio/BatchRadicalModal';
import { KANJI_RADICALS } from '../data/kanjiRadicals';
import { KANGXI_214_RADICALS, KangxiRadicalFullEntry } from '../data/kangxi214Radicals';
import { PathContour, CustomPart, RadicalPlacement, GlyphData, PartCategory } from '../types';
import { generateId, transformContoursForPlacement } from '../utils/path';
import {
  extractRadicalFromFont,
  getOrExtractRadicalContours,
  RADICAL_FONT_OPTIONS,
  FontStyleOption,
} from '../utils/radicalExtractor';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import {
  loadCustomParts,
  saveCustomParts,
  buildDefaultCustomParts,
  isCustomPartsInitialized,
  sanitizeCustomParts,
  SaveCustomPartsResult,
} from '../utils/customPartsStorage';
import { resolveBaselineY } from '../utils/font/constants';
import { makeUniquePartName } from '../utils/customParts';
import {
  RadicalsDrawerProps,
  DrawerTab,
  CUSTOM_PARTS_STORAGE_KEY,
  PlacementSelector,
  PresetRadicalsTab,
  FontExtractionTab,
  KangxiRadicalsTab,
  ShapePresetsTab,
  FromGlyphTab,
  CustomPartsTab,
  useRadicalsResize,
} from './radicals';

export type { RadicalsDrawerProps };

export const RadicalsDrawer: React.FC<RadicalsDrawerProps> = ({
  isOpen,
  onClose,
  onInsertRadical,
  onBatchInsertRadical,
  currentContours,
  selectedChar,
  allGlyphs,
  theme,
  isOverlay,
  ascender,
  unitsPerEm,
}) => {
  const baselineY = resolveBaselineY(ascender, unitsPerEm);
  const effectiveIsOverlay = isOverlay !== undefined ? isOverlay : true;
  const {
    drawerWidth,
    isResizing,
    gridDensity,
    setDrawerWidth,
    setGridDensity,
    resetDrawerWidth,
    handleResizeStart,
  } = useRadicalsResize();
  const [activeTab, setActiveTab] = useState<DrawerTab>('preset');
  const [placement, setPlacement] = useState<RadicalPlacement>('auto');
  const [selectedFontStyle, setSelectedFontStyle] = useState<FontStyleOption>(RADICAL_FONT_OPTIONS[0]);
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [batchModalTarget, setBatchModalTarget] = useState<{
    radicalName: string;
    sourceContours: PathContour[];
    defaultKanjiList?: string[];
  } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [shapeCategoryFilter, setShapeCategoryFilter] = useState<string>('all');
  const [extractingKangxiNum, setExtractingKangxiNum] = useState<number | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);

  // Font Extraction Tool State
  const [extractChar, setExtractChar] = useState<string>('氵');
  const [extractFontFamily, setExtractFontFamily] = useState<string>(RADICAL_FONT_OPTIONS[0].fontFamily);
  const [extractWeight, setExtractWeight] = useState<number>(RADICAL_FONT_OPTIONS[0].fontWeight);
  const [extractRegion, setExtractRegion] = useState<'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi'>('full');
  const [extractSmoothing, setExtractSmoothing] = useState<number>(0.5);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedContours, setExtractedContours] = useState<PathContour[]>([]);

  const handleSelectFontStyle = (opt: FontStyleOption) => {
    setSelectedFontStyle(opt);
    setExtractFontFamily(opt.fontFamily);
    setExtractWeight(opt.fontWeight);
  };

  // Kangxi Radicals Catalog State
  const [kangxiSearch, setKangxiSearch] = useState<string>('');

  // Custom Parts
  const [customParts, setCustomParts] = useState<CustomPart[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PARTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeCustomParts(parsed);
        if (sanitized.length > 0) return sanitized;
      }
    } catch {
      // ignore
    }
    // 保存データが一度もない初回起動時にだけ既定パーツを表示する。
    // ユーザーが全件削除した場合は初期化済みフラグが立っているため空のままにする。
    if (isCustomPartsInitialized()) return [];
    return buildDefaultCustomParts();
  });
  const [newPartName, setNewPartName] = useState<string>('');
  const [newPartCategory, setNewPartCategory] = useState<PartCategory>('other');
  const [createOnlyFrame, setCreateOnlyFrame] = useState<boolean>(false);
  const [showSaveInput, setShowSaveInput] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  // 同名パーツへの保存が要求された場合の確認待ち状態
  const [pendingDuplicateSave, setPendingDuplicateSave] = useState<{
    contours: PathContour[];
    name: string;
    category?: PartCategory;
  } | null>(null);

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
      noticeTimerRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || isLicenseModalOpen || batchModalTarget) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLicenseModalOpen, batchModalTarget, onClose]);

  const lastSavedDrawerJsonRef = useRef<string>('');
  // 初回読み込みが終わるまで同期 effect による保存を行わないためのフラグ。
  // 読み込み前に既定パーツで IndexedDB を上書きしないようにする。
  const initialLoadDoneRef = useRef<boolean>(false);
  const customPartsRef = useRef<CustomPart[]>(customParts);
  // 保存処理の実行中に外部変更の読み込みで編集中の内容を上書きしないためのフラグ
  const saveInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    customPartsRef.current = customParts;
  }, [customParts]);

  // 保存中の読み込み上書きを防ぐため、保存処理はこの経路に集約する
  const savePartsNow = useCallback(async (next: CustomPart[]) => {
    saveInFlightRef.current = true;
    try {
      return await saveCustomParts(next);
    } finally {
      saveInFlightRef.current = false;
    }
  }, []);

  // Reload custom parts from IndexedDB
  const reloadCustomParts = useCallback(async () => {
    try {
      const loaded = await loadCustomParts();
      if (saveInFlightRef.current) {
        // 自身の保存が完了すれば保存成功時にイベントが届き、改めて読み込む
        return;
      }
      if (Array.isArray(loaded) && loaded.length > 0) {
        lastSavedDrawerJsonRef.current = JSON.stringify(loaded);
        setCustomParts(loaded);
      } else if (isCustomPartsInitialized()) {
        // ユーザーが全件削除した状態。既定パーツを復元しない。
        lastSavedDrawerJsonRef.current = '[]';
        setCustomParts([]);
      } else {
        // 初回起動。現在の表示内容（既定パーツ）を保存済みとみなし、
        // 読み込み直後の不要な書き戻しを行わない。
        lastSavedDrawerJsonRef.current = JSON.stringify(customPartsRef.current);
      }
    } catch {
      // ignore
    } finally {
      initialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reloadCustomParts();
    }
  }, [isOpen, reloadCustomParts]);

  useEffect(() => {
    const handleSync = () => reloadCustomParts();
    window.addEventListener('font_custom_parts_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('font_custom_parts_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [reloadCustomParts]);

  // Sync custom parts to IndexedDB when customParts state updates.
  // id 一覧ではなく輪郭を含む内容全体を比較するため、同名パーツへの上書きも保存される。
  // 空の目録も保存し、全件削除を永続化する。
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const jsonStr = JSON.stringify(customParts);
    if (jsonStr === lastSavedDrawerJsonRef.current) return;
    lastSavedDrawerJsonRef.current = jsonStr;
    savePartsNow(customParts).then((result: SaveCustomPartsResult) => {
      if (!result.ok) {
        showNotice(`パーツの保存に失敗しました（${result.fallbackDroppedCount}件を保存できませんでした）`);
      } else if (result.fallbackSavedCount > 0) {
        showNotice('パーツをブラウザ保存に退避しました');
      }
    });
  }, [customParts, showNotice, savePartsNow]);

  // Latest extraction request id. Results from older requests are discarded
  // so a slow earlier extraction cannot overwrite a newer one.
  const extractionRequestIdRef = useRef(0);

  // Perform font extraction
  const performExtraction = useCallback(
    async (charToExtract: string, regionToExtract: 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi') => {
      if (!charToExtract || charToExtract.trim().length === 0) return;
      const requestId = ++extractionRequestIdRef.current;
      setIsExtracting(true);
      try {
        const contours = await extractRadicalFromFont({
          char: charToExtract.trim()[0],
          fontFamily: extractFontFamily,
          fontWeight: extractWeight,
          region: regionToExtract,
          smoothing: extractSmoothing,
          fitMargin: 70,
          baselineY,
        });
        // Discard results from an older request that finished after a newer one started.
        if (requestId !== extractionRequestIdRef.current) return;
        setExtractedContours(contours);
        if (contours.length === 0) {
          showNotice('輪郭が見つかりませんでした');
        }
      } catch (err) {
        if (requestId !== extractionRequestIdRef.current) return;
        console.error('Extraction failed:', err);
        setExtractedContours([]);
        showNotice('抽出に失敗しました。フォントまたは文字を確認してください');
      } finally {
        if (requestId === extractionRequestIdRef.current) {
          setIsExtracting(false);
        }
      }
    },
    [extractFontFamily, extractWeight, extractSmoothing, showNotice, baselineY]
  );

  // Trigger extraction when options change in extract tab (debounced so
  // rapid edits to char, font, weight, or region start only one extraction).
  useEffect(() => {
    if (isOpen && activeTab === 'extract') {
      const timer = setTimeout(() => {
        performExtraction(extractChar, extractRegion);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, extractChar, extractFontFamily, extractWeight, extractRegion, extractSmoothing, performExtraction]);

  // Insert helper with placement
  const handleInsertWithPlacement = (
    rawContours: PathContour[],
    partName?: string,
    defaultCategory?: string
  ) => {
    if (!rawContours || rawContours.length === 0) {
      showNotice('挿入する輪郭データがありません');
      return;
    }
    const clonedContours: PathContour[] = rawContours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const positioned = transformContoursForPlacement(clonedContours, placement, defaultCategory, { baselineY, unitsPerEm });
    onInsertRadical(positioned);
    showNotice(partName ? `「${partName}」をキャンバスに挿入しました` : '部首をキャンバスに挿入しました');
  };

  // High-fidelity insertion for preset radicals using vector cache
  const handleInsertPresetRadical = async (radical: (typeof KANJI_RADICALS)[0]) => {
    try {
      const contours = await getOrExtractRadicalContours(
        radical.char || radical.name,
        'full',
        selectedFontStyle.fontFamily,
        selectedFontStyle.fontWeight,
        baselineY
      );
      if (contours && contours.length > 0) {
        handleInsertWithPlacement(contours, `${radical.name} (${selectedFontStyle.label})`, radical.category);
        return;
      }
    } catch (e) {
      console.error('Preset extraction error:', e);
    }
    handleInsertWithPlacement(radical.contours, radical.name, radical.category);
  };

  const handleOpenBatchModalForPreset = useCallback(
    async (radical: (typeof KANJI_RADICALS)[0]) => {
      let contours = radical.contours;
      try {
        const extracted = await getOrExtractRadicalContours(
          radical.char || radical.name,
          'full',
          selectedFontStyle.fontFamily,
          selectedFontStyle.fontWeight,
          baselineY
        );
        if (extracted && extracted.length > 0) {
          contours = extracted;
        }
      } catch {
        // fallback to preset contours
      }
      const kangxiMatch = KANGXI_214_RADICALS.find(
        (k) => k.char === radical.char || k.altChars?.includes(radical.char)
      );
      const kanjiList = kangxiMatch?.kanjiList || [];
      setBatchModalTarget({
        radicalName: radical.name,
        sourceContours: contours,
        defaultKanjiList: kanjiList,
      });
    },
    [selectedFontStyle, baselineY]
  );

  const handleOpenBatchModalForKangxi = useCallback(
    async (item: KangxiRadicalFullEntry) => {
      const charToUse = item.altChars?.[0] || item.char;
      const matchedPreset = KANJI_RADICALS.find(
        (r) => r.char === charToUse || r.char === item.char || r.name.startsWith(item.name)
      );
      let contours = matchedPreset?.contours || [];
      if (contours.length === 0) {
        try {
          setExtractingKangxiNum(item.number);
          const extracted = await getOrExtractRadicalContours(
            charToUse,
            'full',
            selectedFontStyle.fontFamily,
            selectedFontStyle.fontWeight,
            baselineY
          );
          if (extracted && extracted.length > 0) {
            contours = extracted;
          }
        } catch {
          // ignore
        } finally {
          setExtractingKangxiNum(null);
        }
      }
      if (!contours || contours.length === 0) {
        showNotice(`「${item.char}」の輪郭を取得できませんでした`);
        return;
      }
      setBatchModalTarget({
        radicalName: item.name,
        sourceContours: contours,
        defaultKanjiList: item.kanjiList || [],
      });
    },
    [selectedFontStyle, baselineY]
  );

  const handleOpenBatchModalForCustomPart = useCallback((part: CustomPart) => {
    if (!part.contours || part.contours.length === 0) {
      showNotice(`「${part.name}」には輪郭が未登録です`);
      return;
    }
    setBatchModalTarget({
      radicalName: part.name,
      sourceContours: part.contours,
      defaultKanjiList: [],
    });
  }, []);

  // Save contours as custom part (applies the save once the name is decided)
  const applySaveContoursAsPart = async (
    contoursToSave: PathContour[],
    name: string,
    category?: PartCategory
  ) => {
    // 保存前に IndexedDB から最新の一覧を読み、読み込み前に表示していた
    // 古い一覧で保存済みデータを上書きしないようにする。
    const stored = await loadCustomParts();
    const base =
      stored.length > 0 ? stored : isCustomPartsInitialized() ? [] : customParts;
    const existingIndex = base.findIndex((p) => p.name === name);
    let updated: CustomPart[];
    if (existingIndex >= 0) {
      updated = base.map((p, idx) =>
        idx === existingIndex
          ? {
              ...p,
              contours: JSON.parse(JSON.stringify(contoursToSave || [])),
              category: category ?? p.category ?? 'other',
              updatedAt: Date.now(),
            }
          : p
      );
    } else {
      const newPart: CustomPart = {
        id: generateId(),
        name,
        category: category ?? 'other',
        contours: JSON.parse(JSON.stringify(contoursToSave || [])),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updated = [newPart, ...base];
    }

    setCustomParts(updated);
    lastSavedDrawerJsonRef.current = JSON.stringify(updated);
    const result = await savePartsNow(updated);
    setNewPartName('');
    setShowSaveInput(false);
    if (result.ok) {
      showNotice(
        result.fallbackSavedCount > 0
          ? `「${name}」を保存しました（ブラウザ保存に退避）`
          : `「${name}」を保存しました`
      );
    } else {
      showNotice(`「${name}」の保存に失敗しました（${result.fallbackDroppedCount}件を保存できませんでした）`);
    }
  };

  // Save contours as custom part. When a part with the same name already
  // exists, ask whether to overwrite it or save under a different name.
  // The `overwriteExisting` option skips the dialog for flows where the
  // target part is chosen explicitly (assigning contours to a name frame).
  const handleSaveContoursAsPart = (
    contoursToSave: PathContour[],
    defaultName: string,
    options?: { overwriteExisting?: boolean; category?: PartCategory }
  ) => {
    const name = newPartName.trim() || defaultName;
    if (!name) return;

    const existingIndex = customParts.findIndex((p) => p.name === name);
    if (existingIndex >= 0 && !options?.overwriteExisting) {
      setPendingDuplicateSave({ contours: contoursToSave, name, category: options?.category });
      return;
    }
    applySaveContoursAsPart(contoursToSave, name, options?.category);
  };

  // Create clean name-only frame without contours
  const handleCreateNameFrame = async (frameName?: string) => {
    const stored = await loadCustomParts();
    const base =
      stored.length > 0 ? stored : isCustomPartsInitialized() ? [] : customParts;
    const name = makeUniquePartName(
      (frameName || newPartName).trim() || '新規パーツ枠',
      base.map((p) => p.name)
    );
    const newPart: CustomPart = {
      id: generateId(),
      name,
      category: newPartCategory,
      contours: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newPart, ...base];
    setCustomParts(updated);
    lastSavedDrawerJsonRef.current = JSON.stringify(updated);
    const result = await savePartsNow(updated);
    setNewPartName('');
    setShowSaveInput(false);
    if (result.ok) {
      showNotice(
        result.fallbackSavedCount > 0
          ? `名前枠「${name}」を作成しました（ブラウザ保存に退避）`
          : `名前枠「${name}」を作成しました`
      );
    } else {
      showNotice(`名前枠「${name}」の保存に失敗しました（${result.fallbackDroppedCount}件を保存できませんでした）`);
    }
  };

  // Import all high-quality standard radicals into custom parts
  const handleImportAllPresetRadicals = async () => {
    const stored = await loadCustomParts();
    const base =
      stored.length > 0 ? stored : isCustomPartsInitialized() ? [] : customParts;
    const existingNames = new Set(base.map((p) => p.name));
    const toAdd: CustomPart[] = [];

    showNotice('定番部首の高品質ベクターを取り込み中...');
    for (const rad of KANJI_RADICALS) {
      if (!existingNames.has(rad.name)) {
        let contours: PathContour[] = rad.contours;
        try {
          const extracted = await getOrExtractRadicalContours(
            rad.char || rad.name,
            'full',
            selectedFontStyle.fontFamily,
            selectedFontStyle.fontWeight,
            baselineY
          );
          if (extracted && extracted.length > 0) {
            contours = extracted;
          }
        } catch {
          // fallback to rad.contours
        }

        toAdd.push({
          id: generateId(),
          name: rad.name,
          category: rad.category as CustomPart['category'],
          description: `定番部首: ${rad.name} (${rad.char})`,
          contours: JSON.parse(JSON.stringify(contours)),
          createdAt: Date.now(),
        });
      }
    }

    if (toAdd.length === 0) {
      showNotice('すべての定番部首は既に登録されています');
      return;
    }

    const merged = [...toAdd, ...base];
    setCustomParts(merged);
    lastSavedDrawerJsonRef.current = JSON.stringify(merged);
    const result = await savePartsNow(merged);
    if (result.ok) {
      showNotice(
        result.fallbackSavedCount > 0
          ? `${toAdd.length} 件の定番部首を高精度ベクターでマイパーツに取り込みました（ブラウザ保存に退避）`
          : `${toAdd.length} 件の定番部首を高精度ベクターでマイパーツに取り込みました`
      );
    } else {
      showNotice(
        `定番部首の取り込みを保存できませんでした（${result.fallbackDroppedCount}件を保存できませんでした）`
      );
    }
  };

  // Filter preset radicals
  const filteredRadicals = KANJI_RADICALS.filter((r) => {
    const matchCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchSearch =
      !presetSearch.trim() ||
      r.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
      r.char.includes(presetSearch.trim());
    return matchCategory && matchSearch;
  });

  // Smart constituent radical recommendations based on currently selected character
  const suggestedRadicals = useMemo(() => {
    if (!selectedChar) return [];
    const char = selectedChar.trim();
    return KANGXI_214_RADICALS.filter((item) => {
      if (item.char === char) return true;
      if (item.altChars && item.altChars.includes(char)) return true;
      if (item.kanjiList && item.kanjiList.includes(char)) return true;
      return false;
    }).slice(0, 6);
  }, [selectedChar]);

  // Filter modified glyphs for synthesis
  const availableGlyphs = (Object.values(allGlyphs) as GlyphData[]).filter(
    (g) => g && g.contours && g.contours.length > 0
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay Click-Outside Dismiss */}
      {effectiveIsOverlay && (
        <div
          onClick={onClose}
          className="fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 bg-black/40 z-30"
        />
      )}

      <aside
        style={{
          '--radicals-width': `${drawerWidth}px`,
        } as React.CSSProperties}
        className={`${
          effectiveIsOverlay
            ? 'fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 right-0 z-40 w-full sm:w-[var(--radicals-width)] sm:max-w-[85vw] shadow-2xl anim-slide-right'
            : 'relative z-10 shrink-0 h-full w-[var(--radicals-width)]'
        } border-l flex flex-col min-h-0 select-none ${
          isResizing ? '' : 'transition-[width,background-color,border-color] duration-150'
        } ${themeClasses.sidebarBg} ${themeClasses.border}`}
      >
        {/* Left Edge Drag Resizer Handle */}
        <div
          id="radicals-resizer-handle"
          onPointerDown={handleResizeStart}
          onDoubleClick={resetDrawerWidth}
          style={{ touchAction: 'none' }}
          className={`hidden sm:flex absolute top-0 -left-2 w-4 h-full cursor-col-resize z-30 items-center justify-center group select-none transition-colors ${
            isResizing ? 'bg-emerald-500/15' : 'hover:bg-emerald-500/10'
          }`}
          title={`左右にドラッグして部首パネル幅を調整 (${drawerWidth}px) / ダブルクリックで初期値にリセット`}
        >
          <div
            className={`w-1 h-14 rounded transition-[transform,background-color] flex items-center justify-center ${
              isResizing
                ? 'bg-emerald-500 scale-110'
                : 'bg-stone-300 dark:bg-stone-600 group-hover:bg-emerald-500 group-hover:scale-105'
            }`}
          >
            <div className="w-0.5 h-6 rounded bg-white/50 dark:bg-black/40" />
          </div>
        </div>

        {/* Header */}
        <div
          className={`px-2.5 py-2 border-b flex flex-col gap-1.5 shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Type className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold tracking-wide truncate ${themeClasses.textPrimary}`}>
                  部首・フォントパーツ
                </span>
                <span className={`text-[10px] truncate ${themeClasses.textMuted}`}>
                  ベクター輪郭の登録・文字への挿入
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const firstRad = KANJI_RADICALS.find((r) => r.id === 'rad_kihen') || KANJI_RADICALS[0];
                  handleOpenBatchModalForPreset(firstRad);
                }}
                className={`px-2 py-1 rounded text-[10.5px] font-bold border transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${themeClasses.accentBadge} hover:opacity-90`}
                title="部首パーツを指定した複数の漢字へ一括自動配置・合成します"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>一括流し込み</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className={`p-1 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
                title="閉じる (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Width Presets (sm+) & Card Density Controls */}
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div
              className={`hidden sm:flex items-center p-0.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
              title="部首パネルの幅プリセット（左端をドラッグして自由調整も可）"
            >
              <button
                type="button"
                onClick={() => setDrawerWidth(288)}
                title="幅: 狭め (288px)"
                className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  drawerWidth <= 310
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                狭
              </button>
              <button
                type="button"
                onClick={() => setDrawerWidth(352)}
                title="幅: 標準 (352px)"
                className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  drawerWidth > 310 && drawerWidth < 430
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                標
              </button>
              <button
                type="button"
                onClick={() => setDrawerWidth(480)}
                title="幅: 広め (480px)"
                className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  drawerWidth >= 430
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                広
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className={`text-[10px] ${themeClasses.textMuted}`}>カード:</span>
              <div
                className={`flex items-center p-0.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
              >
                <button
                  type="button"
                  onClick={() => setGridDensity('large')}
                  title="大カード"
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    gridDensity === 'large'
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                  }`}
                >
                  大
                </button>
                <button
                  type="button"
                  onClick={() => setGridDensity('medium')}
                  title="中カード（標準）"
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    gridDensity === 'medium'
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                  }`}
                >
                  中
                </button>
                <button
                  type="button"
                  onClick={() => setGridDensity('compact')}
                  title="小カード（一覧性重視）"
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                    gridDensity === 'compact'
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                  }`}
                >
                  小
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusNotice && (
          <div className="bg-emerald-800 text-white text-[11px] font-bold py-1.5 px-3 text-center border-b border-emerald-700 anim-fade">
            {statusNotice}
          </div>
        )}

        {/* Smart Suggestion Bar: Automatic constituent radicals for selected character */}
        {suggestedRadicals.length > 0 && (
          <div
            className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-2 text-xs shrink-0 min-w-0 ${
              isLight
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-[#142319] border-[#223d2b] text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-[11px] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="whitespace-nowrap">「{selectedChar}」の推奨部首:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll-x min-w-0">
              {suggestedRadicals.map((rad) => {
                const targetChar = rad.altChars?.[0] || rad.char;
                return (
                  <button
                    key={rad.number}
                    type="button"
                    onClick={() => {
                      const matched = KANJI_RADICALS.find(
                        (r) => r.char === targetChar || r.char === rad.char
                      );
                      if (matched && matched.contours.length > 0) {
                        handleInsertWithPlacement(matched.contours, rad.name, rad.category);
                      } else {
                        getOrExtractRadicalContours(
                          targetChar,
                          'full',
                          selectedFontStyle.fontFamily,
                          selectedFontStyle.fontWeight,
                          baselineY
                        )
                          .then((contours) => {
                            if (contours && contours.length > 0) {
                              handleInsertWithPlacement(contours, rad.name, rad.category);
                            } else {
                              showNotice('輪郭が見つかりませんでした');
                            }
                          })
                          .catch((err) => {
                            console.error('Suggested radical extraction failed:', err);
                            showNotice('抽出に失敗しました。フォントまたは文字を確認してください');
                          });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer overflow-hidden ${
                      isLight
                        ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-xs'
                        : 'bg-[#1a2d21] border-[#2f4d39] text-emerald-100 hover:bg-[#253f2e] shadow-xs'
                    }`}
                    title={`「${rad.char}」(${rad.name}) を挿入`}
                  >
                    <span className="text-xs font-bold shrink-0">{rad.displayChar || rad.char}</span>
                    {rad.altChars?.[0] && (
                      <span className="text-[9px] text-stone-500 font-normal shrink-0">({rad.altChars[0]})</span>
                    )}
                    <span className="text-[9px] truncate max-w-[55px]">{rad.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          className={`flex items-center overflow-x-auto no-scrollbar touch-scroll-x p-1 gap-1 border-b text-[10.5px] font-semibold shrink-0 max-sm:grid max-sm:grid-cols-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {[
            { id: 'preset', label: '定番部首' },
            { id: 'extract', label: 'フォント抽出' },
            { id: 'kangxi', label: '康熙214' },
            { id: 'shapes', label: '幾何図形' },
            { id: 'from_glyph', label: '文字合成' },
            { id: 'custom', label: 'マイパーツ' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DrawerTab)}
              className={`flex-1 shrink-0 min-w-fit max-sm:min-w-0 px-2 py-1 rounded text-center whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? `${themeClasses.activeTool} border`
                  : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
              }`}
              title={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Font Style Selector for Radicals */}
        <div
          className={`px-2.5 py-1.5 border-b space-y-1 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span className={`font-bold flex items-center space-x-1 min-w-0 ${themeClasses.textPrimary}`}>
              <Type className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
              <span className="truncate">部首書体スタイル (プレビュー＆抽出):</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className={`inline-flex items-center gap-1 text-[10px] font-medium hover:underline cursor-pointer whitespace-nowrap shrink-0 ${themeClasses.accentText}`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>OFL 1.1 ライセンス一覧</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10.5px] sm:text-[11px]">
            {RADICAL_FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFontStyle(opt)}
                className={`min-w-0 py-1 px-1 rounded border text-center transition-colors flex items-center justify-center overflow-hidden cursor-pointer ${
                  selectedFontStyle.id === opt.id
                    ? themeClasses.accentBtn
                    : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                }`}
                title={`${opt.label} (${opt.subLabel})`}
              >
                <span
                  className="truncate w-full text-center whitespace-nowrap"
                  style={{ fontFamily: opt.fontFamily, fontWeight: opt.fontWeight }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Placement Selector */}
        <PlacementSelector
          placement={placement}
          setPlacement={setPlacement}
          isLight={isLight}
        />

        {/* TAB 1: PRESET RADICALS */}
        {activeTab === 'preset' && (
          <PresetRadicalsTab
            isLight={isLight}
            presetSearch={presetSearch}
            setPresetSearch={setPresetSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            filteredRadicals={filteredRadicals}
            selectedFontStyle={selectedFontStyle}
            gridDensity={gridDensity}
            onInsertPresetRadical={handleInsertPresetRadical}
            onImportAllPresetRadicals={handleImportAllPresetRadicals}
            onBatchInsertPresetRadical={handleOpenBatchModalForPreset}
          />
        )}

        {/* TAB 2: FONT EXTRACTOR */}
        {activeTab === 'extract' && (
          <FontExtractionTab
            isLight={isLight}
            extractChar={extractChar}
            setExtractChar={setExtractChar}
            extractFontFamily={extractFontFamily}
            setExtractFontFamily={setExtractFontFamily}
            extractWeight={extractWeight}
            setExtractWeight={setExtractWeight}
            extractRegion={extractRegion}
            setExtractRegion={setExtractRegion}
            extractSmoothing={extractSmoothing}
            setExtractSmoothing={setExtractSmoothing}
            isExtracting={isExtracting}
            extractedContours={extractedContours}
            placement={placement}
            categoryFilter={categoryFilter}
            setSelectedFontStyle={setSelectedFontStyle}
            onPerformExtraction={performExtraction}
            onInsertWithPlacement={handleInsertWithPlacement}
            onSaveContoursAsPart={handleSaveContoursAsPart}
            baselineY={baselineY}
            unitsPerEm={unitsPerEm}
          />
        )}

        {/* TAB 3: KANGXI 214 RADICALS CATALOG */}
        {activeTab === 'kangxi' && (
          <KangxiRadicalsTab
            isLight={isLight}
            kangxiSearch={kangxiSearch}
            setKangxiSearch={setKangxiSearch}
            selectedFontStyle={selectedFontStyle}
            gridDensity={gridDensity}
            extractingKangxiNum={extractingKangxiNum}
            setExtractingKangxiNum={setExtractingKangxiNum}
            onInsertWithPlacement={handleInsertWithPlacement}
            onBatchInsertKangxi={handleOpenBatchModalForKangxi}
            setExtractChar={setExtractChar}
            setActiveTab={setActiveTab}
            showNotice={showNotice}
            baselineY={baselineY}
          />
        )}

        {/* TAB 4: GEOMETRIC SHAPES */}
        {activeTab === 'shapes' && (
          <ShapePresetsTab
            isLight={isLight}
            shapeCategoryFilter={shapeCategoryFilter}
            setShapeCategoryFilter={setShapeCategoryFilter}
            gridDensity={gridDensity}
            onInsertWithPlacement={handleInsertWithPlacement}
          />
        )}

        {/* TAB 5: SYNTHESIZE FROM EXISTING GLYPHS */}
        {activeTab === 'from_glyph' && (
          <FromGlyphTab
            isLight={isLight}
            availableGlyphs={availableGlyphs}
            gridDensity={gridDensity}
            onInsertWithPlacement={handleInsertWithPlacement}
          />
        )}

        {/* TAB 6: CUSTOM PARTS */}
        {activeTab === 'custom' && (
          <CustomPartsTab
            isLight={isLight}
            gridDensity={gridDensity}
            showSaveInput={showSaveInput}
            setShowSaveInput={setShowSaveInput}
            createOnlyFrame={createOnlyFrame}
            setCreateOnlyFrame={setCreateOnlyFrame}
            newPartName={newPartName}
            setNewPartName={setNewPartName}
            newPartCategory={newPartCategory}
            setNewPartCategory={setNewPartCategory}
            selectedChar={selectedChar}
            currentContours={currentContours}
            customParts={customParts}
            setCustomParts={setCustomParts}
            handleCreateNameFrame={handleCreateNameFrame}
            handleSaveContoursAsPart={handleSaveContoursAsPart}
            handleInsertWithPlacement={handleInsertWithPlacement}
            onBatchInsertCustomPart={handleOpenBatchModalForCustomPart}
            showNotice={showNotice}
          />
        )}
      </aside>

      <BundledFontsModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        theme={theme}
      />

      {/* Duplicate name confirmation: overwrite or save under a different name */}
      {pendingDuplicateSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingDuplicateSave(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="同名パーツの保存確認"
            className={`w-full max-w-xs rounded-lg border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3 space-y-2 shadow-xl ${themeClasses.cardBg} ${themeClasses.border}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
              「{pendingDuplicateSave.name}」は既に存在します
            </p>
            <p className={`text-[11px] leading-relaxed ${themeClasses.textMuted}`}>
              上書きすると、既存のパーツの輪郭が置き換わります。別名で保存すると、末尾に番号を付けた新しいパーツとして保存します。
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  applySaveContoursAsPart(
                    pendingDuplicateSave.contours,
                    pendingDuplicateSave.name,
                    pendingDuplicateSave.category
                  );
                  setPendingDuplicateSave(null);
                }}
                className="px-3 py-1.5 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer"
              >
                上書き保存する
              </button>
              <button
                type="button"
                onClick={() => {
                  const uniqueName = makeUniquePartName(
                    pendingDuplicateSave.name,
                    customParts.map((p) => p.name)
                  );
                  applySaveContoursAsPart(
                    pendingDuplicateSave.contours,
                    uniqueName,
                    pendingDuplicateSave.category
                  );
                  setPendingDuplicateSave(null);
                }}
                className={`px-3 py-1.5 rounded text-[11px] font-bold border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                別名で保存する
              </button>
              <button
                type="button"
                onClick={() => setPendingDuplicateSave(null)}
                className={`px-3 py-1.5 rounded text-[11px] cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {batchModalTarget && (
        <BatchRadicalModal
          isOpen={true}
          onClose={() => setBatchModalTarget(null)}
          radicalName={batchModalTarget.radicalName}
          sourceContours={batchModalTarget.sourceContours}
          defaultKanjiList={batchModalTarget.defaultKanjiList}
          allGlyphs={allGlyphs}
          onBatchInsert={(contours, chars) => {
            onBatchInsertRadical?.(contours, chars);
            showNotice(`${chars.length}文字へ部首パーツを一括流し込みしました`);
          }}
          theme={theme}
          baselineY={baselineY}
          unitsPerEm={unitsPerEm}
        />
      )}
    </>
  );
};

export default RadicalsDrawer;
