import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KANA_PAIRS } from '../../data/unicodeTables';
import { FontProject } from '../../types';
import {
  DAKUTEN_MAPPINGS,
  DakutenStyle,
  HandakutenStyle,
  batchSynthesizeDakuten,
  synthesizeDakutenContours,
} from '../../utils/dakutenHelper';
import { batchGenerateSmallKana } from '../../utils/kanaHelper';
import {
  SmallKanaOptions,
  contoursToSvgPath,
  createSmallKanaContours,
  normalizeGlyphContoursWinding,
} from '../../utils/path';
import {
  DakutenSourceItem,
  KanaScope,
  SmallKanaSourceItem,
  SynthesisTab,
} from './types';
import { useIsTopModal } from '../modals/ModalStackFrame';

interface UseGlyphSynthesisStateParams {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
  commitHistory?: (targetUnicode?: number) => void;
  commitProjectHistory?: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const noopUpdateProject = (_updater: (prev: FontProject) => FontProject): void => {};

/** A source glyph counts as drawn when it has contours, or pixel data with filled dots. */
const hasDrawnGlyph = (glyph: FontProject['glyphs'][number] | undefined): boolean => {
  if (!glyph) return false;
  if (glyph.contours && glyph.contours.length > 0) return true;
  return Boolean(glyph.pixelData?.data?.some((d) => d !== 0));
};

const matchesKanaScope = (code: number, scope: KanaScope): boolean => {
  if (scope === 'hiragana') return code >= 0x3041 && code <= 0x3096;
  if (scope === 'katakana') return code >= 0x30a1 && code <= 0x30fa;
  return true;
};

export function useGlyphSynthesisState({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
  commitHistory,
  commitProjectHistory,
  showToast,
  onShowToast,
}: UseGlyphSynthesisStateParams) {
  const [activeTab, setActiveTab] = useState<SynthesisTab>('dakuten');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Dakuten State
  const [dakuScope, setDakuScope] = useState<KanaScope>('all');
  const [dakuStyle, setDakuStyle] = useState<DakutenStyle>('standard');
  const [handakuStyle, setHandakuStyle] = useState<HandakutenStyle>('standard');
  const [dakuOffsetX, setDakuOffsetX] = useState<number>(0);
  const [dakuOffsetY, setDakuOffsetY] = useState<number>(0);
  const [dakuScale, setDakuScale] = useState<number>(1.0);
  const [dakuOverwrite, setDakuOverwrite] = useState<boolean>(false);
  const [dakuPreviewChar, setDakuPreviewChar] = useState<string>('か');
  const [dakuPreviewKind, setDakuPreviewKind] = useState<'daku' | 'handaku'>('daku');

  // Small Kana State
  const [smallScope, setSmallScope] = useState<KanaScope>('all');
  const [smallScale, setSmallScale] = useState<number>(0.72);
  const [smallPlacement, setSmallPlacement] = useState<SmallKanaOptions['placement']>('bottom-left');
  const [smallOffsetX, setSmallOffsetX] = useState<number>(0);
  const [smallOffsetY, setSmallOffsetY] = useState<number>(0);
  const [smallWeightBoost, setSmallWeightBoost] = useState<number>(4);
  const [smallOverwrite, setSmallOverwrite] = useState<boolean>(false);
  const [smallPreviewChar, setSmallPreviewChar] = useState<string>('つ');

  const updateProject = useMemo<(updater: (prev: FontProject) => FontProject) => void>(() => {
    if (onUpdateProject) return onUpdateProject;
    if (setProject) return setProject;
    return noopUpdateProject;
  }, [onUpdateProject, setProject]);

  const notify = useCallback(
    (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      if (showToast) {
        showToast(msg, type);
      } else if (onShowToast) {
        onShowToast(msg, type);
      }
    },
    [onShowToast, showToast]
  );

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (
        (e.key === 'f' || e.key === 'F') &&
        !isInput &&
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

  const availableDakutenSources = useMemo<DakutenSourceItem[]>(() => {
    return Object.entries(DAKUTEN_MAPPINGS)
      .filter(([, info]) => info.type === 'seion')
      .map(([char, info]) => {
        const code = char.codePointAt(0) || 0;
        const glyph = project.glyphs[code];
        const hasContours = hasDrawnGlyph(glyph);
        return {
          char,
          code,
          daku: info.daku,
          handaku: info.handaku,
          hasContours,
        };
      })
      .filter((item) => matchesKanaScope(item.code, dakuScope));
  }, [project.glyphs, dakuScope]);

  const availableSmallSources = useMemo<SmallKanaSourceItem[]>(() => {
    return Object.entries(KANA_PAIRS)
      .map(([char, pair]) => {
        const code = char.codePointAt(0) || 0;
        const glyph = project.glyphs[code];
        const hasContours = hasDrawnGlyph(glyph);
        return {
          char,
          code,
          smallChar: pair.smallChar,
          smallUnicode: pair.smallUnicode,
          hasContours,
        };
      })
      .filter((item) => matchesKanaScope(item.code, smallScope));
  }, [project.glyphs, smallScope]);

  // Whether the preview character was picked by hand. A hand-picked
  // character is kept when the scope changes; auto-selection only runs
  // on first open or when nothing was picked by hand.
  const dakuPreviewManualRef = useRef(false);
  const smallPreviewManualRef = useRef(false);

  const handleSelectDakuPreviewChar = useCallback((char: string) => {
    dakuPreviewManualRef.current = true;
    setDakuPreviewChar(char);
  }, []);

  const handleSelectSmallPreviewChar = useCallback((char: string) => {
    smallPreviewManualRef.current = true;
    setSmallPreviewChar(char);
  }, []);

  // Reset the session settings when isOpen toggles, so a previous
  // session does not carry over when the modal stays mounted and only
  // isOpen changes (closing normally unmounts the modal, but this does
  // not depend on that).
  const prevOpenForResetRef = useRef(isOpen);
  useEffect(() => {
    if (prevOpenForResetRef.current === isOpen) return;
    prevOpenForResetRef.current = isOpen;
    setActiveTab('dakuten');
    setDakuScope('all');
    setDakuStyle('standard');
    setHandakuStyle('standard');
    setDakuOffsetX(0);
    setDakuOffsetY(0);
    setDakuScale(1.0);
    setDakuOverwrite(false);
    setDakuPreviewChar('か');
    setDakuPreviewKind('daku');
    setSmallScope('all');
    setSmallScale(0.72);
    setSmallPlacement('bottom-left');
    setSmallOffsetX(0);
    setSmallOffsetY(0);
    setSmallWeightBoost(4);
    setSmallOverwrite(false);
    setSmallPreviewChar('つ');
    dakuPreviewManualRef.current = false;
    smallPreviewManualRef.current = false;
  }, [isOpen]);

  // Only auto-pick a drawn preview glyph on modal open or scope change (never override manual clicks)
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;

    prevOpenRef.current = isOpen;

    if (!isOpen) return;

    const currentDaku = availableDakutenSources.find((s) => s.char === dakuPreviewChar);
    if (justOpened || !dakuPreviewManualRef.current) {
      if (!currentDaku?.hasContours) {
        const firstDrawnDaku = availableDakutenSources.find((s) => s.hasContours);
        if (firstDrawnDaku) {
          dakuPreviewManualRef.current = false;
          setDakuPreviewChar(firstDrawnDaku.char);
        } else if (!currentDaku && availableDakutenSources[0]) {
          dakuPreviewManualRef.current = false;
          setDakuPreviewChar(availableDakutenSources[0].char);
        }
      }
    }

    const currentSmall = availableSmallSources.find((s) => s.char === smallPreviewChar);
    if (justOpened || !smallPreviewManualRef.current) {
      if (!currentSmall?.hasContours) {
        const firstDrawnSmall = availableSmallSources.find((s) => s.hasContours);
        if (firstDrawnSmall) {
          smallPreviewManualRef.current = false;
          setSmallPreviewChar(firstDrawnSmall.char);
        } else if (!currentSmall && availableSmallSources[0]) {
          smallPreviewManualRef.current = false;
          setSmallPreviewChar(availableSmallSources[0].char);
        }
      }
    }
  }, [
    isOpen,
    dakuScope,
    smallScope,
    availableDakutenSources,
    availableSmallSources,
    dakuPreviewChar,
    smallPreviewChar,
  ]);

