import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontProject, GlyphData } from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { normalizeGlyph, getContoursBoundingBox, contoursToSvgPath, normalizeGlyphContoursWinding } from '../utils/path';
import { resolveBaselineY } from '../utils/font/constants';
import {
  AlignHorizontal,
  AlignVertical,
  SizePreset,
  TargetScope,
  BatchPreviewSection,
  BatchOptionsSection,
} from './batch';
import { useIsTopModal } from './modals/ModalStackFrame';

export type { TargetScope } from './batch';

interface BatchNormalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const BatchNormalizeModal: React.FC<BatchNormalizeModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  selectedUnicode,
  theme,
  onShowToast,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  // Normalization baseline follows the project ascender so the aligned
  // position matches the exported glyph position (compile uses ascender).
  const baselineY = resolveBaselineY(project.metadata?.ascender, project.metadata?.unitsPerEm);

  const [scope, setScope] = useState<TargetScope>('all');
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [targetWidth, setTargetWidth] = useState<number>(820);
  const [targetHeight, setTargetHeight] = useState<number>(820);
  const [alignH, setAlignH] = useState<AlignHorizontal>('center');
  const [alignV, setAlignV] = useState<AlignVertical>('center');
  const [unifyAdvance, setUnifyAdvance] = useState<boolean>(true);
  const [advanceWidth, setAdvanceWidth] = useState<number>(1000);
  const [optimizePoints, setOptimizePoints] = useState<boolean>(true);
  const [weightDelta, setWeightDelta] = useState<number>(0);
  const [normalizeWinding, setNormalizeWinding] = useState<boolean>(true);

  // Allow previewing specific glyph
  const [previewUnicode, setPreviewUnicode] = useState<number>(selectedUnicode);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Synchronize preview glyph when modal opens or selectedUnicode changes
  useEffect(() => {
    if (isOpen) {
      setPreviewUnicode(selectedUnicode);
    }
  }, [isOpen, selectedUnicode]);

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

  // Apply preset values
  const handlePresetChange = (preset: SizePreset) => {
    setSizePreset(preset);
    if (preset === 'standard') {
      setTargetWidth(820);
      setTargetHeight(820);
      setAlignH('center');
      setAlignV('center');
      setUnifyAdvance(true);
      setAdvanceWidth(1000);
    } else if (preset === 'large') {
      setTargetWidth(890);
      setTargetHeight(890);
      setAlignH('center');
      setAlignV('center');
      setUnifyAdvance(true);
      setAdvanceWidth(1000);
    } else if (preset === 'kana') {
      setTargetWidth(780);
      setTargetHeight(780);
      setAlignH('center');
      setAlignV('center');
      setUnifyAdvance(true);
      setAdvanceWidth(1000);
    } else if (preset === 'compact') {
      setTargetWidth(740);
      setTargetHeight(740);
      setAlignH('center');
      setAlignV('center');
      setUnifyAdvance(true);
      setAdvanceWidth(1000);
    }
  };

  // Filter glyphs matching scope
  const targetGlyphs = useMemo(() => {
    const list: GlyphData[] = [];
    const all = Object.values(project.glyphs) as GlyphData[];

    for (const g of all) {
      if (!g || !g.contours || g.contours.length === 0) continue;
      const u = g.unicode;

      if (scope === 'all') {
        list.push(g);
      } else if (scope === 'current') {
        if (u === selectedUnicode) list.push(g);
      } else if (scope === 'hiragana') {
        if (u >= 0x3041 && u <= 0x3096) list.push(g);
      } else if (scope === 'katakana') {
        if (u >= 0x30a1 && u <= 0x30fa) list.push(g);
      } else if (scope === 'kanji') {
        if ((u >= 0x4e00 && u <= 0x9fff) || (u >= 0x3400 && u <= 0x4dbf)) list.push(g);
      } else if (scope === 'latin') {
        if (u >= 0x0020 && u <= 0x007e) list.push(g);
      }
    }
    return list;
  }, [project.glyphs, scope, selectedUnicode]);

  // Preview sample glyph
  const previewGlyph = useMemo(() => {
    if (project.glyphs[previewUnicode]?.contours?.length) {
      return project.glyphs[previewUnicode];
    }
    if (targetGlyphs.length === 0) {
      return project.glyphs[selectedUnicode] || (Object.values(project.glyphs) as GlyphData[])[0] || null;
    }
    const currentInTarget = targetGlyphs.find((g) => g.unicode === previewUnicode);
    return currentInTarget || targetGlyphs[0];
  }, [targetGlyphs, project.glyphs, previewUnicode, selectedUnicode]);

  // Normalized preview contours
  const normalizedPreviewContours = useMemo(() => {
    if (!previewGlyph || !previewGlyph.contours) return [];
    const res = normalizeGlyph(previewGlyph.contours, {
      mode: 'fitBox',
      targetWidth,
      targetHeight,
      alignHorizontal: alignH,
      alignVertical: alignV,
      targetCenterX: 500,
      targetCenterY: 500,
      targetBaselineY: baselineY,
      unifyAdvanceWidth: unifyAdvance,
      targetAdvanceWidth: advanceWidth,
      optimizePoints,
      weightDelta,
      normalizeWinding,
    });
    return res.contours;
  }, [
    previewGlyph,
    baselineY,
    targetWidth,
    targetHeight,
    alignH,
    alignV,
    unifyAdvance,
    advanceWidth,
    optimizePoints,
    weightDelta,
    normalizeWinding,
  ]);

  if (!isOpen) return null;

  const handleApplyBatch = () => {
    if (targetGlyphs.length === 0) {
      if (onShowToast) {
        onShowToast('処理対象の文字がありません。先に文字を作成してください。', 'warning');
      }
      return;
    }

    const updatedGlyphs = { ...project.glyphs };
    let count = 0;

    for (const g of targetGlyphs) {
      if (!g.contours || g.contours.length === 0) continue;

      const normResult = normalizeGlyph(g.contours, {
        mode: 'fitBox',
        targetWidth,
        targetHeight,
        alignHorizontal: alignH,
        alignVertical: alignV,
        targetCenterX: 500,
        targetCenterY: 500,
        targetBaselineY: baselineY,
        unifyAdvanceWidth: unifyAdvance,
        targetAdvanceWidth: advanceWidth,
        optimizePoints,
        weightDelta,
        normalizeWinding,
      });

      updatedGlyphs[g.unicode] = {
        ...g,
        contours: normResult.contours,
        advanceWidth: normResult.advanceWidth ?? g.advanceWidth,
        lsb: normResult.lsb ?? g.lsb,
        modified: true,
      };
      count++;
    }

    setProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    if (onShowToast) {
      onShowToast(`${count}文字のサイズ・太さ・品質を一括正規化しました`, 'success');
    }
    onClose();
  };

  const origSvg = previewGlyph ? contoursToSvgPath(normalizeGlyphContoursWinding(previewGlyph.contours || [])) : '';
  const normSvg = contoursToSvgPath(normalizeGlyphContoursWinding(normalizedPreviewContours));
  const origBbox = previewGlyph ? getContoursBoundingBox(previewGlyph.contours || []) : { width: 0, height: 0 };
  const normBbox = getContoursBoundingBox(normalizedPreviewContours);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="フォントサイズ・太さ・品質一括調整"
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
            : `w-full h-[100dvh] sm:h-auto sm:max-w-5xl xl:max-w-6xl border-0 sm:border rounded-none sm:rounded-2xl sm:max-h-[92vh] ${themeClasses.border}`
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 sm:pt-2.5 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 border ${themeClasses.accentBadge}`}>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
                <span className="truncate">サイズ・太さ・品質の一括統一</span>
                {isFullscreen && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${themeClasses.accentBtn}`}>
                    全画面
                  </span>
                )}
              </h2>
              <p className={`text-[11px] truncate ${themeClasses.textMuted}`}>
                全文字の字面枠・線の太さ・送り幅・ベジェ頂点数を均一に自動調整
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
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
              className={`p-1.5 rounded-lg max-sm:min-w-[40px] max-sm:min-h-[40px] flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.border} ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
              aria-label="閉じる"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content: Balanced 2-Column CAD Studio Layout on lg+ */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left: Dedicated Visual Stage (5 cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-2.5">
              <BatchPreviewSection
                isLight={isLight}
                themeClasses={themeClasses}
                project={project}
                previewGlyph={previewGlyph}
                origSvg={origSvg}
                normSvg={normSvg}
                origBbox={origBbox}
                normBbox={normBbox}
                targetWidth={targetWidth}
                targetHeight={targetHeight}
                scope={scope}
                setScope={setScope}
                targetGlyphsCount={targetGlyphs.length}
                targetGlyphs={targetGlyphs}
                onSelectPreviewGlyph={(g) => setPreviewUnicode(g.unicode)}
              />
            </div>

            {/* Right: Normalization Controls & Sizing (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <BatchOptionsSection
                isLight={isLight}
                themeClasses={themeClasses}
                scope={scope}
                setScope={setScope}
                targetGlyphsCount={targetGlyphs.length}
                previewChar={previewGlyph?.char || 'あ'}
                sizePreset={sizePreset}
                setSizePreset={setSizePreset}
                handlePresetChange={handlePresetChange}
                targetWidth={targetWidth}
                setTargetWidth={setTargetWidth}
                targetHeight={targetHeight}
                setTargetHeight={setTargetHeight}
                weightDelta={weightDelta}
                setWeightDelta={setWeightDelta}
                alignH={alignH}
                setAlignH={setAlignH}
                alignV={alignV}
                setAlignV={setAlignV}
                unifyAdvance={unifyAdvance}
                setUnifyAdvance={setUnifyAdvance}
                advanceWidth={advanceWidth}
                setAdvanceWidth={setAdvanceWidth}
                optimizePoints={optimizePoints}
                setOptimizePoints={setOptimizePoints}
                normalizeWinding={normalizeWinding}
                setNormalizeWinding={setNormalizeWinding}
              />
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div
          className={`p-3 sm:px-5 sm:py-2.5 border-t flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-2.5 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
            >
              キャンセル
            </button>
            <span className={`text-[11px] font-mono hidden sm:inline ${themeClasses.textMuted}`}>
              選択中: {targetGlyphs.length}文字
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyBatch}
            disabled={targetGlyphs.length === 0}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 active:opacity-85 transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accentBtn}`}
          >
            <Sparkles className="w-4 h-4 fill-current shrink-0" />
            <span className="truncate">対象 {targetGlyphs.length} 文字に一括適用</span>
          </button>
        </div>
      </div>
    </div>
  );
};