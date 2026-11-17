import React, { useState, useCallback } from 'react';
import { FontProject, GlyphData, PathContour, ToolMode } from '../types';
import { createSmallKanaContours, generateId, simplifyGlyphContours, contoursHaveFiniteCoordinates, getContoursBoundingBox } from '../utils/path';
import { cloneContours, synthesizeDakutenContours } from '../utils/dakutenHelper';
import { calculateOptimalSpacing, AutoSpacingPreset } from '../utils/metricsHelper';
import { KANA_PAIRS } from '../data/unicodeTables';

interface UseGlyphActionsOptions {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  selectedChar: string;
  setSelectedUnicode: (unicode: number) => void;
  setSelectedChar: (char: string) => void;
  currentGlyph: GlyphData;
  currentGlyphRef: React.MutableRefObject<GlyphData>;
  commitHistory: (targetUnicode?: number) => void;
  setUndoStack: React.Dispatch<React.SetStateAction<GlyphData[]>>;
  setToolMode: (mode: ToolMode) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  handleUpdateContours: (newContours: PathContour[], options?: { skipHistory?: boolean }) => void;
}

export function useGlyphActions({
  project,
  setProject,
  selectedUnicode,
  selectedChar,
  setSelectedUnicode,
  setSelectedChar,
  currentGlyph,
  currentGlyphRef,
  commitHistory,
  setUndoStack,
  setToolMode,
  onShowToast,
  handleUpdateContours,
}: UseGlyphActionsOptions) {
  const [clipboardContours, setClipboardContours] = useState<PathContour[] | null>(null);

  // Simplify current glyph contours
  const handleSimplifyCurrentGlyph = useCallback(
    (level: 'mild' | 'normal' | 'strong' = 'normal') => {
      if (currentGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }
      const contours = currentGlyph.contours || [];
      if (contours.length === 0) {
        onShowToast('単純化する輪郭がありません', 'warning');
        return;
      }
      commitHistory();
      const res = simplifyGlyphContours(contours, {
        level,
        preserveSharpCorners: true,
      });

      if (!res.changed) {
        onShowToast('既に最適な頂点配置です (不要な重複・共線ノードなし)', 'info');
        return;
      }

      handleUpdateContours(res.contours);
      onShowToast(
        `輪郭を単純化しました: 頂点数 ${res.originalNodeCount}点 → ${res.optimizedNodeCount}点 (${res.reductionPercentage}% 削減)`,
        'success'
      );
    },
    [currentGlyph, commitHistory, handleUpdateContours, onShowToast]
  );

  // Auto-Spacing
  const handleAutoSpaceCurrentGlyph = useCallback(
    (preset: AutoSpacingPreset = 'smart') => {
      if (currentGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }
      const contours = currentGlyph.contours || [];
      if (contours.length === 0) {
        onShowToast('字形が作図されていません', 'warning');
        return;
      }
      commitHistory();
      const res = calculateOptimalSpacing(
        selectedUnicode,
        contours,
        preset,
        project.metadata.unitsPerEm
      );

      setProject((prev) => {
        const existing = prev.glyphs[selectedUnicode] || {
          unicode: selectedUnicode,
          char: selectedChar,
          name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        };

        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [selectedUnicode]: {
              ...existing,
              advanceWidth: res.advanceWidth,
              lsb: res.lsb,
              contours: res.contours,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });

      const presetLabel =
        preset === 'smart'
          ? 'スマート自動'
          : preset === 'japanese-fullwidth'
          ? '和文全角センタリング'
          : preset === 'proportional-tight'
          ? '欧文タイト'
          : preset === 'proportional-loose'
          ? '欧文ルーズ'
          : '欧文プロポーショナル';

      onShowToast(
        `オートスペーシング適用 [${presetLabel}]: 送り幅 ${res.advanceWidth}px, 左余白 ${res.lsb}px`,
        'success'
      );
    },
    [currentGlyph, selectedUnicode, selectedChar, commitHistory, setProject, onShowToast, project.metadata.unitsPerEm]
  );

  // Clear Glyph
  const handleClearGlyph = useCallback(
    (unicode: number) => {
      const targetGlyph = project.glyphs[unicode];
      if (!targetGlyph) return;
      if (targetGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }

      commitHistory(unicode);

      setProject((prev) => {
        const copy = { ...prev.glyphs };
        delete copy[unicode];
        return {
          ...prev,
          glyphs: copy,
          updatedAt: Date.now(),
        };
      });

      const ch = targetGlyph.char || String.fromCodePoint(unicode);
      onShowToast(`文字「${ch}」の字形を消去しました (Ctrl+Zで復元可能)`, 'info');
    },
    [project.glyphs, commitHistory, setProject, onShowToast]
  );

  // Copy Glyph contours
  const handleCopyGlyph = useCallback(
    (unicode: number) => {
      const glyph = project.glyphs[unicode];
      if (glyph && glyph.contours && glyph.contours.length > 0) {
        setClipboardContours(JSON.parse(JSON.stringify(glyph.contours)));
        const ch = glyph.char || String.fromCodePoint(unicode);
        onShowToast(`文字「${ch}」の字形 (${glyph.contours.length}パス) をコピーしました`, 'success');
      } else {
        onShowToast('コピーする輪郭がありません', 'warning');
      }
    },
    [project.glyphs, onShowToast]
  );

  // Paste Glyph contours
  const handlePasteGlyph = useCallback(
    (unicode: number) => {
      if (project.glyphs[unicode]?.locked) {
        onShowToast('貼り付け先の文字は編集ロックされています', 'warning');
        return;
      }
      if (!clipboardContours || clipboardContours.length === 0) {
        onShowToast('クリップボードに字形がありません', 'warning');
        return;
      }
      commitHistory(unicode);
      setProject((prev) => {
        const existing = prev.glyphs[unicode] || {
          unicode,
          char: String.fromCodePoint(unicode),
          name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: 1000,
          lsb: 50,
        };
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [unicode]: {
              ...existing,
              contours: JSON.parse(JSON.stringify(clipboardContours)),
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
      const targetChar = String.fromCodePoint(unicode);
      onShowToast(`「${targetChar}」に字形を貼り付けました`, 'success');
    },
    [project.glyphs, clipboardContours, commitHistory, setProject, onShowToast]
  );

  // Copy only the selected contours into the shared clipboard. This uses
  // the same clipboardContours state as the glyph-level Ctrl+C handler
  // (handleCopyGlyph), so the glyph grid paste item and the canvas menu
  // paste item read the same clipboard.
  const handleCopySelectedContours = useCallback(
    (contourIds: string[]) => {
      const selected = (currentGlyph.contours || []).filter((c) =>
        contourIds.includes(c.id)
      );
      if (selected.length === 0) {
        onShowToast('コピーする輪郭が選択されていません', 'warning');
        return;
      }
      setClipboardContours(JSON.parse(JSON.stringify(selected)));
      onShowToast(
        `選択した輪郭 (${selected.length}パス) をコピーしました`,
        'success'
      );
    },
    [currentGlyph, onShowToast]
  );

  // Paste the shared clipboard contours into the current glyph. The
  // clipboard contours are appended with fresh ids, so the current glyph
  // contours are kept. The glyph-level handlePasteGlyph replaces the whole
  // glyph, which is not what a contour paste should do.
  const handlePasteClipboardContours = useCallback(() => {
    if (currentGlyph.locked) {
      onShowToast('貼り付け先の文字は編集ロックされています', 'warning');
      return;
    }
    if (!clipboardContours || clipboardContours.length === 0) {
      onShowToast('クリップボードに字形がありません', 'warning');
      return;
    }
    commitHistory();
    const pasted = clipboardContours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));
    handleUpdateContours([...(currentGlyph.contours || []), ...pasted]);
    onShowToast(`輪郭 (${pasted.length}パス) を貼り付けました`, 'success');
  }, [currentGlyph, clipboardContours, commitHistory, handleUpdateContours, onShowToast]);

  // Duplicate Normal Kana to Small Kana automatically
  const handleDuplicateAsSmallKana = useCallback(
    (sourceUnicode: number) => {
      const sourceGlyph = project.glyphs[sourceUnicode];
      if (!sourceGlyph || !sourceGlyph.contours || sourceGlyph.contours.length === 0) {
        const fallbackChar = sourceGlyph?.char || String.fromCodePoint(sourceUnicode);
        onShowToast(`「${fallbackChar}」にはまだ字形が作図されていません`, 'warning');
        return;
      }

      const sourceChar = sourceGlyph.char || String.fromCodePoint(sourceUnicode);
      const pair = KANA_PAIRS[sourceChar];
      if (!pair) return;

      const targetUnicode = pair.smallUnicode;
      if (project.glyphs[targetUnicode]?.locked) {
        onShowToast(`小文字「${pair.smallChar}」は編集ロックされています`, 'warning');
        return;
      }
      const upm = project.metadata?.unitsPerEm || 1000;
      const smallContours = createSmallKanaContours(sourceGlyph.contours, {
        scale: 0.72,
        placement: 'bottom-left',
        weightDelta: 4,
        unitsPerEm: upm,
      });
      const bbox = getContoursBoundingBox(smallContours);

      commitHistory(targetUnicode);
      setProject((prev) => {
        const existing = prev.glyphs[targetUnicode] || {
          unicode: targetUnicode,
          char: pair.smallChar,
          name: `uni${targetUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: sourceGlyph.advanceWidth || upm,
          lsb: Math.max(0, Math.round(bbox.minX)),
        };

        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [targetUnicode]: {
              ...existing,
              advanceWidth: sourceGlyph.advanceWidth || existing.advanceWidth || upm,
              lsb: Math.max(0, Math.round(bbox.minX)),
              contours: smallContours,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });

      setSelectedUnicode(targetUnicode);
      setSelectedChar(pair.smallChar);
      onShowToast(`「${sourceChar}」から小文字「${pair.smallChar}」を自動生成しました`, 'success');
    },
    [project.glyphs, project.metadata?.unitsPerEm, commitHistory, setProject, setSelectedUnicode, setSelectedChar, onShowToast]
  );

  // Generate Dakuten / Handakuten from a source glyph.
  // sourceChar is the right-clicked seion character when the generation is
  // started from the glyph grid context menu. Its contours are used as the
  // base, so generating from a non-selected glyph no longer takes the
  // contours of the previously selected glyph. When sourceChar is omitted
  // (for example from the canvas sub-toolbar), the current glyph is used.
  const handleGenerateDakutenTarget = useCallback(
    (targetChar: string, isHandakuten?: boolean, sourceChar?: string) => {
      const targetUnicode = targetChar.codePointAt(0);
      if (!targetUnicode) return;
      if (project.glyphs[targetUnicode]?.locked) {
        onShowToast(`生成先「${targetChar}」は編集ロックされています`, 'warning');
        return;
      }

      const sourceGlyph = sourceChar
        ? project.glyphs[sourceChar.codePointAt(0) || 0]
        : undefined;
      const baseGlyph = sourceGlyph ?? currentGlyph;
      const baseChar = sourceChar ?? selectedChar;
      const baseContours = baseGlyph.contours || [];
      if (baseContours.length === 0) {
        onShowToast(`「${baseChar}」にはまだ字形が作図されていません`, 'warning');
        return;
      }
      const combinedContours = synthesizeDakutenContours(baseContours, Boolean(isHandakuten));

      commitHistory(targetUnicode);
      setProject((prev) => {
        const upm = prev.metadata?.unitsPerEm || 1000;
        const existing = prev.glyphs[targetUnicode] || {
          unicode: targetUnicode,
          char: targetChar,
          name: `uni${targetUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: baseGlyph.advanceWidth || upm,
          lsb: baseGlyph.lsb ?? 50,
        };

        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [targetUnicode]: {
              ...existing,
              contours: combinedContours,
              advanceWidth: baseGlyph.advanceWidth || existing.advanceWidth || upm,
              lsb: baseGlyph.lsb ?? existing.lsb ?? 50,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });

      setSelectedUnicode(targetUnicode);
      setSelectedChar(targetChar);
      onShowToast(
        `「${baseChar}」から${isHandakuten ? '半濁音' : '濁音'}「${targetChar}」を自動生成しました！`,
        'success'
      );
    },
    [project.glyphs, currentGlyph, commitHistory, setProject, selectedChar, setSelectedUnicode, setSelectedChar, onShowToast]
  );

  // Copy strokes from another char
  const handleCopyFromChar = useCallback(
    (sourceChar: string) => {
      if (currentGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }
      const sourceUnicode = sourceChar.codePointAt(0);
      if (!sourceUnicode) return;
      const sourceGlyph = project.glyphs[sourceUnicode];
      if (!sourceGlyph || !sourceGlyph.contours || sourceGlyph.contours.length === 0) {
        onShowToast(`「${sourceChar}」にはまだ字形が作図されていません`, 'warning');
        return;
      }
      commitHistory();
      const cloned = cloneContours(sourceGlyph.contours);
      handleUpdateContours(cloned);
      onShowToast(`「${sourceChar}」から字形を読み込みました`, 'success');
    },
    [currentGlyph.locked, project.glyphs, commitHistory, handleUpdateContours, onShowToast]
  );

  // Insert Radical Contours
  const handleInsertRadical = useCallback(
    (radicalContours: PathContour[]) => {
      if (currentGlyphRef.current?.locked || currentGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }
      if (!radicalContours || radicalContours.length === 0) {
        onShowToast('挿入する輪郭データがありません', 'warning');
        return;
      }
      if (!contoursHaveFiniteCoordinates(radicalContours)) {
        onShowToast('無効な座標を含む輪郭があるため挿入できません', 'warning');
        return;
      }
      commitHistory();
      const base = currentGlyphRef.current?.contours || [];
      const uniqueRadicals = radicalContours.map((c) => ({
        ...c,
        id: generateId(),
        nodes: c.nodes.map((n) => ({
          ...n,
          id: generateId(),
          handleIn: n.handleIn ? { ...n.handleIn } : null,
          handleOut: n.handleOut ? { ...n.handleOut } : null,
        })),
      }));
      const insertedIds = uniqueRadicals.map((c) => c.id);
      handleUpdateContours([...base, ...uniqueRadicals]);
      setToolMode('select');
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('font_editor_select_contours', { detail: { ids: insertedIds } })
        );
      }, 60);
      onShowToast(`部首パーツ (${uniqueRadicals.length}パス) を挿入しました（選択ツールで移動・変形可能）`, 'success');
    },
    [currentGlyph.locked, commitHistory, currentGlyphRef, handleUpdateContours, setToolMode, onShowToast]
  );

  // Batch Insert Radical Contours to multiple kanji glyphs
  const handleBatchInsertRadical = useCallback(
    (radicalContours: PathContour[], targetChars: string[]) => {
      if (!radicalContours || radicalContours.length === 0) {
        onShowToast('挿入する輪郭データがありません', 'warning');
        return;
      }
      if (!contoursHaveFiniteCoordinates(radicalContours)) {
        onShowToast('無効な座標を含む輪郭があるため挿入できません', 'warning');
        return;
      }
      const unlockedChars = targetChars.filter((char) => {
        const unicode = char.codePointAt(0) || 0;
        return unicode > 0 && !project.glyphs?.[unicode]?.locked;
      });
      const skippedCount = targetChars.length - unlockedChars.length;
      if (unlockedChars.length === 0) {
        onShowToast('選択された対象文字はすべて編集ロックされています', 'warning');
        return;
      }
      unlockedChars.forEach((char) => {
        const unicode = char.codePointAt(0);
        if (unicode) commitHistory(unicode);
      });
      setProject((prev) => {
        const updatedGlyphs = { ...(prev.glyphs || {}) };
        unlockedChars.forEach((char) => {
          const unicode = char.codePointAt(0) || 0;
          if (!unicode || updatedGlyphs[unicode]?.locked) return;
          const existingGlyph = updatedGlyphs[unicode] || {
            unicode,
            char,
            name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
            contours: [],
            advanceWidth: 1000,
            lsb: 50,
          };

          const clonedRadical = radicalContours.map((c) => ({
            ...c,
            id: generateId(),
            nodes: c.nodes.map((n) => ({
              ...n,
              id: generateId(),
              handleIn: n.handleIn ? { ...n.handleIn } : null,
              handleOut: n.handleOut ? { ...n.handleOut } : null,
            })),
          }));

          updatedGlyphs[unicode] = {
            ...existingGlyph,
            contours: [...(existingGlyph.contours || []), ...clonedRadical],
            modified: true,
            updatedAt: Date.now(),
          };
        });
        return { ...prev, glyphs: updatedGlyphs, updatedAt: Date.now() };
      });
      if (skippedCount > 0) {
        onShowToast(
          `${unlockedChars.length}文字に部首パーツを一括挿入しました（ロック中の${skippedCount}文字をスキップ）`,
          'info'
        );
      } else {
        onShowToast(`${unlockedChars.length}文字の字形に部首パーツを一括挿入しました`, 'success');
      }
    },
    [project.glyphs, commitHistory, setProject, onShowToast]
  );

  return {
    clipboardContours,
    setClipboardContours,
    handleSimplifyCurrentGlyph,
    handleAutoSpaceCurrentGlyph,
    handleClearGlyph,
    handleCopyGlyph,
    handlePasteGlyph,
    handleCopySelectedContours,
    handlePasteClipboardContours,
    handleDuplicateAsSmallKana,
    handleGenerateDakutenTarget,
    handleCopyFromChar,
    handleInsertRadical,
    handleBatchInsertRadical,
  };
}
