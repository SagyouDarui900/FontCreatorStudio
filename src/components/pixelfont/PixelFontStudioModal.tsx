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
} from 'lucide-react';
import { FontProject, GlyphData } from '../../types';
import { shareOrDownloadFont } from '../../utils/fontCompiler';
import { pixelGridToContours, rasterizeGlyphToPixelGrid } from '../../utils/pixelFontUtils';
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
  selectedUnicode,
  onSelectGlyph,
  onShowToast,
}) => {
  const [glyphSearchQuery, setGlyphSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showGlyphDrawer, setShowGlyphDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'glyphs' | 'presets' | 'export'>('canvas');
  const [previewText, setPreviewText] = useState<string>('あいうえお ABC 123');

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
  }, [isOpen, handleUndo, handleRedo, onClose, handleShift, setTool]);

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
    autoSaveGlyph(currentGridRef.current, currentUnicode, gridWidth, gridHeight);
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

  // Export handlers
  const handleExportFontFile = async (format: 'otf' | 'ttf' = 'otf') => {
    autoSaveGlyph(grid, currentUnicode);

    const updatedGlyphs: Record<number, GlyphData> = { ...project.glyphs };
    const isCurrentActive = grid.some((p) => p === 1);
    if (isCurrentActive) {
      const currentContours = pixelGridToContours(
        grid,
        gridWidth,
        gridHeight,
        project.metadata.unitsPerEm || 1000,
        project.metadata.ascender || 800,
        project.metadata.descender || -200,
        currentGlyph.advanceWidth || 1000,
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
          data: Array.from(grid),
          shape: dotShape,
        },
        modified: true,
      };
    }

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
        const gGrid = new Uint8Array(g.pixelData.data);
        if (gGrid.some((d) => d === 1)) {
          const c = pixelGridToContours(
            gGrid,
            g.pixelData.width || gridWidth,
            g.pixelData.height || gridHeight,
            project.metadata.unitsPerEm || 1000,
            project.metadata.ascender || 800,
            project.metadata.descender || -200,
            g.advanceWidth || 1000,
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
      console.error('Failed to export OTF/TTF font:', err);
      onShowToast(`フォントの書き出しに失敗しました: ${err?.message || '不明なエラー'}`, 'error');
    }
  };

  const handleExportSinglePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel_${currentGlyph.char}_${gridWidth}x${gridHeight}.png`;
    a.click();
    onShowToast(`「${currentGlyph.char}」のPNG画像をダウンロードしました`, 'success');
  };

  const handleExportSpritesheet = () => {
    autoSaveGlyph(grid, currentUnicode);
    const entries = (Object.entries(project.glyphs) as [string, GlyphData][]).filter(
      ([_, g]) => (g.pixelData && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
    );

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

      const gGrid =
        g.pixelData && g.pixelData.data
          ? new Uint8Array(g.pixelData.data)
          : rasterizeGlyphToPixelGrid(g, gridWidth, gridHeight);

      sCtx.fillStyle = '#ffffff';
      for (let gy = 0; gy < gridHeight; gy++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          if (gGrid[gy * gridWidth + gx] === 1) {
            sCtx.fillRect(startX + gx, startY + gy, 1, 1);
          }
        }
      }

      atlasJson[g.char || String.fromCodePoint(u)] = {
        char: g.char || String.fromCodePoint(u),
        unicode: u,
        x: startX,
        y: startY,
        w: gridWidth,
        h: gridHeight,
      };
    });

    const pngUrl = sheetCanvas.toDataURL('image/png');
    const aPng = document.createElement('a');
    aPng.href = pngUrl;
    aPng.download = `${project.name || 'pixel_font'}_spritesheet_${gridWidth}x${gridHeight}.png`;
    aPng.click();

    const jsonBlob = new Blob([JSON.stringify({ fontName: project.name, gridWidth, gridHeight, glyphs: atlasJson }, null, 2)], {
      type: 'application/json',
    });
    const aJson = document.createElement('a');
    aJson.href = URL.createObjectURL(jsonBlob);
    aJson.download = `${project.name || 'pixel_font'}_atlas.json`;
    aJson.click();

    onShowToast(`全 ${entries.length} 文字のスプライトシート (PNG + JSON) を出力しました`, 'success');
  };

  const handleExportCHeader = () => {
    autoSaveGlyph(grid, currentUnicode);
    const entries = (Object.entries(project.glyphs) as [string, GlyphData][]).filter(
      ([_, g]) => (g.pixelData && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
    );

    if (entries.length === 0) {
      onShowToast('作成済みのドット文字がありません', 'warning');
      return;
    }

    let code = `// Pixel Font: ${project.name || 'PixelFont'}\n`;
    code += `// Resolution: ${gridWidth}x${gridHeight}\n`;
    code += `// Total Glyphs: ${entries.length}\n\n`;
    code += `#ifndef PIXEL_FONT_${(project.name || 'FONT').toUpperCase()}_H\n`;
    code += `#define PIXEL_FONT_${(project.name || 'FONT').toUpperCase()}_H\n\n`;
    code += `#include <stdint.h>\n\n`;
    code += `const uint8_t FONT_WIDTH = ${gridWidth};\n`;
    code += `const uint8_t FONT_HEIGHT = ${gridHeight};\n\n`;

    entries.forEach(([uStr, g]) => {
      const u = parseInt(uStr, 10);
      const gGrid =
        g.pixelData && g.pixelData.data
          ? new Uint8Array(g.pixelData.data)
          : rasterizeGlyphToPixelGrid(g, gridWidth, gridHeight);

      code += `// Character: '${g.char}' (U+${u.toString(16).toUpperCase()})\n`;
      code += `const uint8_t glyph_0x${u.toString(16).toUpperCase()}[] = {\n`;

      const bytesPerRow = Math.ceil(gridWidth / 8);
      for (let y = 0; y < gridHeight; y++) {
        code += ' ';
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

    code += `#endif // PIXEL_FONT_${(project.name || 'FONT').toUpperCase()}_H\n`;

    const blob = new Blob([code], { type: 'text/x-c' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name || 'pixel_font'}_${gridWidth}x${gridHeight}.h`;
    a.click();
    onShowToast('C言語ヘッダー形式ビットマップ配列を出力しました', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 bg-black/85 animate-in fade-in duration-150 pointer-events-auto"
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
          isFullscreen ? 'h-full max-h-none' : 'max-w-7xl h-full sm:h-[95vh] sm:max-h-[920px]'
        } rounded-none border-0 sm:border-2 shadow-2xl flex flex-col overflow-hidden select-none transition-colors ${
          isLight ? 'bg-white border-stone-400 text-stone-900' : 'bg-[#0c130f] border-[#294232] text-emerald-100'
        }`}
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
          className={`hidden md:flex items-center justify-between px-3 sm:px-4 py-2 border-b-2 shrink-0 ${
            isLight ? 'bg-stone-100 border-stone-300' : 'bg-[#121c16] border-[#294232]'
          }`}
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
              className="px-2.5 py-1 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 border border-emerald-400 active:scale-95 transition-all cursor-pointer"
              title="作成したピクセルフォントを直接OTF形式でダウンロード (.otf)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>OTF出力</span>
            </button>

            <button
              onClick={() => setShowGlyphDrawer(!showGlyphDrawer)}
              className={`px-2.5 py-1 text-xs font-bold border flex items-center space-x-1 transition-all cursor-pointer ${
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
                setShowTracePanel(!showTracePanel);
                if (!showTrace) setShowTrace(true);
              }}
              className={`px-2.5 py-1 text-xs font-bold border flex items-center space-x-1 transition-all cursor-pointer ${
                showTrace
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
          className={`flex md:hidden items-center justify-between px-2.5 py-1.5 border-b shrink-0 ${
            isLight ? 'bg-stone-100 border-stone-300' : 'bg-[#121c16] border-[#294232]'
          }`}
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
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
              title="元に戻す"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
              title="やり直し"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 active:scale-95 transition-all cursor-pointer"
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
              className={`w-full z-10 flex items-center justify-between p-1 sm:p-1.5 border overflow-x-auto no-scrollbar gap-1 ${
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
              </div>

              <div className="flex items-center space-x-1.5">
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
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              totalDrawnPixelGlyphs={totalDrawnPixelGlyphs}
              activePixelCount={activePixelCount}
              isLight={isLight}
              isMobile={true}
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
          className={`flex md:hidden items-center justify-around h-14 shrink-0 border-t z-30 ${
            isLight ? 'bg-white/98 border-stone-300 shadow-lg' : 'bg-[#0a0f0c]/98 border-[#294232]'
          }`}
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
                className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 transition-all relative cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : isLight
                    ? 'text-stone-500 hover:text-stone-900'
                    : 'text-stone-400 hover:text-stone-100'
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
