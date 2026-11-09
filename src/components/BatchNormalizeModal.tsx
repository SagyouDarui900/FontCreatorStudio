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
import {
  AlignHorizontal,
  AlignVertical,
  SizePreset,
  TargetScope,
  BatchPreviewSection,
  BatchOptionsSection,
} from './batch';

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

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, isFullscreen, onClose]);

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
    if (targetGlyphs.length === 0) {
      return project.glyphs[selectedUnicode] || (Object.values(project.glyphs) as GlyphData[])[0] || null;
    }
    const currentInTarget = targetGlyphs.find((g) => g.unicode === selectedUnicode);
    return currentInTarget || targetGlyphs[0];
  }, [targetGlyphs, project.glyphs, selectedUnicode]);

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
      targetBaselineY: 800,
      unifyAdvanceWidth: unifyAdvance,
      targetAdvanceWidth: advanceWidth,
      optimizePoints,
      weightDelta,
      normalizeWinding,
    });
    return res.contours;
  }, [
    previewGlyph,
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
        targetBaselineY: 800,
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
      onShowToast(`${count}文字のサイズと輪郭を最適化しました`, 'success');
    }
    onClose();
  };

  const origSvg = previewGlyph ? contoursToSvgPath(normalizeGlyphContoursWinding(previewGlyph.contours || [])) : '';
  const normSvg = contoursToSvgPath(normalizeGlyphContoursWinding(normalizedPreviewContours));
  const origBbox = previewGlyph ? getContoursBoundingBox(previewGlyph.contours || []) : { width: 0, height: 0 };
  const normBbox = getContoursBoundingBox(normalizedPreviewContours);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-150 ${
        isFullscreen
          ? 'p-0 w-screen h-screen bg-black/85 flex flex-col'
          : 'flex items-center justify-center p-3 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        className={`flex flex-col transition-colors duration-150 overflow-hidden ${
          isFullscreen
            ? `w-screen h-screen rounded-none border-none shadow-none ${themeClasses.modalBg} ${themeClasses.textPrimary}`
            : `w-full max-w-3xl xl:max-w-4xl border rounded-2xl shadow-2xl max-h-[92vh] ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`
        }`}
      >
        {/* Header */}
        <div
          className={`p-3 sm:p-4 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${themeClasses.accentBadge}`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className={`text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 ${themeClasses.textPrimary}`}
              >
                <span className="truncate">フォントサイズ・品質一括調整</span>
                {isFullscreen && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-medium shrink-0">
                    全画面
                  </span>
                )}
              </h2>
              <p className={`text-xs truncate ${themeClasses.textMuted}`}>
                文字サイズ・余白・頂点数の一括自動調整
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors duration-150 ${
                isFullscreen
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:opacity-85`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">全画面</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors duration-150 ${themeClasses.border} ${themeClasses.textMuted} hover:opacity-80`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 text-xs">
          <BatchPreviewSection
            isLight={isLight}
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
          />

          <BatchOptionsSection
            isLight={isLight}
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

        {/* Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors duration-150 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:opacity-85`}
            >
              キャンセル
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors duration-150 hidden sm:flex ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:opacity-85`}
              title={isFullscreen ? '通常表示に戻す (F / Esc)' : '全画面表示モード (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常サイズに戻す</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面表示</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleApplyBatch}
            className={`px-4 sm:px-5 py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-colors duration-150 min-w-0 ${themeClasses.accentBtn}`}
          >
            <Sparkles className="w-4 h-4 fill-current shrink-0" />
            <span className="truncate">対象 {targetGlyphs.length} 文字に一括適用</span>
          </button>
        </div>
      </div>
    </div>
  );
};