  // Keep preview mark kind valid for the selected character
  useEffect(() => {
    const info = DAKUTEN_MAPPINGS[dakuPreviewChar];
    if (!info) return;
    if (dakuPreviewKind === 'handaku' && !info.handaku && info.daku) {
      setDakuPreviewKind('daku');
    } else if (dakuPreviewKind === 'daku' && !info.daku && info.handaku) {
      setDakuPreviewKind('handaku');
    }
  }, [dakuPreviewChar, dakuPreviewKind]);

  // When switching dakuten/handakuten styles, auto-switch preview so user sees immediate feedback
  const handleSelectDakuStyle = useCallback((style: DakutenStyle) => {
    setDakuStyle(style);
    setDakuPreviewKind('daku');
  }, []);

  const handleSelectHandakuStyle = useCallback(
    (style: HandakutenStyle) => {
      setHandakuStyle(style);
      setDakuPreviewKind('handaku');
      const currentInfo = DAKUTEN_MAPPINGS[dakuPreviewChar];
      if (!currentInfo?.handaku) {
        const drawnHandaku = availableDakutenSources.find((s) => s.handaku && s.hasContours);
        const anyHandaku = availableDakutenSources.find((s) => s.handaku);
        if (drawnHandaku) {
          setDakuPreviewChar(drawnHandaku.char);
        } else if (anyHandaku) {
          setDakuPreviewChar(anyHandaku.char);
        }
      }
    },
    [availableDakutenSources, dakuPreviewChar]
  );

