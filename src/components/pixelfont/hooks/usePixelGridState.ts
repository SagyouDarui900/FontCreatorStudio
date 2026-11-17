import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FontProject, GlyphData, PixelGlyphData } from '../../../types';
import { PixelGridPreset, PixelDotShape } from '../types';
import { PRESET_SIZES } from '../constants';
import {
  resamplePixelGrid,
  pixelGridToContours,
  rasterizeGlyphToPixelGrid,
  normalizePixelGrid,
  isPixelDataLengthValid,
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

  // Last grid written to the project by autoSaveGlyph (or loaded from it).
  // Comparing the live grid against this snapshot tells whether the user
  // has unsaved edits, without saving on every glyph switch or load.
  const savedGridRef = useRef<{ unicode: number; width: number; height: number; grid: Uint8Array }>({
    unicode: selectedUnicode,
    width: defaultW,
    height: defaultH,
    grid: new Uint8Array(defaultW * defaultH),
  });
  const prevSizeRef = useRef<{ w: number; h: number }>({ w: defaultW, h: defaultH });

  const isCurrentGridDirty = useCallback(() => {
    const saved = savedGridRef.current;
    const cur = currentGridRef.current;
    if (
      !saved ||
      saved.unicode !== currentUnicode ||
      saved.width !== gridWidth ||
      saved.height !== gridHeight ||
      saved.grid.length !== cur.length
    ) {
      return false;
    }
    for (let i = 0; i < cur.length; i++) {
      if (cur[i] !== saved.grid[i]) return true;
    }
    return false;
  }, [currentUnicode, gridWidth, gridHeight]);

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
      // Only a grid with filled pixels (or an already-pixel project) marks
      // the project as a pixel font project. Merely opening or switching
      // glyphs must not convert a vector project.
      const hasFilledPixels = targetGrid.some((v) => v !== 0);

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

        // The project-wide default grid size is not updated here: drawing
        // one glyph at a different size must not change the default for
        // every other glyph. Defaults change only on explicit preset or
        // size operations (handlePresetSelect / requestGridSizeChange).
        // Keep the existing defaults when present; fall back to the
        // current size only when the project has no settings yet.
        const prevSettings = prev.pixelFontSettings;
        return {
          ...prev,
          pixelFontSettings: {
            isPixelFontProject: hasFilledPixels ? true : (prevSettings?.isPixelFontProject ?? false),
            defaultWidth: prevSettings?.defaultWidth ?? w,
            defaultHeight: prevSettings?.defaultHeight ?? h,
            dotShape: shape,
            mergeContours: merge,
            ...(prevSettings?.proportionalSpacing !== undefined
              ? { proportionalSpacing: prevSettings.proportionalSpacing }
              : {}),
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
      savedGridRef.current = { unicode: uCode, width: w, height: h, grid: new Uint8Array(targetGrid) };
    },
    [currentUnicode, gridWidth, gridHeight, dotShape, mergeContours, setProject]
  );

  const autoSaveGlyphRef = useRef(autoSaveGlyph);
  autoSaveGlyphRef.current = autoSaveGlyph;

  // Save the current glyph only when the live grid differs from the last
  // saved snapshot. Glyph switches and loads use this instead of saving
  // unconditionally.
  const commitCurrentGlyphEdits = useCallback(() => {
    if (isCurrentGridDirty()) {
      autoSaveGlyphRef.current(currentGridRef.current, currentUnicode, gridWidth, gridHeight);
    }
  }, [currentUnicode, gridWidth, gridHeight, isCurrentGridDirty]);

  const loadGlyphPixelGrid = useCallback((uCode: number, w: number, h: number, opts?: { preserveHistory?: boolean }) => {
    const proj = projectRef.current;
    const g = proj.glyphs[uCode];
    // Capture the pre-load grid before replacing it, so a size change can
    // keep the previous state in the history.
    const prevGridBeforeLoad = new Uint8Array(currentGridRef.current);
    const prevSizeBeforeLoad = { ...prevSizeRef.current };
    let loadedGrid = new Uint8Array(w * h);

    if (g && g.pixelData && g.pixelData.data && g.pixelData.data.length > 0) {
      if (!isPixelDataLengthValid(g.pixelData)) {
        // Refuse the broken pixelData instead of silently showing a blank
        // grid: fall back to the vector contours when they exist.
        onShowToast(
          `文字「${g.char || `U+${uCode.toString(16).toUpperCase()}`}」のピクセルデータが破損しています（長さが幅×高さと一致しません）。ピクセルデータの読み込みを中止しました。`,
          'error'
        );
        if (g.contours && g.contours.length > 0) {
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
      } else {
        // Normalize values to 0/1 on load so every path agrees on filled.
        const normalized = normalizePixelGrid(g.pixelData.data);
        if (g.pixelData.data.length === w * h && g.pixelData.width === w && g.pixelData.height === h) {
          loadedGrid = normalized;
        } else if (
          g.pixelData.width &&
          g.pixelData.height &&
          g.pixelData.data.length === g.pixelData.width * g.pixelData.height
        ) {
          // Display-only resample: opening a glyph at another size must
          // not overwrite the stored pixelData.
          loadedGrid = new Uint8Array(resamplePixelGrid(normalized, g.pixelData.width, g.pixelData.height, w, h));
        } else if (g.pixelData.data.length === w * h) {
          loadedGrid = normalized;
        }
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
    savedGridRef.current = { unicode: uCode, width: w, height: h, grid: new Uint8Array(loadedGrid) };
    if (opts?.preserveHistory && historyRef.current.length > 0) {
      // Keep the pre-change state in the history: resample the grid from
      // before the size change to the new size as the first entry, then
      // the loaded grid.
      const resampledPrev =
        prevGridBeforeLoad.length === w * h
          ? new Uint8Array(prevGridBeforeLoad)
          : new Uint8Array(
              resamplePixelGrid(prevGridBeforeLoad, prevSizeBeforeLoad.w, prevSizeBeforeLoad.h, w, h)
            );
      const keptHist = [resampledPrev, new Uint8Array(loadedGrid)];
      historyRef.current = keptHist;
      historyIdxRef.current = 1;
      setGrid(loadedGrid);
      setHistory(keptHist);
      setHistoryIdx(1);
      return;
    }
    const initialHist = [new Uint8Array(loadedGrid)];
    historyRef.current = initialHist;
    historyIdxRef.current = 0;
    setGrid(loadedGrid);
    setHistory(initialHist);
    setHistoryIdx(0);
  }, [onShowToast]);

  useEffect(() => {
    if (isOpen) {
      const sizeChanged = prevSizeRef.current.w !== gridWidth || prevSizeRef.current.h !== gridHeight;
      prevSizeRef.current = { w: gridWidth, h: gridHeight };
      loadGlyphPixelGrid(currentUnicode, gridWidth, gridHeight, { preserveHistory: sizeChanged });
    }
  }, [isOpen, currentUnicode, gridWidth, gridHeight, loadGlyphPixelGrid]);

  // Restore the vector contours saved before the glyph became a pixel
  // glyph. The pixelData is removed, so the next load rasterizes the
  // restored contours instead of the pixel grid.
  const handleRestoreVectorContours = useCallback(() => {
    const proj = projectRef.current;
    const g = proj.glyphs[currentUnicode];
    const backup = g?.vectorContoursBackup;
    if (!backup || backup.length === 0) return;
    const upm = proj.metadata.unitsPerEm || 1000;
    const asc = proj.metadata.ascender ?? 800;
    const desc = proj.metadata.descender ?? -200;
    const rasterized = rasterizeGlyphToPixelGrid(
      { ...g, contours: backup },
      gridWidth,
      gridHeight,
      upm,
      asc,
      desc
    );
    setProject((prev) => {
      const existing = prev.glyphs[currentUnicode];
      if (!existing) return prev;
      const { pixelData: _removed, ...rest } = existing;
      return {
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [currentUnicode]: { ...rest, contours: backup, modified: true },
        },
        updatedAt: Date.now(),
      };
    });
    const nextGrid = new Uint8Array(rasterized);
    currentGridRef.current = nextGrid;
    savedGridRef.current = { unicode: currentUnicode, width: gridWidth, height: gridHeight, grid: new Uint8Array(nextGrid) };
    const nextHist = [new Uint8Array(nextGrid)];
    historyRef.current = nextHist;
    historyIdxRef.current = 0;
    setGrid(nextGrid);
    setHistory(nextHist);
    setHistoryIdx(0);
    onShowToast('ベクター輪郭に戻しました', 'success');
  }, [currentUnicode, gridWidth, gridHeight, setProject, onShowToast]);

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

  // Explicit size operations update the project-wide default grid size.
  // Drawing one glyph at another size (autoSaveGlyph) does not.
  const updatePixelDefaultSize = useCallback(
    (w: number, h: number) => {
      setProject((prev) => {
        const prevSettings = prev.pixelFontSettings;
        return {
          ...prev,
          pixelFontSettings: {
            isPixelFontProject: prevSettings?.isPixelFontProject ?? false,
            defaultWidth: w,
            defaultHeight: h,
            dotShape: prevSettings?.dotShape ?? 'square',
            mergeContours: prevSettings?.mergeContours ?? true,
            ...(prevSettings?.proportionalSpacing !== undefined
              ? { proportionalSpacing: prevSettings.proportionalSpacing }
              : {}),
          },
          updatedAt: Date.now(),
        };
      });
    },
    [setProject]
  );

  const requestGridSizeChange = useCallback(
    (w: number, h: number): boolean => {
      const nextW = Math.max(3, Math.min(128, Math.floor(w) || 12));
      const nextH = Math.max(3, Math.min(128, Math.floor(h) || 12));
      if (nextW === gridWidth && nextH === gridHeight) return true;
      if (
        !window.confirm(
          `グリッドサイズを ${nextW}×${nextH} に変更しますか？変更前の内容は Undo 履歴に残ります。`
        )
      ) {
        return false;
      }
      setGridWidth(nextW);
      setGridHeight(nextH);
      updatePixelDefaultSize(nextW, nextH);
      return true;
    },
    [gridWidth, gridHeight, updatePixelDefaultSize]
  );

  const handlePresetSelect = (p: PixelGridPreset): boolean => {
    const found = PRESET_SIZES.find((item) => item.id === p);
    if (found && p !== 'custom') {
      if (requestGridSizeChange(found.w, found.h)) {
        setPreset(p);
        return true;
      }
      return false;
    }
    setPreset(p);
    return true;
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
    commitCurrentGlyphEdits,
    isCurrentGridDirty,
    requestGridSizeChange,
    handleRestoreVectorContours,
    loadGlyphPixelGrid,
  };
}
