import { useCallback, useEffect, useMemo, useState } from 'react';
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
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const noopUpdateProject = (_updater: (prev: FontProject) => FontProject): void => {};

export function useGlyphSynthesisState({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
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
      });
  }, [project.glyphs]);

  const availableSmallSources = useMemo<SmallKanaSourceItem[]>(() => {
    return Object.entries(KANA_PAIRS).map(([char, pair]) => {
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
    });
  }, [project.glyphs]);

  // Pick a drawn preview glyph automatically on open if default char is empty
  useEffect(() => {
    if (!isOpen) return;
    const currentDaku = availableDakutenSources.find((s) => s.char === dakuPreviewChar);
    if (!currentDaku?.hasContours) {
      const firstDrawnDaku = availableDakutenSources.find((s) => s.hasContours);
      if (firstDrawnDaku) {
        setDakuPreviewChar(firstDrawnDaku.char);
      }
    }

    const currentSmall = availableSmallSources.find((s) => s.char === smallPreviewChar);
    if (!currentSmall?.hasContours) {
      const firstDrawnSmall = availableSmallSources.find((s) => s.hasContours);
      if (firstDrawnSmall) {
        setSmallPreviewChar(firstDrawnSmall.char);
      }
    }
  }, [
    isOpen,
    availableDakutenSources,
    availableSmallSources,
    dakuPreviewChar,
    smallPreviewChar,
  ]);

  const dakutenPreviewSvgPath = useMemo(() => {
    const code = dakuPreviewChar.codePointAt(0);
    if (!code) return '';
    const glyph = project.glyphs[code];
    const baseContours = glyph?.contours || [];
    if (baseContours.length === 0) return '';

    const info = DAKUTEN_MAPPINGS[dakuPreviewChar];
    const isHandaku = !!(!info?.daku && info?.handaku);

    const synthesized = synthesizeDakutenContours(baseContours, isHandaku, {
      offsetX: dakuOffsetX,
      offsetY: dakuOffsetY,
      scale: dakuScale,
      dakuStyle,
      handakuStyle,
    });
    return contoursToSvgPath(normalizeGlyphContoursWinding(synthesized));
  }, [
    dakuPreviewChar,
    project.glyphs,
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
    });

    return {
      basePath: contoursToSvgPath(normalizeGlyphContoursWinding(baseContours)),
      smallPath: contoursToSvgPath(normalizeGlyphContoursWinding(smallContours)),
    };
  }, [
    smallPreviewChar,
    project.glyphs,
    smallScale,
    smallPlacement,
    smallOffsetX,
    smallOffsetY,
    smallWeightBoost,
  ]);

  const resetDakutenOffsets = useCallback(() => {
    setDakuOffsetX(0);
    setDakuOffsetY(0);
    setDakuScale(1.0);
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
    });

    if (generatedCount === 0) {
      notify(
        '合成対象の親文字（清音）がまだ作成されていないか、既に全文字作成済みです',
        'warning'
      );
      return;
    }

    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`濁音・半濁音 ${generatedCount} 文字を一括自動合成しました！`, 'success');
    onClose();
  }, [
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
    });

    if (generatedCount === 0) {
      notify(
        '生成対象の親文字（通常かな）がまだ作成されていないか、既に全文字作成済みです',
        'warning'
      );
      return;
    }

    updateProject((prev) => ({
      ...prev,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    }));

    notify(`小書き文字 ${generatedCount} 文字を一括自動スケール生成しました！`, 'success');
    onClose();
  }, [
    notify,
    onClose,
    project.glyphs,
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
    setDakuStyle,
    handakuStyle,
    setHandakuStyle,
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
    availableDakutenSources,
    dakutenPreviewSvgPath,
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
    handleExecuteSmallKanaBatch,
  };
}
