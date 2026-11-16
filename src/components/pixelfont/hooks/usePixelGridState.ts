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
  const historyRef = useRef<Uint8Array[]>([]);
  const historyIdxRef = useRef<number>(-1);

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

  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const settings = projectRef.current.pixelFontSettings;
      if (settings) {
        const w = settings.defaultWidth || 16;
        const h = settings.defaultHeight || 16;
        const found = PRESET_SIZES.find((p) => p.w === w && p.h === h);
        setPreset(found ? found.id : 'custom');
        setGridWidth(w);
        setGridHeight(h);
        setDotShape(settings.dotShape || 'square');
        setMergeContours(settings.mergeContours ?? true);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const autoSaveGlyph = useCallback(
    (
      targetGrid: Uint8Array,
      uCode: number = currentUnicode,
      customW?: number,
      customH?: number,
      customDotShape?: PixelDotShape,
      customMergeContours?: boolean
    ) => {
      const w = customW ?? gridWidth;
      const h = customH ?? gridHeight;
      const shape = customDotShape ?? dotShape;
      const merge = customMergeContours ?? mergeContours;

      setProject((prev) => {
        const upm = prev.metadata.unitsPerEm || 1000;
        const ascender = prev.metadata.ascender ?? 800;
        const descender = prev.metadata.descender ?? -200;
        const existing = prev.glyphs[uCode];
        const fallbackChar = uCode > 0 ? String.fromCodePoint(uCode) : 'A';
        const g: GlyphData = existing || {
          unicode: uCode,
          char: fallbackChar,
          name: `uni${(uCode || 65).toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: upm,
          lsb: 50,
          contours: [],
        };

        const contours = pixelGridToContours(
          targetGrid,
          w,
          h,
          upm,
          ascender,
          descender,
          g.advanceWidth || upm,
          shape,
          merge
        );

        const vectorContoursBackup =
          g.vectorContoursBackup || (g.pixelData ? undefined : g.contours && g.contours.length > 0 ? g.contours : undefined);

        const pixelData: PixelGlyphData = {
          width: w,
          height: h,
          data: Array.from(targetGrid),
          shape,
        };

        return {
          ...prev,
          pixelFontSettings: {
            isPixelFontProject: true,
            defaultWidth: w,
            defaultHeight: h,
            dotShape: shape,
            mergeContours: merge,
          },
          glyphs: {
            ...prev.glyphs,
            [uCode]: {
              ...g,
              unicode: uCode,
              char: g.char || fallbackChar,
              contours,
              vectorContoursBackup,
              pixelData,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [currentUnicode, gridWidth, gridHeight, dotShape, mergeContours, setProject]
  );

  const autoSaveGlyphRef = useRef(autoSaveGlyph);
  autoSaveGlyphRef.current = autoSaveGlyph;

  const loadGlyphPixelGrid = useCallback((uCode: number, w: number, h: number) => {
    const proj = projectRef.current;
    const g = proj.glyphs[uCode];
    let loadedGrid = new Uint8Array(w * h);

    if (g && g.pixelData && g.pixelData.data && g.pixelData.data.length > 0) {
      if (g.pixelData.data.length === w * h && g.pixelData.width === w && g.pixelData.height === h) {
        loadedGrid = new Uint8Array(g.pixelData.data);
      } else if (
        g.pixelData.width &&
        g.pixelData.height &&
        g.pixelData.data.length === g.pixelData.width * g.pixelData.height
      ) {
        loadedGrid = new Uint8Array(resamplePixelGrid(g.pixelData.data, g.pixelData.width, g.pixelData.height, w, h));
        autoSaveGlyphRef.current(loadedGrid, uCode, w, h);
      } else if (g.pixelData.data.length === w * h) {
        loadedGrid = new Uint8Array(g.pixelData.data);
      }
    } else if (g && g.contours && g.contours.length > 0) {
      loadedGrid = new Uint8Array(
        rasterizeGlyphToPixelGrid(
          g,
          w,
          h,
          proj.metadata.unitsPerEm || 1000,
          proj.metadata.ascender ?? 800,
          proj.metadata.descender ?? -200
        )
      );
    }

    currentGridRef.current = loadedGrid;
    const initialHist = [new Uint8Array(loadedGrid)];
    historyRef.current = initialHist;
    historyIdxRef.current = 0;
    setGrid(loadedGrid);
    setHistory(initialHist);
    setHistoryIdx(0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadGlyphPixelGrid(currentUnicode, gridWidth, gridHeight);
    }
  }, [isOpen, currentUnicode, gridWidth, gridHeight, loadGlyphPixelGrid]);

  const pushHistory = useCallback(
    (nextGrid: Uint8Array) => {
      const prevHist = historyRef.current;
      const prevIdx = historyIdxRef.current;
      const newHistory: Uint8Array[] = prevHist.slice(0, prevIdx + 1).map((h) => new Uint8Array(h));
      newHistory.push(new Uint8Array(nextGrid));
      if (newHistory.length > 40) newHistory.shift();
      const nextIdx = newHistory.length - 1;

      historyRef.current = newHistory;
      historyIdxRef.current = nextIdx;
      currentGridRef.current = nextGrid;

      setHistory(newHistory);
      setHistoryIdx(nextIdx);
      setGrid(nextGrid);
      autoSaveGlyphRef.current(nextGrid, currentUnicode);
    },
    [currentUnicode]
  );

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      const targetIdx = historyIdxRef.current - 1;
      const targetGrid = new Uint8Array(historyRef.current[targetIdx]);
      historyIdxRef.current = targetIdx;
      currentGridRef.current = targetGrid;
      setHistoryIdx(targetIdx);
      setGrid(targetGrid);
      autoSaveGlyphRef.current(targetGrid, currentUnicode);
    }
  }, [currentUnicode]);

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      const targetIdx = historyIdxRef.current + 1;
      const targetGrid = new Uint8Array(historyRef.current[targetIdx]);
      historyIdxRef.current = targetIdx;
      currentGridRef.current = targetGrid;
      setHistoryIdx(targetIdx);
      setGrid(targetGrid);
      autoSaveGlyphRef.current(targetGrid, currentUnicode);
    }
  }, [currentUnicode]);

  const handleShift = useCallback(
    (dx: number, dy: number) => {
      const src = currentGridRef.current;
      const next = new Uint8Array(gridWidth * gridHeight);
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            next[ny * gridWidth + nx] = src[y * gridWidth + x];
          }
        }
      }
      pushHistory(next);
    },
    [gridWidth, gridHeight, pushHistory]
  );

  const handlePresetSelect = (p: PixelGridPreset) => {
    setPreset(p);
    const found = PRESET_SIZES.find((item) => item.id === p);
    if (found && p !== 'custom') {
      setGridWidth(found.w);
      setGridHeight(found.h);
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
    const src = currentGridRef.current;
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let i = 0; i < src.length; i++) {
      next[i] = src[i] === 1 ? 0 : 1;
    }
    pushHistory(next);
  };

  const handleFlipH = () => {
    const src = currentGridRef.current;
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[y * gridWidth + (gridWidth - 1 - x)] = src[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleFlipV = () => {
    const src = currentGridRef.current;
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[(gridHeight - 1 - y) * gridWidth + x] = src[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleRotate90 = () => {
    if (gridWidth !== gridHeight) {
      onShowToast('回転は正方形グリッドのみ対応しています', 'info');
      return;
    }
    const src = currentGridRef.current;
    const next = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        next[x * gridWidth + (gridHeight - 1 - y)] = src[y * gridWidth + x];
      }
    }
    pushHistory(next);
  };

  const handleAddOutline = () => {
    const src = currentGridRef.current;
    const next = new Uint8Array(src);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (src[y * gridWidth + x] === 1) {
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
    const src = currentGridRef.current;
    const next = new Uint8Array(src);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (src[y * gridWidth + x] === 1) {
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
