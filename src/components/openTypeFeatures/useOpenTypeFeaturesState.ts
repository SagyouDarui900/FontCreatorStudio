import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FontProject,
  OpenTypeFeatureLigature,
  OpenTypeFeaturesConfig,
} from '../../types';
import { deriveProjectPaltMetrics } from '../../utils/font';
import {
  buildDefaultOpenTypeFeaturesConfig,
  parseUnicodeCodePoint,
} from './openTypePresets';
import { OpenTypeTab } from './types';
import { useIsTopModal } from '../modals/ModalStackFrame';

interface UseOpenTypeFeaturesStateParams {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useOpenTypeFeaturesState({
  project,
  setProject,
  isOpen,
  onClose,
  onShowToast,
}: UseOpenTypeFeaturesStateParams) {
  const [activeTab, setActiveTab] = useState<OpenTypeTab>('vert');
  const [opticalSideBearingPercent, setOpticalSideBearingPercent] = useState<number>(
    project.openTypeFeatures?.palt?.opticalSideBearingPercent ?? 5
  );

  // Form Inputs for Adding Custom Ligatures
  const [newLigName, setNewLigName] = useState('');
  const [newLigInputs, setNewLigInputs] = useState('');
  const [newLigTargetUnicode, setNewLigTargetUnicode] = useState('');

  // Interactive Live Preview State
  const [previewText, setPreviewText] = useState(
    '「こんにちは、世界！」ーフォントテスト。\noffice & flight & staff'
  );
  const [previewWritingMode, setPreviewWritingMode] = useState<'vertical-rl' | 'horizontal-tb'>(
    'vertical-rl'
  );

  // Resync optical margin percent whenever modal opens or project palt config changes
  useEffect(() => {
    if (!isOpen) return;
    setOpticalSideBearingPercent(project.openTypeFeatures?.palt?.opticalSideBearingPercent ?? 5);
  }, [isOpen, project.id, project.openTypeFeatures?.palt?.opticalSideBearingPercent]);

  const isTopModal = useIsTopModal();

  // Close on Escape
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, onClose]);

  const config: OpenTypeFeaturesConfig = useMemo(() => {
    const defaults = buildDefaultOpenTypeFeaturesConfig(
      project.metadata.unitsPerEm || 1000,
      project.metadata.ascender || 880
    );
    if (!project.openTypeFeatures) {
      return defaults;
    }
    return {
      ...defaults,
      ...project.openTypeFeatures,
      verticalWriting: {
        ...defaults.verticalWriting,
        ...(project.openTypeFeatures.verticalWriting || {}),
        substitutions:
          project.openTypeFeatures.verticalWriting?.substitutions ?? defaults.verticalWriting.substitutions,
      },
      ligatures: project.openTypeFeatures.ligatures ?? defaults.ligatures,
    };
  }, [project.openTypeFeatures, project.metadata]);

  const updateFeatures = useCallback(
    (newConfig: OpenTypeFeaturesConfig) => {
      setProject((prev) => ({
        ...prev,
        openTypeFeatures: newConfig,
        updatedAt: Date.now(),
      }));
    },
    [setProject]
  );

  const toggleFeaturesGlobal = useCallback(() => {
    const updated = { ...config, enabled: !config.enabled };
    updateFeatures(updated);
    onShowToast(`OpenType Featuresを${updated.enabled ? '有効化' : '無効化'}しました`, 'info');
  }, [config, onShowToast, updateFeatures]);

  const toggleVerticalWriting = useCallback(() => {
    const updated: OpenTypeFeaturesConfig = {
      ...config,
      verticalWriting: {
        ...config.verticalWriting,
        enabled: !config.verticalWriting.enabled,
      },
    };
    updateFeatures(updated);
    onShowToast(`縦書き ('vert') 機能: ${updated.verticalWriting.enabled ? 'ON' : 'OFF'}`, 'info');
  }, [config, onShowToast, updateFeatures]);

  const updateVerticalMetricField = useCallback(
    (field: 'defaultVertAdvance' | 'vertOriginY', value: number) => {
      updateFeatures({
        ...config,
        verticalWriting: {
          ...config.verticalWriting,
          [field]: value,
        },
      });
    },
    [config, updateFeatures]
  );

  const toggleVertSub = useCallback(
    (id: string) => {
      const subs = config.verticalWriting.substitutions.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      updateFeatures({
        ...config,
        verticalWriting: { ...config.verticalWriting, substitutions: subs },
      });
    },
    [config, updateFeatures]
  );

  const handleAutoDetectVerticalGlyphs = useCallback(() => {
    let count = 0;
    const existingUnicodes = new Set(Object.keys(project.glyphs).map(Number));

    const updatedSubs = config.verticalWriting.substitutions.map((sub) => {
      if (existingUnicodes.has(sub.vertUnicode) || existingUnicodes.has(sub.sourceUnicode)) {
        count++;
        return { ...sub, enabled: true };
      }
      return sub;
    });

    updateFeatures({
      ...config,
      verticalWriting: { ...config.verticalWriting, substitutions: updatedSubs },
    });

    onShowToast(
      `プロジェクト内から ${count} 件の縦書き対応グリフを全自動検出・登録しました`,
      'success'
    );
  }, [config, onShowToast, project.glyphs, updateFeatures]);

  const toggleLigature = useCallback(
    (id: string) => {
      const ligs = config.ligatures.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
      updateFeatures({ ...config, ligatures: ligs });
    },
    [config, updateFeatures]
  );

  const handleAddCustomLigature = useCallback(() => {
    if (!newLigInputs.trim() || !newLigTargetUnicode.trim()) {
      onShowToast('入力文字並びと変換先Unicodeを入力してください', 'warning');
      return;
    }

    const inputArr = Array.from<string>(newLigInputs.trim());
    if (inputArr.length < 2) {
      onShowToast('合字の入力文字は2文字以上で指定してください', 'warning');
      return;
    }

    const targetUni = parseUnicodeCodePoint(newLigTargetUnicode);
    if (targetUni === null) {
      onShowToast('変換先Unicodeの値が正しくありません (例: U+FB01 または 64257)', 'error');
      return;
    }

    const newLig: OpenTypeFeatureLigature = {
      id: `lig_custom_${Date.now()}`,
      type: 'liga',
      name: newLigName.trim() || `${inputArr.join('+')} 合字`,
      inputChars: inputArr,
      substituteUnicode: targetUni,
      enabled: true,
    };

    updateFeatures({
      ...config,
      ligatures: [...config.ligatures, newLig],
    });

    setNewLigName('');
    setNewLigInputs('');
    setNewLigTargetUnicode('');
    onShowToast(`合字「${newLig.name}」を追加しました`, 'success');
  }, [config, newLigInputs, newLigName, newLigTargetUnicode, onShowToast, updateFeatures]);

  const handleRemoveLigature = useCallback(
    (id: string) => {
      const filtered = config.ligatures.filter((l) => l.id !== id);
      updateFeatures({ ...config, ligatures: filtered });
      onShowToast('合字ルールを削除しました', 'info');
    },
    [config, onShowToast, updateFeatures]
  );

  const togglePaltGlobal = useCallback(() => {
    const currentPalt = config.palt || {
      enabled: false,
      autoDerivePalt: true,
      autoDeriveVpal: true,
      opticalSideBearingPercent: 5,
      paltList: [],
      vpalList: [],
    };
    const updated: OpenTypeFeaturesConfig = {
      ...config,
      palt: {
        ...currentPalt,
        enabled: !currentPalt.enabled,
      },
    };
    updateFeatures(updated);
    onShowToast(
      `プロポーショナルメトリクス (palt) を${updated.palt?.enabled ? '有効化' : '無効化'}しました`,
      'info'
    );
  }, [config, onShowToast, updateFeatures]);

  const handleAutoDerivePalt = useCallback(() => {
    const list = deriveProjectPaltMetrics(project, opticalSideBearingPercent);
    const updated: OpenTypeFeaturesConfig = {
      ...config,
      palt: {
        enabled: true,
        autoDerivePalt: true,
        autoDeriveVpal: true,
        opticalSideBearingPercent,
        paltList: list,
        vpalList: config.palt?.vpalList || [],
      },
    };
    updateFeatures(updated);
    onShowToast(
      `${list.length} 文字のプロポーショナルメトリクス (palt) を自動算出・登録しました`,
      'success'
    );
  }, [config, onShowToast, opticalSideBearingPercent, project, updateFeatures]);

  const togglePaltItem = useCallback(
    (unicode: number) => {
      if (!config.palt) return;
      const updatedList = config.palt.paltList.map((p) =>
        p.unicode === unicode ? { ...p, enabled: !p.enabled } : p
      );
      updateFeatures({
        ...config,
        palt: {
          ...config.palt,
          paltList: updatedList,
        },
      });
    },
    [config, updateFeatures]
  );

  const togglePreviewWritingMode = useCallback(() => {
    setPreviewWritingMode((prev) => (prev === 'vertical-rl' ? 'horizontal-tb' : 'vertical-rl'));
  }, []);

  return {
    activeTab,
    setActiveTab,
    config,
    opticalSideBearingPercent,
    setOpticalSideBearingPercent,
    newLigName,
    setNewLigName,
    newLigInputs,
    setNewLigInputs,
    newLigTargetUnicode,
    setNewLigTargetUnicode,
    previewText,
    setPreviewText,
    previewWritingMode,
    togglePreviewWritingMode,
    toggleFeaturesGlobal,
    toggleVerticalWriting,
    updateVerticalMetricField,
    toggleVertSub,
    handleAutoDetectVerticalGlyphs,
    toggleLigature,
    handleAddCustomLigature,
    handleRemoveLigature,
    togglePaltGlobal,
    handleAutoDerivePalt,
    togglePaltItem,
  };
}
