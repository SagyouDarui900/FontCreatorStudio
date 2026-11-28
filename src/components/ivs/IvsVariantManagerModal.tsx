import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ArrowRight,
  Maximize2,
  Minimize2,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  IVS_PRESETS,
  VARIATION_SELECTOR_OPTIONS,
  formatVariationSelectorLabel,
} from '../../data/ivsPresets';
import { getThemeClasses, ThemeMode } from '../../utils/theme';
import {
  FontProject,
  GlyphData,
  IvsGlyphVariant,
  formatIvsVariantKey,
} from '../../types';
import { useIsTopModal, useDialogFocusTrap } from '../modals/ModalStackFrame';
import { ModalTabs } from '../modals/ModalTabs';
import { ModalFooter } from '../modals/ModalFooter';
import { contoursToSvgPath } from '../gridFitting/gridFittingEngine';

export interface IvsVariantManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnicode: number;
  selectedChar: string;
  glyphs: Record<number, GlyphData>;
  project?: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  activeIvsKey?: string | null;
  onSelectIvsVariant?: (ivsKey: string | null) => void;
  onSelectGlyph: (unicode: number) => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeMode;
}

function hasGlyphArtwork(glyph?: GlyphData): boolean {
  if (!glyph) return false;
  if (glyph.contours && glyph.contours.length > 0) return true;
  if (glyph.pixelData?.data && glyph.pixelData.data.some((d) => d !== 0)) return true;
  return false;
}

function cloneGlyphData(glyph: GlyphData, fallbackName: string, upm: number): GlyphData {
  return {
    unicode: glyph.unicode,
    char: glyph.char,
    name: fallbackName,
    advanceWidth: glyph.advanceWidth ?? upm,
    lsb: glyph.lsb ?? Math.round(50 * (upm / 1000)),
    contours: JSON.parse(JSON.stringify(glyph.contours || [])),
    ...(glyph.pixelData
      ? {
          pixelData: {
            ...glyph.pixelData,
            data: [...glyph.pixelData.data],
          },
        }
      : {}),
    modified: true,
  };
}

function parseBaseCharOrCode(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hexMatch = /^(?:U\+|0x)?([0-9a-fA-F]{4,6})$/i.exec(trimmed);
  if (hexMatch && ([...trimmed].length > 1 || trimmed.startsWith('U+') || trimmed.startsWith('0x'))) {
    const parsed = parseInt(hexMatch[1], 16);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 0x10ffff) {
      return parsed;
    }
    return null;
  }
  const code = trimmed.codePointAt(0);
  return code && code > 0 && code <= 0x10ffff ? code : null;
}

