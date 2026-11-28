import React, { useState, useCallback, useMemo } from 'react';
import { FontProject, GlyphData, IvsGlyphVariant, PathContour, PixelGlyphData, ToolMode } from '../types';
import { createSmallKanaContours, generateId, simplifyGlyphContours, contoursHaveFiniteCoordinates, getContoursBoundingBox } from '../utils/path';
import { cloneContours, synthesizeDakutenContours } from '../utils/dakutenHelper';
import { calculateOptimalSpacing, AutoSpacingPreset } from '../utils/metricsHelper';
import { batchOptimizeProjectNodes } from '../utils/quality/nodeOptimizer';
import { KANA_PAIRS } from '../data/unicodeTables';
import { requestConfirm } from '../components/modals/ConfirmDialog';

/** What a clipboard entry holds, and how it must be pasted. */
export interface GlyphClipboard {
  /** 'glyph': a whole-glyph copy, pasted by replacing the target glyph (with its metrics and pixel data). 'contours': selected contours only, pasted by appending to the target glyph. */
  kind: 'glyph' | 'contours';
  /** Project the copy came from. Pasting into another project is refused. */
  sourceProjectId: string;
  contours: PathContour[];
  /** Whole-glyph copies only. */
  advanceWidth?: number;
  lsb?: number;
  pixelData?: PixelGlyphData;
  vectorContoursBackup?: PathContour[];
  notes?: string;
}

/** Whether a clipboard entry carries filled pixel data (a pixel-only glyph copy has no contours). */
function hasCopiedPixelData(entry: GlyphClipboard): boolean {
  return Boolean(entry.pixelData?.data?.some((d) => d !== 0));
}

/** Give pasted contours fresh contour and node ids so pasted outlines never share ids with the source or with an earlier paste. */
export function regenerateContourIds(contours: PathContour[]): PathContour[] {
  return contours.map((c) => ({
    ...c,
    id: generateId(),
    nodes: c.nodes.map((n) => ({
      ...n,
      id: generateId(),
      handleIn: n.handleIn ? { ...n.handleIn } : null,
      handleOut: n.handleOut ? { ...n.handleOut } : null,
    })),
  }));
}