  const unitsPerEm = project.metadata?.unitsPerEm && project.metadata.unitsPerEm > 0
    ? project.metadata.unitsPerEm
    : 1000;

  const dakutenPreviewSvgPath = useMemo(() => {
    const code = dakuPreviewChar.codePointAt(0);
    if (!code) return '';
    const glyph = project.glyphs[code];
    const baseContours = glyph?.contours || [];
    if (baseContours.length === 0) return '';

    const info = DAKUTEN_MAPPINGS[dakuPreviewChar];
    const isHandaku = Boolean(
      info?.handaku && (dakuPreviewKind === 'handaku' || !info?.daku)
    );

    const synthesized = synthesizeDakutenContours(baseContours, isHandaku, {
      offsetX: dakuOffsetX,
      offsetY: dakuOffsetY,
      scale: dakuScale,
      dakuStyle,
      handakuStyle,
      unitsPerEm,
    });
    // synthesizeDakutenContours already normalizes the winding, so no
    // second normalization pass is needed here.
    return contoursToSvgPath(synthesized);
  }, [
    dakuPreviewChar,
    dakuPreviewKind,
    project.glyphs,
    unitsPerEm,
    dakuOffsetX,
    dakuOffsetY,
    dakuScale,
    dakuStyle,
    handakuStyle,
  ]);

  const smallKanaPreviewPaths = useMemo(() => {
    const code = smallPreviewChar.codePointAt(0);
    if (!code) return { basePath: '', smallPath: '' };
    const glyph = project.glyphs[code];
    const baseContours = glyph?.contours || [];
    if (baseContours.length === 0) return { basePath: '', smallPath: '' };

    const smallContours = createSmallKanaContours(baseContours, {
      scale: smallScale,
      placement: smallPlacement,
      offsetX: smallOffsetX,
      offsetY: smallOffsetY,
      weightDelta: smallWeightBoost,
      unitsPerEm,
      ascender: project.metadata?.ascender,
    });

    return {
      basePath: contoursToSvgPath(normalizeGlyphContoursWinding(baseContours)),
      smallPath: contoursToSvgPath(normalizeGlyphContoursWinding(smallContours)),
    };
  }, [
    smallPreviewChar,
    project.glyphs,
    project.metadata?.ascender,
    unitsPerEm,
    smallScale,
    smallPlacement,
    smallOffsetX,
    smallOffsetY,
    smallWeightBoost,
  ]);

  const dakutenTargetCount = useMemo(() => {
    let count = 0;
    for (const item of availableDakutenSources) {
      if (!item.hasContours) continue;
      for (const targetChar of [item.daku, item.handaku]) {
        if (!targetChar) continue;
        const targetCode = targetChar.codePointAt(0);
        if (!targetCode) continue;
        const existing = project.glyphs[targetCode];
        if (existing?.locked) continue;
        const hasExisting = Boolean(existing?.contours && existing.contours.length > 0);
        if (!hasExisting || dakuOverwrite) count++;
      }
    }
    return count;
  }, [availableDakutenSources, project.glyphs, dakuOverwrite]);

  const smallKanaTargetCount = useMemo(() => {
    let count = 0;
    for (const item of availableSmallSources) {
      if (!item.hasContours) continue;
      const existing = project.glyphs[item.smallUnicode];
      if (existing?.locked) continue;
      const hasExisting = Boolean(existing?.contours && existing.contours.length > 0);
      if (!hasExisting || smallOverwrite) count++;
    }
    return count;
  }, [availableSmallSources, project.glyphs, smallOverwrite]);

