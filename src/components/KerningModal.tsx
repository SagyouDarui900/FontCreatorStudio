import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Trash2,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { FontProject, GlyphData } from '../types';
import {
  KERNING_PRESET_GROUPS,
  batchAdjustSidebearings,
  SidebearingBatchOptions,
  calculateAutoKernOffset,
} from '../utils/metricsHelper';
import { contoursToSvgPath, normalizeGlyphContoursWinding } from '../utils/path';
import { DEFAULT_UPM } from '../utils/font';
import { parseKerningPairKey } from '../utils/font/validation';

import { ThemeMode, getThemeClasses, isLightTheme } from '../utils/theme';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalShell } from './modals/ModalShell';
import { ModalSection } from './modals/ModalSection';
import { ModalAlert } from './modals/ModalAlert';
import { ModalFooter } from './modals/ModalFooter';
import { ModalTabs } from './modals/ModalTabs';
import { SliderRow } from './modals/SliderRow';

interface KerningModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeMode;
  /** Commit history for one glyph (target unicode) before sidebearing batch changes. */
  commitHistory?: (targetUnicode?: number) => void;
  /** Batched history commit for sidebearing changes across multiple glyphs. */
  commitBatchHistory?: (targetUnicodes: number[], targetIvsKeys?: string[]) => void;
  /** Commit project-level config history before kerning changes. */
  commitProjectHistory?: () => void;
}

function safeCharFromCode(code: number | null): string {
  if (code === null || !Number.isInteger(code) || code <= 0 || code > 0x10ffff) {
    return '';
  }
  return String.fromCodePoint(code);
}

function formatKerningPairKey(leftChar: string, rightChar: string): string {
  if (leftChar === ',' || rightChar === ',') {
    const leftCode = leftChar.codePointAt(0);
    const rightCode = rightChar.codePointAt(0);
    if (leftCode && rightCode) {
      return `U+${leftCode.toString(16).toUpperCase().padStart(4, '0')},U+${rightCode.toString(16).toUpperCase().padStart(4, '0')}`;
    }
  }
  return `${leftChar},${rightChar}`;
}

function formatPairKeyDisplay(pairKey: string): string {
  const { left, right } = parseKerningPairKey(pairKey);
  if (left !== null && right !== null) {
    return `${safeCharFromCode(left)} ${safeCharFromCode(right)}`;
  }
  return pairKey.replace(',', ' ');
}

function findPairKeyInMap(
  map: Record<string, number>,
  leftCode: number,
  rightCode: number
): string | null {
  const leftChar = safeCharFromCode(leftCode);
  const rightChar = safeCharFromCode(rightCode);
  if (leftChar && rightChar) {
    const directKey = `${leftChar},${rightChar}`;
    if (Object.prototype.hasOwnProperty.call(map, directKey)) return directKey;
    const formattedKey = formatKerningPairKey(leftChar, rightChar);
    if (Object.prototype.hasOwnProperty.call(map, formattedKey)) return formattedKey;
  }
  for (const key of Object.keys(map)) {
    const parsed = parseKerningPairKey(key);
    if (parsed.left === leftCode && parsed.right === rightCode) {
      return key;
    }
  }
  return null;
}

function hasDrawableGlyph(glyph: GlyphData | null | undefined): boolean {
  if (!glyph) return false;
  return Boolean(
    (glyph.contours && glyph.contours.some((c) => c.nodes && c.nodes.length > 0)) ||
      (glyph.pixelData?.data && glyph.pixelData.data.some((v) => v === 1))
  );
}