interface UseGlyphActionsOptions {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  selectedChar: string;
  setSelectedUnicode: (unicode: number) => void;
  setSelectedChar: (char: string) => void;
  onSelectGlyph?: (unicode: number, char?: string) => void;
  activeIvsKey?: string | null;
  activeIvsVariant?: IvsGlyphVariant | null;
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
  onSelectGlyph,
  activeIvsKey = null,
  activeIvsVariant = null,
  currentGlyph,
  currentGlyphRef,
  commitHistory,
  setUndoStack,
  setToolMode,
  onShowToast,
  handleUpdateContours,
}: UseGlyphActionsOptions) {
  const [clipboard, setClipboard] = useState<GlyphClipboard | null>(null);
  // The contours alone, for callers (shortcuts, grid) that only need to
  // know whether something is copied. The kind and the rest of the entry
  // live in `clipboard` and decide how a paste behaves.
  const clipboardContours = clipboard?.contours ?? null;
  const clipboardKind = clipboard?.kind ?? null;
  // Keep the historical setter shape (contours array) for the context:
  // replacing the contours keeps the entry kind, clearing empties it.
  const setClipboardContours: React.Dispatch<React.SetStateAction<PathContour[] | null>> =
    useCallback(
      (action) => {
        setClipboard((prev) => {
          const next = typeof action === 'function' ? action(prev?.contours ?? null) : action;
          if (next === null) return null;
          return {
            kind: prev?.kind ?? 'contours',
            sourceProjectId: prev?.sourceProjectId ?? project.id,
            contours: next,
            ...(prev?.kind === 'glyph'
              ? {
                  advanceWidth: prev.advanceWidth,
                  lsb: prev.lsb,
                  pixelData: prev.pixelData,
                  vectorContoursBackup: prev.vectorContoursBackup,
                  notes: prev.notes,
                }
              : {}),
          };
        });
      },
      [project.id]
    );

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
      const res = simplifyGlyphContours(contours, {
        level,
        preserveSharpCorners: true,
      });

      if (!res.changed) {
        onShowToast('既に最適な頂点配置です (不要な重複・共線ノードなし)', 'info');
        return;
      }

      commitHistory();
      handleUpdateContours(res.contours, { skipHistory: true });
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

      const baseGlyph = activeIvsKey
        ? activeIvsVariant?.glyph ?? currentGlyph
        : currentGlyphRef.current.unicode === selectedUnicode
          ? currentGlyphRef.current
          : currentGlyph;
      currentGlyphRef.current = {
        ...baseGlyph,
        advanceWidth: res.advanceWidth,
        lsb: res.lsb,
        contours: res.contours,
        modified: true,
      };

      setProject((prev) => {
        if (activeIvsKey && prev.ivsVariants?.[activeIvsKey]) {
          const existingVariant = prev.ivsVariants[activeIvsKey];
          return {
            ...prev,
            ivsVariants: {
              ...prev.ivsVariants,
              [activeIvsKey]: {
                ...existingVariant,
                glyph: {
                  ...existingVariant.glyph,
                  advanceWidth: res.advanceWidth,
                  lsb: res.lsb,
                  contours: res.contours,
                  modified: true,
                },
                updatedAt: Date.now(),
              },
            },
            updatedAt: Date.now(),
          };
        }

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
    [
      activeIvsKey,
      activeIvsVariant,
      currentGlyph,
      currentGlyphRef,
      selectedUnicode,
      selectedChar,
      commitHistory,
      setProject,
      onShowToast,
      project.metadata.unitsPerEm,
    ]
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
      if (unicode !== selectedUnicode || activeIvsKey) {
        if (onSelectGlyph) {
          onSelectGlyph(unicode, ch);
        } else {
          setSelectedUnicode(unicode);
          setSelectedChar(ch);
        }
      }
      onShowToast(`文字「${ch}」の字形を消去しました (Ctrl+Zで復元可能)`, 'info');
    },
    [
      project.glyphs,
      selectedUnicode,
      activeIvsKey,
      onSelectGlyph,
      setSelectedUnicode,
      setSelectedChar,
      commitHistory,
      setProject,
      onShowToast,
    ]
  );

  // Optimize a single glyph's paths: remove redundant nodes on straight
  // lines and smooth micro-wobble without changing the shape. Uses the
  // same defaults as the quality panel's node optimization
  // (level 'normal', preserveSharpCorners, maxBboxDeviation 1.5).
  const handleOptimizeGlyph = useCallback(
    (unicode: number) => {
      const targetGlyph = project.glyphs[unicode];
      if (!targetGlyph) return;
      if (targetGlyph.locked) {
        onShowToast('この文字は編集ロックされています', 'warning');
        return;
      }
      const contours = targetGlyph.contours || [];
      if (contours.length === 0) return;

      const res = batchOptimizeProjectNodes(project, [unicode], {
        level: 'normal',
        preserveSharpCorners: true,
        maxBboxDeviation: 1.5,
      });

      const ch = targetGlyph.char || String.fromCodePoint(unicode);
      if (res.totalReducedNodes <= 0) {
        onShowToast(`文字「${ch}」のパスに削減できる頂点はありませんでした`, 'info');
        return;
      }

      commitHistory(unicode);
      setProject(res.updatedProject);
      onShowToast(
        `文字「${ch}」のパスを最適化しました（${res.totalOriginalNodes}頂点 → ${res.totalOptimizedNodes}頂点） (Ctrl+Zで復元可能)`,
        'success'
      );
    },
    [project, commitHistory, setProject, onShowToast]
  );

  // Copy a whole glyph: contours plus advanceWidth, lsb, pixel data,
  // vector backup and notes. A pixel-only glyph (no contours) can be
  // copied too; only a glyph with neither contours nor filled pixels
  // has nothing to copy.
  const handleCopyGlyph = useCallback(
    (unicode: number) => {
      const isActiveIvsTarget = Boolean(
        activeIvsKey && unicode === selectedUnicode && activeIvsVariant?.glyph
      );
      const glyph = isActiveIvsTarget ? activeIvsVariant!.glyph : project.glyphs[unicode];
      const contours = glyph?.contours || [];
      const hasFilledPixels = Boolean(glyph?.pixelData?.data?.some((d) => d !== 0));
      if (glyph && (contours.length > 0 || hasFilledPixels)) {
        setClipboard({
          kind: 'glyph',
          sourceProjectId: project.id,
          contours: JSON.parse(JSON.stringify(contours)),
          advanceWidth: glyph.advanceWidth,
          lsb: glyph.lsb,
          pixelData: glyph.pixelData ? JSON.parse(JSON.stringify(glyph.pixelData)) : undefined,
          vectorContoursBackup: glyph.vectorContoursBackup
            ? JSON.parse(JSON.stringify(glyph.vectorContoursBackup))
            : undefined,
          notes: glyph.notes,
        });
        const ch = glyph.char || String.fromCodePoint(unicode);
        onShowToast(
          contours.length > 0
            ? `文字「${ch}」の字形 (${contours.length}パス) をコピーしました`
            : `文字「${ch}」のピクセルデータをコピーしました`,
          'success'
        );
      } else {
        onShowToast('コピーする輪郭がありません', 'warning');
      }
    },
    [activeIvsKey, activeIvsVariant, selectedUnicode, project.glyphs, project.id, onShowToast]
  );

  // Replace the target glyph with the clipboard's whole-glyph copy:
  // fresh contour/node ids, plus the copied advanceWidth, lsb, pixel
  // data, vector backup and notes. A new glyph gets its defaults from
  // the project's unitsPerEm, not from fixed 1000/50.
  const pasteReplaceGlyph = useCallback(
    (unicode: number, entry: GlyphClipboard) => {
      const isTargetIvs = Boolean(
        activeIvsKey && unicode === selectedUnicode && project.ivsVariants?.[activeIvsKey]
      );
      if (isTargetIvs) {
        commitHistory();
      } else {
        commitHistory(unicode);
      }
      const upm = project.metadata?.unitsPerEm || 1000;
      const defaultLsb = Math.round(50 * (upm / 1000));
      const freshContours = regenerateContourIds(entry.contours);
      const nextPixelData = entry.pixelData ? JSON.parse(JSON.stringify(entry.pixelData)) : undefined;
      const nextVectorBackup = entry.vectorContoursBackup
        ? JSON.parse(JSON.stringify(entry.vectorContoursBackup))
        : undefined;

      if (isTargetIvs && activeIvsKey) {
        const currentVariant = project.ivsVariants?.[activeIvsKey];
        if (currentVariant) {
          currentGlyphRef.current = {
            ...currentVariant.glyph,
            contours: freshContours,
            advanceWidth: entry.advanceWidth ?? currentVariant.glyph.advanceWidth ?? upm,
            lsb: entry.lsb ?? currentVariant.glyph.lsb ?? defaultLsb,
            pixelData: nextPixelData,
            vectorContoursBackup: nextVectorBackup,
            notes: entry.notes,
            modified: true,
          };
        }
        setProject((prev) => {
          const prevUpm = prev.metadata?.unitsPerEm || upm;
          const prevDefaultLsb = Math.round(50 * (prevUpm / 1000));
          const existingVariant = prev.ivsVariants?.[activeIvsKey];
          if (!existingVariant) return prev;
          return {
            ...prev,
            ivsVariants: {
              ...prev.ivsVariants,
              [activeIvsKey]: {
                ...existingVariant,
                glyph: {
                  ...existingVariant.glyph,
                  contours: freshContours,
                  advanceWidth: entry.advanceWidth ?? existingVariant.glyph.advanceWidth ?? prevUpm,
                  lsb: entry.lsb ?? existingVariant.glyph.lsb ?? prevDefaultLsb,
                  pixelData: nextPixelData,
                  vectorContoursBackup: nextVectorBackup,
                  notes: entry.notes,
                  modified: true,
                },
                updatedAt: Date.now(),
              },
            },
            updatedAt: Date.now(),
          };
        });
        return;
      }

      setProject((prev) => {
        const prevUpm = prev.metadata?.unitsPerEm || upm;
        const existing = prev.glyphs[unicode] || {
          unicode,
          char: String.fromCodePoint(unicode),
          name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: entry.advanceWidth ?? prevUpm,
          lsb: entry.lsb ?? Math.round(50 * (prevUpm / 1000)),
        };
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [unicode]: {
              ...existing,
              contours: freshContours,
              advanceWidth: entry.advanceWidth ?? existing.advanceWidth ?? prevUpm,
              lsb: entry.lsb ?? existing.lsb ?? defaultLsb,
              pixelData: nextPixelData,
              vectorContoursBackup: nextVectorBackup,
              notes: entry.notes,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [activeIvsKey, selectedUnicode, project.ivsVariants, project.metadata?.unitsPerEm, commitHistory, currentGlyphRef, setProject]
  );

  // Append the clipboard contours to the target glyph with fresh ids,
  // keeping the target glyph's existing contours and metrics.
  const pasteAppendContours = useCallback(
    (unicode: number, entry: GlyphClipboard) => {
      const isTargetIvs = Boolean(
        activeIvsKey && unicode === selectedUnicode && project.ivsVariants?.[activeIvsKey]
      );
      if (isTargetIvs) {
        commitHistory();
      } else {
        commitHistory(unicode);
      }
      const freshContours = regenerateContourIds(entry.contours);
      if (unicode === selectedUnicode) {
        handleUpdateContours([...(currentGlyph.contours || []), ...freshContours], {
          skipHistory: true,
        });
        return;
      }
      setProject((prev) => {
        const prevUpm = prev.metadata?.unitsPerEm || 1000;
        const existing = prev.glyphs[unicode] || {
          unicode,
          char: String.fromCodePoint(unicode),
          name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: prevUpm,
          lsb: Math.round(50 * (prevUpm / 1000)),
          contours: [],
        };
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [unicode]: {
              ...existing,
              contours: [...(existing.contours || []), ...freshContours],
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [activeIvsKey, selectedUnicode, project.ivsVariants, commitHistory, currentGlyph, handleUpdateContours, setProject]
  );

  // Paste into a glyph. The behaviour is fixed by how the clipboard was
  // copied, not by where paste is invoked from: a whole-glyph copy
  // replaces the target glyph, a selected-contours copy appends to it.
  const handlePasteGlyph = useCallback(
    (unicode: number) => {
      const isTargetIvs = Boolean(
        activeIvsKey && unicode === selectedUnicode && project.ivsVariants?.[activeIvsKey]
      );
      const isTargetLocked = isTargetIvs
        ? Boolean(project.ivsVariants?.[activeIvsKey!]?.glyph?.locked)
        : Boolean(project.glyphs[unicode]?.locked);
      if (isTargetLocked) {
        onShowToast('貼り付け先の文字は編集ロックされています', 'warning');
        return;
      }
      if (!clipboard || (clipboard.contours.length === 0 && !hasCopiedPixelData(clipboard))) {
        onShowToast('クリップボードに字形がありません', 'warning');
        return;
      }
      if (clipboard.sourceProjectId !== project.id) {
        onShowToast('コピー元のプロジェクトと異なるため貼り付けできません', 'warning');
        return;
      }
      if (clipboard.kind === 'contours') {
        pasteAppendContours(unicode, clipboard);
        onShowToast(`輪郭 (${clipboard.contours.length}パス) を貼り付けました`, 'success');
        return;
      }
      pasteReplaceGlyph(unicode, clipboard);
      const targetChar = isTargetIvs
        ? project.ivsVariants?.[activeIvsKey!]?.glyph?.char || selectedChar
        : String.fromCodePoint(unicode);
      onShowToast(`「${targetChar}」に字形を貼り付けました`, 'success');
    },
    [
      activeIvsKey,
      selectedUnicode,
      selectedChar,
      project.ivsVariants,
      project.glyphs,
      project.id,
      clipboard,
      pasteAppendContours,
      pasteReplaceGlyph,
      onShowToast,
    ]
  );

  // Copy only the selected contours into the shared clipboard. This uses
  // the same clipboard as the glyph-level Ctrl+C handler
  // (handleCopyGlyph), but records the kind as 'contours' so pasting
  // appends instead of replacing the target glyph.
  const handleCopySelectedContours = useCallback(
    (contourIds: string[]) => {
      const selected = (currentGlyph.contours || []).filter((c) =>
        contourIds.includes(c.id)
      );
      if (selected.length === 0) {
        onShowToast('コピーする輪郭が選択されていません', 'warning');
        return;
      }
      setClipboard({
        kind: 'contours',
        sourceProjectId: project.id,
        contours: JSON.parse(JSON.stringify(selected)),
      });
      onShowToast(
        `選択した輪郭 (${selected.length}パス) をコピーしました`,
        'success'
      );
    },
    [currentGlyph, project.id, onShowToast]
  );

  // Paste the shared clipboard into the current glyph. The behaviour is
  // fixed by the copy kind, same as handlePasteGlyph: a whole-glyph copy
  // replaces the current glyph (with its metrics and pixel data), a
  // selected-contours copy appends with fresh ids.
  const handlePasteClipboardContours = useCallback(() => {
    if (currentGlyph.locked) {
      onShowToast('貼り付け先の文字は編集ロックされています', 'warning');
      return;
    }
    if (!clipboard || (clipboard.contours.length === 0 && !hasCopiedPixelData(clipboard))) {
      onShowToast('クリップボードに字形がありません', 'warning');
      return;
    }
    if (clipboard.sourceProjectId !== project.id) {
      onShowToast('コピー元のプロジェクトと異なるため貼り付けできません', 'warning');
      return;
    }
    if (clipboard.kind === 'glyph') {
      pasteReplaceGlyph(selectedUnicode, clipboard);
      onShowToast(`「${selectedChar}」に字形を貼り付けました`, 'success');
      return;
    }
    pasteAppendContours(selectedUnicode, clipboard);
    onShowToast(`輪郭 (${clipboard.contours.length}パス) を貼り付けました`, 'success');
  }, [currentGlyph, project.id, clipboard, selectedUnicode, selectedChar, pasteReplaceGlyph, pasteAppendContours, onShowToast]);

  // Duplicate Normal Kana to Small Kana automatically.
  // The overwrite check is async: when the target already has contours,
  // a custom confirm dialog is shown and the generation waits for the
  // answer. Without existing contours there is no await, so the call
  // behaves as before.
  const handleDuplicateAsSmallKana = useCallback(
    async (sourceUnicode: number) => {
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
      const existingTarget = project.glyphs[targetUnicode];
      if (existingTarget?.contours && existingTarget.contours.length > 0) {
        const overwrite = await requestConfirm(
          `「${pair.smallChar}」には既に字形があります。上書きしますか？`
        );
        if (!overwrite) {
          return;
        }
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
              // The new contours replace any pixel-only drawing, so the
              // old pixel data and its vector backup must not survive.
              pixelData: undefined,
              vectorContoursBackup: undefined,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });

      if (onSelectGlyph) {
        onSelectGlyph(targetUnicode, pair.smallChar);
      } else {
        setSelectedUnicode(targetUnicode);
        setSelectedChar(pair.smallChar);
      }
      onShowToast(`「${sourceChar}」から小文字「${pair.smallChar}」を自動生成しました`, 'success');
    },
    [project.glyphs, project.metadata?.unitsPerEm, commitHistory, setProject, onSelectGlyph, setSelectedUnicode, setSelectedChar, onShowToast]
  );

  // Generate Dakuten / Handakuten from a source glyph.
  // The overwrite check is async: when the target already has contours,
  // a custom confirm dialog is shown and the generation waits for the
  // answer. Without existing contours there is no await, so the call
  // behaves as before.
  const handleGenerateDakutenTarget = useCallback(
    async (targetChar: string, isHandakuten?: boolean, sourceChar?: string) => {
      // sourceChar is the right-clicked seion character when the generation is
      // started from the glyph grid context menu. Its contours are used as the
      // base, so generating from a non-selected glyph no longer takes the
      // contours of the previously selected glyph. When sourceChar is omitted
      // (for example from the canvas sub-toolbar), the current glyph is used.
      const targetUnicode = targetChar.codePointAt(0);
      if (!targetUnicode) return;
      if (project.glyphs[targetUnicode]?.locked) {
        onShowToast(`生成先「${targetChar}」は編集ロックされています`, 'warning');
        return;
      }
      const existingTarget = project.glyphs[targetUnicode];
      if (existingTarget?.contours && existingTarget.contours.length > 0) {
        const overwrite = await requestConfirm(
          `「${targetChar}」には既に字形があります。上書きしますか？`
        );
        if (!overwrite) {
          return;
        }
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
      const upm = project.metadata?.unitsPerEm || 1000;
      const defaultLsb = Math.round(50 * (upm / 1000));
      const combinedContours = synthesizeDakutenContours(baseContours, Boolean(isHandakuten), {
        unitsPerEm: upm,
      });

      commitHistory(targetUnicode);
      setProject((prev) => {
        const currentUpm = prev.metadata?.unitsPerEm || upm;
        const fallbackLsb = Math.round(50 * (currentUpm / 1000));
        const existing = prev.glyphs[targetUnicode] || {
          unicode: targetUnicode,
          char: targetChar,
          name: `uni${targetUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: baseGlyph.advanceWidth || currentUpm,
          lsb: baseGlyph.lsb ?? fallbackLsb,
        };

        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [targetUnicode]: {
              ...existing,
              contours: combinedContours,
              advanceWidth: baseGlyph.advanceWidth || existing.advanceWidth || currentUpm,
              lsb: baseGlyph.lsb ?? existing.lsb ?? defaultLsb,
              // The new contours replace any pixel-only drawing, so the
              // old pixel data and its vector backup must not survive.
              pixelData: undefined,
              vectorContoursBackup: undefined,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });

      if (onSelectGlyph) {
        onSelectGlyph(targetUnicode, targetChar);
      } else {
        setSelectedUnicode(targetUnicode);
        setSelectedChar(targetChar);
      }
      onShowToast(
        `「${baseChar}」から${isHandakuten ? '半濁音' : '濁音'}「${targetChar}」を自動生成しました！`,
        'success'
      );
    },
    [project.glyphs, project.metadata?.unitsPerEm, currentGlyph, commitHistory, setProject, selectedChar, onSelectGlyph, setSelectedUnicode, setSelectedChar, onShowToast]
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
      handleUpdateContours(cloned, { skipHistory: true });
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
      handleUpdateContours([...base, ...uniqueRadicals], { skipHistory: true });
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
        const currentUpm = prev.metadata?.unitsPerEm || 1000;
        const defaultLsb = Math.round(50 * (currentUpm / 1000));
        const updatedGlyphs = { ...(prev.glyphs || {}) };
        unlockedChars.forEach((char) => {
          const unicode = char.codePointAt(0) || 0;
          if (!unicode || updatedGlyphs[unicode]?.locked) return;
          const existingGlyph = updatedGlyphs[unicode] || {
            unicode,
            char,
            name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
            contours: [],
            advanceWidth: currentUpm,
            lsb: defaultLsb,
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

  return useMemo(
    () => ({
      clipboard,
      clipboardContours,
      clipboardKind,
      setClipboardContours,
      handleSimplifyCurrentGlyph,
      handleAutoSpaceCurrentGlyph,
      handleClearGlyph,
      handleOptimizeGlyph,
      handleCopyGlyph,
      handlePasteGlyph,
      handleCopySelectedContours,
      handlePasteClipboardContours,
      handleDuplicateAsSmallKana,
      handleGenerateDakutenTarget,
      handleCopyFromChar,
      handleInsertRadical,
      handleBatchInsertRadical,
    }),
    [
      clipboard,
      clipboardContours,
      clipboardKind,
      setClipboardContours,
      handleSimplifyCurrentGlyph,
      handleAutoSpaceCurrentGlyph,
      handleClearGlyph,
      handleOptimizeGlyph,
      handleCopyGlyph,
      handlePasteGlyph,
      handleCopySelectedContours,
      handlePasteClipboardContours,
      handleDuplicateAsSmallKana,
      handleGenerateDakutenTarget,
      handleCopyFromChar,
      handleInsertRadical,
      handleBatchInsertRadical,
    ]
  );
}