  const resetDakutenOffsets = useCallback(() => {
    setDakuOffsetX(0);
    setDakuOffsetY(0);
    setDakuScale(1.0);
    setDakuStyle('standard');
    setHandakuStyle('standard');
  }, []);

  const resetSmallKanaOffsets = useCallback(() => {
    setSmallScale(0.72);
    setSmallWeightBoost(4);
    setSmallPlacement('bottom-left');
    setSmallOffsetX(0);
    setSmallOffsetY(0);
  }, []);

  const handleExecuteDakutenBatch = useCallback(() => {
    if (isExecuting) return;
    setIsExecuting(true);
    let succeeded = false;
    try {
      const { updatedGlyphs, generatedCount } = batchSynthesizeDakuten(project.glyphs, {
        scope: dakuScope,
        overwriteExisting: dakuOverwrite,
        dakuStyle,
        handakuStyle,
        offsetX: dakuOffsetX,
        offsetY: dakuOffsetY,
        scale: dakuScale,
        unitsPerEm,
        ascender: project.metadata?.ascender,
        descender: project.metadata?.descender,
      });

      if (generatedCount === 0) {
        let drawnParentCount = 0;
        let lockedCount = 0;
        let existingCount = 0;
        for (const item of availableDakutenSources) {
          if (!item.hasContours) continue;
          drawnParentCount++;
          for (const targetChar of [item.daku, item.handaku]) {
            if (!targetChar) continue;
            const targetCode = targetChar.codePointAt(0);
            if (!targetCode) continue;
            const target = project.glyphs[targetCode];
            if (target?.locked) {
              lockedCount++;
            } else if (target?.contours && target.contours.length > 0 && !dakuOverwrite) {
              existingCount++;
            }
          }
        }
        const reasons: string[] = [];
        if (drawnParentCount === 0) reasons.push('作図済みの親文字がありません');
        if (existingCount > 0) reasons.push(`生成先が作成済み: ${existingCount}字`);
        if (lockedCount > 0) reasons.push(`生成先がロック中: ${lockedCount}字`);
        notify(
          reasons.length > 0
            ? `合成できる文字がありません（${reasons.join('、')}）`
            : '合成対象の親文字（清音）が未作成、または生成先が既に作成済/ロック中です',
          'warning'
        );
        return;
      }

      if (!commitHistory) {
        console.warn(
          'GlyphSynthesis: commitHistory が渡されていないため、濁点の一括合成の Undo 履歴が登録されません'
        );
      }
      // Register history for every generated glyph before applying, so
      // each one can be undone individually.
      for (const [key, glyph] of Object.entries(updatedGlyphs)) {
        if (project.glyphs[Number(key)] !== glyph) {
          commitHistory?.(Number(key));
        }
      }
      commitProjectHistory?.();
      // Merge into the current glyphs instead of replacing them, so a
      // second batch run in the same mount keeps the first run's results.
      updateProject((prev) => ({
        ...prev,
        glyphs: { ...prev.glyphs, ...updatedGlyphs },
        updatedAt: Date.now(),
      }));

      notify(
        `濁音・半濁音 ${generatedCount} 文字を一括自動合成しました！${
          commitHistory ? '' : '（履歴が利用できないため Undo できません）'
        }`,
        'success'
      );
      succeeded = true;
    } catch (error) {
      notify(
        `濁音・半濁音の一括合成に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error'
      );
    } finally {
      setIsExecuting(false);
    }
    if (succeeded) onClose();
  }, [
    availableDakutenSources,
    commitHistory,
    commitProjectHistory,
    dakuOffsetX,
    dakuOffsetY,
    dakuOverwrite,
    dakuScale,
    dakuScope,
    dakuStyle,
    handakuStyle,
    isExecuting,
    notify,
    onClose,
    project.glyphs,
    project.metadata?.ascender,
    project.metadata?.descender,
    unitsPerEm,
    updateProject,
  ]);

  const handleExecuteSmallKanaBatch = useCallback(() => {
    if (isExecuting) return;
    setIsExecuting(true);
    let succeeded = false;
    try {
      const { updatedGlyphs, generatedCount } = batchGenerateSmallKana(project.glyphs, {
        scope: smallScope,
        overwriteExisting: smallOverwrite,
        scale: smallScale,
        placement: smallPlacement,
        offsetX: smallOffsetX,
        offsetY: smallOffsetY,
        weightDelta: smallWeightBoost,
        unitsPerEm,
        ascender: project.metadata?.ascender,
        descender: project.metadata?.descender,
      });

      if (generatedCount === 0) {
        let drawnParentCount = 0;
        let lockedCount = 0;
        let existingCount = 0;
        for (const item of availableSmallSources) {
          if (!item.hasContours) continue;
          drawnParentCount++;
          const target = project.glyphs[item.smallUnicode];
          if (target?.locked) {
            lockedCount++;
          } else if (target?.contours && target.contours.length > 0 && !smallOverwrite) {
            existingCount++;
          }
        }
        const reasons: string[] = [];
        if (drawnParentCount === 0) reasons.push('作図済みの親文字がありません');
        if (existingCount > 0) reasons.push(`生成先が作成済み: ${existingCount}字`);
        if (lockedCount > 0) reasons.push(`生成先がロック中: ${lockedCount}字`);
        notify(
          reasons.length > 0
            ? `生成できる文字がありません（${reasons.join('、')}）`
            : '生成対象の親文字（通常かな）が未作成、または生成先が既に作成済/ロック中です',
          'warning'
        );
        return;
      }

      if (!commitHistory) {
        console.warn(
          'GlyphSynthesis: commitHistory が渡されていないため、小書き文字の一括生成の Undo 履歴が登録されません'
        );
      }
      // Register history for every generated glyph before applying, so
      // each one can be undone individually.
      for (const [key, glyph] of Object.entries(updatedGlyphs)) {
        if (project.glyphs[Number(key)] !== glyph) {
          commitHistory?.(Number(key));
        }
      }
      commitProjectHistory?.();
      // Merge into the current glyphs instead of replacing them, so a
      // second batch run in the same mount keeps the first run's results.
      updateProject((prev) => ({
        ...prev,
        glyphs: { ...prev.glyphs, ...updatedGlyphs },
        updatedAt: Date.now(),
      }));

      notify(
        `小書き文字 ${generatedCount} 文字を一括自動スケール生成しました！${
          commitHistory ? '' : '（履歴が利用できないため Undo できません）'
        }`,
        'success'
      );
      succeeded = true;
    } catch (error) {
      notify(
        `小書き文字の一括生成に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error'
      );
    } finally {
      setIsExecuting(false);
    }
    if (succeeded) onClose();
  }, [
    availableSmallSources,
    commitHistory,
    commitProjectHistory,
    isExecuting,
    notify,
    onClose,
    project.glyphs,
    project.metadata?.ascender,
    project.metadata?.descender,
    smallOffsetX,
    smallOffsetY,
    smallOverwrite,
    smallPlacement,
    smallScale,
    smallScope,
    smallWeightBoost,
    unitsPerEm,
    updateProject,
  ]);

