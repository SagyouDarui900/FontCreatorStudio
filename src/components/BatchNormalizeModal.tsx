import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { FontProject, GlyphData, PathContour } from '../types';
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
import { ModalShell } from './modals/ModalShell';
import { ModalFooter } from './modals/ModalFooter';

export type { TargetScope } from './batch';

interface BatchNormalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  commitBatchHistory?: (targetUnicodes: number[], targetIvsKeys?: string[]) => void;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

function getPresetDimensions(preset: Exclude<SizePreset, 'custom'>, unitsPerEm: number) {
  const ratio =
    preset === 'large'
      ? 0.89
      : preset === 'kana'
      ? 0.78
      : preset === 'compact'
      ? 0.74
      : 0.82;
  const size = Math.round(unitsPerEm * ratio);
  return {
    width: size,
    height: size,
    advanceWidth: unitsPerEm,
  };
}

export const BatchNormalizeModal: React.FC<BatchNormalizeModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  selectedUnicode,
  commitBatchHistory,
  theme,
  onShowToast,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const upm = project.metadata?.unitsPerEm || 1000;
  const halfUpm = upm / 2;
  // Normalization baseline follows the project ascender so the aligned
  // position matches the exported glyph position (compile uses ascender).
  const baselineY = resolveBaselineY(project.metadata?.ascender, upm);

  const initialPreset = getPresetDimensions('standard', upm);
  const [scope, setScope] = useState<TargetScope>('all');
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [targetWidth, setTargetWidth] = useState<number>(initialPreset.width);
  const [targetHeight, setTargetHeight] = useState<number>(initialPreset.height);
  const [alignH, setAlignH] = useState<AlignHorizontal>('center');
  const [alignV, setAlignV] = useState<AlignVertical>('center');
  const [unifyAdvance, setUnifyAdvance] = useState<boolean>(true);
  const [advanceWidth, setAdvanceWidth] = useState<number>(initialPreset.advanceWidth);
  const [optimizePoints, setOptimizePoints] = useState<boolean>(true);
  const [weightDelta, setWeightDelta] = useState<number>(0);
  const [normalizeWinding, setNormalizeWinding] = useState<boolean>(true);

  // Allow previewing specific glyph
  const [previewUnicode, setPreviewUnicode] = useState<number>(selectedUnicode);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const wasOpenRef = useRef<boolean>(false);
  const lastSyncedUpmRef = useRef<number>(upm);

  // Synchronize preview glyph and UPM-scaled preset dimensions when modal opens or UPM changes
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    setPreviewUnicode(selectedUnicode);
    if (!wasOpenRef.current || lastSyncedUpmRef.current !== upm) {
      if (sizePreset !== 'custom') {
        const dims = getPresetDimensions(sizePreset, upm);
        setTargetWidth(dims.width);
        setTargetHeight(dims.height);
        setAdvanceWidth(dims.advanceWidth);
      }
      lastSyncedUpmRef.current = upm;
    }
    wasOpenRef.current = true;
  }, [isOpen, selectedUnicode, upm, sizePreset]);

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        if (e.repeat) return;
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, onClose]);

  // Apply preset values scaled to project UPM
  const handlePresetChange = (preset: SizePreset) => {
    setSizePreset(preset);
    if (preset !== 'custom') {
      const dims = getPresetDimensions(preset, upm);
      setTargetWidth(dims.width);
      setTargetHeight(dims.height);
      setAlignH('center');
      setAlignV('center');
      setUnifyAdvance(true);
      setAdvanceWidth(dims.advanceWidth);
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

  const unlockedTargetGlyphs = useMemo(
    () => targetGlyphs.filter((g) => !g.locked),
    [targetGlyphs]
  );
  const lockedTargetCount = targetGlyphs.length - unlockedTargetGlyphs.length;

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
      targetCenterX: halfUpm,
      targetCenterY: halfUpm,
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
    halfUpm,
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
      onShowToast?.('処理対象の文字がありません。先に文字を作成してください。', 'warning');
      return;
    }
    if (unlockedTargetGlyphs.length === 0) {
      onShowToast?.('選択中の対象文字はすべて編集ロックされています', 'warning');
      return;
    }

    const normalizedByUnicode = new Map<
      number,
      { contours: PathContour[]; advanceWidth?: number; lsb?: number }
    >();

    for (const g of unlockedTargetGlyphs) {
      if (!g.contours || g.contours.length === 0) continue;

      const normResult = normalizeGlyph(g.contours, {
        mode: 'fitBox',
        targetWidth,
        targetHeight,
        alignHorizontal: alignH,
        alignVertical: alignV,
        targetCenterX: halfUpm,
        targetCenterY: halfUpm,
        targetBaselineY: baselineY,
        unifyAdvanceWidth: unifyAdvance,
        targetAdvanceWidth: advanceWidth,
        optimizePoints,
        weightDelta,
        normalizeWinding,
      });

      normalizedByUnicode.set(g.unicode, {
        contours: normResult.contours,
        advanceWidth: normResult.advanceWidth,
        lsb: normResult.lsb,
      });
    }

    const targetUnicodes = Array.from(normalizedByUnicode.keys());
    if (targetUnicodes.length === 0) return;

    commitBatchHistory?.(targetUnicodes);

    setProject((prev) => {
      const updatedGlyphs = { ...prev.glyphs };
      for (const [unicode, normResult] of normalizedByUnicode) {
        const current = updatedGlyphs[unicode];
        if (!current || current.locked || !current.contours || current.contours.length === 0) continue;
        updatedGlyphs[unicode] = {
          ...current,
          contours: normResult.contours,
          advanceWidth: normResult.advanceWidth ?? current.advanceWidth,
          lsb: normResult.lsb ?? current.lsb,
          modified: true,
        };
      }
      return {
        ...prev,
        glyphs: updatedGlyphs,
        updatedAt: Date.now(),
      };
    });

    if (lockedTargetCount > 0) {
      onShowToast?.(
        `${targetUnicodes.length}文字のサイズ・太さ・品質を一括正規化しました（ロック中の${lockedTargetCount}文字をスキップ）`,
        'info'
      );
    } else {
      onShowToast?.(`${targetUnicodes.length}文字のサイズ・太さ・品質を一括正規化しました`, 'success');
    }
    onClose();
  };

  const origSvg = previewGlyph ? contoursToSvgPath(normalizeGlyphContoursWinding(previewGlyph.contours || [])) : '';
  const normSvg = contoursToSvgPath(normalizeGlyphContoursWinding(normalizedPreviewContours));
  const origBbox = previewGlyph ? getContoursBoundingBox(previewGlyph.contours || []) : { width: 0, height: 0 };
  const normBbox = getContoursBoundingBox(normalizedPreviewContours);

  return (
    <ModalShell
      title="サイズ・太さ・品質の一括統一"
      subtitle="全文字の字面枠・線の太さ・送り幅・ベジェ頂点数を均一に自動調整"
      theme={theme}
      themeClasses={themeClasses}
      maxWidth="5xl"
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
      onClose={onClose}
      ariaLabel="フォントサイズ・太さ・品質一括調整"
      bodyClassName="overscroll-contain"
      footer={
        <ModalFooter
          primaryLabel={
            lockedTargetCount > 0
              ? `ロック除く ${unlockedTargetGlyphs.length} 文字に一括適用`
              : `対象 ${unlockedTargetGlyphs.length} 文字に一括適用`
          }
          primaryIcon={<Sparkles className="w-4 h-4 fill-current shrink-0" />}
          onPrimary={handleApplyBatch}
          primaryDisabled={unlockedTargetGlyphs.length === 0}
          onCancel={onClose}
          theme={theme}
          themeClasses={themeClasses}
          leftInfo={
            <span className={`text-[11px] font-mono hidden sm:inline ${themeClasses.textMuted}`}>
              {lockedTargetCount > 0
                ? `選択中: ${unlockedTargetGlyphs.length}文字（ロック中 ${lockedTargetCount}文字除外）`
                : `選択中: ${unlockedTargetGlyphs.length}文字`}
            </span>
          }
        />
      }
    >
        {/* Content: Balanced 2-Column CAD Studio Layout on lg+ */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left: Dedicated Visual Stage (5 cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-3">
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
                unitsPerEm={upm}
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
    </ModalShell>
  );
};