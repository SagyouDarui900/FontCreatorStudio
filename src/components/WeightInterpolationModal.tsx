import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  CheckCircle2,
  FolderArchive,
  Minus,
  Plus,
} from 'lucide-react';
import JSZip from 'jszip';
import { FontProject, GlyphData } from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import {
  adjustContoursWeight,
  contoursToSvgPath,
  getContoursBoundingBox,
  getSafeGlyphViewBox,
  interpolateContours,
  groupContoursForRendering,
} from '../utils/path';
import {
  compileFont,
  sanitizeFontFilenamePart,
  DEFAULT_UPM,
  DEFAULT_ASCENDER,
  DEFAULT_DESCENDER,
  resolveBaselineY,
} from '../utils/font';
import { pixelGridToContours, normalizePixelGrid } from '../utils/pixelFontUtils';
import { createLocalSnapshot } from '../utils/storageManager';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalShell } from './modals/ModalShell';
import { ModalSection } from './modals/ModalSection';
import { ModalAlert } from './modals/ModalAlert';
import { SliderRow } from './modals/SliderRow';
import { ModalTabs } from './modals/ModalTabs';
import { ModalFooter } from './modals/ModalFooter';

interface WeightInterpolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  // Commits the pre-change snapshot of one glyph's history. Called with a
  // unicode for each glyph the batch apply actually changes; called with
  // no argument it commits the selected glyph (used by the single-glyph
  // master-interpolation apply).
  onCommitHistory?: (targetUnicode?: number) => void;
  // Commits the pre-change project-level config (styleName /
  // usWeightClass) before the batch apply rewrites the metadata.
  onCommitProjectHistory?: () => void;
}

export type WeightPresetKey = 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'heavy' | 'custom';
type WeightScope = 'all' | 'kanji' | 'kana' | 'latin' | 'current';

const isWeightScope = (value: string): value is WeightScope =>
  value === 'all' || value === 'kanji' || value === 'kana' || value === 'latin' || value === 'current';

interface WeightPreset {
  key: WeightPresetKey;
  label: string;
  sub: string;
  delta: number;
  styleName: string;
  usWeightClass: number;
}

const WEIGHT_PRESETS: WeightPreset[] = [
  { key: 'thin', label: 'Thin (極細)', sub: '-40px', delta: -40, styleName: 'Thin', usWeightClass: 100 },
  { key: 'light', label: 'Light (細字)', sub: '-22px', delta: -22, styleName: 'Light', usWeightClass: 300 },
  { key: 'regular', label: 'Regular (標準)', sub: '±0px', delta: 0, styleName: 'Regular', usWeightClass: 400 },
  { key: 'medium', label: 'Medium (中字)', sub: '+22px', delta: 22, styleName: 'Medium', usWeightClass: 500 },
  { key: 'semibold', label: 'SemiBold (中太)', sub: '+45px', delta: 45, styleName: 'SemiBold', usWeightClass: 600 },
  { key: 'bold', label: 'Bold (太字)', sub: '+70px', delta: 70, styleName: 'Bold', usWeightClass: 700 },
  { key: 'extrabold', label: 'ExtraBold (極太)', sub: '+100px', delta: 100, styleName: 'ExtraBold', usWeightClass: 800 },
  { key: 'heavy', label: 'Heavy (超極太)', sub: '+135px', delta: 135, styleName: 'Heavy', usWeightClass: 900 },
];

// Estimate usWeightClass for an arbitrary (non-preset) delta from the
// nearest preset. Used when applying or duplicating a custom delta so the
// exported font's weight metadata matches the visible thickening.
const estimateWeightClassFromDelta = (delta: number): number => {
  let best = WEIGHT_PRESETS[0];
  for (const p of WEIGHT_PRESETS) {
    if (Math.abs(p.delta - delta) < Math.abs(best.delta - delta)) best = p;
  }
  return best.usWeightClass;
};

