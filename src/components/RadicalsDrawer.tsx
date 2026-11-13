import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Type, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { BundledFontsModal } from './BundledFontsModal';
import { BatchRadicalModal } from './radicalStudio/BatchRadicalModal';
import { KANJI_RADICALS } from '../data/kanjiRadicals';
import { KANGXI_214_RADICALS, KangxiRadicalFullEntry } from '../data/kangxi214Radicals';
import { PathContour, CustomPart, RadicalPlacement } from '../types';
import { generateId, transformContoursForPlacement } from '../utils/path';
import {
  extractRadicalFromFont,
  getOrExtractRadicalContours,
  KANGXI_RADICALS_CATALOG,
  RADICAL_FONT_OPTIONS,
  FontStyleOption,
} from '../utils/radicalExtractor';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import { loadCustomParts, saveCustomParts } from '../utils/customPartsStorage';
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
  onOpenRadicalStudio,
}) => {
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
  const [extractSmoothing] = useState<number>(2.0);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedContours, setExtractedContours] = useState<PathContour[]>([]);

  const handleSelectFontStyle = (opt: FontStyleOption) => {
    setSelectedFontStyle(opt);
    setExtractFontFamily(opt.fontFamily);
    setExtractWeight(opt.fontWeight);
  };

  // Kangxi Radicals Catalog State
  const [kangxiSearch, setKangxiSearch] = useState<string>('');
  const [kangxiStrokeFilter, setKangxiStrokeFilter] = useState<number | 'all'>('all');

  // Custom Parts
  const [customParts, setCustomParts] = useState<CustomPart[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PARTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: generateId(),
        name: 'さんずい (氵)',
        category: 'hen',
        description: '三水・水に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_sanzui')?.contours || [],
        createdAt: Date.now() - 5000,
      },
      {
        id: generateId(),
        name: 'きへん (木)',
        category: 'hen',
        description: '木偏・樹木に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_kihen')?.contours || [],
        createdAt: Date.now() - 4000,
      },
      {
        id: generateId(),
        name: 'にんべん (亻)',
        category: 'hen',
        description: '人偏・人間に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_ninben')?.contours || [],
        createdAt: Date.now() - 3000,
      },
      {
        id: generateId(),
        name: 'ごんべん (言)',
        category: 'hen',
        description: '言偏・言葉に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_gonben')?.contours || [],
        createdAt: Date.now() - 2000,
      },
      {
        id: generateId(),
        name: 'くさかんむり (艹)',
        category: 'kanmuri',
        description: '草冠・植物に関する冠',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_kusakanmuri')?.contours || [],
        createdAt: Date.now() - 1000,
      },
    ];
  });
  const [newPartName, setNewPartName] = useState<string>('');
  const [createOnlyFrame, setCreateOnlyFrame] = useState<boolean>(false);
  const [showSaveInput, setShowSaveInput] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const lastSavedDrawerJsonRef = useRef<string>('');

  // Reload custom parts from IndexedDB
  const reloadCustomParts = useCallback(async () => {
    try {
      const loaded = await loadCustomParts();
      if (Array.isArray(loaded) && loaded.length > 0) {
        setCustomParts(loaded);
      }
    } catch {
      // ignore
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

  // Sync custom parts to IndexedDB when customParts state updates
  useEffect(() => {
    if (!customParts || customParts.length === 0) return;
    const jsonStr = JSON.stringify(customParts.map((p) => p.id));
    if (jsonStr === lastSavedDrawerJsonRef.current) return;
    lastSavedDrawerJsonRef.current = jsonStr;
    saveCustomParts(customParts);
  }, [customParts]);

  // Perform font extraction
  const performExtraction = useCallback(
    async (charToExtract: string, regionToExtract: 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi') => {
      if (!charToExtract || charToExtract.trim().length === 0) return;
      setIsExtracting(true);
      try {
        const contours = await extractRadicalFromFont({
          char: charToExtract.trim()[0],
          fontFamily: extractFontFamily,
          fontWeight: extractWeight,
          region: regionToExtract,
          smoothing: extractSmoothing,
          fitMargin: 70,
        });
        setExtractedContours(contours);
      } catch (err) {
        console.error('Extraction failed:', err);
      } finally {
        setIsExtracting(false);
      }
    },
    [extractFontFamily, extractWeight, extractSmoothing]
  );

  // Trigger extraction when options change in extract tab
  useEffect(() => {
    if (isOpen && activeTab === 'extract') {
      performExtraction(extractChar, extractRegion);
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

    const positioned = transformContoursForPlacement(clonedContours, placement, defaultCategory);
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
        selectedFontStyle.fontWeight
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
          selectedFontStyle.fontWeight
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
    [selectedFontStyle]
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
            selectedFontStyle.fontWeight
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
    [selectedFontStyle]
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

  // Save contours as custom part
  const handleSaveContoursAsPart = (contoursToSave: PathContour[], defaultName: string) => {
    const name = newPartName.trim() || defaultName;
    if (!name) return;

    const existingIndex = customParts.findIndex((p) => p.name === name);
    let updated: CustomPart[];
    if (existingIndex >= 0) {
      updated = customParts.map((p, idx) =>
        idx === existingIndex
          ? { ...p, contours: JSON.parse(JSON.stringify(contoursToSave || [])) }
          : p
      );
    } else {
      const newPart: CustomPart = {
        id: generateId(),
        name,
        contours: JSON.parse(JSON.stringify(contoursToSave || [])),
        createdAt: Date.now(),
      };
      updated = [newPart, ...customParts];
    }

    setCustomParts(updated);
    try {
      localStorage.setItem(CUSTOM_PARTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewPartName('');
    setShowSaveInput(false);
    showNotice(`「${name}」を保存しました`);
  };

  // Create clean name-only frame without contours
  const handleCreateNameFrame = (frameName?: string) => {
    const name = (frameName || newPartName).trim() || '新規パーツ枠';
    const newPart: CustomPart = {
      id: generateId(),
      name,
      contours: [],
      createdAt: Date.now(),
    };
    const updated = [newPart, ...customParts];
    setCustomParts(updated);
    try {
      localStorage.setItem(CUSTOM_PARTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewPartName('');
    setShowSaveInput(false);
    showNotice(`名前枠「${name}」を作成しました`);
  };

  // Import all high-quality standard radicals into custom parts
  const handleImportAllPresetRadicals = async () => {
    const existingNames = new Set(customParts.map((p) => p.name));
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
            selectedFontStyle.fontWeight
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

    setCustomParts((prev) => [...toAdd, ...prev]);
    showNotice(`${toAdd.length} 件の定番部首を高精度ベクターでマイパーツに取り込みました`);
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
  const availableGlyphs = (Object.values(allGlyphs) as any[]).filter(
    (g) => g && g.contours && g.contours.length > 0
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Click-Outside Dismiss */}
      <div
        onClick={onClose}
        className="fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] inset-x-0 bottom-14 sm:bottom-0 bg-black/10 dark:bg-black/25 lg:hidden z-30"
      />

      <div
        className={`fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] bottom-14 sm:bottom-0 right-0 w-full sm:w-[320px] sm:max-w-xs border-l shadow-2xl z-40 flex flex-col select-none transition-colors animate-in slide-in-from-right duration-200 ${themeClasses.sidebarBg}`}
      >
        {/* Header */}
        <div
          className={`p-2.5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#18231c] border-[#25362b]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Type className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <div className="flex flex-col">
              <span className={`text-xs font-bold tracking-wide ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
                部首・フォントパーツ
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">
                ベクター輪郭の登録・文字への挿入
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const firstRad = KANJI_RADICALS.find((r) => r.id === 'rad_kihen') || KANJI_RADICALS[0];
                handleOpenBatchModalForPreset(firstRad);
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-[#1c2920] border-emerald-700 text-emerald-200 hover:bg-[#25392b]'
              }`}
              title="部首パーツを指定した複数の漢字へ一括自動配置・合成します"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>一括流し込み</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-stone-500 hover:bg-stone-100' : 'text-stone-400 hover:bg-[#202d24]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusNotice && (
          <div className="bg-emerald-800 text-white text-[11px] font-bold py-1.5 px-3 text-center border-b border-emerald-700 animate-in fade-in">
            {statusNotice}
          </div>
        )}

        {/* Smart Suggestion Bar: Automatic constituent radicals for selected character */}
        {suggestedRadicals.length > 0 && (
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-xs shrink-0 ${
              isLight
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-[#142319] border-[#223d2b] text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-[11px] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>「{selectedChar}」の推奨部首:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pl-2">
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
                          selectedFontStyle.fontWeight
                        ).then((contours) => {
                          if (contours && contours.length > 0) {
                            handleInsertWithPlacement(contours, rad.name, rad.category);
                          }
                        });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                      isLight
                        ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-xs'
                        : 'bg-[#1a2d21] border-[#2f4d39] text-emerald-100 hover:bg-[#253f2e] shadow-xs'
                    }`}
                    title={`「${rad.char}」(${rad.name}) を挿入`}
                  >
                    <span className="text-xs font-bold">{rad.displayChar || rad.char}</span>
                    {rad.altChars?.[0] && (
                      <span className="text-[9px] text-stone-500 font-normal">({rad.altChars[0]})</span>
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
          className={`flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-6 p-1 gap-1 border-b text-[10px] font-semibold shrink-0 ${
            isLight ? 'bg-[#edf5f0] border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
          }`}
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
              className={`py-1.5 px-2 sm:px-1 rounded text-center whitespace-nowrap transition-all shrink-0 sm:shrink cursor-pointer ${
                activeTab === tab.id
                  ? isLight
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-emerald-200'
                    : 'bg-[#1c2920] text-emerald-300 shadow-xs font-bold border border-[#2d4032]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-emerald-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Font Style Selector for Radicals */}
        <div
          className={`px-2.5 py-2 border-b space-y-1 shrink-0 ${
            isLight ? 'bg-[#f4f8f5] border-[#d8e6df]' : 'bg-[#141e17] border-[#25362b]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold flex items-center space-x-1">
              <Type className="w-3.5 h-3.5 text-emerald-600" />
              <span>部首書体スタイル (プレビュー＆抽出):</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>OFL 1.1 ライセンス一覧</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {RADICAL_FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFontStyle(opt)}
                className={`py-1.5 px-2 rounded border text-center transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  selectedFontStyle.id === opt.id
                    ? isLight
                      ? 'bg-emerald-800 border-emerald-900 text-white font-bold shadow-xs'
                      : 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-xs'
                    : isLight
                    ? 'bg-white border-stone-300 text-stone-700 hover:bg-emerald-50'
                    : 'bg-[#1c2920] border-[#2d4032] text-stone-300 hover:bg-[#25362b]'
                }`}
                title={`${opt.label} (${opt.subLabel})`}
              >
                <span style={{ fontFamily: opt.fontFamily, fontWeight: opt.fontWeight }}>
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
            isExtracting={isExtracting}
            extractedContours={extractedContours}
            placement={placement}
            categoryFilter={categoryFilter}
            setSelectedFontStyle={setSelectedFontStyle}
            onPerformExtraction={performExtraction}
            onInsertWithPlacement={handleInsertWithPlacement}
            onSaveContoursAsPart={handleSaveContoursAsPart}
          />
        )}

        {/* TAB 3: KANGXI 214 RADICALS CATALOG */}
        {activeTab === 'kangxi' && (
          <KangxiRadicalsTab
            isLight={isLight}
            kangxiSearch={kangxiSearch}
            setKangxiSearch={setKangxiSearch}
            kangxiStrokeFilter={kangxiStrokeFilter}
            setKangxiStrokeFilter={setKangxiStrokeFilter}
            selectedFontStyle={selectedFontStyle}
            extractingKangxiNum={extractingKangxiNum}
            setExtractingKangxiNum={setExtractingKangxiNum}
            onInsertWithPlacement={handleInsertWithPlacement}
            onBatchInsertKangxi={handleOpenBatchModalForKangxi}
            setExtractChar={setExtractChar}
            setActiveTab={setActiveTab}
            showNotice={showNotice}
          />
        )}

        {/* TAB 4: GEOMETRIC SHAPES */}
        {activeTab === 'shapes' && (
          <ShapePresetsTab
            isLight={isLight}
            shapeCategoryFilter={shapeCategoryFilter}
            setShapeCategoryFilter={setShapeCategoryFilter}
            onInsertWithPlacement={handleInsertWithPlacement}
          />
        )}

        {/* TAB 5: SYNTHESIZE FROM EXISTING GLYPHS */}
        {activeTab === 'from_glyph' && (
          <FromGlyphTab
            isLight={isLight}
            availableGlyphs={availableGlyphs}
            onInsertWithPlacement={handleInsertWithPlacement}
          />
        )}

        {/* TAB 6: CUSTOM PARTS */}
        {activeTab === 'custom' && (
          <CustomPartsTab
            isLight={isLight}
            showSaveInput={showSaveInput}
            setShowSaveInput={setShowSaveInput}
            createOnlyFrame={createOnlyFrame}
            setCreateOnlyFrame={setCreateOnlyFrame}
            newPartName={newPartName}
            setNewPartName={setNewPartName}
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
      </div>

      <BundledFontsModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        theme={theme}
      />

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
        />
      )}
    </>
  );
};

export default RadicalsDrawer;
