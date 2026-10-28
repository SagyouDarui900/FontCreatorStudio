import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FontProject, GlyphData, PixelGlyphData } from '../../../types';
import { PixelGridPreset, PixelDotShape } from '../types';
import { PRESET_SIZES } from '../constants';
import {
  resamplePixelGrid,
  pixelGridToContours,
  rasterizeGlyphToPixelGrid,
} from '../../../utils/pixelFontUtils';

interface UsePixelGridStateProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  selectedUnicode: number;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function usePixelGridState({
  project,
  setProject,
  isOpen,
  selectedUnicode,
  onShowToast,
}: UsePixelGridStateProps) {
  const defaultW = project.pixelFontSettings?.defaultWidth || 16;
  const defaultH = project.pixelFontSettings?.defaultHeight || 16;

  const [preset, setPreset] = useState<PixelGridPreset>(() => {
    const found = PRESET_SIZES.find((p) => p.w === defaultW && p.h === defaultH);
    return found ? found.id : 'custom';
  });
  const [gridWidth, setGridWidth] = useState<number>(defaultW);
  const [gridHeight, setGridHeight] = useState<number>(defaultH);

  const [currentUnicode, setCurrentUnicode] = useState<number>(selectedUnicode);
  const [dotShape, setDotShape] = useState<PixelDotShape>(project.pixelFontSettings?.dotShape || 'square');
  const [mergeContours, setMergeContours] = useState<boolean>(project.pixelFontSettings?.mergeContours ?? true);

  const [grid, setGrid] = useState<Uint8Array>(() => new Uint8Array(defaultW * defaultH));
  const currentGridRef = useRef<Uint8Array>(grid);
  useEffect(() => {
    currentGridRef.current = grid;
  }, [grid]);

  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const projectRef = useRef(project);
  projectRef.current = project;

  const currentGlyph = useMemo(() => {
    return (
      project.glyphs[currentUnicode] || {
        unicode: currentUnicode,
        char: String.fromCodePoint(currentUnicode || 65),
        name: `uni${(currentUnicode || 65).toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: project.metadata.unitsPerEm || 1000,
        lsb: 50,
        contours: [],
      }
    );
  }, [project.glyphs, currentUnicode, project.metadata.unitsPerEm]);

  useEffect(() => {
    if (selectedUnicode) {
      setCurrentUnicode(selectedUnicode);
    }
  }, [selectedUnicode]);

  const autoSaveGlyph = useCallback(
    (targetGrid: Uint8Array, uCode: number = currentUnicode, customW?: number, customH?: number) => {
      const proj = projectRef.current;
      const w = customW ?? gridWidth;
      const h = customH ?? gridHeight;
      const g = proj.glyphs[uCode] || currentGlyph;
      const contours = pixelGridToContours(
        targetGrid,
        w,
        h,
        proj.metadata.unitsPerEm || 1000,
        proj.metadata.ascender || 800,
        proj.metadata.descender || -200,
        g.advanceWidth || 1000,
        dotShape,
        mergeContours
      );

      const vectorContoursBackup =
        g.vectorContoursBackup || (g.pixelData ? undefined : g.contours && g.contours.length > 0 ? g.contours : undefined);

      const pixelData: PixelGlyphData = {
        width: w,
        height: h,
        data: Array.from(targetGrid),
        shape: dotShape,
      };

      setProject((prev) => ({
        ...prev,
        pixelFontSettings: {
          isPixelFontProject: true,
          defaultWidth: w,
          defaultHeight: h,
          dotShape,
          mergeContours,
        },
        glyphs: {
          ...prev.glyphs,
          [uCode]: {
            ...g,
            unicode: uCode,
            char: g.char || String.fromCodePoint(uCode),
            contours,
            vectorContoursBackup,
            pixelData,
            modified: true,
          },
        },
        updatedAt: Date.now(),
      }));
    },
    [currentUnicode, currentGlyph, gridWidth, gridHeight, dotShape, mergeContours, setProject]
  );

  const loadGlyphPixelGrid = useCallback(
    (uCode: number, w: number, h: number) => {
      const proj = projectRef.current;
      const g = proj.glyphs[uCode];
      let loadedGrid = new Uint8Array(w * h);

      if (g && g.pixelData && g.pixelData.data && g.pixelData.data.length > 0) {
        if (g.pixelData.data.length === w * h) {
          loadedGrid = new Uint8Array(g.pixelData.data);
        } else if (g.pixelData.width && g.pixelData.height && g.pixelData.data.length === g.pixelData.width * g.pixelData.height) {
          loadedGrid = new Uint8Array(resamplePixelGrid(g.pixelData.data, g.pixelData.width, g.pixelData.height, w, h));
          autoSaveGlyph(loadedGrid, uCode, w, h);
        }
      } else if (g && g.contours && g.contours.length > 0) {
        loadedGrid = new Uint8Array(
          rasterizeGlyphToPixelGrid(
            g,
            w,
            h,
            proj.metadata.unitsPerEm || 1000,
            proj.metadata.ascender || 800,
            proj.metadata.descender || -200
          )
        );
      }

      currentGridRef.current = loadedGrid;
      setGrid(loadedGrid);
      setHistory([new Uint8Array(loadedGrid)]);
      setHistoryIdx(0);
    },
    [autoSaveGlyph]
  );

  useEffect(() => {
    if (isOpen) {
      loadGlyphPixelGrid(currentUnicode, gridWidth, gridHeight);
    }
  }, [isOpen, currentUnicode, gridWidth, gridHeight, loadGlyphPixelGrid]);

  const pushHistory = useCallback(
    (nextGrid: Uint8Array) => {
      const newHistory: Uint8Array[] = history.slice(0, historyIdx + 1).map((h) => new Uint8Array(h));
      newHistory.push(new Uint8Array(nextGrid));
      if (newHistory.length > 40) newHistory.shift();
      setHistory(newHistory);
      setHistoryIdx(newHistory.length - 1);
      setGrid(nextGrid);
      autoSaveGlyph(nextGrid, currentUnicode);
    },
    [history, historyIdx, autoSaveGlyph, currentUnicode]
  );

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const targetIdx = historyIdx - 1;
      const targetGrid = new Uint8Array(history[targetIdx]);
      setHistoryIdx(targetIdx);
      setGrid(targetGrid);
      autoSaveGlyph(targetGrid, currentUnicode);
    }
  }, [history, historyIdx, autoSaveGlyph, currentUnicode]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const targetIdx = historyIdx + 1;
      const targetGrid = new Uint8Array(history[targetIdx]);
      setHistoryIdx(targetIdx);
      setGrid(targetGrid);
      autoSaveGlyph(targetGrid, currentUnicode);
    }
  }, [history, historyIdx, autoSaveGlyph, currentUnicode]);

  const handleShift = useCallback(
    (dx: number, dy: number) => {
      const next = new Uint8Array(gridWidth * gridHeight);
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            next[ny * gridWidth + nx] = grid[y * gridWidth + x];
          }
        }
      }
      pushHistory(next);
    },
    [gridWidth, gridHeight, grid, pushHistory]
  );

  const handlePresetSelect = (p: PixelGridPreset) => {
    setPreset(p);
    const found = PRESET_SIZES.find((item) => item.id === p);
    if (found && p !== 'custom') {
      setGridWidth(found.w);
      setGridHeight(found.h);
      loadGlyphPixelGrid(currentUnicode, found.w, found.h);
    }
  };

  const activePixelCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) count++;
    }
    return count;
  }, [grid]);

  const totalDrawnPixelGlyphs = useMemo(() => {
    return (Object.values(project.glyphs) as GlyphData[]).filter(
      (g) => (g.pixelData && g.pixelData.data.some((d) => d === 1)) || (g.contours && g.contours.length > 0)
    ).length;
  }, [project.glyphs]);

  const handleClear = () => {
    const empty = new Uint8Array(gridWidth * gridHeight);
    pushHistory(empty);
  };

  const handleInvert = () => {
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let i = 0; i < grid.length; i++) {
      next[i] = grid[i] === 1 ? 0 : 1;
    }
    pushHistory(next);
  };

  const handleFlipH = () => {
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[y * gridWidth + (gridWidth - 1 - x)] = grid[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleFlipV = () => {
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[(gridHeight - 1 - y) * gridWidth + x] = grid[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleRotate90 = () => {
    if (gridWidth !== gridHeight) {
      onShowToast('回転は正方形グリッドのみ対応しています', 'info');
      return;
    }
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[x * gridWidth + (gridHeight - 1 - y)] = grid[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleAddOutline = () => {
    const next = new Uint8Array(grid);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y * gridWidth + x] === 1) {
          const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
            [x + 1, y + 1],
            [x - 1, y + 1],
            [x + 1, y - 1],
            [x - 1, y - 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
              next[ny * gridWidth + nx] = 1;
            }
          }
        }
      }
    }
    pushHistory(next);
  };

  const handleAddShadow = () => {
    const next = new Uint8Array(grid);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y * gridWidth + x] === 1) {
          const nx = x + 1;
          const ny = y + 1;
          if (nx < gridWidth && ny < gridHeight) {
            next[ny * gridWidth + nx] = 1;
          }
        }
      }
    }
    pushHistory(next);
  };

  return {
    preset,
    setPreset,
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
    loadGlyphPixelGrid,
  };
}