function GlyphMiniPreview({
  glyph,
  upm,
  label,
  cardClass,
  mutedClass,
}: {
  glyph?: GlyphData;
  upm: number;
  label: string;
  cardClass: string;
  mutedClass: string;
}) {
  const svgPath = useMemo(() => {
    if (!glyph?.contours || glyph.contours.length === 0) return '';
    return contoursToSvgPath(glyph.contours);
  }, [glyph]);

  const pixelCells = useMemo(() => {
    if (svgPath || !glyph?.pixelData?.data || !glyph.pixelData.width || !glyph.pixelData.height) {
      return null;
    }
    const { width, height, data } = glyph.pixelData;
    const cellW = upm / width;
    const cellH = upm / height;
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[y * width + x]) {
          rects.push({ x: x * cellW, y: y * cellH, w: cellW, h: cellH });
        }
      }
    }
    return rects;
  }, [glyph, svgPath, upm]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-14 h-14 rounded-lg border flex items-center justify-center overflow-hidden ${cardClass}`}
      >
        {svgPath ? (
          <svg
            viewBox={`0 0 ${upm} ${upm}`}
            className="w-12 h-12"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={svgPath} fillRule="nonzero" />
          </svg>
        ) : pixelCells && pixelCells.length > 0 ? (
          <svg
            viewBox={`0 0 ${upm} ${upm}`}
            className="w-12 h-12"
            fill="currentColor"
            aria-hidden="true"
          >
            {pixelCells.map((r, i) => (
              <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
            ))}
          </svg>
        ) : (
          <span className={`text-[10px] ${mutedClass}`}>未作図</span>
        )}
      </div>
      <span className={`text-[10px] font-medium ${mutedClass}`}>{label}</span>
    </div>
  );
}

export const IvsVariantManagerModal: React.FC<IvsVariantManagerModalProps> = ({
  isOpen,
  onClose,
  selectedUnicode,
  selectedChar,
  glyphs,
  project,
  setProject,
  activeIvsKey = null,
  onSelectIvsVariant,
  onSelectGlyph,
  onShowToast,
  theme,
}) => {
  const themeClasses = getThemeClasses(theme);
  const upm = project?.metadata?.unitsPerEm || 1000;
  const ivsMap = project?.ivsVariants || {};
  const registeredVariants = useMemo(
    () =>
      Object.values(ivsMap).sort((a, b) =>
        a.baseUnicode !== b.baseUnicode
          ? a.baseUnicode - b.baseUnicode
          : a.selectorCode - b.selectorCode
      ),
    [ivsMap]
  );

  const [activeTab, setActiveTab] = useState<'registered' | 'presets' | 'about'>(() =>
    Object.keys(ivsMap).length > 0 ? 'registered' : 'presets'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customBaseInput, setCustomBaseInput] = useState<string>(selectedChar || '');
  const [customSelectorCode, setCustomSelectorCode] = useState<number>(0xe0101);
  const [customNote, setCustomNote] = useState<string>('');
  const [copyFromBaseOnCreate, setCopyFromBaseOnCreate] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmOverwriteKey, setConfirmOverwriteKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const isTopModal = useIsTopModal();

  useEffect(() => {
    if (isOpen) {
      setCustomBaseInput(selectedChar || '');
      setConfirmOverwriteKey(null);
      setConfirmDeleteKey(null);
    }
  }, [isOpen, selectedChar]);

  useDialogFocusTrap(modalRef, isOpen && isTopModal, () => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      onClose();
    }
  });

  // F toggles fullscreen outside form fields
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal]);

  const registerVariant = (
    baseUnicode: number,
    selectorCode: number,
    options?: {
      collection?: string;
      note?: string;
      copyBase?: boolean;
      openAfterRegister?: boolean;
    }
  ) => {
    if (!setProject) {
      onSelectGlyph(baseUnicode);
      onClose();
      return;
    }

    const key = formatIvsVariantKey(baseUnicode, selectorCode);
    const existing = ivsMap[key];
    if (existing) {
      if (options?.openAfterRegister && onSelectIvsVariant) {
        onSelectIvsVariant(key);
        onClose();
        onShowToast('登録済みのIVS異体字をエディタで開きました', 'info');
      } else {
        setActiveTab('registered');
        onShowToast('この組み合わせのIVS異体字はすでに登録されています', 'info');
      }
      return;
    }

    const baseHex = baseUnicode.toString(16).toUpperCase().padStart(4, '0');
    const selHex = selectorCode.toString(16).toUpperCase().padStart(4, '0');
    let baseChar = '';
    try {
      baseChar = String.fromCodePoint(baseUnicode);
    } catch {
      baseChar = '';
    }
    const baseGlyph = glyphs[baseUnicode];
    const variantName = `uni${baseHex}.u${selHex}`;
    const shouldCopy = options?.copyBase ?? copyFromBaseOnCreate;

    const variantGlyph: GlyphData =
      shouldCopy && baseGlyph
        ? cloneGlyphData(baseGlyph, variantName, upm)
        : {
            unicode: baseUnicode,
            char: baseChar,
            name: variantName,
            advanceWidth: baseGlyph?.advanceWidth ?? upm,
            lsb: baseGlyph?.lsb ?? Math.round(50 * (upm / 1000)),
            contours: [],
            modified: false,
          };

    const newVariant: IvsGlyphVariant = {
      id: key,
      baseUnicode,
      selectorCode,
      collection:
        options?.collection ||
        (selectorCode >= 0xe0100 && selectorCode <= 0xe01ef ? 'Adobe-Japan1' : 'SVS'),
      ...(options?.note ? { note: options.note } : {}),
      glyph: variantGlyph,
      updatedAt: Date.now(),
    };

    setProject((prev) => ({
      ...prev,
      ivsVariants: {
        ...(prev.ivsVariants || {}),
        [key]: newVariant,
      },
      updatedAt: Date.now(),
    }));

    if (options?.openAfterRegister && onSelectIvsVariant) {
      // Allow state update to flush on next microtask so ProjectContext finds the variant
      setTimeout(() => {
        onSelectIvsVariant(key);
      }, 0);
      onClose();
      onShowToast(
        `IVS異体字「${baseChar || `U+${baseHex}`}」(+U+${selHex}) を登録してエディタを開きました`,
        'success'
      );
    } else {
      setActiveTab('registered');
      onShowToast(
        `IVS異体字「${baseChar || `U+${baseHex}`}」(+U+${selHex}) を登録しました`,
        'success'
      );
    }
  };

  const handleRegisterCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const baseUnicode = parseBaseCharOrCode(customBaseInput);
    if (!baseUnicode) {
      onShowToast('基底文字を1文字、または U+XXXX 形式で入力してください', 'warning');
      return;
    }
    registerVariant(baseUnicode, customSelectorCode, {
      note: customNote.trim() || undefined,
      copyBase: copyFromBaseOnCreate,
    });
    setCustomNote('');
  };

  const handleSyncFromBase = (variant: IvsGlyphVariant) => {
    if (!setProject) return;
    const baseGlyph = glyphs[variant.baseUnicode];
    if (!baseGlyph || !hasGlyphArtwork(baseGlyph)) {
      onShowToast('基底文字に作図データがありません', 'warning');
      return;
    }
    if (hasGlyphArtwork(variant.glyph) && confirmOverwriteKey !== variant.id) {
      setConfirmOverwriteKey(variant.id);
      return;
    }
    setConfirmOverwriteKey(null);
    const cloned = cloneGlyphData(baseGlyph, variant.glyph.name, upm);
    setProject((prev) => {
      const current = prev.ivsVariants?.[variant.id];
      if (!current) return prev;
      return {
        ...prev,
        ivsVariants: {
          ...prev.ivsVariants,
          [variant.id]: {
            ...current,
            glyph: cloned,
            updatedAt: Date.now(),
          },
        },
        updatedAt: Date.now(),
      };
    });
    onShowToast('基底文字の輪郭を異体字へ複製しました', 'success');
  };

  const handleDeleteVariant = (ivsKey: string) => {
    if (!setProject) return;
    if (confirmDeleteKey !== ivsKey) {
      setConfirmDeleteKey(ivsKey);
      return;
    }
    setConfirmDeleteKey(null);
    if (activeIvsKey === ivsKey && onSelectIvsVariant) {
      onSelectIvsVariant(null);
    }
    setProject((prev) => {
      if (!prev.ivsVariants || !(ivsKey in prev.ivsVariants)) return prev;
      const next = { ...prev.ivsVariants };
      delete next[ivsKey];
      return {
        ...prev,
        ivsVariants: next,
        updatedAt: Date.now(),
      };
    });
    onShowToast('IVS異体字を削除しました', 'info');
  };

  const handleCopyIvsString = async (variant: IvsGlyphVariant) => {
    try {
      const seq =
        String.fromCodePoint(variant.baseUnicode) + String.fromCodePoint(variant.selectorCode);
      await navigator.clipboard.writeText(seq);
      setCopiedKey(variant.id);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === variant.id ? null : prev));
      }, 1800);
      onShowToast(
        `IVS文字列（U+${variant.baseUnicode.toString(16).toUpperCase()} + U+${variant.selectorCode.toString(16).toUpperCase()}）をコピーしました`,
        'success'
      );
    } catch {
      onShowToast('クリップボードへのコピーに失敗しました', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col select-none'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="IVS 異体字セレクタ管理"
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-5xl border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 sm:pt-2.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-base font-bold flex items-center gap-2 truncate ${themeClasses.textPrimary}`}>
                IVS 異体字セレクタ（Ideographic Variation Sequence）管理
              </h2>
              <p className={`hidden sm:block text-xs ${themeClasses.textMuted}`}>
                cmap format 14 テーブルを書き出し、1つのコードポイントに対して規格や伝統字形を切り替える異体字を作図・管理します
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
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
                  <span>通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 max-sm:min-w-[40px] max-sm:min-h-[40px] flex items-center justify-center rounded-xl border transition-colors shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <ModalTabs
          tabs={[
            {
              id: 'registered',
              label: '登録済みIVS異体字',
              shortLabel: '登録済み',
              count: registeredVariants.length,
            },
            {
              id: 'presets',
              label: '代表的なIVS漢字プリセット',
              shortLabel: 'プリセット',
              count: IVS_PRESETS.length,
            },
            {
              id: 'about',
              label: 'IVS規格とフォント出力仕様について',
              shortLabel: 'IVS規格',
            },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="IVS管理のタブ"
        />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          {activeTab === 'registered' ? (
            <div className="space-y-4">
              {setProject && (
                <form
                  onSubmit={handleRegisterCustom}
                  className={`p-3.5 rounded-xl border space-y-3 ${themeClasses.cardBg} ${themeClasses.border}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                      新規 IVS 異体字を登録
                    </h3>
                    <span className={`text-[11px] ${themeClasses.textMuted}`}>
                      登録した異体字はメインキャンバスで作図でき、OTF書き出し時に cmap format 14 へ組み込まれます
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-3">
                      <label className={`block text-[11px] font-semibold mb-1 ${themeClasses.textMuted}`}>
                        基底文字 (文字 / U+XXXX)
                      </label>
                      <input
                        type="text"
                        value={customBaseInput}
                        onChange={(e) => setCustomBaseInput(e.target.value)}
                        placeholder="例: 辻 または U+8FBB"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className={`block text-[11px] font-semibold mb-1 ${themeClasses.textMuted}`}>
                        異体字セレクタ (Variation Selector)
                      </label>
                      <select
                        value={customSelectorCode}
                        onChange={(e) => setCustomSelectorCode(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                      >
                        {VARIATION_SELECTOR_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={`block text-[11px] font-semibold mb-1 ${themeClasses.textMuted}`}>
                        メモ（字形差の特徴など）
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="例: 2点しんにょう"
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${themeClasses.accentBtn}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>追加登録</span>
                      </button>
                    </div>
                  </div>

                  <label className={`inline-flex items-center gap-2 text-xs cursor-pointer ${themeClasses.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={copyFromBaseOnCreate}
                      onChange={(e) => setCopyFromBaseOnCreate(e.target.checked)}
                      className="rounded border-stone-400"
                    />
                    <span>基底文字の輪郭・メトリクスを複製して開始する</span>
                  </label>
                </form>
              )}

              {registeredVariants.length === 0 ? (
                <div className={`p-6 rounded-xl border text-center space-y-2 ${themeClasses.cardBg} ${themeClasses.border}`}>
                  <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                    登録された IVS 異体字はまだありません
                  </p>
                  <p className={`text-xs ${themeClasses.textMuted}`}>
                    上のフォームから任意の漢字＋セレクタを追加するか、「プリセット」タブから代表的な漢字異体字を登録してください。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {registeredVariants.map((variant) => {
                    const baseHex = variant.baseUnicode.toString(16).toUpperCase().padStart(4, '0');
                    const selHex = variant.selectorCode.toString(16).toUpperCase().padStart(4, '0');
                    let baseChar = '';
                    try {
                      baseChar = String.fromCodePoint(variant.baseUnicode);
                    } catch {}
                    const baseGlyph = glyphs[variant.baseUnicode];
                    const isActive = activeIvsKey === variant.id;
                    const variantDrawn = hasGlyphArtwork(variant.glyph);
                    const isConfirmingOverwrite = confirmOverwriteKey === variant.id;
                    const isConfirmingDelete = confirmDeleteKey === variant.id;

                    return (
                      <div
                        key={variant.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${themeClasses.cardBg} ${
                          isActive
                            ? `${themeClasses.accentBorder} ring-1 ring-emerald-500/30`
                            : themeClasses.border
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-2xl font-serif font-bold leading-none">
                                {baseChar || `U+${baseHex}`}
                              </span>
                              <span className={`text-xs font-mono font-bold ${themeClasses.accentText}`}>
                                U+{baseHex} + U+{selHex}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${themeClasses.accentBadge}`}>
                                {formatVariationSelectorLabel(variant.selectorCode)}
                              </span>
                              {isActive && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${themeClasses.accentBtn}`}>
                                  編集中
                                </span>
                              )}
                            </div>
                            {variant.note && (
                              <p className={`text-xs mt-1 ${themeClasses.textPrimary}`}>{variant.note}</p>
                            )}
                            <p className={`text-[11px] font-mono mt-1 ${themeClasses.textMuted}`}>
                              {variant.glyph.contours.length > 0
                                ? `輪郭 ${variant.glyph.contours.length} 本`
                                : variantDrawn
                                ? 'ピクセルデータあり'
                                : '未作図（空）'}
                              {' / '}幅 {variant.glyph.advanceWidth}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <GlyphMiniPreview
                              glyph={baseGlyph}
                              upm={upm}
                              label="基底"
                              cardClass={`${themeClasses.toolbarBg} ${themeClasses.border}`}
                              mutedClass={themeClasses.textMuted}
                            />
                            <GlyphMiniPreview
                              glyph={variant.glyph}
                              upm={upm}
                              label="異体字"
                              cardClass={`${themeClasses.toolbarBg} ${variantDrawn ? themeClasses.accentBorder : themeClasses.border}`}
                              mutedClass={themeClasses.textMuted}
                            />
                          </div>
                        </div>

                        <div className={`pt-2 border-t flex items-center justify-between gap-1.5 flex-wrap ${themeClasses.border}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => void handleCopyIvsString(variant)}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                              title="基底文字＋セレクタの実際のUnicode文字列をコピー"
                            >
                              {copiedKey === variant.id ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>IVS文字コピー</span>
                            </button>
                            {setProject && (
                              <button
                                type="button"
                                onClick={() => handleSyncFromBase(variant)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                                title="基底文字の輪郭をこの異体字へコピー"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{isConfirmingOverwrite ? 'もう一度押して上書き' : '基底を複製'}</span>
                              </button>
                            )}
                            {setProject && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVariant(variant.id)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                  isConfirmingDelete
                                    ? 'bg-red-600 border-red-500 text-white hover:bg-red-500'
                                    : `${themeClasses.toolbarBg} ${themeClasses.border} text-red-500 hover:bg-red-500/10`
                                }`}
                                title="このIVS異体字を削除"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isConfirmingDelete ? 'もう一度押して削除' : '削除'}</span>
                              </button>
                            )}
                          </div>

                          {onSelectIvsVariant && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectIvsVariant(variant.id);
                                onClose();
                                onShowToast(
                                  `IVS異体字「${baseChar || `U+${baseHex}`}」(+U+${selHex}) の編集を開始しました`,
                                  'success'
                                );
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${themeClasses.accentBtn}`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>キャンバスで編集</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'presets' ? (
            <div className="space-y-3">
              <p className={`text-xs ${themeClasses.textMuted}`}>
                人名や自治体名などで字形差が問題となる主要な漢字（Adobe-Japan1 / Moji_Joho 準拠の IVS セレクタ）です。各異体字をプロジェクトへ登録して直接作図できます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {IVS_PRESETS.map((item) => {
                  const isCurrent = item.baseUnicode === selectedUnicode || item.baseChar === selectedChar;
                  const glyph = glyphs[item.baseUnicode];
                  const hasArtwork = hasGlyphArtwork(glyph);

                  return (
                    <div
                      key={`${item.baseUnicode}_${item.baseChar}`}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${themeClasses.cardBg} ${
                        isCurrent
                          ? `${themeClasses.accentBorder} ring-1 ring-emerald-500/30`
                          : themeClasses.border
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-serif font-bold leading-none">{item.baseChar}</span>
                            <div>
                              <span className="font-bold text-xs block">{item.name}</span>
                              <span className={`font-mono text-[10px] ${themeClasses.textMuted}`}>
                                U+{item.baseUnicode.toString(16).toUpperCase().padStart(4, '0')}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${themeClasses.accentBadge}`}>
                            {item.category}
                          </span>
                        </div>

                        {/* Variants breakdown */}
                        <div className={`space-y-1.5 mt-3 pt-2 border-t ${themeClasses.border}`}>
                          {item.variants.map((v) => {
                            const ivsKey = formatIvsVariantKey(item.baseUnicode, v.selectorCode);
                            const registered = ivsMap[ivsKey];
                            return (
                              <div key={v.selectorCode} className={`text-xs p-2 rounded-lg border ${themeClasses.toolbarBg} ${themeClasses.border}`}>
                                <div className="flex items-center justify-between font-bold text-[11px] mb-0.5 gap-1">
                                  <span className={themeClasses.accentText}>{v.selectorName}</span>
                                  <span className="font-mono text-[10px] opacity-60 shrink-0">
                                    U+{v.selectorCode.toString(16).toUpperCase()}
                                  </span>
                                </div>
                                <p className={`text-[11px] ${themeClasses.textMuted}`}>{v.description}</p>
                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-bold ${themeClasses.accentText}`}>
                                    特徴: {v.distinction}
                                  </span>
                                  {setProject && onSelectIvsVariant && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        registerVariant(item.baseUnicode, v.selectorCode, {
                                          collection: v.collection,
                                          note: v.distinction,
                                          copyBase: true,
                                          openAfterRegister: true,
                                        })
                                      }
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors shrink-0 ${
                                        registered ? themeClasses.accentBadge : themeClasses.accentBtn
                                      }`}
                                    >
                                      {registered ? '異体字を編集' : '登録して編集'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 flex items-center justify-between">
                        <span className={`text-[10px] font-mono ${themeClasses.textMuted}`}>
                          {hasArtwork ? '基底文字: 作図データあり' : '基底文字: 未作成'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectGlyph(item.baseUnicode);
                            onClose();
                            onShowToast(`「${item.baseChar}」の基底文字エディタを開きました`, 'success');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${themeClasses.accentBtn}`}
                        >
                          <span>基底文字を開く</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`space-y-4 text-xs leading-relaxed ${themeClasses.textPrimary}`}>
              <h3 className={`text-xs font-bold ${themeClasses.textPrimary}`}>IVS（Ideographic Variation Sequence）とは？</h3>
              <p>
                従来のUnicodeでは「辻」や「葛」といった漢字は1つのコードポイント（例: 辻=U+8FBB）しか割り当てられていませんでしたが、
                人名・地名における「一点しんにょう」と「二点しんにょう」のように、微細だが区別が必要な字形差を表現するために制定された仕組みです。
              </p>
              <p>
                親文字（基底漢字）の直後に異体字セレクタ（漢字IVS: <code>U+E0100〜U+E01EF</code> / 標準SVS: <code>U+FE00〜U+FE0F</code>）を付与することで、
                同一コードポイントでありながら異なるグリフ（字形）を切り替えて表示できます。
              </p>

              <h3 className={`text-xs font-bold mt-4 ${themeClasses.textPrimary}`}>OpenType 出力仕様（cmap format 14）</h3>
              <p>
                登録・作図した IVS 異体字は、OTF 書き出し時に独立した非符号化グリフとしてフォントへ格納され、
                OpenType <code>cmap format 14 (Platform 0 / Encoding 5: Unicode Variation Sequences)</code> の <code>NonDefaultUVS</code> テーブルへマッピングされます。
                書き出した OTF を再びアプリへ読み込んだ際も、cmap format 14 の定義が復元されます。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <ModalFooter
          primaryLabel="閉じる"
          onPrimary={onClose}
          theme={theme}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};
