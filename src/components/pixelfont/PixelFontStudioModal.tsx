import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Grid,
  Pencil,
  BookOpen,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  Undo2,
  Redo2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Trash2,
  ImageIcon,
  Type,
  Upload,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { FontProject, GlyphData } from '../../types';
import { getThemeClasses } from '../../utils/theme';
import { shareOrDownloadFont } from '../../utils/font';
import { pixelGridToContours, rasterizeGlyphToPixelGrid, resamplePixelGrid, normalizePixelGrid } from '../../utils/pixelFontUtils';
import { UNICODE_CATEGORIES, getCategoryCharList } from '../../data/unicodeTables';
import { PixelFontStudioModalProps } from './types';
import { usePixelGridState } from './hooks/usePixelGridState';
import { usePixelTrace } from './hooks/usePixelTrace';
import { usePixelDrawing } from './hooks/usePixelDrawing';
import { PixelToolbar } from './PixelToolbar';
import { PixelGlyphDrawer } from './PixelGlyphDrawer';
import { PixelPresetsPanel } from './PixelPresetsPanel';
import { PixelExportPanel } from './PixelExportPanel';
import { PixelDrawingCanvas } from './PixelDrawingCanvas';

export const PixelFontStudioModal: React.FC<PixelFontStudioModalProps> = ({
  project,
  setProject,
  isOpen,
  onClose,
  isLight,
  theme = isLight ? 'light' : 'dark',
  selectedUnicode,
  onSelectGlyph,
  onShowToast,
}) => {
  const themeClasses = getThemeClasses(theme);
  const [glyphSearchQuery, setGlyphSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showGlyphDrawer, setShowGlyphDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'glyphs' | 'presets' | 'export'>('canvas');
  const [previewText, setPreviewText] = useState<string>('あいうえお ABC 123');
  const [pngScale, setPngScale] = useState<number>(8);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    preset,
    gridWidth,
    setGridWidth,
    gridHeight,
    setGridHeight,
    currentUnicode,
    setCurrentUnicode,
    dotShape,
    setDotShape,
    mergeContours,
    setMergeContours,
    grid,
    setGrid,
    currentGridRef,
    history,
    historyIdx,
    currentGlyph,
    activePixelCount,
    totalDrawnPixelGlyphs,
    pushHistory,
    handleUndo,
    handleRedo,
    handleShift,
    handlePresetSelect,
    handleClear,
    handleInvert,
    handleFlipH,
    handleFlipV,
    handleRotate90,
    handleAddOutline,
    handleAddShadow,
    autoSaveGlyph,
    commitCurrentGlyphEdits,
    requestGridSizeChange,
    handleRestoreVectorContours,
    loadGlyphPixelGrid,
  } = usePixelGridState({
    project,
    setProject,
    isOpen,
    selectedUnicode,
    onShowToast,
  });

  const {
    showTrace,
    setShowTrace,
    showTracePanel,
    setShowTracePanel,
    traceSource,
    setTraceSource,
    traceChar,
    setTraceChar,
    traceFontFamily,
    setTraceFontFamily,
    traceOpacity,
    setTraceOpacity,
    traceScale,
    setTraceScale,
    traceOffsetX,
    setTraceOffsetX,
    traceOffsetY,
    setTraceOffsetY,
    traceThreshold,
    setTraceThreshold,
    traceImageSrc,
    setTraceImageSrc,
    traceImageVersion,
    traceImageRef,
    fileInputRef,
    handleImageUpload,
    handleAutoBinarizeTrace,
  } = usePixelTrace({
    currentGlyph,
    gridWidth,
    gridHeight,
    pushHistory,
    onShowToast,
  });

  const {
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushStamp,
    setBrushStamp,
    showGridLines,
    setShowGridLines,
    showSubdivisions,
    setShowSubdivisions,
    showMetricsGuides,
    setShowMetricsGuides,
    symmetryH,
    setSymmetryH,
    symmetryV,
    setSymmetryV,
    isDrawing,
    previewGrid,
    hoverPos,
    setHoverPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    commitCurrentStroke,
  } = usePixelDrawing({
    gridWidth,
    gridHeight,
    grid,
    setGrid,
    currentGridRef,
    pushHistory,
    canvasRef,
  });

  // Dedicated Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleStudioKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInputActive) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Commit an in-progress stroke first so it is not lost.
        if (isDrawing) {
          commitCurrentStroke();
        }
        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'b' || key === 'p') {
          e.preventDefault();
          e.stopPropagation();
          setTool('pencil');
        } else if (key === 'e') {
          e.preventDefault();
          e.stopPropagation();
          setTool('eraser');
        } else if (key === 'g' || key === 'f') {
          e.preventDefault();
          e.stopPropagation();
          setTool('bucket');
        } else if (key === 'l') {
          e.preventDefault();
          e.stopPropagation();
          setTool('line');
        } else if (key === 'r') {
          e.preventDefault();
          e.stopPropagation();
          setTool('rect');
        } else if (key === 'c') {
          e.preventDefault();
          e.stopPropagation();
          setTool('circle');
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowUp') handleShift(0, -1);
        else if (e.key === 'ArrowDown') handleShift(0, 1);
        else if (e.key === 'ArrowLeft') handleShift(-1, 0);
        else if (e.key === 'ArrowRight') handleShift(1, 0);
        return;
      }

      if (
        e.code === 'Space' ||
        e.key === ' ' ||
        e.key === 'Delete' ||
        e.key === 'Backspace' ||
        ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'd'].includes(e.key.toLowerCase())) ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && ['g', 's', 'f', 'z', 't', 'q'].includes(e.key.toLowerCase()))
      ) {
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleStudioKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleStudioKeyDown, true);
    };
  }, [isOpen, handleUndo, handleRedo, onClose, handleShift, setTool, isDrawing, commitCurrentStroke]);

  // Project Glyphs & Categories
  const projectGlyphUnicodes = useMemo(() => {
    return Object.keys(project.glyphs)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);
  }, [project.glyphs]);

  const displayedGlyphList = useMemo(() => {
    let pool: { unicode: number; char: string; hasData: boolean }[] = [];

    if (activeCategory === 'all') {
      pool = projectGlyphUnicodes.map((u) => {
        const g = project.glyphs[u];
        const hasData = Boolean(
          (g?.pixelData && g.pixelData.data.some((d) => d === 1)) || (g?.contours && g.contours.length > 0)
        );
        return {
          unicode: u,
          char: g?.char || (u ? String.fromCodePoint(u) : ''),
          hasData,
        };
      });

      if (pool.length === 0) {
        const defaultCat = UNICODE_CATEGORIES.find((c) => c.id === 'hiragana');
        if (defaultCat) {
          pool = getCategoryCharList(defaultCat).map((item) => {
            const g = project.glyphs[item.code];
            const hasData = Boolean(
              (g?.pixelData && g.pixelData.data.some((d) => d === 1)) || (g?.contours && g.contours.length > 0)
            );
            return {
              unicode: item.code,
              char: item.char,
              hasData,
            };
          });
        }
      }
    } else if (activeCategory === 'drawn') {
      pool = projectGlyphUnicodes
        .filter((u) => {
          const g = project.glyphs[u];
          return Boolean(
            (g?.pixelData && g.pixelData.data.some((d) => d === 1)) || (g?.contours && g.contours.length > 0)
          );
        })
        .map((u) => ({
          unicode: u,
          char: project.glyphs[u]?.char || String.fromCodePoint(u),
          hasData: true,
        }));
    } else {
      const targetCatId = activeCategory === 'basic_latin' ? 'basic_latin_alnum' : activeCategory;
      const cat = UNICODE_CATEGORIES.find((c) => c.id === targetCatId || c.id === activeCategory);
      if (cat) {
        const charItems = getCategoryCharList(cat);
        pool = charItems.map((item) => {
          const u = item.code;
          const g = project.glyphs[u];
          const hasData = Boolean(
            (g?.pixelData && g.pixelData.data.some((d) => d === 1)) || (g?.contours && g.contours.length > 0)
          );
          return {
            unicode: u,
            char: item.char,
            hasData,
          };
        });
      }
    }

    if (glyphSearchQuery.trim()) {
      const query = glyphSearchQuery.trim().toLowerCase();
      pool = pool.filter((item) => {
        const hex = item.unicode.toString(16).toLowerCase();
        return item.char.toLowerCase().includes(query) || hex.includes(query);
      });
    }

    return pool;
  }, [projectGlyphUnicodes, project.glyphs, activeCategory, glyphSearchQuery]);

  const handleSelectGlyphItem = (unicode: number) => {
    // Save only when the current glyph has unsaved edits. Switching
    // glyphs must not rewrite the stored pixelData or mark the project
    // as a pixel font project.
    commitCurrentGlyphEdits();
    setCurrentUnicode(unicode);
    onSelectGlyph?.(unicode);
    loadGlyphPixelGrid(unicode, gridWidth, gridHeight);
    const g = project.glyphs[unicode];
    const ch = g?.char || (unicode ? String.fromCodePoint(unicode) : '');
    if (ch) {
      setTraceChar(ch);
    }
  };

  const handlePrevGlyph = () => {
    const list = displayedGlyphList.length > 0 ? displayedGlyphList.map((i) => i.unicode) : projectGlyphUnicodes;
    const idx = list.indexOf(currentUnicode);
    if (idx > 0) {
      handleSelectGlyphItem(list[idx - 1]);
    } else if (idx === -1 && list.length > 0) {
      handleSelectGlyphItem(list[0]);
    }
  };

  const handleNextGlyph = () => {
    const list = displayedGlyphList.length > 0 ? displayedGlyphList.map((i) => i.unicode) : projectGlyphUnicodes;
    const idx = list.indexOf(currentUnicode);
    if (idx >= 0 && idx < list.length - 1) {
      handleSelectGlyphItem(list[idx + 1]);
    } else if (idx === -1 && list.length > 0) {
      handleSelectGlyphItem(list[0]);
    }
  };

  // Build up-to-date glyph map including live current grid edits
  const buildEffectiveGlyphs = (): Record<number, GlyphData> => {
    const activeGrid = currentGridRef.current || grid;
    const upm = project.metadata.unitsPerEm || 1000;
    const asc = project.metadata.ascender ?? 800;
    const desc = project.metadata.descender ?? -200;
    const updatedGlyphs: Record<number, GlyphData> = { ...project.glyphs };
    const isCurrentActive = activeGrid.some((p) => p === 1);

    if (isCurrentActive) {
      const currentContours = pixelGridToContours(
        activeGrid,
        gridWidth,
        gridHeight,
        upm,
        asc,
        desc,
        currentGlyph.advanceWidth || upm,
        dotShape,
        mergeContours
      );
      updatedGlyphs[currentUnicode] = {
        ...currentGlyph,
        unicode: currentUnicode,
        char: currentGlyph.char || (currentUnicode ? String.fromCodePoint(currentUnicode) : ''),
        contours: currentContours,
        pixelData: {
          width: gridWidth,
          height: gridHeight,
          data: Array.from(activeGrid),
          shape: dotShape,
        },
        modified: true,
      };
    } else if (updatedGlyphs[currentUnicode]) {
      updatedGlyphs[currentUnicode] = {
        ...updatedGlyphs[currentUnicode],
        contours: [],
        pixelData: {
          width: gridWidth,
          height: gridHeight,
          data: Array.from(activeGrid),
          shape: dotShape,
        },
        modified: true,
      };
    }

    return updatedGlyphs;
  };

  // Export handlers. The format is always 'otf': opentype.js writes CFF
  // outlines with sfnt version OTTO and has no TrueType (glyf) writer.
  const handleExportFontFile = async (format: 'otf' = 'otf') => {
    const activeGrid = currentGridRef.current || grid;
    autoSaveGlyph(activeGrid, currentUnicode);

    const upm = project.metadata.unitsPerEm || 1000;
    const asc = project.metadata.ascender ?? 800;
    const desc = project.metadata.descender ?? -200;
    const updatedGlyphs = buildEffectiveGlyphs();

    const hasAnyGlyphs = Object.values(updatedGlyphs).some(
      (g) => (g.pixelData && g.pixelData.data && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
    );

    if (!hasAnyGlyphs) {
      onShowToast('作成済みのドット文字がありません。先に文字を描画してください。', 'warning');
      return;
    }

    for (const [uStr, g] of Object.entries(updatedGlyphs)) {
      const u = parseInt(uStr, 10);
      if (g.pixelData && g.pixelData.data && (!g.contours || g.contours.length === 0)) {
        const gGrid = normalizePixelGrid(g.pixelData.data);
        if (gGrid.some((d) => d === 1)) {
          const c = pixelGridToContours(
            gGrid,
            g.pixelData.width || gridWidth,
            g.pixelData.height || gridHeight,
            upm,
            asc,
            desc,
            g.advanceWidth || upm,
            g.pixelData.shape || dotShape,
            mergeContours
          );
          updatedGlyphs[u] = { ...g, contours: c };
        }
      }
    }

    const projectToExport: FontProject = {
      ...project,
      glyphs: updatedGlyphs,
      pixelFontSettings: {
        isPixelFontProject: true,
        defaultWidth: gridWidth,
        defaultHeight: gridHeight,
        dotShape,
        mergeContours,
      },
      updatedAt: Date.now(),
    };

    // Warn when glyphs use different grid sizes: dots end up with
    // different sizes in the same em box.
    const exportSizes = new Set<string>();
    for (const g of Object.values(updatedGlyphs)) {
      if (g.pixelData && g.pixelData.width && g.pixelData.height) {
        exportSizes.add(`${g.pixelData.width}x${g.pixelData.height}`);
      }
    }
    if (exportSizes.size > 1) {
      onShowToast(
        `グリッドサイズが混在しています（${[...exportSizes].join('、')}）。ドットの寸法が文字ごとに異なります。`,
        'warning'
      );
    }

    try {
      const result = await shareOrDownloadFont(projectToExport, format, {
        scaleFactor: 1.0,
        balanceSideBearings: false,
        mergeOverlaps: false,
        normalizeWinding: true,
      });

      const formatUpper = format.toUpperCase();
      const msg =
        result.method === 'share'
          ? `「${project.metadata.familyName || 'PixelFont'}」の ${formatUpper} 共有シートを開きました`
          : `「${project.metadata.familyName || 'PixelFont'}」を ${formatUpper} 形式 (.${format}) で出力しました`;
      onShowToast(msg, 'success');
    } catch (err: any) {
      console.error('Failed to export OTF font:', err);
      onShowToast(`フォントの書き出しに失敗しました: ${err?.message || '不明なエラー'}`, 'error');
    }
  };

  const handleExportSinglePng = () => {
    const activeGrid = currentGridRef.current || grid;
    const scale = Math.max(1, Math.min(32, pngScale || 8));
    const outW = gridWidth * scale;
    const outH = gridHeight * scale;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = outW;
    offCanvas.height = outH;
    const oCtx = offCanvas.getContext('2d');
    if (!oCtx) return;

    oCtx.clearRect(0, 0, outW, outH);
    oCtx.fillStyle = '#000000';
    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (activeGrid[gy * gridWidth + gx] === 1) {
          oCtx.fillRect(gx * scale, gy * scale, scale, scale);
        }
      }
    }

    const codeHex = (currentUnicode || 0).toString(16).toUpperCase().padStart(4, '0');
    const safeChar = (currentGlyph.char || '').replace(/[\\/:*?"<>|\s]/g, '') || `U_${codeHex}`;
    const url = offCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel_${safeChar}_U${codeHex}_${gridWidth}x${gridHeight}_x${scale}.png`;
    a.click();
    onShowToast(`「${currentGlyph.char}」の単体PNG画像 (${outW}×${outH}、${scale}倍) をダウンロードしました`, 'success');
  };

  const getGlyphBitmapAtStudioSize = (g: GlyphData): Uint8Array => {
    if (g.pixelData && g.pixelData.data && g.pixelData.data.length > 0) {
      const pw = g.pixelData.width || gridWidth;
      const ph = g.pixelData.height || gridHeight;
      const normalized = normalizePixelGrid(g.pixelData.data);
      return pw === gridWidth && ph === gridHeight && normalized.length === gridWidth * gridHeight
        ? normalized
        : resamplePixelGrid(normalized, pw, ph, gridWidth, gridHeight);
    }
    return rasterizeGlyphToPixelGrid(
      g,
      gridWidth,
      gridHeight,
      project.metadata.unitsPerEm || 1000,
      project.metadata.ascender ?? 800,
      project.metadata.descender ?? -200
    );
  };

  const handleExportSpritesheet = () => {
    const activeGrid = currentGridRef.current || grid;
    autoSaveGlyph(activeGrid, currentUnicode);
    const effectiveGlyphs = buildEffectiveGlyphs();
    const entries = (Object.entries(effectiveGlyphs) as [string, GlyphData][])
      .filter(
        ([_, g]) => (g.pixelData && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
      )
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

    if (entries.length === 0) {
      onShowToast('作成済みのドット文字がありません', 'warning');
      return;
    }

    const cols = Math.ceil(Math.sqrt(entries.length));
    const rows = Math.ceil(entries.length / cols);
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cols * gridWidth;
    sheetCanvas.height = rows * gridHeight;
    const sCtx = sheetCanvas.getContext('2d');
    if (!sCtx) return;

    sCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    const atlasJson: Record<string, { char: string; unicode: number; x: number; y: number; w: number; h: number }> = {};

    entries.forEach(([uStr, g], idx) => {
      const u = parseInt(uStr, 10);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const startX = col * gridWidth;
      const startY = row * gridHeight;

      const gGrid = getGlyphBitmapAtStudioSize(g);

      sCtx.fillStyle = '#ffffff';
      for (let gy = 0; gy < gridHeight; gy++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          if (gGrid[gy * gridWidth + gx] === 1) {
            sCtx.fillRect(startX + gx, startY + gy, 1, 1);
          }
        }
      }

      const keyChar = g.char || String.fromCodePoint(u);
      atlasJson[keyChar] = {
        char: keyChar,
        unicode: u,
        x: startX,
        y: startY,
        w: gridWidth,
        h: gridHeight,
      };
    });

    const safeFileBase = (project.name || 'pixel_font').replace(/[\\/:*?"<>|]/g, '_');
    const pngUrl = sheetCanvas.toDataURL('image/png');
    const aPng = document.createElement('a');
    aPng.href = pngUrl;
    aPng.download = `${safeFileBase}_spritesheet_${gridWidth}x${gridHeight}.png`;
    aPng.click();

    const jsonBlob = new Blob([JSON.stringify({ fontName: project.name, gridWidth, gridHeight, glyphs: atlasJson }, null, 2)], {
      type: 'application/json',
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const aJson = document.createElement('a');
    aJson.href = jsonUrl;
    aJson.download = `${safeFileBase}_atlas.json`;
    aJson.click();
    setTimeout(() => URL.revokeObjectURL(jsonUrl), 60000);

    onShowToast(`全 ${entries.length} 文字のスプライトシート (PNG + JSON) を出力しました`, 'success');
  };

  const handleExportCHeader = () => {
    const activeGrid = currentGridRef.current || grid;
    autoSaveGlyph(activeGrid, currentUnicode);
    const effectiveGlyphs = buildEffectiveGlyphs();
    const entries = (Object.entries(effectiveGlyphs) as [string, GlyphData][])
      .filter(
        ([_, g]) => (g.pixelData && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
      )
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

    if (entries.length === 0) {
      onShowToast('作成済みのドット文字がありません', 'warning');
      return;
    }

    const macroId =
      (project.name || 'FONT')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || 'FONT';

    let code = `// Pixel Font: ${project.name || 'PixelFont'}\n`;
    code += `// Resolution: ${gridWidth}x${gridHeight}\n`;
    code += `// Total Glyphs: ${entries.length}\n\n`;
    code += `#ifndef PIXEL_FONT_${macroId}_H\n`;
    code += `#define PIXEL_FONT_${macroId}_H\n\n`;
    code += `#include <stdint.h>\n\n`;
    code += `const uint8_t FONT_WIDTH = ${gridWidth};\n`;
    code += `const uint8_t FONT_HEIGHT = ${gridHeight};\n\n`;

    entries.forEach(([uStr, g]) => {
      const u = parseInt(uStr, 10);
      const uHex = u.toString(16).toUpperCase().padStart(4, '0');
      const gGrid = getGlyphBitmapAtStudioSize(g);

      code += `// Character: '${g.char}' (U+${uHex})\n`;
      code += `const uint8_t glyph_0x${uHex}[] = {\n`;

      const bytesPerRow = Math.ceil(gridWidth / 8);
      for (let y = 0; y < gridHeight; y++) {
        code += '  ';
        for (let b = 0; b < bytesPerRow; b++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const gx = b * 8 + bit;
            if (gx < gridWidth && gGrid[y * gridWidth + gx] === 1) {
              byteVal |= 1 << (7 - bit);
            }
          }
          code += `0x${byteVal.toString(16).padStart(2, '0')}, `;
        }
        code += `// Row ${y}\n`;
      }
      code += `};\n\n`;
    });

    code += `#endif // PIXEL_FONT_${macroId}_H\n`;

    const safeFileBase = (project.name || 'pixel_font').replace(/[\\/:*?"<>|]/g, '_');
    const blob = new Blob([code], { type: 'text/x-c' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileBase}_${gridWidth}x${gridHeight}.h`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    onShowToast('C言語ヘッダー形式ビットマップ配列を出力しました', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-2 bg-black/75 anim-fade pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full ${
          isFullscreen
            ? 'h-full max-h-none rounded-none border-0'
            : 'max-w-7xl h-full sm:h-[95vh] sm:max-h-[920px] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border'
        } flex flex-col overflow-hidden select-none ${themeClasses.modalBg}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* DESKTOP TOP HEADER */}
        <div
          className={`hidden md:flex items-center justify-between px-3 sm:px-4 py-2 border-b shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-none bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-sm border border-emerald-400">
              <Grid className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-sm sm:text-base leading-none tracking-tight">
                  ピクセルフォント・クリエイター
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-700/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30">
                  PIXEL FONT WORKSHOP
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs">
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  「{currentGlyph.char}」
                </span>
                <span className="font-mono text-[11px] opacity-70">
                  U+{(currentUnicode || 0).toString(16).toUpperCase().padStart(4, '0')}
                </span>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {gridWidth}×{gridHeight}
                </span>
                <span className="font-mono text-[10.5px] opacity-75">
                  ({activePixelCount} 点灯)
                </span>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <span className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400">
                  総作図: {totalDrawnPixelGlyphs} 文字
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={() => handleExportFontFile('otf')}
              className="px-2.5 py-1 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 border border-emerald-400 transition-colors cursor-pointer"
              title="作成したピクセルフォントを直接OTF形式でダウンロード (.otf)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>OTF出力</span>
            </button>

            <button
              onClick={() => setShowGlyphDrawer(!showGlyphDrawer)}
              className={`px-2.5 py-1 text-xs font-bold border flex items-center space-x-1 transition-colors cursor-pointer ${
                showGlyphDrawer
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                  : 'bg-[#18261f] border-stone-700 text-stone-300 hover:bg-[#203429]'
              }`}
              title="文字一覧サイドバーの開閉"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>文字一覧</span>
            </button>

            <button
              onClick={() => {
                setShowTracePanel((prev) => {
                  const next = !prev;
                  if (next && !showTrace) setShowTrace(true);
                  return next;
                });
              }}
              className={`px-2.5 py-1 text-xs font-bold border flex items-center space-x-1 transition-colors cursor-pointer ${
                showTracePanel
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                  : 'bg-[#18261f] border-stone-700 text-stone-300 hover:bg-[#203429]'
              }`}
              title="下絵・参照文字の表示設定"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>下絵</span>
            </button>

            <div className="flex items-center border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-[#18261f]">
              <button
                onClick={handlePrevGlyph}
                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                title="前の文字"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-xs">{currentGlyph.char}</span>
              <button
                onClick={handleNextGlyph}
                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                title="次の文字"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'ウィンドウサイズに戻す' : 'フルスクリーン表示'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="スタジオを閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MOBILE TOP HEADER */}
        <div
          className={`flex md:hidden items-center justify-between px-2.5 py-1.5 border-b shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-400">
              <Grid className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18261f]">
              <button
                onClick={handlePrevGlyph}
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                title="前の文字"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileTab('glyphs')}
                className="px-2 min-h-[32px] flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer"
                title="文字一覧を開く"
              >
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {currentGlyph.char}
                </span>
                <span className="text-[9px] font-mono opacity-60">
                  U+{(currentUnicode || 0).toString(16).toUpperCase()}
                </span>
              </button>
              <button
                onClick={handleNextGlyph}
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                title="次の文字"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="元に戻す"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="やり直し"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DESKTOP RESOLUTION PRESET BAR */}
        <PixelPresetsPanel
          preset={preset}
          onPresetSelect={handlePresetSelect}
          gridWidth={gridWidth}
          setGridWidth={setGridWidth}
          gridHeight={gridHeight}
          setGridHeight={setGridHeight}
          onRequestGridSizeChange={requestGridSizeChange}
          loadGlyphPixelGrid={loadGlyphPixelGrid}
          currentUnicode={currentUnicode}
          dotShape={dotShape}
          setDotShape={setDotShape}
          autoSaveGlyph={autoSaveGlyph}
          grid={grid}
          isLight={isLight}
          isMobile={false}
          onShowToast={onShowToast}
        />

        {/* MAIN WORKSPACE AREA */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* DESKTOP GLYPH DRAWER */}
          {showGlyphDrawer && (
            <PixelGlyphDrawer
              displayedGlyphList={displayedGlyphList}
              currentUnicode={currentUnicode}
              glyphSearchQuery={glyphSearchQuery}
              setGlyphSearchQuery={setGlyphSearchQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onSelectGlyphItem={handleSelectGlyphItem}
              isLight={isLight}
              isMobile={false}
            />
          )}

          {/* DESKTOP DRAWING TOOLS SIDEBAR */}
          <PixelToolbar
            tool={tool}
            setTool={setTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushStamp={brushStamp}
            setBrushStamp={setBrushStamp}
            symmetryH={symmetryH}
            setSymmetryH={setSymmetryH}
            symmetryV={symmetryV}
            setSymmetryV={setSymmetryV}
            isLight={isLight}
            isMobile={false}
          />

          {/* CANVAS WORKSPACE (DESKTOP ALWAYS, MOBILE ON 'canvas' TAB) */}
          <div
            className={`${
              mobileTab === 'canvas' ? 'flex' : 'hidden md:flex'
            } flex-1 flex-col items-center justify-between p-1.5 sm:p-3 relative overflow-hidden bg-stone-200/70 dark:bg-[#060a08]`}
          >
            {/* Top Transform & Quick FX Toolbar */}
            <div
              className={`w-full z-10 flex items-center justify-between p-1 sm:p-1.5 border overflow-x-auto no-scrollbar gap-1 max-sm:flex-wrap ${
                isLight ? 'bg-white/95 border-stone-300 text-stone-800' : 'bg-[#101812]/95 border-[#294232] text-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={historyIdx <= 0}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 disabled:opacity-30 transition-opacity cursor-pointer"
                  title="元に戻す (Undo)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIdx >= history.length - 1}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 disabled:opacity-30 transition-opacity cursor-pointer"
                  title="やり直し (Redo)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-0.5 sm:mx-1" />

                <button
                  onClick={() => handleShift(-1, 0)}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="左に1px移動"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(0, -1)}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="上に1px移動"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(0, 1)}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="下に1px移動"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(1, 0)}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="右に1px移動"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={handleFlipH}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="左右反転"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleFlipV}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="上下反転"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRotate90}
                  className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="90度回転"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleInvert}
                  className="px-2 py-1 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-bold cursor-pointer"
                  title="階調反転"
                >
                  反転
                </button>
                <button
                  onClick={handleAddOutline}
                  className="px-2 py-1 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-bold cursor-pointer"
                  title="1px 輪郭を太らせる"
                >
                  輪郭+
                </button>
                <button
                  onClick={handleAddShadow}
                  className="px-2 py-1 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-bold cursor-pointer"
                  title="右下に1px シャドウ"
                >
                  影+
                </button>

                <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-0.5 sm:mx-1" />

                <button
                  onClick={handleClear}
                  className="p-1.5 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                  title="全消去"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Rendering */}
            <PixelDrawingCanvas
              canvasRef={canvasRef}
              grid={grid}
              previewGrid={previewGrid}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              isLight={isLight}
              dotShape={dotShape}
              showGridLines={showGridLines}
              showSubdivisions={showSubdivisions}
              showMetricsGuides={showMetricsGuides}
              showTrace={showTrace}
              traceSource={traceSource}
              traceChar={traceChar}
              currentGlyph={currentGlyph}
              traceFontFamily={traceFontFamily}
              traceOpacity={traceOpacity}
              traceScale={traceScale}
              traceOffsetX={traceOffsetX}
              traceOffsetY={traceOffsetY}
              traceImageVersion={traceImageVersion}
              traceImageRef={traceImageRef}
              hoverPos={hoverPos}
              isDrawing={isDrawing}
              brushSize={brushSize}
              brushStamp={brushStamp}
              project={project}
              handlePointerDown={handlePointerDown}
              handlePointerMove={handlePointerMove}
              handlePointerUp={handlePointerUp}
              handlePointerCancel={handlePointerCancel}
              onPointerLeave={() => setHoverPos(null)}
            />

            {/* Mobile Bottom Floating Tool Dock */}
            <PixelToolbar
              tool={tool}
              setTool={setTool}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              brushStamp={brushStamp}
              setBrushStamp={setBrushStamp}
              symmetryH={symmetryH}
              setSymmetryH={setSymmetryH}
              symmetryV={symmetryV}
              setSymmetryV={setSymmetryV}
              isLight={isLight}
              isMobile={true}
              showTrace={showTrace}
              setShowTrace={setShowTrace}
            />

            {/* Desktop Bottom Controls Bar */}
            <div className="hidden md:flex w-full items-center justify-between pt-1">
              <div className="flex items-center space-x-2 bg-white/95 dark:bg-[#101812]/95 px-3 py-1 border border-stone-300 dark:border-stone-800 text-[11px] font-bold">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGridLines}
                    onChange={(e) => setShowGridLines(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>方眼線</span>
                </label>
                <span className="opacity-40">|</span>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSubdivisions}
                    onChange={(e) => setShowSubdivisions(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>中心線</span>
                </label>
                <span className="opacity-40">|</span>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMetricsGuides}
                    onChange={(e) => setShowMetricsGuides(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>基準線 (Baseline)</span>
                </label>
                <span className="opacity-40">|</span>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTrace}
                    onChange={(e) => setShowTrace(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-emerald-600 dark:text-emerald-400">下絵表示</span>
                </label>
                {dotShape === 'square' && (
                  <>
                    <span className="opacity-40">|</span>
                    <label
                      className="flex items-center space-x-1 cursor-pointer"
                      title="隣接する正方形ドットを1つの輪郭パスに最適化結合します"
                    >
                      <input
                        type="checkbox"
                        checked={mergeContours}
                        onChange={(e) => {
                          const nextMerge = e.target.checked;
                          setMergeContours(nextMerge);
                          autoSaveGlyph(
                            currentGridRef.current,
                            currentUnicode,
                            undefined,
                            undefined,
                            undefined,
                            nextMerge
                          );
                        }}
                        className="accent-emerald-600 cursor-pointer"
                      />
                      <span>輪郭結合</span>
                    </label>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                {currentGlyph.pixelData && currentGlyph.vectorContoursBackup && currentGlyph.vectorContoursBackup.length > 0 && (
                  <button
                    onClick={handleRestoreVectorContours}
                    className="px-2.5 py-1 bg-stone-100 dark:bg-[#142018] hover:bg-stone-200 dark:hover:bg-[#1c2e22] text-xs font-bold flex items-center space-x-1 transition-colors border border-stone-300 dark:border-stone-700 cursor-pointer"
                    title="ピクセル化する前のベクター輪郭に戻します"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ベクター輪郭に戻す</span>
                  </button>
                )}
                <label className="flex items-center space-x-1 text-xs font-bold">
                  <span>PNG倍率</span>
                  <select
                    value={pngScale}
                    onChange={(e) => setPngScale(parseInt(e.target.value, 10))}
                    className="px-1 py-1 border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#142018] text-xs font-mono cursor-pointer"
                    title="単体PNG出力の拡大倍率"
                  >
                    {[1, 2, 4, 8, 16, 32].map((s) => (
                      <option key={s} value={s}>
                        {s}倍
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={handleExportSinglePng}
                  className="px-2.5 py-1 bg-stone-100 dark:bg-[#142018] hover:bg-stone-200 dark:hover:bg-[#1c2e22] text-xs font-bold flex items-center space-x-1 transition-colors border border-stone-300 dark:border-stone-700 cursor-pointer"
                  title="ドット絵を単体PNGとして保存"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>単体PNG</span>
                </button>
              </div>
            </div>
          </div>

          {/* DESKTOP TRACE SETTINGS PANEL */}
          {showTracePanel && (
            <div
              className={`hidden md:flex w-64 border-l-2 p-3 flex-col gap-3 shrink-0 overflow-y-auto ${
                isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-[#0f1712] border-[#294232] text-emerald-100'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-300 dark:border-stone-800 pb-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                  <ImageIcon className="w-4 h-4" />
                  <span>下絵・トレース設定</span>
                </span>
                <button
                  onClick={() => setShowTracePanel(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                  title="下絵設定を閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <label className="flex items-center justify-between p-2 border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018] text-xs font-bold cursor-pointer">
                <span>キャンバスに下絵を表示</span>
                <input
                  type="checkbox"
                  checked={showTrace}
                  onChange={(e) => setShowTrace(e.target.checked)}
                  className="accent-emerald-600 cursor-pointer w-4 h-4"
                />
              </label>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setTraceSource('font')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                    traceSource === 'font'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isLight
                      ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      : 'bg-[#142018] border-stone-700 text-stone-300 hover:bg-[#1e2f24]'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>システム文字</span>
                </button>
                <button
                  onClick={() => {
                    setTraceSource('image');
                    if (!traceImageSrc) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                    traceSource === 'image'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isLight
                      ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                      : 'bg-[#142018] border-stone-700 text-stone-300 hover:bg-[#1e2f24]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>画像読込</span>
                </button>
              </div>

              {traceSource === 'font' ? (
                <div className="space-y-2 p-2 border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018]">
                  <div className="text-[11px] font-bold opacity-75">参照文字・書体:</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={traceChar}
                      onChange={(e) => setTraceChar(e.target.value)}
                      placeholder="文字"
                      className="w-12 text-center font-bold text-sm py-1 border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                    />
                    <select
                      value={traceFontFamily}
                      onChange={(e) => setTraceFontFamily(e.target.value)}
                      className="flex-1 text-xs py-1 px-1.5 border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                    >
                      <option value="sans-serif">ゴシック体</option>
                      <option value="serif">明朝体</option>
                      <option value="monospace">等幅</option>
                      <option value="cursive">手書き風</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2 border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold opacity-75">画像ファイル:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {traceImageSrc ? '読込済み' : '未選択'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>画像選択</span>
                    </button>
                    {traceImageSrc && (
                      <button
                        onClick={() => {
                          setTraceImageSrc(null);
                          traceImageRef.current = null;
                          onShowToast('下絵画像をクリアしました', 'info');
                        }}
                        className="px-2 py-1.5 text-xs font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 cursor-pointer"
                      >
                        クリア
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold opacity-75">透明度:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{traceOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={traceOpacity}
                  onChange={(e) => setTraceOpacity(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold opacity-75">拡大率:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{traceScale}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={traceScale}
                  onChange={(e) => setTraceScale(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 p-2 border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018] text-xs">
                <div className="flex justify-between">
                  <span className="font-bold opacity-75">位置調整 (X/Y):</span>
                  <span className="font-mono text-[11px]">
                    {traceOffsetX}, {traceOffsetY}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTraceOffsetX((v) => v - 1)}
                      className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="左へ"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTraceOffsetX((v) => v + 1)}
                      className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="右へ"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTraceOffsetY((v) => v - 1)}
                      className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="上へ"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTraceOffsetY((v) => v + 1)}
                      className="p-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="下へ"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(traceOffsetX !== 0 || traceOffsetY !== 0) && (
                    <button
                      onClick={() => {
                        setTraceOffsetX(0);
                        setTraceOffsetY(0);
                      }}
                      className="px-2 py-1 text-[11px] font-bold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>戻す</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold opacity-75">抽出感度 (閾値):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {traceThreshold} / 255
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="245"
                  value={traceThreshold}
                  onChange={(e) => setTraceThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <button
                onClick={handleAutoBinarizeTrace}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-400 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>下絵から自動ドット化</span>
              </button>
            </div>
          )}

          {/* MOBILE GLYPHS TAB */}
          {mobileTab === 'glyphs' && (
            <PixelGlyphDrawer
              displayedGlyphList={displayedGlyphList}
              currentUnicode={currentUnicode}
              glyphSearchQuery={glyphSearchQuery}
              setGlyphSearchQuery={setGlyphSearchQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onSelectGlyphItem={(u) => {
                handleSelectGlyphItem(u);
                setMobileTab('canvas');
              }}
              isLight={isLight}
              isMobile={true}
            />
          )}

          {/* MOBILE PRESETS TAB */}
          {mobileTab === 'presets' && (
            <PixelPresetsPanel
              preset={preset}
              onPresetSelect={handlePresetSelect}
              gridWidth={gridWidth}
              setGridWidth={setGridWidth}
              gridHeight={gridHeight}
              setGridHeight={setGridHeight}
              onRequestGridSizeChange={requestGridSizeChange}
              loadGlyphPixelGrid={loadGlyphPixelGrid}
              currentUnicode={currentUnicode}
              dotShape={dotShape}
              setDotShape={setDotShape}
              autoSaveGlyph={autoSaveGlyph}
              grid={grid}
              isLight={isLight}
              isMobile={true}
              onReturnToCanvas={() => setMobileTab('canvas')}
              showTrace={showTrace}
              setShowTrace={setShowTrace}
              traceSource={traceSource}
              setTraceSource={setTraceSource}
              traceChar={traceChar}
              setTraceChar={setTraceChar}
              traceFontFamily={traceFontFamily}
              setTraceFontFamily={setTraceFontFamily}
              traceImageSrc={traceImageSrc}
              setTraceImageSrc={setTraceImageSrc}
              traceOpacity={traceOpacity}
              setTraceOpacity={setTraceOpacity}
              traceScale={traceScale}
              setTraceScale={setTraceScale}
              traceOffsetX={traceOffsetX}
              setTraceOffsetX={setTraceOffsetX}
              traceOffsetY={traceOffsetY}
              setTraceOffsetY={setTraceOffsetY}
              traceThreshold={traceThreshold}
              setTraceThreshold={setTraceThreshold}
              handleAutoBinarizeTrace={handleAutoBinarizeTrace}
              fileInputRef={fileInputRef}
              traceImageRef={traceImageRef}
              showGridLines={showGridLines}
              setShowGridLines={setShowGridLines}
              showSubdivisions={showSubdivisions}
              setShowSubdivisions={setShowSubdivisions}
              symmetryH={symmetryH}
              setSymmetryH={setSymmetryH}
              symmetryV={symmetryV}
              setSymmetryV={setSymmetryV}
              onShowToast={onShowToast}
            />
          )}

          {/* MOBILE EXPORT TAB */}
          {mobileTab === 'export' && (
            <PixelExportPanel
              previewText={previewText}
              setPreviewText={setPreviewText}
              handleExportFontFile={handleExportFontFile}
              handleExportSpritesheet={handleExportSpritesheet}
              handleExportCHeader={handleExportCHeader}
              handleExportSinglePng={handleExportSinglePng}
              currentGlyph={currentGlyph}
              project={project}
              grid={grid}
              currentUnicode={currentUnicode}
              dotShape={dotShape}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              totalDrawnPixelGlyphs={totalDrawnPixelGlyphs}
              activePixelCount={activePixelCount}
              isLight={isLight}
              isMobile={true}
              pngScale={pngScale}
              onPngScaleChange={setPngScale}
            />
          )}

          {/* DESKTOP RIGHT PANEL */}
          <PixelExportPanel
            previewText={previewText}
            setPreviewText={setPreviewText}
            handleExportFontFile={handleExportFontFile}
            handleExportSpritesheet={handleExportSpritesheet}
            handleExportCHeader={handleExportCHeader}
            handleExportSinglePng={handleExportSinglePng}
            currentGlyph={currentGlyph}
            project={project}
            grid={grid}
            currentUnicode={currentUnicode}
            dotShape={dotShape}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            totalDrawnPixelGlyphs={totalDrawnPixelGlyphs}
            activePixelCount={activePixelCount}
            isLight={isLight}
            isMobile={false}
          />
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <div
          className={`flex md:hidden items-center justify-around h-14 shrink-0 border-t z-30 shadow-lg ${themeClasses.headerBg} ${themeClasses.border}`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2px)' }}
        >
          {[
            { id: 'canvas' as const, label: '描画', icon: Pencil },
            { id: 'glyphs' as const, label: '文字一覧', icon: BookOpen, badge: `${totalDrawnPixelGlyphs}` },
            { id: 'presets' as const, label: '規格・下絵', icon: Grid },
            { id: 'export' as const, label: '出力・テスト', icon: Gamepad2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
                  isActive
                    ? `${themeClasses.accentText} font-extrabold`
                    : `${themeClasses.textMuted} hover:opacity-90`
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge && parseInt(tab.badge, 10) > 0 && (
                    <span className="absolute -top-1.5 -right-3 text-[8.5px] font-mono px-1 rounded-full bg-emerald-600 text-white font-bold leading-tight">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
                {isActive && <div className="w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PixelFontStudioModal;