  return {
    activeTab,
    setActiveTab,
    isFullscreen,
    setIsFullscreen,
    dakuScope,
    setDakuScope,
    dakuStyle,
    setDakuStyle: handleSelectDakuStyle,
    handakuStyle,
    setHandakuStyle: handleSelectHandakuStyle,
    dakuOffsetX,
    setDakuOffsetX,
    dakuOffsetY,
    setDakuOffsetY,
    dakuScale,
    setDakuScale,
    dakuOverwrite,
    setDakuOverwrite,
    dakuPreviewChar,
    setDakuPreviewChar: handleSelectDakuPreviewChar,
    dakuPreviewKind,
    setDakuPreviewKind,
    availableDakutenSources,
    dakutenPreviewSvgPath,
    dakutenTargetCount,
    resetDakutenOffsets,
    handleExecuteDakutenBatch,
    isExecuting,
    smallScope,
    setSmallScope,
    smallScale,
    setSmallScale,
    smallPlacement,
    setSmallPlacement,
    smallOffsetX,
    setSmallOffsetX,
    smallOffsetY,
    setSmallOffsetY,
    smallWeightBoost,
    setSmallWeightBoost,
    smallOverwrite,
    setSmallOverwrite,
    smallPreviewChar,
    setSmallPreviewChar: handleSelectSmallPreviewChar,
    availableSmallSources,
    smallKanaPreviewPaths,
    smallKanaTargetCount,
    resetSmallKanaOffsets,
    handleExecuteSmallKanaBatch,
    unitsPerEm,
  };
}
