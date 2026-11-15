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

export const TARGET_PPEM_SIZES = [9, 10, 12, 14, 16, 18, 20, 24, 32, 48] as const;

interface UseGridFittingStateOptions {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useGridFittingState({
  project,
  setProject,
  isOpen,
  onClose,
  isLight,
  onShowToast,
}: UseGridFittingStateOptions) {
  const [selectedPpem, setSelectedPpem] = useState<number>(16);
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('grayscale');
  const [showStemOverlay, setShowStemOverlay] = useState(true);
  const [hoveredStemId, setHoveredStemId] = useState<string | null>(null);
  const [mobilePreviewDisplay, setMobilePreviewDisplay] = useState<MobilePreviewDisplay>('raster');
  const [enablePreview, setEnablePreview] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const upm = project.metadata.unitsPerEm || 1000;

  const currentGlyph: GlyphData = useMemo(
    () =>
      project.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: String.fromCharCode(selectedUnicode),
        name: `uni${selectedUnicode.toString(16).toUpperCase()}`,
        advanceWidth: 1000,
        lsb: 50,
        contours: [],
      },
    [project.glyphs, selectedUnicode]
  );

  const fittedGlyph = useMemo(() => {
    if (!enablePreview) return currentGlyph;
    return applyGridFittingToGlyph(currentGlyph, selectedPpem, upm, config);
  }, [currentGlyph, selectedPpem, upm, config, enablePreview]);

  const detectedStems = useMemo(() => {
    return detectGlyphStems(
      enablePreview ? fittedGlyph.contours : currentGlyph.contours,
      selectedPpem,
      upm
    );
  }, [currentGlyph.contours, fittedGlyph.contours, selectedPpem, upm, enablePreview]);

  const glyphList = useMemo(() => {
    const list: GlyphData[] = Object.values(project.glyphs);
    if (!searchQuery.trim()) return list.slice(0, 50);

    const q = searchQuery.toLowerCase().trim();
    return list.filter((g: GlyphData) => {
      return (
        g.char.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        `u+${g.unicode.toString(16)}`.includes(q)
      );
    });
  }, [project.glyphs, searchQuery]);

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
    fittedGlyph.contours,
    currentGlyph.contours,
    selectedPpem,
    upm,
    renderingMode,
    enablePreview,
    isLight,
  ]);

  const handleApplyToCurrentGlyph = useCallback(() => {
    if (!currentGlyph.contours || currentGlyph.contours.length === 0) {
      onShowToast(`「${currentGlyph.char}」には整列する輪郭パスがありません`, 'warning');
      return;
    }
    const updated = applyGridFittingToGlyph(currentGlyph, selectedPpem, upm, config);
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
  }, [currentGlyph, selectedPpem, upm, config, setProject, selectedUnicode, onShowToast]);

  const handleBatchApplyHinting = useCallback(() => {
    let updatedCount = 0;
    const newGlyphs: Record<number, GlyphData> = { ...project.glyphs };

    for (const uniStr of Object.keys(newGlyphs)) {
      const uni = Number(uniStr);
      const original = newGlyphs[uni];
      if (original && original.contours && original.contours.length > 0) {
        newGlyphs[uni] = applyGridFittingToGlyph(original, selectedPpem, upm, config);
        updatedCount++;
      }
    }

    setProject((prev) => ({
      ...prev,
      glyphs: newGlyphs,
      updatedAt: Date.now(),
    }));

    onShowToast(
      `全 ${updatedCount} 文字のステムを ${selectedPpem}px グリッドに最適化整列しました`,
      'success'
    );
  }, [project.glyphs, selectedPpem, upm, config, setProject, onShowToast]);

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