export const WeightInterpolationModal: React.FC<WeightInterpolationModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  selectedUnicode,
  theme,
  onShowToast,
  onCommitHistory,
  onCommitProjectHistory,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  // Preview baseline follows the project ascender so the position shown
  // here matches the exported glyph position (compile uses ascender).
  const baselineY = resolveBaselineY(project.metadata?.ascender, project.metadata?.unitsPerEm);

  // Mode: 'family' (Weight expansion / variation) or 'master' (Master-to-master morphing)
  const [activeTab, setActiveTab] = useState<'family' | 'master'>('family');

  // Family settings
  const [selectedPreset, setSelectedPreset] = useState<WeightPresetKey>('bold');
  const [weightDelta, setWeightDelta] = useState<number>(70);
  const [scope, setScope] = useState<WeightScope>('all');
  const [showOriginalOverlay, setShowOriginalOverlay] = useState<boolean>(true);
  const [previewSampleText, setPreviewSampleText] = useState<string>('永青木あいうABC123');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [previewUnicode, setPreviewUnicode] = useState<number>(selectedUnicode);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const nonEmptyGlyphs = useMemo(
    () => (Object.values(project.glyphs || {}) as GlyphData[]).filter((g) => g && g.contours && g.contours.length > 0),
    [project.glyphs]
  );

  // Master interpolation settings
  const [masterAUnicode, setMasterAUnicode] = useState<number>(selectedUnicode);
  const [masterBUnicode, setMasterBUnicode] = useState<number>(() => {
    const other = nonEmptyGlyphs.find((g) => g.unicode !== selectedUnicode);
    return other ? other.unicode : selectedUnicode;
  });
  const [interpFactor, setInterpFactor] = useState<number>(0.5); // 0.0 to 1.0

  useEffect(() => {
    if (isOpen) {
      setPreviewUnicode(selectedUnicode);
      setMasterAUnicode(selectedUnicode);
      const other = nonEmptyGlyphs.find((g) => g.unicode !== selectedUnicode);
      setMasterBUnicode(other ? other.unicode : selectedUnicode);
    }
  }, [isOpen, selectedUnicode, nonEmptyGlyphs]);

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        if (e.repeat) return;
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, onClose]);

  // Active apply-target glyph (follows selectedUnicode, not preview chip switcher)
  const selectedGlyph = useMemo(() => {
    return project.glyphs[selectedUnicode] || null;
  }, [project.glyphs, selectedUnicode]);

  // Current active preview glyph
  const currentGlyph = useMemo(() => {
    return project.glyphs[previewUnicode] || project.glyphs[selectedUnicode] || Object.values(project.glyphs)[0] || null;
  }, [project.glyphs, previewUnicode, selectedUnicode]);

  // Target glyphs in scope + separation of editable vs locked glyphs
  const { targetGlyphs, lockedTargetCount, openContourCount } = useMemo(() => {
    const list: GlyphData[] = [];
    let lockedCount = 0;
    let openCount = 0;
    const all = Object.values(project.glyphs || {}) as GlyphData[];

    for (const g of all) {
      if (!g || !g.contours || g.contours.length === 0) continue;
      const u = g.unicode;

      let inScope = false;
      if (scope === 'all') {
        inScope = true;
      } else if (scope === 'current') {
        inScope = u === selectedUnicode;
      } else if (scope === 'kana') {
        inScope = (u >= 0x3041 && u <= 0x3096) || (u >= 0x30a1 && u <= 0x30fa);
      } else if (scope === 'kanji') {
        inScope = (u >= 0x4e00 && u <= 0x9fff) || (u >= 0x3400 && u <= 0x4dbf);
      } else if (scope === 'latin') {
        inScope = u >= 0x0020 && u <= 0x007e;
      }

      if (!inScope) continue;
      if (g.locked) {
        lockedCount++;
      } else {
        list.push(g);
        openCount += (g.contours || []).filter((c) => !c.closed).length;
      }
    }
    return { targetGlyphs: list, lockedTargetCount: lockedCount, openContourCount: openCount };
  }, [project.glyphs, scope, selectedUnicode]);

  // Quick glyph switcher candidates
  const quickGlyphs = useMemo(() => {
    const all = Object.values(project.glyphs || {}) as GlyphData[];
    const withContours = all.filter((g) => g.contours && g.contours.length > 0);
    const result: GlyphData[] = [];
    const seen = new Set<string>();

    if (currentGlyph && currentGlyph.contours?.length) {
      result.push(currentGlyph);
      seen.add(currentGlyph.char);
    }
    for (const g of withContours) {
      if (result.length >= 8) break;
      if (!seen.has(g.char)) {
        result.push(g);
        seen.add(g.char);
      }
    }
    return result;
  }, [project.glyphs, currentGlyph]);

  // Handle Preset Change
  const handlePresetSelect = (preset: WeightPreset) => {
    setSelectedPreset(preset.key);
    setWeightDelta(preset.delta);
  };

  // Preview Contours for Single Glyph
  const previewOriginalContours = useMemo(() => {
    return currentGlyph?.contours || [];
  }, [currentGlyph]);

  const previewModifiedContours = useMemo(() => {
    if (!previewOriginalContours || previewOriginalContours.length === 0) return [];
    if (weightDelta === 0) return previewOriginalContours;
    return adjustContoursWeight(previewOriginalContours, weightDelta);
  }, [previewOriginalContours, weightDelta]);

  // Live Sample Text Render Paths (grouped with holes preserved)
  const sampleTextGlyphPaths = useMemo(() => {
    const chars = Array.from(previewSampleText);
    return chars.map((ch) => {
      const u = ch.codePointAt(0);
      if (!u) return { char: ch, groups: [], hasGlyph: false };
      const g = project.glyphs[u];
      if (!g || !g.contours || g.contours.length === 0) {
        return { char: ch, groups: [], hasGlyph: false };
      }
      const adjusted = weightDelta === 0 ? g.contours : adjustContoursWeight(g.contours, weightDelta);
      return {
        char: ch,
        groups: groupContoursForRendering(adjusted),
        hasGlyph: true,
      };
    });
  }, [previewSampleText, project.glyphs, weightDelta]);

  // Master interpolation contours
  const glyphA = project.glyphs[masterAUnicode];
  const glyphB = project.glyphs[masterBUnicode];

  const masterCompatStatus = useMemo(() => {
    const cA = glyphA?.contours || [];
    const cB = glyphB?.contours || [];
    if (cA.length === 0 || cB.length === 0) {
      return { kind: 'empty' as const, label: '両方のマスターに輪郭のある文字を選択してください' };
    }
    if (cA.length !== cB.length) {
      return {
        kind: 'mismatch' as const,
        label: `注意: 輪郭数が異なります（A: ${cA.length} / B: ${cB.length}）— 50%で切り替わります`,
      };
    }
    const allSameNodes = cA.every((c, i) => (c.nodes?.length || 0) === (cB[i]?.nodes?.length || 0));
    if (allSameNodes) {
      return { kind: 'exact' as const, label: 'トポロジー一致（1:1 頂点補間）' };
    }
    return { kind: 'resampled' as const, label: '輪郭数一致（自動リサンプリング補間）' };
  }, [glyphA, glyphB]);

  const masterInterpContours = useMemo(() => {
    if (!glyphA?.contours?.length || !glyphB?.contours?.length) return [];
    return interpolateContours(glyphA.contours, glyphB.contours, interpFactor);
  }, [glyphA, glyphB, interpFactor]);

  // Helper to resolve vector contours for any glyph (including pixelData-only glyphs)
  const resolveGlyphContoursForExport = (g: GlyphData) => {
    if (g.contours && g.contours.length > 0) return g.contours;
    if (g.pixelData?.data && g.pixelData.width && g.pixelData.height) {
      const pGrid = normalizePixelGrid(g.pixelData.data);
      if (pGrid.some((val) => val === 1)) {
        return pixelGridToContours(
          pGrid,
          g.pixelData.width,
          g.pixelData.height,
          project.metadata.unitsPerEm || DEFAULT_UPM,
          project.metadata.ascender || DEFAULT_ASCENDER,
          project.metadata.descender || DEFAULT_DESCENDER,
          g.advanceWidth || project.metadata.unitsPerEm || DEFAULT_UPM,
          g.pixelData.shape || project.pixelFontSettings?.dotShape || 'square',
          project.pixelFontSettings?.mergeContours !== false
        );
      }
    }
    return [];
  };

  // Apply Weight Delta to Current Project
  const handleApplyToProject = () => {
    // ±0px changes nothing: applying would still rewrite every target
    // glyph's lsb and push a history entry, so refuse instead.
    if (weightDelta === 0) {
      onShowToast?.('太さオフセットが ±0px のため、適用する変更がありません', 'info');
      return;
    }
    if (targetGlyphs.length === 0) {
      onShowToast?.(
        lockedTargetCount > 0
          ? `対象範囲の ${lockedTargetCount} 文字はロック保護されているため変更されませんでした`
          : '対象となる文字がありません',
        'warning'
      );
      return;
    }

    // Register undo history before changing anything: every glyph the
    // batch rewrites gets its own pre-change snapshot (previously only
    // the selected glyph was registered, so the other glyphs could not
    // be restored with Ctrl+Z), and the metadata change below gets a
    // project-level snapshot.
    for (const g of targetGlyphs) {
      if (!g.contours || g.contours.length === 0 || g.locked) continue;
      onCommitHistory?.(g.unicode);
    }

    const updatedGlyphs = { ...project.glyphs };
    let count = 0;

    for (const g of targetGlyphs) {
      if (!g.contours || g.contours.length === 0 || g.locked) continue;
      const modified = adjustContoursWeight(g.contours, weightDelta);
      const bbox = getContoursBoundingBox(modified);
      updatedGlyphs[g.unicode] = {
        ...g,
        contours: modified,
        lsb: Number.isFinite(bbox.minX) && bbox.width > 0 ? Math.round(bbox.minX) : g.lsb,
        modified: true,
      };
      count++;
    }

    onCommitProjectHistory?.();

    // Keep the font metadata in sync with the visible thickening, so the
    // exported OTF is not still Regular: an exact preset match updates both
    // styleName and usWeightClass; a custom in-between delta updates only
    // usWeightClass (estimated from the nearest preset) and leaves the
    // style name untouched.
    const presetObj = WEIGHT_PRESETS.find((p) => p.delta === weightDelta);
    const newStyleName = presetObj ? presetObj.styleName : project.metadata.styleName;
    const newWeightClass = presetObj
      ? presetObj.usWeightClass
      : estimateWeightClassFromDelta(weightDelta);

    setProject({
      ...project,
      metadata: {
        ...project.metadata,
        styleName: newStyleName,
        usWeightClass: newWeightClass,
      },
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    });

    const sign = weightDelta > 0 ? `+${weightDelta}px` : `${weightDelta}px`;
    const lockedNote = lockedTargetCount > 0 ? `（ロック保護 ${lockedTargetCount}件除外）` : '';
    const metaNote = presetObj
      ? `／スタイル名「${newStyleName}」・Weight ${newWeightClass} に更新しました`
      : `／Weight ${newWeightClass} に更新しました（スタイル名は変更なし）`;
    onShowToast?.(
      `${count}文字のウェイトを補正しました (${sign})${lockedNote}${metaNote}`,
      'success'
    );
    onClose();
  };

  // Duplicate as New Weight Project
  const handleCreateNewWeightProject = () => {
    const presetObj = WEIGHT_PRESETS.find((p) => p.delta === weightDelta);
    const newStyleName = presetObj
      ? presetObj.styleName
      : weightDelta === 0
        ? 'Regular'
        : weightDelta > 0
          ? `Bold+${weightDelta}`
          : `Light${weightDelta}`;
    const newWeightClass = presetObj
      ? presetObj.usWeightClass
      : estimateWeightClassFromDelta(weightDelta);
    const newProjectName = `${project.metadata.familyName || 'Font'} ${newStyleName}`;

    // Replacing the current project also clears the Undo history (a new
    // project id triggers clearHistory), so confirm first and keep the
    // current project as a restorable snapshot. Abort when the snapshot
    // cannot be created, instead of losing the project silently.
    const confirmed = window.confirm(
      `新しいウェイトプロジェクト「${newProjectName}」を作成します。\n` +
        `現在のプロジェクト「${project.name || project.metadata.familyName || '名称未設定'}」は画面から置き換わり、Undo 履歴もリセットされます。\n` +
        `元のプロジェクトはスナップショットとして保存し、ストレージ管理から復元できます。\n` +
        `続行しますか？`
    );
    if (!confirmed) return;

    const snapshotRes = createLocalSnapshot(
      project,
      'manual',
      `ウェイト作成前のバックアップ (${project.metadata.styleName || 'Regular'})`
    );
    if (!snapshotRes.success) {
      onShowToast?.(
        snapshotRes.error ||
          '元のプロジェクトのスナップショット作成に失敗したため、新規プロジェクト作成を中止しました',
        'error'
      );
      return;
    }

    const updatedGlyphs: Record<number, GlyphData> = {};
    for (const [key, rawG] of Object.entries(project.glyphs || {})) {
      const g = rawG as GlyphData;
      if (!g) continue;
      const sourceContours = resolveGlyphContoursForExport(g);
      if (sourceContours.length === 0) {
        updatedGlyphs[Number(key)] = { ...g };
        continue;
      }
      const adjusted = weightDelta === 0
        ? JSON.parse(JSON.stringify(sourceContours))
        : adjustContoursWeight(sourceContours, weightDelta);
      const bbox = getContoursBoundingBox(adjusted);
      updatedGlyphs[Number(key)] = {
        ...g,
        contours: adjusted,
        lsb: Number.isFinite(bbox.minX) && bbox.width > 0 ? Math.round(bbox.minX) : g.lsb,
        modified: true,
      };
    }

    const now = Date.now();
    const newProj: FontProject = {
      ...project,
      id: `proj-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: newProjectName,
      metadata: {
        ...project.metadata,
        styleName: newStyleName,
        usWeightClass: newWeightClass,
      },
      glyphs: updatedGlyphs,
      createdAt: now,
      updatedAt: now,
    };

    setProject(newProj);
    onShowToast?.(
      `新しいウェイトプロジェクト「${newProjectName}」を作成しました！元のプロジェクトはスナップショットに保存しました（ストレージ管理から復元できます）。`,
      'success'
    );
    onClose();
  };

  // Batch Export Entire Weight Family as ZIP
  const handleBatchExportWeightFamilyZip = async () => {
    setIsExportingZip(true);
    onShowToast?.('全ウェイトファミリーをコンパイル中...', 'info');

    try {
      const zip = new JSZip();
      const safeFamilyName = sanitizeFontFilenamePart(project.metadata.familyName, 'MyCustomFont');

      const exportPresets = [
        { name: 'Light', delta: -22, usWeightClass: 300 },
        { name: 'Regular', delta: 0, usWeightClass: 400 },
        { name: 'Medium', delta: 22, usWeightClass: 500 },
        { name: 'Bold', delta: 70, usWeightClass: 700 },
        { name: 'ExtraBold', delta: 100, usWeightClass: 800 },
      ];

      for (const p of exportPresets) {
        // Clone project for this weight
        const weightGlyphs: Record<number, GlyphData> = {};
        for (const [key, rawG] of Object.entries(project.glyphs || {})) {
          const g = rawG as GlyphData;
          if (!g) continue;
          const sourceContours = resolveGlyphContoursForExport(g);
          if (sourceContours.length === 0) {
            weightGlyphs[Number(key)] = { ...g };
            continue;
          }
          const adjusted = p.delta === 0
            ? JSON.parse(JSON.stringify(sourceContours))
            : adjustContoursWeight(sourceContours, p.delta);
          const bbox = getContoursBoundingBox(adjusted);
          weightGlyphs[Number(key)] = {
            ...g,
            contours: adjusted,
            lsb: Number.isFinite(bbox.minX) && bbox.width > 0 ? Math.round(bbox.minX) : g.lsb,
          };
        }

        const weightProj: FontProject = {
          ...project,
          metadata: {
            ...project.metadata,
            styleName: p.name,
            usWeightClass: p.usWeightClass,
          },
          glyphs: weightGlyphs,
        };

        const result = compileFont(weightProj, {
          scaleFactor: 1.0,
          mergeOverlaps: true,
          normalizeWinding: true,
          skipBlobUrl: true,
        });

        if (result?.buffer) {
          const safeStyleName = sanitizeFontFilenamePart(p.name, 'Regular');
          zip.file(`${safeFamilyName}-${safeStyleName}.otf`, result.buffer);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFamilyName}-FontFamily-Weights.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 10000);

      onShowToast?.(
        `全5ウェイトのフォントファミリー（ZIP）を出力しました！`,
        'success'
      );
    } catch (error) {
      console.error('Batch export error:', error);
      const message = error instanceof Error ? error.message : '不明なエラー';
      onShowToast?.(`ウェイト出力中にエラーが発生しました: ${message}`, 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Apply Master Interpolation Result to Active Glyph
  const handleApplyMasterInterp = () => {
    if (masterInterpContours.length === 0) return;

    if (project.glyphs[selectedUnicode]?.locked) {
      onShowToast?.('選択中の文字はロック保護されているため上書きできません', 'warning');
      return;
    }

    onCommitHistory?.();

    const interpBbox = getContoursBoundingBox(masterInterpContours);
    const computedLsb =
      Number.isFinite(interpBbox.minX) && interpBbox.width > 0 ? Math.round(interpBbox.minX) : 50;

    setProject((prev) => ({
      ...prev,
      glyphs: {
        ...prev.glyphs,
        [selectedUnicode]: {
          ...(prev.glyphs[selectedUnicode] || {
            unicode: selectedUnicode,
            char: String.fromCodePoint(selectedUnicode),
            name: `uni${selectedUnicode.toString(16).toUpperCase()}`,
            advanceWidth: prev.metadata?.unitsPerEm || DEFAULT_UPM,
            lsb: computedLsb,
          }),
          contours: masterInterpContours,
          lsb: prev.glyphs[selectedUnicode]?.lsb ?? computedLsb,
          modified: true,
        },
      },
      updatedAt: Date.now(),
    }));

    onShowToast?.(
      `補間結果（${Math.round(interpFactor * 100)}%）を「${selectedGlyph?.char || String.fromCodePoint(selectedUnicode)}」に適用しました`,
      'success'
    );
    onClose();
  };

  if (!isOpen) return null;

  // Family tab footer: ModalFooter holds the primary apply button and the
  // cancel button (M-10). The two extra actions (ZIP export, new weight
  // project) stay in leftInfo so no action is dropped.
  const familyFooter = (
    <ModalFooter
      primaryLabel="現在のプロジェクトに適用"
      primaryIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
      onPrimary={handleApplyToProject}
      primaryDisabled={weightDelta === 0}
      primaryTitle={
        weightDelta === 0
          ? '太さオフセットが ±0px のため適用する変更がありません'
          : '適用すると各文字の左余白（lsb）も輪郭の左端に合わせて再計算します'
      }
      onCancel={onClose}
      theme={theme}
      themeClasses={themeClasses}
      leftInfo={
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleBatchExportWeightFamilyZip}
            disabled={isExportingZip}
            className={`min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${themeClasses.accentBadge} hover:opacity-90 disabled:opacity-50`}
          >
            <FolderArchive className="w-4 h-4 shrink-0" />
            <span>全5ウェイト一括ZIP出力</span>
          </button>
          <button
            type="button"
            onClick={handleCreateNewWeightProject}
            className={`min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">新規ウェイトプロジェクト作成</span>
            <span className="sm:hidden">新規複製</span>
          </button>
        </div>
      }
    />
  );

  const masterFooter = (
    <ModalFooter
      primaryLabel={`補間結果を「${selectedGlyph?.char || String.fromCodePoint(selectedUnicode)}」に適用`}
      primaryIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
      onPrimary={handleApplyMasterInterp}
      primaryDisabled={masterInterpContours.length === 0}
      onCancel={onClose}
      theme={theme}
      themeClasses={themeClasses}
    />
  );

  return (
    <ModalShell
      title="ウェイト補間 & ファミリー生成"
      subtitle="線の太さの一括増減・ウェイトファミリー展開・2マスター間モーフィング補間"
      theme={theme}
      themeClasses={themeClasses}
      maxWidth="6xl"
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((v) => !v)}
      onClose={onClose}
      footer={activeTab === 'family' ? familyFooter : masterFooter}
    >
      {/* Tab bar: sticky so it stays visible while the body scrolls.
          The negative margins cancel the ModalShell body padding (p-3.5
          sm:p-4) so the bar spans the full modal width like before. */}
      <div className="sticky top-0 z-10 -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-3.5 sm:mb-4">
        <ModalTabs
          tabs={[
            {
              id: 'family',
              label: 'ウェイトファミリー展開 (自動太さ補正)',
              shortLabel: 'ファミリー展開',
              count: targetGlyphs.length,
            },
            {
              id: 'master',
              label: '2マスター間 線形補間 (Morphing)',
              shortLabel: '2マスター補間',
              count: nonEmptyGlyphs.length,
            },
          ]}
          activeId={activeTab}
          onChange={(id) => {
            if (id === 'family' || id === 'master') setActiveTab(id);
          }}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="ウェイト補間のタブ"
        />
      </div>

      {activeTab === 'family' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Dedicated Visual Stage & Live Text String Preview (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-2.5">
            {/* Single Glyph Vector Preview Stage */}
            <ModalSection
              title="単文字ベクタープレビュー"
              badge={
                <span
                  className={`ml-auto px-2 py-0.5 rounded-md font-mono text-xs font-bold border shrink-0 ${themeClasses.accentBadge}`}
                >
                  「{currentGlyph?.char || 'あ'}」
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-2">
                {/* Quick Glyph Selection Chips */}
                {quickGlyphs.length > 1 && (
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className={`text-[10px] font-medium shrink-0 ${themeClasses.textMuted}`}>
                      確認文字:
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                      {quickGlyphs.map((g) => (
                        <button
                          key={g.unicode}
                          type="button"
                          onClick={() => setPreviewUnicode(g.unicode)}
                          className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg sm:rounded-md text-xs font-bold shrink-0 border transition-colors cursor-pointer flex items-center justify-center ${
                            currentGlyph?.unicode === g.unicode
                              ? themeClasses.accentBtn
                              : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                          }`}
                        >
                          {g.char}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SVG Stage */}
                <div
                  className={`relative w-full aspect-square max-w-[230px] mx-auto rounded-xl border flex items-center justify-center overflow-hidden shadow-none ${themeClasses.canvasOuterBg} ${themeClasses.border}`}
                >
                  <svg
                    viewBox={getSafeGlyphViewBox(
                      [...previewOriginalContours, ...previewModifiedContours],
                      1000
                    )}
                    className="w-full h-full p-2 pointer-events-none"
                  >
                    {/* Guides */}
                    <rect x={0} y={0} width={1000} height={1000} fill="none" stroke="#94a3b8" strokeDasharray="6 6" strokeWidth={5} opacity={0.3} />
                    <line x1={0} y1={500} x2={1000} y2={500} stroke="#38bdf8" strokeDasharray="6 6" strokeWidth={3} opacity={0.35} />
                    <line x1={500} y1={0} x2={500} y2={1000} stroke="#38bdf8" strokeDasharray="6 6" strokeWidth={3} opacity={0.35} />
                    <line x1={0} y1={baselineY} x2={1000} y2={baselineY} stroke="#f87171" strokeDasharray="8 8" strokeWidth={4} opacity={0.45} />

                    {/* Original Shape (Ghost Outline) */}
                    {showOriginalOverlay && previewOriginalContours.length > 0 && (
                      <path
                        d={contoursToSvgPath(previewOriginalContours)}
                        fill="none"
                        stroke={isLight ? '#94a3b8' : '#64748b'}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        opacity={0.8}
                      />
                    )}

                    {/* New Weight Result */}
                    {previewModifiedContours.length > 0 &&
                      groupContoursForRendering(previewModifiedContours).map((group) => (
                        <path
                          key={group.id}
                          d={group.d}
                          fill={isLight ? '#0f172a' : '#ecfdf5'}
                          fillRule={group.fillRule}
                          stroke={isLight ? '#059669' : '#34d399'}
                          strokeWidth={1}
                        />
                      ))}
                  </svg>

                  {/* Floating Legend */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[9px] font-mono pointer-events-none">
                    {showOriginalOverlay && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold border ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`}
                      >
                        - - 元形状
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold border ${themeClasses.accentBadge}`}
                    >
                      ■ {weightDelta > 0 ? `+${weightDelta}px` : `${weightDelta}px`}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2 text-[10px] font-mono opacity-70">
                    頂点: {previewModifiedContours.reduce((acc, c) => acc + (c.nodes?.length || 0), 0)}点
                  </div>

                  {/* H-4: empty preview state — previously only guides and
                      「頂点：0点」 were shown, so an empty preview looked
                      identical to a rendering failure. */}
                  {previewOriginalContours.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center">
                      <p className="text-xs font-bold">プレビューできる輪郭がありません</p>
                      <p className={`text-[11px] leading-relaxed jp-wrap ${themeClasses.textMuted}`}>
                        {currentGlyph
                          ? `「${currentGlyph.char}」はまだ作成されていません。輪郭のある文字を選択してください。`
                          : 'プレビュー対象の文字がありません。文字を作成してから確認してください。'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Ghost Overlay Toggle */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOriginalOverlay}
                      onChange={(e) => setShowOriginalOverlay(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="text-[11px] font-medium opacity-85">元形状（点線）を重ねて比較</span>
                  </label>
                </div>
              </div>
            </ModalSection>

            {/* Live Sample Text Preview Bar */}
            <ModalSection
              title="文章プレビュー (ライブレンダリング)"
              badge={
                <span className={`ml-auto text-[10px] font-mono shrink-0 ${themeClasses.textMuted}`}>
                  文字をクリックで直接編集
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-2">
                <input
                  type="text"
                  value={previewSampleText}
                  onChange={(e) => setPreviewSampleText(e.target.value)}
                  placeholder="サンプル文字列を入力..."
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-hidden ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                />

                {/* Rendered Sample Strips */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center gap-1 overflow-x-auto min-h-[58px] ${themeClasses.cardBg} ${themeClasses.border}`}
                >
                  {sampleTextGlyphPaths.map((item, idx) => (
                    <div key={idx} className="shrink-0 flex flex-col items-center">
                      {item.hasGlyph ? (
                        <svg viewBox="0 0 1000 1000" className="w-9 h-9">
                          {item.groups.map((group) => (
                            <path
                              key={group.id}
                              d={group.d}
                              fill="currentColor"
                              fillRule={group.fillRule}
                            />
                          ))}
                        </svg>
                      ) : (
                        <div className={`w-9 h-9 flex items-center justify-center font-bold text-sm border border-dashed rounded ${themeClasses.border} opacity-40`}>
                          {item.char}
                        </div>
                      )}
                      <span className={`text-[8px] font-mono opacity-50`}>{item.char}</span>
                    </div>
                  ))}
                </div>

                {/* L-05: each glyph is rendered at a fixed 36px width, so the
                    on-screen spacing differs from the real advance width. */}
                <p className={`text-[10.5px] leading-snug jp-wrap ${themeClasses.textMuted}`}>
                  ※ 各文字を幅 36px で並べているため、表示上の間隔は実際の送り幅と異なります。
                </p>
              </div>
            </ModalSection>
          </div>

          {/* Right Column: Weight Controls, Presets & Scope (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* 1. Presets Bar */}
            <ModalSection
              title="ウェイトプリセットを選択"
              step={1}
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {WEIGHT_PRESETS.map((p) => {
                  const isSelected = weightDelta === p.delta;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`p-2 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? themeClasses.activeTool
                          : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      <div className="text-xs font-bold truncate w-full">{p.label}</div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-current/10 w-full">
                        <span className="text-[10px] opacity-75 font-mono tabular-nums">{p.sub}</span>
                        <div
                          className="h-1.5 rounded-xs bg-current opacity-70"
                          style={{ width: `${Math.max(8, Math.min(32, 14 + p.delta * 0.15))}px` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ModalSection>

            {/* 2. Weight Delta Slider */}
            <ModalSection
              title="太さオフセット（片側輪郭移動）"
              step={2}
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-2">
                <SliderRow
                  label="オフセット量"
                  value={weightDelta}
                  min={-60}
                  max={150}
                  step={1}
                  unit="px"
                  formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
                  onChange={(v) => {
                    setSelectedPreset('custom');
                    setWeightDelta(v);
                  }}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="オフセットを 5px 細くする"
                    onClick={() => {
                      setSelectedPreset('custom');
                      setWeightDelta(Math.max(-60, weightDelta - 5));
                    }}
                    className={`w-11 h-11 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset('regular');
                      setWeightDelta(0);
                    }}
                    className="flex-1 text-center text-[11px] hover:underline cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
                  >
                    標準 (0px リセット / 線幅変化 ≈ {weightDelta * 2 > 0 ? `+${weightDelta * 2}` : weightDelta * 2}px)
                  </button>
                  <button
                    type="button"
                    aria-label="オフセットを 5px 太くする"
                    onClick={() => {
                      setSelectedPreset('custom');
                      setWeightDelta(Math.min(150, weightDelta + 5));
                    }}
                    className={`w-11 h-11 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                </div>

                <div className={`flex justify-between text-[10px] font-mono ${themeClasses.textMuted}`}>
                  <span>細字化 (-60px)</span>
                  <span>極太化 (+150px)</span>
                </div>
              </div>
            </ModalSection>

            {/* 3. Scope Selection */}
            <ModalSection
              title="適用対象（スコープ）"
              step={3}
              badge={
                <span
                  className={`ml-auto text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md border shrink-0 ${themeClasses.accentBadge}`}
                >
                  対象: {targetGlyphs.length} 文字{lockedTargetCount > 0 ? ` (ロック除外 ${lockedTargetCount})` : ''}
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'all', label: '全文字一括' },
                    { id: 'kanji', label: '漢字のみ' },
                    { id: 'kana', label: 'かなのみ' },
                    { id: 'latin', label: '英数のみ' },
                    { id: 'current', label: `現在文字 (${selectedGlyph?.char || ''})` },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (isWeightScope(s.id)) {
                          setScope(s.id);
                        }
                      }}
                      className={`min-h-[44px] sm:min-h-0 p-2 rounded-xl border text-center text-xs font-bold transition-colors cursor-pointer last:max-sm:col-span-2 flex items-center justify-center ${
                        scope === s.id
                          ? themeClasses.activeTool
                          : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <p className={`text-[11px] leading-relaxed ${themeClasses.textMuted}`}>
                  ※ 適用すると各文字の左余白（lsb）を輪郭の左端に合わせて再計算します。手動で調整した余白は上書きされます。
                </p>
                {openContourCount > 0 && (
                  <p className={`text-[11px] leading-relaxed ${themeClasses.textMuted}`}>
                    ※ 開輪郭 {openContourCount} 本は太さ調整の対象外です（位置・形状は変わりません）。太くするには先にアウトライン化してください。
                  </p>
                )}
              </div>
            </ModalSection>
          </div>
        </div>
      ) : (
        /* Master Interpolation Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: 2 Master Glyphs Selector + Interpolation Factor Slider */}
          <div className="lg:col-span-6 space-y-3">
            <ModalSection
              title="補間マスターグリフの選択"
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Master A */}
                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
                    <label className="text-xs font-bold block text-sky-600 dark:text-sky-400">
                      マスター A (始点 0%)
                    </label>
                    <select
                      value={masterAUnicode}
                      onChange={(e) => setMasterAUnicode(Number(e.target.value))}
                      className={`w-full p-2 rounded-lg border text-xs font-bold outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    >
                      {(nonEmptyGlyphs.length > 0 ? nonEmptyGlyphs : (Object.values(project.glyphs || {}) as GlyphData[])).map((g) => (
                        <option key={g.unicode} value={g.unicode}>
                          {g.char || `U+${g.unicode.toString(16).toUpperCase()}`} ({g.contours?.length || 0}輪郭)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Master B */}
                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
                    <label className="text-xs font-bold block text-rose-600 dark:text-rose-400">
                      マスター B (終点 100%)
                    </label>
                    <select
                      value={masterBUnicode}
                      onChange={(e) => setMasterBUnicode(Number(e.target.value))}
                      className={`w-full p-2 rounded-lg border text-xs font-bold outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    >
                      {(nonEmptyGlyphs.length > 0 ? nonEmptyGlyphs : (Object.values(project.glyphs || {}) as GlyphData[])).map((g) => (
                        <option key={g.unicode} value={g.unicode}>
                          {g.char || `U+${g.unicode.toString(16).toUpperCase()}`} ({g.contours?.length || 0}輪郭)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ModalAlert
                  tone={
                    masterCompatStatus.kind === 'mismatch'
                      ? 'warning'
                      : masterCompatStatus.kind === 'empty'
                        ? 'info'
                        : 'success'
                  }
                  title={masterCompatStatus.label}
                  theme={theme}
                />
              </div>
            </ModalSection>

            {/* Interpolation Factor Slider */}
            <ModalSection
              title="補間ブレンド比率 (t)"
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="space-y-2.5">
                <SliderRow
                  label="ブレンド比率"
                  value={Math.round(interpFactor * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => setInterpFactor(v / 100)}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* Quick Step Buttons */}
                <div className="flex justify-between gap-1.5 pt-0.5">
                  {[0, 0.25, 0.5, 0.75, 1.0].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setInterpFactor(step)}
                      className={`flex-1 min-h-[44px] sm:min-h-0 py-1.5 text-xs rounded-xl border font-mono tabular-nums transition-colors cursor-pointer ${
                        Math.abs(interpFactor - step) < 0.02
                          ? `${themeClasses.activeTool} font-bold`
                          : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      {Math.round(step * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </ModalSection>
          </div>

          {/* Right Column: Master Morphing Preview Stage */}
          <div className="lg:col-span-6">
            <ModalSection
              title="モーフィング補間プレビュー"
              badge={
                <span className="ml-auto flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="text-sky-600 font-bold">■ Master A ({glyphA?.char || 'A'})</span>
                  <span className="text-rose-600 font-bold">■ Master B ({glyphB?.char || 'B'})</span>
                  <span className={`${themeClasses.accentText} font-bold`}>■ 補間結果</span>
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div
                className={`w-full aspect-square max-w-[290px] mx-auto rounded-xl border flex items-center justify-center relative overflow-hidden shadow-none ${themeClasses.canvasOuterBg} ${themeClasses.border}`}
              >
                <svg
                  viewBox={getSafeGlyphViewBox(
                    [
                      ...(glyphA?.contours || []),
                      ...(glyphB?.contours || []),
                      ...masterInterpContours,
                    ],
                    1000
                  )}
                  className="w-full h-full p-3 pointer-events-none"
                >
                  {/* Master A Ghost */}
                  {glyphA?.contours && (
                    <path
                      d={contoursToSvgPath(glyphA.contours)}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      opacity={0.45}
                    />
                  )}
                  {/* Master B Ghost */}
                  {glyphB?.contours && (
                    <path
                      d={contoursToSvgPath(glyphB.contours)}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      opacity={0.45}
                    />
                  )}
                  {/* Interpolated Result */}
                  {masterInterpContours.length > 0 &&
                    groupContoursForRendering(masterInterpContours).map((group) => (
                      <path
                        key={group.id}
                        d={group.d}
                        fill={isLight ? '#0f172a' : '#ecfdf5'}
                        fillRule={group.fillRule}
                        stroke={isLight ? '#059669' : '#34d399'}
                        strokeWidth={1}
                      />
                    ))}
                </svg>
              </div>
            </ModalSection>
          </div>
        </div>
      )}
    </ModalShell>
  );
};