export const KerningModal: React.FC<KerningModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
  showToast,
  onShowToast,
  theme,
  commitHistory,
  commitBatchHistory,
  commitProjectHistory,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const upm =
    project.metadata?.unitsPerEm && project.metadata.unitsPerEm > 0
      ? project.metadata.unitsPerEm
      : DEFAULT_UPM;
  const emScale = upm / 1000;
  const [activeTab, setActiveTab] = useState<'kerning' | 'sidebearing'>('kerning');

  // Unified updater function supporting both prop styles
  const updateProject = useMemo(() => {
    if (onUpdateProject) return onUpdateProject;
    if (setProject) return setProject;
    return (_updater: (prev: FontProject) => FontProject) => {};
  }, [onUpdateProject, setProject]);

  // Kerning-only changes are project-level config: register them in the
  // project history before applying so Ctrl+Z can restore them.
  const commitKerningHistory = useMemo(
    () => () => commitProjectHistory?.(),
    [commitProjectHistory]
  );

  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    } else if (onShowToast) {
      onShowToast(msg, type);
    }
  };

  // -------------------------------------------------------------
  // Kerning Pairs State
  // -------------------------------------------------------------
  const kerningPairs = project.kerning || {};
  const [selectedPairKey, setSelectedPairKey] = useState<string>('「,「');
  const [customLeft, setCustomLeft] = useState<string>('');
  const [customRight, setCustomRight] = useState<string>('');
  const [customValue, setCustomValue] = useState<number>(-100);
  const [sampleText, setSampleText] = useState<string>('「こんにちは」AVANT-GARDE 110番');
  const [autoKernOverwrite, setAutoKernOverwrite] = useState<boolean>(false);

  // Fullscreen & Clear confirmation state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);

  // Drag-session ref so dragging the slider pushes ONE undo entry instead of every frame
  const hasCommittedSliderHistoryRef = useRef<boolean>(false);
  const wasOpenRef = useRef<boolean>(false);

  const isTopModal = useIsTopModal();

  // Reset drag-session commit flag on pointer release / blur / pair change
  useEffect(() => {
    const endSession = () => {
      hasCommittedSliderHistoryRef.current = false;
    };
    window.addEventListener('pointerup', endSession);
    window.addEventListener('pointercancel', endSession);
    window.addEventListener('blur', endSession);
    return () => {
      window.removeEventListener('pointerup', endSession);
      window.removeEventListener('pointercancel', endSession);
      window.removeEventListener('blur', endSession);
    };
  }, []);

  useEffect(() => {
    hasCommittedSliderHistoryRef.current = false;
  }, [selectedPairKey]);

  // Select first registered pair (if any) when opening modal so we don't land on phantom '「,「'
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const keys = Object.keys(kerningPairs);
      if (keys.length > 0 && !(selectedPairKey in kerningPairs)) {
        setSelectedPairKey(keys[0]);
      } else if (keys.length === 0) {
        // Pick first preset whose characters both exist, else keep current
        for (const group of KERNING_PRESET_GROUPS) {
          const available = group.pairs.find((p) => {
            const lc = p.left.codePointAt(0);
            const rc = p.right.codePointAt(0);
            return Boolean(lc && rc && project.glyphs[lc] && project.glyphs[rc]);
          });
          if (available) {
            setSelectedPairKey(formatKerningPairKey(available.left, available.right));
            break;
          }
        }
      }
      setSbTargetAdvance(upm);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, upm, kerningPairs, selectedPairKey, project.glyphs]);

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
      } else if (
        (e.key === 'f' || e.key === 'F') &&
        !isInput &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, onClose]);

  // Effective kerning map combining project.kerning + enabled OpenType customKerningPairs (matches compilerCore)
  const effectiveKerningByCodePair = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, val] of Object.entries(kerningPairs)) {
      if (typeof val !== 'number' || !Number.isFinite(val)) continue;
      const { left, right } = parseKerningPairKey(key);
      if (left !== null && right !== null) {
        map.set(`${left}:${right}`, val);
      }
    }
    if (project.openTypeFeatures?.enabled !== false) {
      for (const pair of project.openTypeFeatures?.customKerningPairs || []) {
        if (!pair.enabled || !Number.isFinite(pair.amount)) continue;
        map.set(`${pair.firstUnicode}:${pair.secondUnicode}`, pair.amount);
      }
    }
    return map;
  }, [kerningPairs, project.openTypeFeatures]);

  // Selected pair character glyphs
  const pairGlyphs = useMemo(() => {
    const { left, right } = parseKerningPairKey(selectedPairKey);
    const leftChar = safeCharFromCode(left);
    const rightChar = safeCharFromCode(right);
    const leftGlyph = left ? project.glyphs[left] : null;
    const rightGlyph = right ? project.glyphs[right] : null;

    return {
      leftCode: left,
      rightCode: right,
      leftChar,
      rightChar,
      leftGlyph,
      rightGlyph,
      leftDrawable: hasDrawableGlyph(leftGlyph),
      rightDrawable: hasDrawableGlyph(rightGlyph),
    };
  }, [selectedPairKey, project.glyphs]);

  const matchedRegisteredKey = useMemo(() => {
    if (!pairGlyphs.leftCode || !pairGlyphs.rightCode) return null;
    return findPairKeyInMap(kerningPairs, pairGlyphs.leftCode, pairGlyphs.rightCode);
  }, [kerningPairs, pairGlyphs.leftCode, pairGlyphs.rightCode]);

  const isSelectedPairRegistered = Boolean(matchedRegisteredKey);

  // Recommended preset (if any) without pretending it is already registered
  const recommendedPresetValue = useMemo(() => {
    if (!pairGlyphs.leftChar || !pairGlyphs.rightChar) return null;
    for (const group of KERNING_PRESET_GROUPS) {
      const match = group.pairs.find(
        (p) => p.left === pairGlyphs.leftChar && p.right === pairGlyphs.rightChar
      );
      if (match) return Math.round(match.defaultVal * emScale);
    }
    return null;
  }, [pairGlyphs.leftChar, pairGlyphs.rightChar, emScale]);

  const currentPairValue = useMemo(() => {
    if (matchedRegisteredKey) {
      const v = kerningPairs[matchedRegisteredKey];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }
    if (pairGlyphs.leftCode && pairGlyphs.rightCode) {
      const customVal = effectiveKerningByCodePair.get(
        `${pairGlyphs.leftCode}:${pairGlyphs.rightCode}`
      );
      if (customVal !== undefined) return customVal;
    }
    return 0;
  }, [matchedRegisteredKey, kerningPairs, pairGlyphs.leftCode, pairGlyphs.rightCode, effectiveKerningByCodePair]);

  const canAdjustSelectedPair = Boolean(
    pairGlyphs.leftCode &&
      pairGlyphs.rightCode &&
      pairGlyphs.leftGlyph &&
      pairGlyphs.rightGlyph &&
      pairGlyphs.leftDrawable &&
      pairGlyphs.rightDrawable
  );

  // -------------------------------------------------------------
  // Sidebearing State
  // -------------------------------------------------------------
  const [sbScope, setSbScope] = useState<SidebearingBatchOptions['scope']>('all');
  const [sbMode, setSbMode] = useState<SidebearingBatchOptions['mode']>('center');
  const [sbLsb, setSbLsb] = useState<number>(Math.round(60 * emScale));
  const [sbRsb, setSbRsb] = useState<number>(Math.round(60 * emScale));
  const [sbTargetAdvance, setSbTargetAdvance] = useState<number>(upm);
  const [sbOffsetDelta, setSbOffsetDelta] = useState<number>(0);
  const [sbPreviewChar, setSbPreviewChar] = useState<string>('あ');

  // Preview Glyph for Sidebearings
  const sbPreviewGlyph = useMemo(() => {
    const code = sbPreviewChar.codePointAt(0);
    if (!code) return null;
    return project.glyphs[code] || null;
  }, [sbPreviewChar, project.glyphs]);

  if (!isOpen) return null;

  const kernSliderMin = Math.round(-300 * emScale);
  const kernSliderMax = Math.round(150 * emScale);
  const kernSliderStep = Math.max(1, Math.round(5 * emScale));

  const beginSliderHistorySession = () => {
    if (!hasCommittedSliderHistoryRef.current) {
      commitKerningHistory();
      hasCommittedSliderHistoryRef.current = true;
    }
  };

  // Add or update kerning pair (syncs customKerningPairs override if present)
  const handleUpdateKerningValue = (val: number) => {
    const leftCode = pairGlyphs.leftCode;
    const rightCode = pairGlyphs.rightCode;
    if (
      !leftCode ||
      !rightCode ||
      !project.glyphs[leftCode] ||
      !project.glyphs[rightCode] ||
      !pairGlyphs.leftDrawable ||
      !pairGlyphs.rightDrawable
    ) {
      notify('対象の文字がまだ作図されていないため、カーニングを追加できません', 'warning');
      return;
    }
    const targetKey =
      matchedRegisteredKey || formatKerningPairKey(pairGlyphs.leftChar, pairGlyphs.rightChar);
    if (!hasCommittedSliderHistoryRef.current) {
      commitKerningHistory();
    }
    updateProject((prev) => {
      const nextCustomPairs = prev.openTypeFeatures?.customKerningPairs?.map((p) =>
        p.enabled && p.firstUnicode === leftCode && p.secondUnicode === rightCode
          ? { ...p, amount: val }
          : p
      );
      return {
        ...prev,
        kerning: {
          ...(prev.kerning || {}),
          [targetKey]: val,
        },
        ...(nextCustomPairs && prev.openTypeFeatures
          ? {
              openTypeFeatures: {
                ...prev.openTypeFeatures,
                customKerningPairs: nextCustomPairs,
              },
            }
          : {}),
        updatedAt: Date.now(),
      };
    });
    if (targetKey !== selectedPairKey) {
      setSelectedPairKey(targetKey);
    }
  };

  // Add custom kerning pair
  const handleAddCustomPair = () => {
    const leftChar = Array.from(customLeft.trim())[0];
    const rightChar = Array.from(customRight.trim())[0];
    if (!leftChar || !rightChar) {
      notify('左文字と右文字の両方を入力してください', 'warning');
      return;
    }
    const leftCode = leftChar.codePointAt(0);
    const rightCode = rightChar.codePointAt(0);
    if (!leftCode || !rightCode || !project.glyphs[leftCode] || !project.glyphs[rightCode]) {
      notify('対象の文字がまだ作図されていないため、ペアを追加できません', 'warning');
      return;
    }
    const safeVal = Number.isFinite(customValue) ? Math.round(customValue) : 0;
    const existingKey = findPairKeyInMap(kerningPairs, leftCode, rightCode);
    const pairKey = existingKey || formatKerningPairKey(leftChar, rightChar);
    commitKerningHistory();
    updateProject((prev) => {
      const nextCustomPairs = prev.openTypeFeatures?.customKerningPairs?.map((p) =>
        p.enabled && p.firstUnicode === leftCode && p.secondUnicode === rightCode
          ? { ...p, amount: safeVal }
          : p
      );
      return {
        ...prev,
        kerning: {
          ...(prev.kerning || {}),
          [pairKey]: safeVal,
        },
        ...(nextCustomPairs && prev.openTypeFeatures
          ? {
              openTypeFeatures: {
                ...prev.openTypeFeatures,
                customKerningPairs: nextCustomPairs,
              },
            }
          : {}),
        updatedAt: Date.now(),
      };
    });
    setSelectedPairKey(pairKey);
    setCustomLeft('');
    setCustomRight('');
    notify(`ペア「${leftChar} ${rightChar}」(${safeVal}) を追加しました`, 'success');
  };

  // Remove kerning pair
  const handleRemovePair = (key: string) => {
    const { left, right } = parseKerningPairKey(key);
    commitKerningHistory();
    updateProject((prev) => {
      const next = { ...(prev.kerning || {}) };
      delete next[key];
      const nextCustomPairs =
        left && right && prev.openTypeFeatures?.customKerningPairs
          ? prev.openTypeFeatures.customKerningPairs.map((p) =>
              p.firstUnicode === left && p.secondUnicode === right
                ? { ...p, enabled: false }
                : p
            )
          : undefined;
      return {
        ...prev,
        kerning: next,
        ...(nextCustomPairs && prev.openTypeFeatures
          ? {
              openTypeFeatures: {
                ...prev.openTypeFeatures,
                customKerningPairs: nextCustomPairs,
              },
            }
          : {}),
        updatedAt: Date.now(),
      };
    });
    notify(`ペア「${formatPairKeyDisplay(key)}」のカーニング設定を解除しました`, 'info');
  };

  // Apply preset group
  const handleApplyPresetGroup = (group: (typeof KERNING_PRESET_GROUPS)[0]) => {
    const existingPairs = group.pairs.filter((p) => {
      const leftCode = p.left.codePointAt(0);
      const rightCode = p.right.codePointAt(0);
      return Boolean(leftCode && rightCode && project.glyphs[leftCode] && project.glyphs[rightCode]);
    });
    const skippedCount = group.pairs.length - existingPairs.length;
    if (existingPairs.length === 0) {
      notify('プリセットの対象文字がまだ作図されていないため、登録できません', 'warning');
      return;
    }
    commitKerningHistory();
    updateProject((prev) => {
      const next = { ...(prev.kerning || {}) };
      for (const p of existingPairs) {
        const key = formatKerningPairKey(p.left, p.right);
        next[key] = Math.round(p.defaultVal * emScale);
      }
      return {
        ...prev,
        kerning: next,
        updatedAt: Date.now(),
      };
    });
    notify(
      skippedCount > 0
        ? `プリセット「${group.name}」(${existingPairs.length}ペア) を一括登録しました（作図されていない文字の${skippedCount}ペアを除外）`
        : `プリセット「${group.name}」(${group.pairs.length}ペア) を一括登録しました`,
      skippedCount > 0 ? 'warning' : 'success'
    );
  };

  // FontForge AutoKern algorithm execution across preset + existing registered pairs
  const handleAutoKernAllPairs = () => {
    const glyphEntries = Object.values(project.glyphs || {});
    if (glyphEntries.length < 2) {
      notify('オートカーニングを実行するには最低2文字以上の作図が必要です', 'warning');
      return;
    }

    const nextKerning = { ...(project.kerning || {}) };
    const candidateMap = new Map<string, { leftCode: number; rightCode: number; preferredKey: string }>();

    for (const group of KERNING_PRESET_GROUPS) {
      for (const p of group.pairs) {
        const leftCode = p.left.codePointAt(0);
        const rightCode = p.right.codePointAt(0);
        if (!leftCode || !rightCode) continue;
        const existingKey = findPairKeyInMap(nextKerning, leftCode, rightCode);
        candidateMap.set(`${leftCode}:${rightCode}`, {
          leftCode,
          rightCode,
          preferredKey: existingKey || formatKerningPairKey(p.left, p.right),
        });
      }
    }

    for (const existingKey of Object.keys(nextKerning)) {
      const { left, right } = parseKerningPairKey(existingKey);
      if (left && right && !candidateMap.has(`${left}:${right}`)) {
        candidateMap.set(`${left}:${right}`, {
          leftCode: left,
          rightCode: right,
          preferredKey: existingKey,
        });
      }
    }

    let autoKernedCount = 0;
    let skippedExistingCount = 0;

    for (const cand of candidateMap.values()) {
      const alreadyRegistered = Object.prototype.hasOwnProperty.call(nextKerning, cand.preferredKey);
      if (alreadyRegistered && !autoKernOverwrite) {
        skippedExistingCount++;
        continue;
      }

      const leftGlyph = project.glyphs[cand.leftCode];
      const rightGlyph = project.glyphs[cand.rightCode];
      if (!leftGlyph || !rightGlyph) continue;

      const offset = calculateAutoKernOffset(leftGlyph, rightGlyph, undefined, upm);
      if (offset !== 0) {
        nextKerning[cand.preferredKey] = offset;
        autoKernedCount++;
      }
    }

    if (autoKernedCount === 0) {
      notify(
        skippedExistingCount > 0
          ? `未登録ペアに大きな光学的ズレは見つかりませんでした（調整済み ${skippedExistingCount}件は保持）`
          : '作図済み文字の中で大きな光学的ズレは検出されませんでした',
        'info'
      );
      return;
    }

    commitKerningHistory();
    updateProject((prev) => ({
      ...prev,
      kerning: nextKerning,
      updatedAt: Date.now(),
    }));

    notify(
      skippedExistingCount > 0
        ? `自動カーニング: ${autoKernedCount} ペアを計算しました（調整済み ${skippedExistingCount}件は保持）`
        : `自動カーニング: ${autoKernedCount} ペアのカーニング値を光学計算しました！`,
      'success'
    );
  };

  // Execute Batch Sidebearings
  const handleExecuteSidebearingBatch = () => {
    const { updatedGlyphs, modifiedCount, lockedSkippedCount } = batchAdjustSidebearings(
      project.glyphs,
      {
        scope: sbScope,
        mode: sbMode,
        lsb: sbLsb,
        rsb: sbRsb,
        targetAdvance: sbTargetAdvance,
        offsetDelta: sbOffsetDelta,
        unitsPerEm: upm,
      }
    );

    if (modifiedCount === 0) {
      if (lockedSkippedCount > 0) {
        notify(
          `対象範囲の ${lockedSkippedCount} 文字はロック保護されているため変更されませんでした`,
          'warning'
        );
      } else if ((sbMode === 'offset-lsb' || sbMode === 'offset-rsb') && sbOffsetDelta === 0) {
        notify('オフセットシフト値が 0px のため、変更がありません', 'info');
      } else {
        notify('変更対象となる作図済み文字がありません（または既に同じ値です）', 'warning');
      }
      return;
    }

    const changedUnicodes: number[] = [];
    for (const [key, glyph] of Object.entries(updatedGlyphs)) {
      const unicode = Number(key);
      if (project.glyphs[unicode] !== glyph) {
        changedUnicodes.push(unicode);
      }
    }

    if (commitBatchHistory) {
      commitBatchHistory(changedUnicodes);
    } else {
      for (const unicode of changedUnicodes) {
        commitHistory?.(unicode);
      }
    }

    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    const lockedNote = lockedSkippedCount > 0 ? `（ロック保護 ${lockedSkippedCount}件除外）` : '';
    notify(`${modifiedCount} 文字の余白・送り幅を一括調整しました！${lockedNote}`, 'success');
  };

  // Precompute sample sentence SVG layout cleanly
  const sampleLayout = (() => {
    const chars = Array.from(sampleText);
    let cursorX = Math.round(50 * emScale);
    const items = chars.map((ch, idx) => {
      const code = ch.codePointAt(0);
      const glyph = code ? project.glyphs[code] : null;
      const currentAdvance = glyph?.advanceWidth && glyph.advanceWidth > 0 ? glyph.advanceWidth : upm;

      let kernOffset = 0;
      if (idx < chars.length - 1 && code) {
        const nextCode = chars[idx + 1].codePointAt(0);
        if (nextCode) {
          kernOffset = effectiveKerningByCodePair.get(`${code}:${nextCode}`) ?? 0;
        }
      }

      const x = cursorX;
      cursorX += currentAdvance + kernOffset;
      return { ch, idx, glyph, currentAdvance, x };
    });
    const totalWidth = Math.max(upm * 2, cursorX + Math.round(80 * emScale));
    return { items, totalWidth };
  })();

  const footer = (
    <ModalFooter
      primaryLabel="閉じる"
      onPrimary={onClose}
      theme={theme}
      themeClasses={themeClasses}
      leftInfo={
        <span className={`text-[11px] font-mono hidden sm:inline ${themeClasses.textMuted}`}>
          登録ペア: {Object.keys(kerningPairs).length}件 / UPM: {upm}
        </span>
      }
    />
  );

  return (
    <ModalShell
      title="カーニング & サイドベアリング調整スタジオ"
      subtitle="文字間のすきま（ペアカーニング）と左右余白（サイドベアリング）を一括調整します"
      maxWidth="4xl"
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((v) => !v)}
      onClose={onClose}
      theme={theme}
      themeClasses={themeClasses}
      footer={footer}
    >
      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-3.5 sm:mb-4">
        <ModalTabs
          tabs={[
            {
              id: 'kerning',
              label: 'ペアカーニング調整（約物・欧文・かな）',
              shortLabel: 'ペアカーニング調整',
              count: Object.keys(kerningPairs).length,
            },
            {
              id: 'sidebearing',
              label: 'サイドベアリング（左右余白・送り幅）一括調整',
              shortLabel: 'サイドベアリング一括調整',
            },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="カーニング調整のタブ"
        />
      </div>

      {activeTab === 'kerning' ? (
        /* ========================================================= */
        /* TAB 1: PAIR KERNING */
        /* ========================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Preset Groups & Pair List */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Preset Fast Loader */}
            <ModalSection
              title="標準カーニング一括プリセット"
              badge={
                <button
                  type="button"
                  onClick={handleAutoKernAllPairs}
                  className={`ml-auto px-2.5 py-1 sm:px-2 sm:py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${themeClasses.accentBtn}`}
                  title="作図済みグリフの光学プロファイルからペアカーニングを自動計算"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>自動カーニング</span>
                </button>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-[10.5px] cursor-pointer select-none opacity-85">
                  <input
                    type="checkbox"
                    checked={autoKernOverwrite}
                    onChange={(e) => setAutoKernOverwrite(e.target.checked)}
                    className="rounded accent-emerald-600 w-3.5 h-3.5"
                  />
                  <span>自動計算時に既存の調整済みペアも上書きする</span>
                </label>
                <div className="flex flex-col gap-1.5">
                  {KERNING_PRESET_GROUPS.map((group) => (
                    <div
                      key={group.id}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${themeClasses.cardBg} ${themeClasses.border}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[11px]">{group.name}</span>
                        <span className={`text-[10px] ${themeClasses.textMuted}`}>
                          {group.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPresetGroup(group)}
                        className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
                      >
                        一括登録
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </ModalSection>

            {/* Custom Pair Input */}
            <ModalSection
              title="自由なペアを追加"
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="grid grid-cols-[1fr_auto_1fr_1.3fr] sm:flex items-center gap-2 text-xs">
                <input
                  type="text"
                  maxLength={2}
                  placeholder="左 (A)"
                  value={customLeft ?? ''}
                  onChange={(e) => setCustomLeft(e.target.value)}
                  className={`w-full sm:w-16 p-2 sm:p-1.5 rounded-lg border text-center font-bold ${themeClasses.cardBg} ${themeClasses.border}`}
                />
                <span className={`font-bold ${themeClasses.textMuted}`}>+</span>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="右 (V)"
                  value={customRight ?? ''}
                  onChange={(e) => setCustomRight(e.target.value)}
                  className={`w-full sm:w-16 p-2 sm:p-1.5 rounded-lg border text-center font-bold ${themeClasses.cardBg} ${themeClasses.border}`}
                />
                <input
                  type="number"
                  step={10}
                  placeholder="-100"
                  value={Number.isFinite(customValue) ? customValue : 0}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    setCustomValue(Number.isFinite(parsed) ? parsed : 0);
                  }}
                  className={`w-full sm:w-20 p-2 sm:p-1.5 rounded-lg border text-center font-mono font-bold ${themeClasses.cardBg} ${themeClasses.border}`}
                />
                <button
                  type="button"
                  onClick={handleAddCustomPair}
                  className={`col-span-4 sm:col-span-1 sm:flex-1 py-2 sm:py-1.5 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
                >
                  追加
                </button>
              </div>
            </ModalSection>

            {/* Registered Pairs List */}
            <div
              className={`p-3 rounded-xl border flex-1 flex flex-col min-h-48 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
            >
              <div
                className={`flex items-center justify-between text-[11px] font-bold mb-2 ${themeClasses.textMuted}`}
              >
                <span>登録済みペア一覧 ({Object.keys(kerningPairs).length} 件):</span>
                {Object.keys(kerningPairs).length > 0 &&
                  (isConfirmingClearAll ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          commitKerningHistory();
                          updateProject((prev) => ({
                            ...prev,
                            kerning: {},
                            updatedAt: Date.now(),
                          }));
                          setIsConfirmingClearAll(false);
                          notify('登録済みのカーニングをすべて削除しました', 'info');
                        }}
                        className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        本当に全削除
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAll(false)}
                        className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`}
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClearAll(true)}
                      className="text-[10px] text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      全削除
                    </button>
                  ))}
              </div>
              <div className="flex-1 overflow-y-auto max-h-56 flex flex-col gap-1 pr-1">
                {Object.entries(kerningPairs).length === 0 ? (
                  <div className={`text-center p-6 text-xs ${themeClasses.textMuted}`}>
                    上のプリセットから一括登録するか、自由な文字ペアを追加してください
                  </div>
                ) : (
                  Object.entries(kerningPairs).map(([pairKey, val]) => {
                    const isActive =
                      selectedPairKey === pairKey || matchedRegisteredKey === pairKey;
                    return (
                      <div
                        key={pairKey}
                        onClick={() => setSelectedPairKey(pairKey)}
                        className={`p-2 rounded border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isActive
                            ? `${themeClasses.activeTool} border-transparent`
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        <span className="font-mono text-sm tracking-widest">
                          {formatPairKeyDisplay(pairKey)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">
                            {Number(val) > 0 ? `+${val}` : `${val}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePair(pairKey);
                            }}
                            className={`p-1 rounded hover:text-red-600 transition-colors cursor-pointer ${
                              isActive ? 'opacity-80 hover:opacity-100' : themeClasses.textMuted
                            }`}
                            title="ペアを削除"
                            aria-label={`${formatPairKeyDisplay(pairKey)} を削除`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Pair Preview & Slider Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Active Pair Control Box */}
            <ModalSection
              title="選択ペアの字間微調整"
              badge={
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      isSelectedPairRegistered
                        ? themeClasses.accentBadge
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`
                    }`}
                  >
                    {isSelectedPairRegistered ? '登録済み' : '未登録 (±0)'}
                  </span>
                  <span className={`font-mono text-sm font-bold ${themeClasses.accentText}`}>
                    「{pairGlyphs.leftChar || '?'}」と「{pairGlyphs.rightChar || '?'}」
                  </span>
                </div>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-col gap-4">
                {!canAdjustSelectedPair && (
                  <ModalAlert
                    tone="warning"
                    title="作図されていない文字が含まれています"
                    theme={theme}
                  >
                    「{pairGlyphs.leftChar || '?'}」「{pairGlyphs.rightChar || '?'}」の両方に輪郭またはピクセル作図がある場合のみ調整できます。
                  </ModalAlert>
                )}

                {!isSelectedPairRegistered &&
                  recommendedPresetValue !== null &&
                  canAdjustSelectedPair && (
                    <div
                      className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-[11px] ${themeClasses.cardBg} ${themeClasses.border}`}
                    >
                      <span className={themeClasses.textMuted}>
                        まだ登録されていません（プリセット推奨値:{' '}
                        <strong className="font-mono">
                          {recommendedPresetValue > 0
                            ? `+${recommendedPresetValue}`
                            : recommendedPresetValue}
                        </strong>
                        ）
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateKerningValue(recommendedPresetValue)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0 cursor-pointer ${themeClasses.accentBtn}`}
                      >
                        推奨値を適用
                      </button>
                    </div>
                  )}

                {/* Value Slider */}
                <SliderRow
                  label="カーニング変位値 (フォント単位)"
                  value={Number.isFinite(currentPairValue) ? currentPairValue : 0}
                  min={kernSliderMin}
                  max={kernSliderMax}
                  step={kernSliderStep}
                  unit=" units"
                  disabled={!canAdjustSelectedPair}
                  formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
                  onInteractionStart={beginSliderHistorySession}
                  onChange={(v) => handleUpdateKerningValue(v)}
                  showNumberInput
                  hint={`${kernSliderMin} (詰める) ・ 0 (基準) ・ +${kernSliderMax} (広げる)`}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* Visual Pair Comparison */}
                <div className="flex flex-col gap-2">
                  <span className={`text-[11px] font-bold ${themeClasses.textMuted}`}>
                    字間比較プレビュー（上: カーニングなし / 下: カーニング適用後）:
                  </span>

                  {/* Compare Container */}
                  <div
                    className={`grid grid-rows-2 gap-2 p-3 rounded-lg border overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}
                  >
                    {/* Row 1: Without Kerning */}
                    <div
                      className={`flex items-center gap-3 border-b pb-2 min-w-0 ${themeClasses.border}`}
                    >
                      <span className={`text-[10px] w-16 shrink-0 ${themeClasses.textMuted}`}>
                        通常(±0)
                      </span>
                      <div className="h-16 min-w-0 flex-1 flex items-center relative overflow-hidden sm:overflow-visible">
                        <svg
                          viewBox={`0 0 ${upm * 2} ${upm}`}
                          className="w-full max-w-[240px] sm:w-auto h-16 overflow-visible"
                        >
                          {/* Left Glyph */}
                          {pairGlyphs.leftGlyph && (
                            <path
                              d={contoursToSvgPath(
                                normalizeGlyphContoursWinding(pairGlyphs.leftGlyph.contours || [])
                              )}
                              fill={isLight ? '#57534e' : '#6ee7b7'}
                              fillRule="nonzero"
                              opacity={0.7}
                            />
                          )}
                          {/* Right Glyph shifted by regular advance */}
                          {pairGlyphs.rightGlyph && (
                            <g
                              transform={`translate(${
                                pairGlyphs.leftGlyph?.advanceWidth || upm
                              }, 0)`}
                            >
                              <path
                                d={contoursToSvgPath(
                                  normalizeGlyphContoursWinding(pairGlyphs.rightGlyph.contours || [])
                                )}
                                fill={isLight ? '#57534e' : '#6ee7b7'}
                                fillRule="nonzero"
                                opacity={0.7}
                              />
                            </g>
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* Row 2: With Kerning */}
                    <div className="flex items-center gap-3 pt-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 w-16 shrink-0">
                        {currentPairValue > 0 ? `+${currentPairValue}` : currentPairValue} 適用
                      </span>
                      <div className="h-16 min-w-0 flex-1 flex items-center relative overflow-hidden sm:overflow-visible">
                        <svg
                          viewBox={`0 0 ${upm * 2} ${upm}`}
                          className="w-full max-w-[240px] sm:w-auto h-16 overflow-visible"
                        >
                          {/* Left Glyph */}
                          {pairGlyphs.leftGlyph && (
                            <path
                              d={contoursToSvgPath(
                                normalizeGlyphContoursWinding(pairGlyphs.leftGlyph.contours || [])
                              )}
                              fill={isLight ? '#1c1917' : '#34d399'}
                              fillRule="nonzero"
                            />
                          )}
                          {/* Right Glyph shifted by regular advance + kerning offset */}
                          {pairGlyphs.rightGlyph && (
                            <g
                              transform={`translate(${
                                (pairGlyphs.leftGlyph?.advanceWidth || upm) + currentPairValue
                              }, 0)`}
                            >
                              <path
                                d={contoursToSvgPath(
                                  normalizeGlyphContoursWinding(pairGlyphs.rightGlyph.contours || [])
                                )}
                                fill={isLight ? '#1c1917' : '#34d399'}
                                fillRule="nonzero"
                              />
                            </g>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalSection>

            {/* Live Sample Sentence Testing */}
            <ModalSection
              title="リアルタイム組版テスト"
              badge={
                <span className={`ml-auto text-[10px] shrink-0 ${themeClasses.textMuted}`}>
                  文字を入力してテストできます
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={sampleText ?? ''}
                  onChange={(e) => setSampleText(e.target.value)}
                  className={`w-full p-2 text-xs rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
                  placeholder="テスト組版テキスト"
                />

                {/* Render Sample Canvas */}
                <div
                  className={`p-4 rounded border min-h-20 flex items-center overflow-x-auto shadow-inner ${themeClasses.cardBg} ${themeClasses.border}`}
                >
                  <div className="flex items-center h-20 shrink-0">
                    <svg
                      viewBox={`0 0 ${sampleLayout.totalWidth} ${upm}`}
                      className="h-20 overflow-visible"
                      style={{
                        width: `${Math.max(240, Math.round((sampleLayout.totalWidth / upm) * 72))}px`,
                      }}
                    >
                      {sampleLayout.items.map(({ idx, glyph, currentAdvance, x }) => {
                        if (!glyph || !glyph.contours || glyph.contours.length === 0) {
                          return (
                            <g key={idx} transform={`translate(${x}, 0)`}>
                              <rect
                                x={Math.round(50 * emScale)}
                                y={Math.round(100 * emScale)}
                                width={Math.max(10, currentAdvance - Math.round(100 * emScale))}
                                height={Math.round(800 * emScale)}
                                fill="none"
                                stroke={isLight ? '#e5e7eb' : '#223126'}
                                strokeDasharray={`${20 * emScale} ${20 * emScale}`}
                              />
                            </g>
                          );
                        }

                        return (
                          <g key={idx} transform={`translate(${x}, 0)`}>
                            <path
                              d={contoursToSvgPath(normalizeGlyphContoursWinding(glyph.contours))}
                              fill={isLight ? '#1c1917' : '#34d399'}
                              fillRule="nonzero"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </ModalSection>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* TAB 2: SIDEBEARINGS BATCH ADJUSTMENT */
        /* ========================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Scope Selection */}
            <ModalSection
              title="調整対象の文字カテゴリ"
              step={1}
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', name: '全グリフ一括' },
                    { id: 'hiragana', name: 'ひらがな' },
                    { id: 'katakana', name: 'カタカナ' },
                    { id: 'kanji', name: '漢字' },
                    { id: 'latin', name: '英数字' },
                    { id: 'symbols', name: '記号・約物' },
                  ] as const
                ).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSbScope(sc.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                      sbScope === sc.id
                        ? `${themeClasses.activeTool} border-transparent`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            </ModalSection>

            {/* Adjustment Mode Card */}
            <ModalSection
              title="サイドベアリング調整モード"
              step={2}
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      {
                        id: 'center',
                        title: '① 左右余白均等センタリング',
                        desc: '字面枠の中央に文字を配置（LSB = RSB）',
                      },
                      {
                        id: 'proportional',
                        title: '② プロポーショナル化',
                        desc: '指定の左右余白で文字幅に合わせて送り幅を再計算',
                      },
                      {
                        id: 'uniform-advance',
                        title: '③ 送り幅統一（全角/半角）',
                        desc: `全角${upm}pxや半角${Math.round(upm / 2)}px等に送り幅を固定`,
                      },
                      {
                        id: 'offset-lsb',
                        title: '④ 左余白(LSB)の加減算',
                        desc: '文字の左余白を一律に左右へシフト',
                      },
                      {
                        id: 'offset-rsb',
                        title: '⑤ 右余白(RSB)の加減算',
                        desc: '送り幅を増減して右側の余白を一律調整',
                      },
                      {
                        id: 'smart-auto',
                        title: '⑥ スマート自動スペーシング',
                        desc: '和文は全角中央揃え、欧文は光学余白を自動設定',
                      },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSbMode(m.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        sbMode === m.id
                          ? `${themeClasses.activeTool} border-transparent`
                          : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      <div className="text-xs font-bold">{m.title}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          sbMode === m.id ? 'opacity-85' : themeClasses.textMuted
                        }`}
                      >
                        {m.desc}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Mode Specific Inputs */}
                {sbMode === 'proportional' && (
                  <div className={`grid grid-cols-2 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
                    <div>
                      <span className={`block mb-1 ${themeClasses.textMuted}`}>
                        目標 左余白 (LSB):
                      </span>
                      <input
                        type="number"
                        value={Number.isFinite(sbLsb) ? sbLsb : Math.round(60 * emScale)}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setSbLsb(Number.isFinite(parsed) ? parsed : 0);
                        }}
                        className={`w-full p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
                      />
                    </div>
                    <div>
                      <span className={`block mb-1 ${themeClasses.textMuted}`}>
                        目標 右余白 (RSB):
                      </span>
                      <input
                        type="number"
                        value={Number.isFinite(sbRsb) ? sbRsb : Math.round(60 * emScale)}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setSbRsb(Number.isFinite(parsed) ? parsed : 0);
                        }}
                        className={`w-full p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
                      />
                    </div>
                  </div>
                )}

                {sbMode === 'uniform-advance' && (
                  <div className={`pt-2 border-t text-xs ${themeClasses.border}`}>
                    <span className={`block mb-1 ${themeClasses.textMuted}`}>
                      送り幅 (Advance Width):
                    </span>
                    <div className="flex items-center gap-2 max-sm:flex-wrap">
                      <input
                        type="number"
                        step={50}
                        value={Number.isFinite(sbTargetAdvance) ? sbTargetAdvance : upm}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setSbTargetAdvance(Number.isFinite(parsed) ? parsed : upm);
                        }}
                        className={`w-32 p-1.5 font-mono font-bold rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
                      />
                      <button
                        type="button"
                        onClick={() => setSbTargetAdvance(upm)}
                        className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                      >
                        全角 ({upm})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSbTargetAdvance(Math.round(upm / 2))}
                        className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                      >
                        半角 ({Math.round(upm / 2)})
                      </button>
                    </div>
                  </div>
                )}

                {(sbMode === 'offset-lsb' || sbMode === 'offset-rsb') && (
                  <div className={`pt-2 border-t text-xs ${themeClasses.border}`}>
                    <SliderRow
                      label="オフセットシフト値"
                      value={Number.isFinite(sbOffsetDelta) ? sbOffsetDelta : 0}
                      min={Math.round(-150 * emScale)}
                      max={Math.round(150 * emScale)}
                      step={Math.max(1, Math.round(5 * emScale))}
                      unit="px"
                      formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
                      onChange={(v) => setSbOffsetDelta(v)}
                      showNumberInput
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>
                )}
              </div>
            </ModalSection>

            {/* Preview Char Selector */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs max-sm:flex-wrap max-sm:gap-2 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
            >
              <span className={`font-bold ${themeClasses.textMuted}`}>
                プレビューする文字:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {['あ', 'い', 'か', '漢', '字', 'A', '1'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSbPreviewChar(c)}
                    className={`w-10 h-10 sm:w-7 sm:h-7 rounded border text-xs font-bold transition-colors cursor-pointer ${
                      sbPreviewChar === c
                        ? `${themeClasses.activeTool} border-transparent`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebearing Preview */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <ModalSection
              title="余白・送り幅プレビュー"
              badge={
                <span className={`ml-auto font-mono text-xs ${themeClasses.textMuted}`}>
                  「{sbPreviewChar}」
                </span>
              }
              theme={theme}
              themeClasses={themeClasses}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-full max-w-[320px] sm:max-w-[256px] aspect-square relative rounded-lg border flex items-center justify-center overflow-hidden shadow-inner ${themeClasses.cardBg} ${themeClasses.border}`}
                >
                  {/* Visual Sidebearing Margins */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
                    <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
                  </div>

                  {sbPreviewGlyph && sbPreviewGlyph.contours && sbPreviewGlyph.contours.length > 0 ? (
                    <svg viewBox={`0 0 ${upm} ${upm}`} className="w-full h-full">
                      {/* LSB guideline */}
                      <line
                        x1={sbPreviewGlyph.lsb ?? Math.round(upm * 0.05)}
                        y1={0}
                        x2={sbPreviewGlyph.lsb ?? Math.round(upm * 0.05)}
                        y2={upm}
                        stroke="#10b981"
                        strokeWidth={2 * emScale}
                        strokeDasharray={`${4 * emScale} ${4 * emScale}`}
                      />
                      {/* Advance width guideline */}
                      <line
                        x1={sbPreviewGlyph.advanceWidth || upm}
                        y1={0}
                        x2={sbPreviewGlyph.advanceWidth || upm}
                        y2={upm}
                        stroke="#ef4444"
                        strokeWidth={2 * emScale}
                        strokeDasharray={`${4 * emScale} ${4 * emScale}`}
                      />
                      {/* Glyph Contours */}
                      <path
                        d={contoursToSvgPath(normalizeGlyphContoursWinding(sbPreviewGlyph.contours))}
                        fill={isLight ? '#1c1917' : '#34d399'}
                        fillRule="nonzero"
                      />
                    </svg>
                  ) : (
                    <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
                      文字「{sbPreviewChar}」がまだ作図されていません
                    </div>
                  )}
                </div>

                <div
                  className={`mt-2 text-[10px] text-center flex items-center gap-1 ${themeClasses.textMuted}`}
                >
                  <Info className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                  <span>緑破線: 左余白(LSB) / 赤破線: 送り幅境界</span>
                </div>
              </div>
            </ModalSection>

            {/* Batch Execute Button */}
            <button
              type="button"
              onClick={handleExecuteSidebearingBatch}
              className={`w-full py-2.5 px-4 min-h-[44px] sm:min-h-0 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>選択カテゴリのサイドベアリングを一括調整</span>
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
};
