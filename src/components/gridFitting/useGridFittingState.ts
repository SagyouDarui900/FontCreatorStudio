import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FontProject, GlyphData } from '../../types';
import {
  GridFittingConfig,
  GridFittingPresetType,
  GridFittingTab,
  MobilePreviewDisplay,
  RenderingMode,
} from './types';
import {
  applyGridFittingToGlyph,
  detectGlyphStems,
  renderRasterPreviewToCanvas,
} from './gridFittingEngine';
import { useIsTopModal } from '../modals/ModalStackFrame';

export const TARGET_PPEM_SIZES = [9, 10, 12, 14, 16, 18, 20, 24, 32, 48] as const;

interface UseGridFittingStateOptions {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitHistory?: (targetUnicode?: number) => void;
  commitBatchHistory?: (targetUnicodes: number[]) => void;
}

export function useGridFittingState({
  project,
  setProject,
  isOpen,
  onClose,
  isLight,
  onShowToast,
  commitHistory,
  commitBatchHistory,
}: UseGridFittingStateOptions) {
  const [selectedPpem, setSelectedPpem] = useState<number>(16);
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('grayscale');
  const [showStemOverlay, setShowStemOverlay] = useState(true);
  const [hoveredStemId, setHoveredStemId] = useState<string | null>(null);
  const [mobilePreviewDisplay, setMobilePreviewDisplay] = useState<MobilePreviewDisplay>('raster');
  const [enablePreview, setEnablePreview] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGlyphs, setShowAllGlyphs] = useState(false);
  const [activeTab, setActiveTab] = useState<GridFittingTab>('preview');

  const [config, setConfig] = useState<GridFittingConfig>({
    snapStrength: 1.0,
    minStemWidthPx: 1.0,
    snapVertical: true,
    snapHorizontal: true,
    snapMetrics: true,
    adjustHandles: true,
  });

  const [selectedUnicode, setSelectedUnicode] = useState<number>(() => {
    const unicodes = Object.keys(project.glyphs).map(Number);
    return unicodes.length > 0 ? unicodes[0] : 0x3042;
  });

  // Sync selectedUnicode to an existing glyph when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const unicodes = Object.keys(project.glyphs).map(Number);
    if (unicodes.length > 0 && !project.glyphs[selectedUnicode]) {
      setSelectedUnicode(unicodes[0]);
    }
  }, [isOpen, project.glyphs, selectedUnicode]);

  const isTopModal = useIsTopModal();

  // Close on Escape key
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const upm = project.metadata.unitsPerEm || 1000;

  const currentGlyph: GlyphData = useMemo(
    () =>
      project.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: String.fromCodePoint(selectedUnicode),
        name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: upm,
        lsb: 50,
        contours: [],
      },
    [project.glyphs, selectedUnicode, upm]
  );

  const fittedGlyph = useMemo(() => {
    if (!enablePreview) return currentGlyph;
    return applyGridFittingToGlyph(currentGlyph, selectedPpem, upm, config, project.metadata);
  }, [currentGlyph, selectedPpem, upm, config, enablePreview, project.metadata]);

  const detectedStems = useMemo(() => {
    return detectGlyphStems(
      enablePreview ? fittedGlyph.contours : currentGlyph.contours,
      selectedPpem,
      upm
    );
  }, [currentGlyph.contours, fittedGlyph.contours, selectedPpem, upm, enablePreview]);

  const allGlyphs = useMemo(() => Object.values(project.glyphs), [project.glyphs]);
  const totalGlyphCount = allGlyphs.length;

  const glyphList = useMemo(() => {
    if (!searchQuery.trim()) {
      return showAllGlyphs ? allGlyphs : allGlyphs.slice(0, 80);
    }

    const q = searchQuery.toLowerCase().trim();
    return allGlyphs.filter((g: GlyphData) => {
      return (
        g.char.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        `u+${g.unicode.toString(16)}`.includes(q)
      );
    });
  }, [allGlyphs, searchQuery, showAllGlyphs]);

  // Render raster pixel simulation canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const contoursToRender = enablePreview ? fittedGlyph.contours : currentGlyph.contours;
    renderRasterPreviewToCanvas(
      canvas,
      contoursToRender,
      selectedPpem,
      upm,
      renderingMode,
      isLight
    );
  }, [
    isOpen,
    activeTab,
    mobilePreviewDisplay,
    fittedGlyph.contours,
    currentGlyph.contours,
    selectedPpem,
    upm,
    renderingMode,
    enablePreview,
    isLight,
  ]);

  const handleApplyToCurrentGlyph = useCallback(() => {
    if (currentGlyph.locked) {
      onShowToast(
        `「${currentGlyph.char}」は編集ロックされているため整列できません。ロックを解除してから実行してください`,
        'warning'
      );
      return;
    }
    if (!currentGlyph.contours || currentGlyph.contours.length === 0) {
      const hasPixel = Boolean(currentGlyph.pixelData?.data?.some((p) => p === 1));
      onShowToast(
        hasPixel
          ? `「${currentGlyph.char}」はピクセルグリフのため、ベジェ輪郭のグリッド整列は不要です`
          : `「${currentGlyph.char}」には整列する輪郭パスがありません`,
        hasPixel ? 'info' : 'warning'
      );
      return;
    }
    const updated = applyGridFittingToGlyph(currentGlyph, selectedPpem, upm, config, project.metadata);
    commitHistory?.(selectedUnicode);
    setProject((prev) => ({
      ...prev,
      glyphs: {
        ...prev.glyphs,
        [selectedUnicode]: updated,
      },
      updatedAt: Date.now(),
    }));
    onShowToast(
      `「${currentGlyph.char}」のステムを ${selectedPpem}px グリッドに最適化整列しました`,
      'success'
    );
  }, [currentGlyph, selectedPpem, upm, config, project.metadata, setProject, selectedUnicode, commitHistory, onShowToast]);

  const handleBatchApplyHinting = useCallback(() => {
    let updatedCount = 0;
    let skippedLockedCount = 0;
    const newGlyphs: Record<number, GlyphData> = { ...project.glyphs };
    const updatedUnicodes: number[] = [];

    for (const uniStr of Object.keys(newGlyphs)) {
      const uni = Number(uniStr);
      const original = newGlyphs[uni];
      if (!original) continue;
      if (original.locked) {
        skippedLockedCount++;
        continue;
      }
      if (original.contours && original.contours.length > 0) {
        newGlyphs[uni] = applyGridFittingToGlyph(original, selectedPpem, upm, config, project.metadata);
        updatedUnicodes.push(uni);
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      onShowToast(
        skippedLockedCount > 0
          ? `対象となる未ロックの輪郭グリフがありません（ロック中 ${skippedLockedCount} 文字をスキップ）`
          : '整列可能な輪郭を持つ文字がありません',
        'warning'
      );
      return;
    }

    if (commitBatchHistory) {
      commitBatchHistory(updatedUnicodes);
    } else {
      for (const uni of updatedUnicodes) {
        commitHistory?.(uni);
      }
    }

    setProject((prev) => ({
      ...prev,
      glyphs: newGlyphs,
      updatedAt: Date.now(),
    }));

    const skippedNote =
      skippedLockedCount > 0 ? `（ロック中の ${skippedLockedCount} 文字は保護のため除外）` : '';
    onShowToast(
      `全 ${updatedCount} 文字のステムを ${selectedPpem}px グリッドに最適化整列しました${skippedNote}`,
      'success'
    );
  }, [project.glyphs, project.metadata, selectedPpem, upm, config, setProject, commitBatchHistory, commitHistory, onShowToast]);

  const applyPreset = useCallback(
    (presetType: GridFittingPresetType) => {
      if (presetType === 'retro') {
        setConfig({
          snapStrength: 1.0,
          minStemWidthPx: 1.0,
          snapVertical: true,
          snapHorizontal: true,
          snapMetrics: true,
          adjustHandles: true,
        });
        setRenderingMode('mono');
        onShowToast('「レトロゲーム・ドット風」プリセットを適用しました', 'info');
      } else if (presetType === 'web_ui') {
        setConfig({
          snapStrength: 0.85,
          minStemWidthPx: 1.0,
          snapVertical: true,
          snapHorizontal: true,
          snapMetrics: true,
          adjustHandles: true,
        });
        setRenderingMode('grayscale');
        onShowToast('「Webフォント・小画面最適化」プリセットを適用しました', 'info');
      } else {
        setConfig({
          snapStrength: 0.5,
          minStemWidthPx: 0,
          snapVertical: true,
          snapHorizontal: true,
          snapMetrics: false,
          adjustHandles: true,
        });
        setRenderingMode('grayscale');
        onShowToast('「高解像度・ソフト整列」プリセットを適用しました', 'info');
      }
    },
    [onShowToast]
  );

  return {
    targetSizes: TARGET_PPEM_SIZES,
    selectedPpem,
    setSelectedPpem,
    renderingMode,
    setRenderingMode,
    showStemOverlay,
    setShowStemOverlay,
    hoveredStemId,
    setHoveredStemId,
    mobilePreviewDisplay,
    setMobilePreviewDisplay,
    config,
    setConfig,
    enablePreview,
    setEnablePreview,
    selectedUnicode,
    setSelectedUnicode,
    searchQuery,
    setSearchQuery,
    showAllGlyphs,
    setShowAllGlyphs,
    totalGlyphCount,
    activeTab,
    setActiveTab,
    canvasRef,
    upm,
    currentGlyph,
    fittedGlyph,
    detectedStems,
    glyphList,
    handleApplyToCurrentGlyph,
    handleBatchApplyHinting,
    applyPreset,
  };
}
