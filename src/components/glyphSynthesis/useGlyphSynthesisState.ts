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

interface UseGlyphSynthesisStateParams {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
  commitHistory?: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const noopUpdateProject = (_updater: (prev: FontProject) => FontProject): void => {};

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
  showToast,
  onShowToast,
}: UseGlyphSynthesisStateParams) {
  const [activeTab, setActiveTab] = useState<SynthesisTab>('dakuten');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, isFullscreen, onClose]);

  const availableDakutenSources = useMemo<DakutenSourceItem[]>(() => {
    return Object.entries(DAKUTEN_MAPPINGS)
      .filter(([, info]) => info.type === 'seion')
      .map(([char, info]) => {
        const code = char.codePointAt(0) || 0;
        const glyph = project.glyphs[code];
        const hasContours = !!(glyph && glyph.contours && glyph.contours.length > 0);
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
        const hasContours = !!(glyph && glyph.contours && glyph.contours.length > 0);
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

  // Only auto-pick a drawn preview glyph on modal open or scope change (never override manual clicks)
  const prevOpenRef = useRef(false);
  const prevDakuScopeRef = useRef(dakuScope);
  const prevSmallScopeRef = useRef(smallScope);

  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    const dakuScopeChanged = dakuScope !== prevDakuScopeRef.current;
    const smallScopeChanged = smallScope !== prevSmallScopeRef.current;

    prevOpenRef.current = isOpen;
    prevDakuScopeRef.current = dakuScope;
    prevSmallScopeRef.current = smallScope;

    if (!isOpen) return;

    const currentDaku = availableDakutenSources.find((s) => s.char === dakuPreviewChar);
    if (justOpened || dakuScopeChanged || !currentDaku) {
      if (!currentDaku?.hasContours) {
        const firstDrawnDaku = availableDakutenSources.find((s) => s.hasContours);
        if (firstDrawnDaku) {
          setDakuPreviewChar(firstDrawnDaku.char);
        } else if (!currentDaku && availableDakutenSources[0]) {
          setDakuPreviewChar(availableDakutenSources[0].char);
        }
      }
    }

    const currentSmall = availableSmallSources.find((s) => s.char === smallPreviewChar);
    if (justOpened || smallScopeChanged || !currentSmall) {
      if (!currentSmall?.hasContours) {
        const firstDrawnSmall = availableSmallSources.find((s) => s.hasContours);
        if (firstDrawnSmall) {
          setSmallPreviewChar(firstDrawnSmall.char);
        } else if (!currentSmall && availableSmallSources[0]) {
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
    return contoursToSvgPath(normalizeGlyphContoursWinding(synthesized));
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
    });

    return {
      basePath: contoursToSvgPath(normalizeGlyphContoursWinding(baseContours)),
      smallPath: contoursToSvgPath(normalizeGlyphContoursWinding(smallContours)),
    };
  }, [
    smallPreviewChar,
    project.glyphs,
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
  }, []);

  const resetSmallKanaOffsets = useCallback(() => {
    setSmallScale(0.72);
    setSmallWeightBoost(4);
    setSmallPlacement('bottom-left');
    setSmallOffsetX(0);
    setSmallOffsetY(0);
  }, []);

  const handleExecuteDakutenBatch = useCallback(() => {
    const { updatedGlyphs, generatedCount } = batchSynthesizeDakuten(project.glyphs, {
      scope: dakuScope,
      overwriteExisting: dakuOverwrite,
      dakuStyle,
      handakuStyle,
      offsetX: dakuOffsetX,
      offsetY: dakuOffsetY,
      scale: dakuScale,
      unitsPerEm,
    });

    if (generatedCount === 0) {
      notify(
        '合成対象の親文字（清音）が未作成、または生成先が既に作成済/ロック中です',
        'warning'
      );
      return;
    }

    commitHistory?.();
    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`濁音・半濁音 ${generatedCount} 文字を一括自動合成しました！`, 'success');
    onClose();
  }, [
    commitHistory,
    dakuOffsetX,
    dakuOffsetY,
    dakuOverwrite,
    dakuScale,
    dakuScope,
    dakuStyle,
    handakuStyle,
    notify,
    onClose,
    project.glyphs,
    unitsPerEm,
    updateProject,
  ]);

  const handleExecuteSmallKanaBatch = useCallback(() => {
    const { updatedGlyphs, generatedCount } = batchGenerateSmallKana(project.glyphs, {
      scope: smallScope,
      overwriteExisting: smallOverwrite,
      scale: smallScale,
      placement: smallPlacement,
      offsetX: smallOffsetX,
      offsetY: smallOffsetY,
      weightDelta: smallWeightBoost,
      unitsPerEm: project.metadata?.unitsPerEm || 1000,
    });

    if (generatedCount === 0) {
      notify(
        '生成対象の親文字（通常かな）が未作成、または生成先が既に作成済/ロック中です',
        'warning'
      );
      return;
    }

    commitHistory?.();
    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`小書き文字 ${generatedCount} 文字を一括自動スケール生成しました！`, 'success');
    onClose();
  }, [
    commitHistory,
    notify,
    onClose,
    project.glyphs,
    project.metadata?.unitsPerEm,
    smallOffsetX,
    smallOffsetY,
    smallOverwrite,
    smallPlacement,
    smallScale,
    smallScope,
    smallWeightBoost,
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
    setDakuPreviewChar,
    dakuPreviewKind,
    setDakuPreviewKind,
    availableDakutenSources,
    dakutenPreviewSvgPath,
    dakutenTargetCount,
    resetDakutenOffsets,
    handleExecuteDakutenBatch,
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
    setSmallPreviewChar,
    availableSmallSources,
    smallKanaPreviewPaths,
    smallKanaTargetCount,
    resetSmallKanaOffsets,
    handleExecuteSmallKanaBatch,
    unitsPerEm,
  };
}
