import React, { useRef } from 'react';
import {
  CustomPart,
  PartCategory,
  PathContour,
  RadicalPlacement,
  GlyphData,
  FontProject,
} from '../../../types';
import {
  generateId,
  contoursToSvgPath,
  smoothStrokeContour,
  slantSingleContour,
  rotateSingleContour,
  scaleSingleContour,
  flipSingleContourH,
  flipSingleContourV,
  slantContours,
  scaleContours,
  flipContoursHorizontal,
  flipContoursVertical,
  transformContoursForPlacement,
  getContoursBoundingBox,
  unionContours,
  normalizeGlyphContoursWinding,
  simplifyGlyphContours,
  flipMultipleContoursH,
  flipMultipleContoursV,
} from '../../../utils/pathUtils';
import { parseSvgStringToContours } from '../../../utils/svgParser';
import { KANJI_RADICALS } from '../../../data/kanjiRadicals';
import {
  getOrExtractRadicalContours,
  FontStyleOption,
  INITIAL_STUDIO_RADICAL_DEFS,
} from '../../../utils/radicalExtractor';
import {
  StudioRadicalPresetItem,
  STUDIO_RADICAL_PRESETS,
} from '../types';
import { RadicalEntry } from '../../../data/kanjiRadicalDatabase';

interface UseRadicalOperationsProps {
  activePart: CustomPart | null;
  parts: CustomPart[];
  setParts: React.Dispatch<React.SetStateAction<CustomPart[]>>;
  selectedPartId: string;
  setSelectedPartId: (id: string) => void;
  selectedContourId: string | null;
  setSelectedContourId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  commitPartChange: (contours: PathContour[]) => void;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  setActivePenContour: (contour: PathContour | null) => void;
  targetChar: string;
  selectedChar: string;
  selectedUnicode: number;
  insertPlacement: RadicalPlacement;
  batchCharsInput: string;
  selectedBatchChars: string[];
  selectedFontStyle: FontStyleOption;
  insertingPresetId: string | null;
  setInsertingPresetId: (id: string | null) => void;
  setIsLoadingPreset: (val: boolean) => void;
  setIsImportingAll: (val: boolean) => void;
  setShowExtractModal: (val: boolean) => void;
  setLeftSidebarTab: (tab: 'presets' | 'kanji_db' | 'custom') => void;
  onInsertToCurrentGlyph: (contours: PathContour[]) => void;
  onBatchInsertToGlyphs?: (contours: PathContour[], targetChars: string[]) => void;
  onClose: () => void;
  project: FontProject;
}

export function useRadicalOperations({
  activePart,
  parts,
  setParts,
  setSelectedPartId,
  selectedContourId,
  setSelectedContourId,
  selectedNodeId,
  setSelectedNodeId,
  commitPartChange,
  notify,
  activeBrushPathRef,
  setActivePenContour,
  targetChar,
  selectedChar,
  selectedUnicode,
  insertPlacement,
  batchCharsInput,
  selectedBatchChars,
  selectedFontStyle,
  insertingPresetId,
  setInsertingPresetId,
  setIsLoadingPreset,
  setIsImportingAll,
  setShowExtractModal,
  setLeftSidebarTab,
  onInsertToCurrentGlyph,
  onBatchInsertToGlyphs,
  onClose,
  project,
}: UseRadicalOperationsProps) {
  const svgFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const getSelectedNodeType = (): 'smooth' | 'corner' | null => {
    if (!activePart || !selectedContourId || !selectedNodeId) return null;
    const c = activePart.contours.find((item) => item.id === selectedContourId);
    const n = c?.nodes.find((item) => item.id === selectedNodeId);
    return n ? (n.type === 'smooth' || n.type === 'symmetric' ? 'smooth' : 'corner') : 'corner';
  };

  const getContourNodeCount = (): number => {
    if (!activePart || !selectedContourId) return 0;
    const c = activePart.contours.find((item) => item.id === selectedContourId);
    return c?.nodes.length || 0;
  };

  const handleDeleteSelectedNode = () => {
    if (!activePart || !selectedNodeId || !selectedContourId) return;
    const updatedContours: PathContour[] = [];
    for (const contour of activePart.contours) {
      if (contour.id !== selectedContourId) {
        updatedContours.push(contour);
        continue;
      }
      const remainingNodes = contour.nodes.filter((n) => n.id !== selectedNodeId);
      const minNodes = contour.closed ? 3 : 2;
      if (remainingNodes.length >= minNodes) {
        updatedContours.push({
          ...contour,
          nodes: remainingNodes,
        });
      }
    }
    commitPartChange(updatedContours);
    setSelectedNodeId(null);
    notify('ノードを削除しました', 'info');
  };

  const handleToggleSelectedNodeType = () => {
    if (!activePart || !selectedNodeId || !selectedContourId) return;
    const updatedContours = activePart.contours.map((contour) => {
      if (contour.id !== selectedContourId) return contour;
      return {
        ...contour,
        nodes: contour.nodes.map((node) => {
          if (node.id !== selectedNodeId) return node;
          if (node.type === 'smooth') {
            return {
              ...node,
              type: 'corner' as const,
              handleIn: null,
              handleOut: null,
            };
          } else {
            const handleLength = 40;
            return {
              ...node,
              type: 'smooth' as const,
              handleIn: { x: node.x - handleLength, y: node.y },
              handleOut: { x: node.x + handleLength, y: node.y },
            };
          }
        }),
      };
    });
    commitPartChange(updatedContours);
    notify('ノードの種類を切り替えました', 'info');
  };

  const handleDeleteSelectedContour = () => {
    if (!activePart || !selectedContourId) return;
    const updated = activePart.contours.filter((c) => c.id !== selectedContourId);
    if (updated.length === 0 && activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    commitPartChange(updated);
    setSelectedContourId(null);
    setSelectedNodeId(null);
    notify('輪郭パスを削除しました', 'info');
  };

  const handleDuplicateSelectedContour = () => {
    if (!activePart || !selectedContourId) return;
    const target = activePart.contours.find((c) => c.id === selectedContourId);
    if (!target) return;
    const offset = 24;
    const newId = generateId();
    const cloned: PathContour = {
      id: newId,
      closed: target.closed,
      nodes: target.nodes.map((n) => ({
        id: generateId(),
        x: n.x + offset,
        y: n.y + offset,
        type: n.type,
        handleIn: n.handleIn ? { x: n.handleIn.x + offset, y: n.handleIn.y + offset } : null,
        handleOut: n.handleOut ? { x: n.handleOut.x + offset, y: n.handleOut.y + offset } : null,
      })),
    };
    commitPartChange([...activePart.contours, cloned]);
    setSelectedContourId(newId);
    setSelectedNodeId(null);
    notify('輪郭パスを複製しました', 'success');
  };

  const handleFlipSelectedContour = (dir: 'h' | 'v') => {
    if (!activePart || !selectedContourId) return;
    const target = activePart.contours.find((c) => c.id === selectedContourId);
    if (!target) return;
    const flipped = dir === 'h' ? flipMultipleContoursH([target]) : flipMultipleContoursV([target]);
    const updated = activePart.contours.map((c) => (c.id === selectedContourId ? { ...flipped[0], id: c.id } : c));
    commitPartChange(updated);
    notify(`輪郭パスを${dir === 'h' ? '左右' : '上下'}反転しました`, 'info');
  };

  const handleSmoothSelectedContour = () => {
    if (!activePart || !selectedContourId) return;
    const target = activePart.contours.find((c) => c.id === selectedContourId);
    if (!target) return;
    const smoothedResult = smoothStrokeContour(target, { level: 'standard', preserveCorners: true });
    const updated = activePart.contours.map((c) => (c.id === selectedContourId ? smoothedResult.contour : c));
    commitPartChange(updated);
    notify('パスを平滑化（滑らか化）しました', 'success');
  };

  const handleExtractFromGlyph = (glyph: GlyphData) => {
    if (!glyph.contours || glyph.contours.length === 0) {
      notify(`「${glyph.char}」には描画データがありません`, 'warning');
      return;
    }
    const newId = generateId();
    const clonedContours: PathContour[] = glyph.contours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const newPart: CustomPart = {
      id: newId,
      name: `パーツ_${glyph.char || glyph.name}`,
      category: 'other',
      description: `文字「${glyph.char}」から取り込んだ作字パーツ`,
      contours: clonedContours,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setParts((prev) => [newPart, ...prev]);
    setSelectedPartId(newId);
    setShowExtractModal(false);
    notify(`文字「${glyph.char}」からパーツを作成しました`, 'success');
  };

  const handleInsertToGlyph = (closeAfter: boolean = false) => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) {
      notify('パーツに輪郭データがありません', 'warning');
      return;
    }
    const cloned: PathContour[] = activePart.contours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const positioned = transformContoursForPlacement(cloned, insertPlacement, activePart.category);
    if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
      onBatchInsertToGlyphs(positioned, [targetChar]);
    } else {
      onInsertToCurrentGlyph(positioned);
    }
    notify(`「${activePart.name}」を「${targetChar || selectedChar}」に挿入しました`, 'success');
    if (closeAfter) {
      onClose();
    }
  };

  const handleBatchInsertToGlyphs = (closeAfter: boolean = false) => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) {
      notify('パーツに輪郭データがありません', 'warning');
      return;
    }

    const typedChars = Array.from(new Set(batchCharsInput.split('').filter((c) => c.trim())));
    const allTargetChars = Array.from(new Set([...selectedBatchChars, ...typedChars]));

    if (allTargetChars.length === 0) {
      notify('一括挿入の対象となる漢字を候補から選択するか、入力してください', 'warning');
      return;
    }

    const cloned: PathContour[] = activePart.contours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const positioned = transformContoursForPlacement(cloned, insertPlacement, activePart.category);

    if (onBatchInsertToGlyphs) {
      onBatchInsertToGlyphs(positioned, allTargetChars);
    } else {
      allTargetChars.forEach(() => {
        onInsertToCurrentGlyph(positioned);
      });
    }

    notify(`「${activePart.name}」を ${allTargetChars.length} 文字 (${allTargetChars.slice(0, 6).join('')}${allTargetChars.length > 6 ? '…' : ''}) に一括挿入しました`, 'success');
    if (closeAfter) {
      onClose();
    }
  };

  const handleBatchInsertRadicalEntry = async (radical: RadicalEntry) => {
    if (!radical.kanjiList || radical.kanjiList.length === 0) {
      notify('対象の漢字リストがありません', 'warning');
      return;
    }

    let contoursToUse: PathContour[] = [];
    const placement = (radical.category === 'basic' ? 'auto' : radical.category) as RadicalPlacement;

    if (activePart && activePart.contours && activePart.contours.length > 0) {
      contoursToUse = JSON.parse(JSON.stringify(activePart.contours));
    } else {
      try {
        const extracted = await getOrExtractRadicalContours(
          radical.char,
          'full',
          selectedFontStyle.fontFamily,
          selectedFontStyle.fontWeight
        );
        if (extracted && extracted.length > 0) {
          contoursToUse = JSON.parse(JSON.stringify(extracted));
        }
      } catch {
        // Fallback below
      }

      if (contoursToUse.length === 0) {
        const fallbackRad = KANJI_RADICALS.find((r) => r.name === radical.name || r.char === radical.char);
        if (fallbackRad && fallbackRad.contours && fallbackRad.contours.length > 0) {
          contoursToUse = JSON.parse(JSON.stringify(fallbackRad.contours));
        }
      }
    }

    if (contoursToUse.length === 0) {
      notify(`部首「${radical.name}」の輪郭データが見つかりません。まずキャンバスで作字するか部首を読み込んでください`, 'warning');
      return;
    }

    const cloned: PathContour[] = contoursToUse.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const positioned = transformContoursForPlacement(
      cloned,
      placement,
      radical.category === 'basic' ? 'other' : (radical.category as PartCategory)
    );

    if (onBatchInsertToGlyphs) {
      onBatchInsertToGlyphs(positioned, radical.kanjiList);
    } else {
      radical.kanjiList.forEach(() => {
        onInsertToCurrentGlyph(positioned);
      });
    }

    notify(
      `部首「${radical.name}」を収録漢字 ${radical.kanjiList.length} 文字（${radical.kanjiList.slice(0, 6).join('')}${
        radical.kanjiList.length > 6 ? '…' : ''
      }）に一括配置しました（既存文字は輪郭を追加合成）`,
      'success'
    );
  };

  const handleExtractFromCurrentGlyph = () => {
    const currentGlyph = project.glyphs?.[selectedUnicode];
    if (!currentGlyph || !currentGlyph.contours || currentGlyph.contours.length === 0) {
      notify(`編集中文字「${selectedChar}」には描画された輪郭がありません`, 'warning');
      return;
    }
    const newId = generateId();
    const clonedContours: PathContour[] = currentGlyph.contours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const newPart: CustomPart = {
      id: newId,
      name: `パーツ_${selectedChar || currentGlyph.name || '文字'}`,
      category: 'other',
      description: `文字「${selectedChar}」から取り込んだ作字パーツ`,
      contours: clonedContours,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setParts((prev) => [newPart, ...prev]);
    setSelectedPartId(newId);
    setLeftSidebarTab('custom');
    notify(`編集中文字「${selectedChar}」の輪郭（${clonedContours.length}本）をパーツとして取り込みました`, 'success');
  };

  const handleLoadPreset = async (item: StudioRadicalPresetItem) => {
    setIsLoadingPreset(true);
    try {
      let contours = await getOrExtractRadicalContours(
        item.char,
        'full',
        selectedFontStyle.fontFamily,
        selectedFontStyle.fontWeight
      );
      if (!contours || contours.length === 0) {
        const fallbackRad = KANJI_RADICALS.find((r) => r.name === item.name || r.char === item.char);
        contours = fallbackRad?.contours || [];
      }

      const styleLabel = selectedFontStyle.label;
      const partName = `${item.name} (${styleLabel})`;

      const targetPart = parts.find((p) => p.name === partName || p.name === item.name);
      if (targetPart) {
        const updatedParts = parts.map((p) =>
          p.id === targetPart.id
            ? { ...p, contours: JSON.parse(JSON.stringify(contours)), description: `${item.name}・${selectedFontStyle.subLabel}の高品質ベクター部首`, updatedAt: Date.now() }
            : p
        );
        setParts(updatedParts);
        setSelectedPartId(targetPart.id);
      } else {
        const newPart: CustomPart = {
          id: generateId(),
          name: partName,
          category: item.category,
          description: `${item.name}・${selectedFontStyle.subLabel}の高品質ベクター部首`,
          contours: JSON.parse(JSON.stringify(contours)),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setParts((prev) => [newPart, ...prev]);
        setSelectedPartId(newPart.id);
      }
      notify(`部首「${item.name}」を${selectedFontStyle.label}の高精度ベクターとしてキャンバスに読み込みました`, 'success');
    } catch (err) {
      console.error('Failed to extract preset contours:', err);
      notify('部首ベクターの抽出に失敗しました', 'error');
    } finally {
      setIsLoadingPreset(false);
    }
  };

  const handleInsertPresetDirectly = async (
    item: StudioRadicalPresetItem,
    placement: RadicalPlacement = 'original',
    closeAfter: boolean = false
  ) => {
    if (insertingPresetId) return;
    setInsertingPresetId(item.id);
    try {
      let contours = await getOrExtractRadicalContours(
        item.char,
        'full',
        selectedFontStyle.fontFamily,
        selectedFontStyle.fontWeight
      );
      if (!contours || contours.length === 0) {
        const fallbackRad = KANJI_RADICALS.find((r) => r.name === item.name || r.char === item.char);
        contours = fallbackRad?.contours || [];
      }

      const positioned = transformContoursForPlacement(contours, placement, item.category);
      if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
        onBatchInsertToGlyphs(positioned, [targetChar]);
      } else {
        onInsertToCurrentGlyph(positioned);
      }
      notify(`部首「${item.name} (${selectedFontStyle.label})」を文字「${targetChar || selectedChar}」に挿入しました`, 'success');
      if (closeAfter) {
        onClose();
      }
    } catch {
      notify('部首の挿入に失敗しました', 'error');
    } finally {
      setInsertingPresetId(null);
    }
  };

  const handleQuickInsertPlacement = (placement: RadicalPlacement, closeAfter: boolean = false) => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) {
      notify('挿入する輪郭データがありません', 'warning');
      return;
    }
    const cloned: PathContour[] = JSON.parse(JSON.stringify(activePart.contours));
    const positioned = transformContoursForPlacement(cloned, placement, activePart.category);
    if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
      onBatchInsertToGlyphs(positioned, [targetChar]);
    } else {
      onInsertToCurrentGlyph(positioned);
    }
    const placementNames: Record<RadicalPlacement, string> = {
      auto: '自動判別',
      original: '原寸のまま',
      hen: '偏 (左46%)',
      tsukuri: '旁 (右46%)',
      kanmuri: '冠 (上36%)',
      ashi: '脚 (下36%)',
      center_small: '中央縮小 (60%)',
    };
    notify(`「${activePart.name}」を【${placementNames[placement] || placement}】として「${targetChar || selectedChar}」に挿入しました`, 'success');
    if (closeAfter) {
      onClose();
    }
  };

  const handleUpgradeDefaultParts = async (
    fontStyle: FontStyleOption = selectedFontStyle,
    silent: boolean = false
  ) => {
    if (!silent) {
      notify(`初期部首パーツを「${fontStyle.label}」の高精度ベクターに更新しています...`, 'info');
    }
    try {
      const updatedParts = [...parts];
      let updatedCount = 0;

      for (const def of INITIAL_STUDIO_RADICAL_DEFS) {
        const contours = await getOrExtractRadicalContours(
          def.char,
          'full',
          fontStyle.fontFamily,
          fontStyle.fontWeight
        );
        if (contours && contours.length > 0) {
          const idx = updatedParts.findIndex(
            (p) => p.name === def.name || p.name.startsWith(def.name.split(' ')[0])
          );
          if (idx >= 0) {
            updatedParts[idx] = {
              ...updatedParts[idx],
              contours: JSON.parse(JSON.stringify(contours)),
              description: `${def.description} (${fontStyle.label}・高精度ベクター)`,
              updatedAt: Date.now(),
            };
            updatedCount++;
          } else {
            updatedParts.push({
              id: generateId(),
              name: def.name,
              category: def.category as PartCategory,
              description: `${def.description} (${fontStyle.label}・高精度ベクター)`,
              contours: JSON.parse(JSON.stringify(contours)),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            updatedCount++;
          }
        }
      }

      setParts(updatedParts);
      if (!silent) {
        notify(`${updatedCount}件の部首パーツを高精度フォント（${fontStyle.label}）ベクターに刷新しました！`, 'success');
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        notify('部首パーツの更新に失敗しました', 'error');
      }
    }
  };

  const handleImportDefaultRadicals = async () => {
    setIsImportingAll(true);
    notify(`高品質な定番部首（${selectedFontStyle.label}）を順次取り込んでいます...`, 'info');
    try {
      const existingNames = new Set(parts.map((p) => p.name));
      const toAdd: CustomPart[] = [];

      for (const item of STUDIO_RADICAL_PRESETS) {
        const partName = `${item.name} (${selectedFontStyle.label})`;
        if (!existingNames.has(item.name) && !existingNames.has(partName)) {
          let contours: PathContour[] = [];
          try {
            contours = await getOrExtractRadicalContours(
              item.char,
              'full',
              selectedFontStyle.fontFamily,
              selectedFontStyle.fontWeight
            );
          } catch {
            // fallback
          }
          if (contours && contours.length > 0) {
            toAdd.push({
              id: generateId(),
              name: partName,
              category: item.category,
              description: `${item.name} (${item.char}) - ${selectedFontStyle.subLabel}`,
              contours,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
      }

      if (toAdd.length === 0) {
        notify('すべての定番部首はすでにマイパーツに登録されています', 'info');
        return;
      }

      setParts((prev) => [...toAdd, ...prev]);
      notify(`${toAdd.length}件の高品質定番部首（${selectedFontStyle.label}）をマイパーツに取り込みました！`, 'success');
    } catch (e) {
      notify('部首の一括取り込み中にエラーが発生しました', 'error');
    } finally {
      setIsImportingAll(false);
    }
  };

  const handleExportLibraryJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(parts, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `font_radical_parts_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    notify('部首パーツライブラリをJSON形式で保存しました', 'success');
  };

  const handleImportLibraryJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setParts((prev) => [...json, ...prev]);
          notify(`${json.length}件のパーツをライブラリに読み込みました`, 'success');
        } else {
          notify('無効なパーツJSONファイルです', 'error');
        }
      } catch {
        notify('JSONファイルの解析に失敗しました', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportPartSvg = () => {
    if (!activePart) return;
    const svgPath = contoursToSvgPath(activePart.contours);
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n  <path d="${svgPath}" fill="#000000" fill-rule="evenodd" />\n</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePart.name.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff-]/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify(`「${activePart.name}」をSVG出力しました`, 'success');
  };

  const handleImportSvgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePart) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = parseSvgStringToContours(text, true);
        if (res.contours.length === 0) {
          notify('SVGファイル内に有効なベクターパスが見つかりませんでした', 'warning');
          return;
        }
        commitPartChange(res.contours);
        notify(`SVGから ${res.contours.length} 本の輪郭を読み込みました`, 'success');
      } catch {
        notify('SVGファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSlantPart = (angleDeg: number) => {
    if (!activePart) return;
    if (selectedContourId) {
      const updated = activePart.contours.map((c) =>
        c.id === selectedContourId ? slantSingleContour(c, angleDeg) : c
      );
      commitPartChange(updated);
    } else {
      const updated = slantContours(activePart.contours, angleDeg);
      commitPartChange(updated);
    }
  };

  const handleRotatePart = (angleDeg: number) => {
    if (!activePart) return;
    if (selectedContourId) {
      const updated = activePart.contours.map((c) =>
        c.id === selectedContourId ? rotateSingleContour(c, angleDeg) : c
      );
      commitPartChange(updated);
    } else {
      const updated = activePart.contours.map((c) => rotateSingleContour(c, angleDeg, 500, 500));
      commitPartChange(updated);
    }
  };

  const handleFlipHPart = () => {
    if (!activePart) return;
    if (selectedContourId) {
      const updated = activePart.contours.map((c) =>
        c.id === selectedContourId ? flipSingleContourH(c) : c
      );
      commitPartChange(updated);
    } else {
      const updated = flipContoursHorizontal(activePart.contours);
      commitPartChange(updated);
    }
  };

  const handleFlipVPart = () => {
    if (!activePart) return;
    if (selectedContourId) {
      const updated = activePart.contours.map((c) =>
        c.id === selectedContourId ? flipSingleContourV(c) : c
      );
      commitPartChange(updated);
    } else {
      const updated = flipContoursVertical(activePart.contours);
      commitPartChange(updated);
    }
  };

  const handleScalePart = (factor: number) => {
    if (!activePart) return;
    if (selectedContourId) {
      const updated = activePart.contours.map((c) =>
        c.id === selectedContourId ? scaleSingleContour(c, factor, factor) : c
      );
      commitPartChange(updated);
    } else {
      const updated = scaleContours(activePart.contours, factor, factor);
      commitPartChange(updated);
    }
  };

  const handleFitToPlacement = (place: RadicalPlacement) => {
    if (!activePart) return;
    const positioned = transformContoursForPlacement(activePart.contours, place, activePart.category);
    commitPartChange(positioned);
    notify(`配置を「${place}」基準に自動フィットしました`, 'info');
  };

  const handleUnionPart = () => {
    if (!activePart || !activePart.contours || activePart.contours.length <= 0) {
      notify('合体する輪郭がありません', 'warning');
      return;
    }
    try {
      const merged = unionContours(activePart.contours);
      commitPartChange(merged);
      notify('重なり合うストロークを合体し、交差の白抜けを防止しました', 'success');
    } catch {
      notify('合体処理に失敗しました', 'error');
    }
  };

  const handleNormalizeWinding = () => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
    try {
      const normalized = normalizeGlyphContoursWinding(activePart.contours);
      commitPartChange(normalized);
      notify('輪郭の向き（Winding）をTrueType規格に統一しました', 'success');
    } catch {
      notify('輪郭処理に失敗しました', 'error');
    }
  };

  const handleSimplifyPart = () => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
    try {
      const result = simplifyGlyphContours(activePart.contours, { tolerance: 2.0 });
      commitPartChange(result.contours);
      notify(`パスの単純化を実行しました（${result.reducedCount}頂点削減）`, 'success');
    } catch {
      notify('パスの単純化に失敗しました', 'error');
    }
  };

  const handleCenterPartInCanvas = () => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
    const bbox = getContoursBoundingBox(activePart.contours);
    if (bbox.width <= 0 || bbox.height <= 0) return;
    const dx = 500 - bbox.centerX;
    const dy = 500 - bbox.centerY;
    const centered = activePart.contours.map((c) => ({
      ...c,
      nodes: c.nodes.map((n) => ({
        ...n,
        x: n.x + dx,
        y: n.y + dy,
        handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
        handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
      })),
    }));
    commitPartChange(centered);
    notify('パーツをキャンバス中央に配置しました', 'info');
  };

  const handleClearCanvas = () => {
    if (!activePart) return;
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    setActivePenContour(null);
    setSelectedContourId(null);
    setSelectedNodeId(null);
    commitPartChange([]);
    notify('輪郭を全消去しました', 'info');
  };

  const handleNudgePart = (dx: number, dy: number) => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
    const nudged = activePart.contours.map((c) => ({
      ...c,
      nodes: c.nodes.map((n) => ({
        ...n,
        x: n.x + dx,
        y: n.y + dy,
        handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
        handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
      })),
    }));
    commitPartChange(nudged);
  };

  return {
    svgFileInputRef,
    jsonFileInputRef,
    getSelectedNodeType,
    getContourNodeCount,
    handleDeleteSelectedNode,
    handleToggleSelectedNodeType,
    handleDeleteSelectedContour,
    handleDuplicateSelectedContour,
    handleFlipSelectedContour,
    handleSmoothSelectedContour,
    handleExtractFromGlyph,
    handleInsertToGlyph,
    handleBatchInsertToGlyphs,
    handleBatchInsertRadicalEntry,
    handleExtractFromCurrentGlyph,
    handleLoadPreset,
    handleInsertPresetDirectly,
    handleQuickInsertPlacement,
    handleUpgradeDefaultParts,
    handleImportDefaultRadicals,
    handleExportLibraryJson,
    handleImportLibraryJson,
    handleExportPartSvg,
    handleImportSvgFile,
    handleSlantPart,
    handleRotatePart,
    handleFlipHPart,
    handleFlipVPart,
    handleScalePart,
    handleFitToPlacement,
    handleUnionPart,
    handleNormalizeWinding,
    handleSimplifyPart,
    handleCenterPartInCanvas,
    handleClearCanvas,
    handleNudgePart,
  };
}
