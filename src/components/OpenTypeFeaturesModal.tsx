import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Layers,
  ArrowUpDown,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Sliders,
  Eye,
  Zap,
  AlignVerticalJustifyCenter,
  Type,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  FontProject,
  OpenTypeFeaturesConfig,
  OpenTypeFeatureLigature,
  VerticalWritingGlyphSub,
  PaltGlyphMetric,
  ProportionalMetricsConfig,
} from '../types';
import { deriveProjectPaltMetrics } from '../utils/font';
import { ThemeMode, getThemeClasses } from '../utils/theme';

interface OpenTypeFeaturesModalProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  theme?: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type OpenTypeTab = 'vert' | 'liga' | 'gpos' | 'palt' | 'preview';

const isOpenTypeTab = (value: string): value is OpenTypeTab =>
  value === 'vert' || value === 'liga' || value === 'gpos' || value === 'palt' || value === 'preview';

// Preset Japanese Vertical Substitutions (Standard GSUB 'vert' table)
const DEFAULT_VERT_PRESETS = [
  { name: '句点', char: '。', sourceUnicode: 0x3002, vertUnicode: 0xFE12, vertChar: '︒' },
  { name: '読点', char: '、', sourceUnicode: 0x3001, vertUnicode: 0xFE10, vertChar: '︐' },
  { name: '鍵括弧（開）', char: '「', sourceUnicode: 0x300C, vertUnicode: 0xFE41, vertChar: '﹁' },
  { name: '鍵括弧（閉）', char: '」', sourceUnicode: 0x300D, vertUnicode: 0xFE42, vertChar: '﹂' },
  { name: '二重鍵括弧（開）', char: '『', sourceUnicode: 0x300E, vertUnicode: 0xFE43, vertChar: '﹃' },
  { name: '二重鍵括弧（閉）', char: '』', sourceUnicode: 0x300F, vertUnicode: 0xFE44, vertChar: '﹄' },
  { name: '丸括弧（開）', char: '（', sourceUnicode: 0x28, vertUnicode: 0xFE35, vertChar: '︵' },
  { name: '丸括弧（閉）', char: '）', sourceUnicode: 0x29, vertUnicode: 0xFE36, vertChar: '︶' },
  { name: '波括弧（開）', char: '｛', sourceUnicode: 0x7B, vertUnicode: 0xFE37, vertChar: '︷' },
  { name: '波括弧（閉）', char: '｝', sourceUnicode: 0x7D, vertUnicode: 0xFE38, vertChar: '︸' },
  { name: '長音記号 (ー)', char: 'ー', sourceUnicode: 0x30FC, vertUnicode: 0xFE31, vertChar: '︱' },
  { name: '波ダッシュ (〜)', char: '〜', sourceUnicode: 0x301C, vertUnicode: 0xFE30, vertChar: '︰' },
  { name: '二重波線 (approx)', char: '≈', sourceUnicode: 0x2248, vertUnicode: 0xFE4F, vertChar: '﹏' },
  { name: '促音 小文字つ', char: 'っ', sourceUnicode: 0x3063, vertUnicode: 0x3063, vertChar: 'っ(縦)' },
  { name: '促音 小文字ツ', char: 'ッ', sourceUnicode: 0x30C3, vertUnicode: 0x30C3, vertChar: 'ッ(縦)' },
  { name: '小文字や', char: 'ゃ', sourceUnicode: 0x3083, vertUnicode: 0x3083, vertChar: 'ゃ(縦)' },
  { name: '小文字ゆ', char: 'ゅ', sourceUnicode: 0x3085, vertUnicode: 0x3085, vertChar: 'ゅ(縦)' },
  { name: '小文字よ', char: 'ょ', sourceUnicode: 0x3087, vertUnicode: 0x3087, vertChar: 'ょ(縦)' },
];

// Preset Ligatures (Standard GSUB 'liga' / 'dlig' tables)
const DEFAULT_LIGATURE_PRESETS = [
  { id: 'liga_fi', name: 'fi 合字', type: 'liga' as const, inputChars: ['f', 'i'], substituteUnicode: 0xFB01 },
  { id: 'liga_fl', name: 'fl 合字', type: 'liga' as const, inputChars: ['f', 'l'], substituteUnicode: 0xFB02 },
  { id: 'liga_ff', name: 'ff 合字', type: 'liga' as const, inputChars: ['f', 'f'], substituteUnicode: 0xFB00 },
  { id: 'liga_ffi', name: 'ffi 合字', type: 'liga' as const, inputChars: ['f', 'f', 'i'], substituteUnicode: 0xFB03 },
  { id: 'liga_ffl', name: 'ffl 合字', type: 'liga' as const, inputChars: ['f', 'f', 'l'], substituteUnicode: 0xFB04 },
  { id: 'liga_st', name: 'st 合字', type: 'dlig' as const, inputChars: ['s', 't'], substituteUnicode: 0xFB06 },
];

export const OpenTypeFeaturesModal: React.FC<OpenTypeFeaturesModalProps> = ({
  project,
  setProject,
  isOpen,
  onClose,
  isLight,
  theme,
  onShowToast,
}) => {
  const themeClasses = getThemeClasses(theme ?? (isLight ? 'light' : 'dark'));
  const [activeTab, setActiveTab] = useState<OpenTypeTab>('vert');
  const [opticalSideBearingPercent, setOpticalSideBearingPercent] = useState<number>(
    project.openTypeFeatures?.palt?.opticalSideBearingPercent ?? 5
  );

  // Config State initialized from project or defaults
  const config: OpenTypeFeaturesConfig = useMemo(() => {
    return (
      project.openTypeFeatures || {
        enabled: true,
        verticalWriting: {
          enabled: true,
          defaultVertAdvance: project.metadata.unitsPerEm || 1000,
          vertOriginY: project.metadata.ascender || 880,
          substitutions: DEFAULT_VERT_PRESETS.map((p, idx) => ({
            id: `vsub_${idx}`,
            sourceUnicode: p.sourceUnicode,
            vertUnicode: p.vertUnicode,
            enabled: true,
          })),
        },
        ligatures: DEFAULT_LIGATURE_PRESETS.map((p) => ({
          id: p.id,
          type: p.type,
          name: p.name,
          inputChars: p.inputChars,
          substituteUnicode: p.substituteUnicode,
          enabled: true,
        })),
        customKerningPairs: [],
        palt: {
          enabled: true,
          autoDerivePalt: true,
          autoDeriveVpal: true,
          opticalSideBearingPercent: 5,
          paltList: [],
          vpalList: [],
        },
      }
    );
  }, [project.openTypeFeatures, project.metadata]);

  // Form Inputs for Adding Custom Ligatures
  const [newLigName, setNewLigName] = useState('');
  const [newLigInputs, setNewLigInputs] = useState('');
  const [newLigTargetUnicode, setNewLigTargetUnicode] = useState('');

  // Interactive Live Preview State
  const [previewText, setPreviewText] = useState('「こんにちは、世界！」ーフォントテスト。\noffice & flight & staff');
  const [previewWritingMode, setPreviewWritingMode] = useState<'vertical-rl' | 'horizontal-tb'>('vertical-rl');

  // Helper to update project features
  const updateFeatures = (newConfig: OpenTypeFeaturesConfig) => {
    setProject((prev) => ({
      ...prev,
      openTypeFeatures: newConfig,
      updatedAt: Date.now(),
    }));
  };

  // Toggle Global OpenType Features
  const toggleFeaturesGlobal = () => {
    const updated = { ...config, enabled: !config.enabled };
    updateFeatures(updated);
    onShowToast(`OpenType Featuresを${updated.enabled ? '有効化' : '無効化'}しました`, 'info');
  };

  // Toggle Vertical Writing Feature
  const toggleVerticalWriting = () => {
    const updated: OpenTypeFeaturesConfig = {
      ...config,
      verticalWriting: {
        ...config.verticalWriting,
        enabled: !config.verticalWriting.enabled,
      },
    };
    updateFeatures(updated);
    onShowToast(`縦書き ('vert') 機能: ${updated.verticalWriting.enabled ? 'ON' : 'OFF'}`, 'info');
  };

  // Toggle specific vertical substitution
  const toggleVertSub = (id: string) => {
    const subs = config.verticalWriting.substitutions.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    updateFeatures({
      ...config,
      verticalWriting: { ...config.verticalWriting, substitutions: subs },
    });
  };

  // Auto-detect Vertical Glyphs from current project
  const handleAutoDetectVerticalGlyphs = () => {
    let count = 0;
    const existingUnicodes = new Set(Object.keys(project.glyphs).map(Number));

    const updatedSubs = config.verticalWriting.substitutions.map((sub) => {
      // Check if project has a vertical variant glyph (e.g., U+FE10, U+FE12, etc.)
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

    onShowToast(`プロジェクト内から ${count} 件の縦書き対応グリフを全自動検出・登録しました`, 'success');
  };

  // Toggle Ligature Item
  const toggleLigature = (id: string) => {
    const ligs = config.ligatures.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
    updateFeatures({ ...config, ligatures: ligs });
  };

  // Add Custom Ligature
  const handleAddCustomLigature = () => {
    if (!newLigInputs.trim() || !newLigTargetUnicode.trim()) {
      onShowToast('入力文字並びと変換先Unicodeを入力してください', 'warning');
      return;
    }

    const inputArr = Array.from<string>(newLigInputs.trim());
    const targetText = newLigTargetUnicode.trim();
    const targetUni = /^U\+/i.test(targetText)
      ? Number.parseInt(targetText.slice(2), 16)
      : Number.parseInt(targetText, 10);

    if (inputArr.length < 2) {
      onShowToast('合字の入力文字は2文字以上で指定してください', 'warning');
      return;
    }

    if (!Number.isInteger(targetUni) || targetUni < 0 || targetUni > 0x10ffff) {
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
  };

  // Remove Ligature
  const handleRemoveLigature = (id: string) => {
    const filtered = config.ligatures.filter((l) => l.id !== id);
    updateFeatures({ ...config, ligatures: filtered });
    onShowToast('合字ルールを削除しました', 'info');
  };

  // Proportional Metrics (palt) Handlers
  const togglePaltGlobal = () => {
    const currentPalt = config.palt || {
      enabled: false,
      autoDerivePalt: true,
      autoDeriveVpal: true,
      opticalSideBearingPercent: 5,
      paltList: [],
      vpalList: [],
    };
    const updated = {
      ...config,
      palt: {
        ...currentPalt,
        enabled: !currentPalt.enabled,
      },
    };
    updateFeatures(updated);
    onShowToast(`プロポーショナルメトリクス (palt) を${updated.palt.enabled ? '有効化' : '無効化'}しました`, 'info');
  };

  const handleAutoDerivePalt = () => {
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
    onShowToast(`${list.length} 文字のプロポーショナルメトリクス (palt) を自動算出・登録しました`, 'success');
  };

  const togglePaltItem = (unicode: number) => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/75 anim-fade">
      <div
        className={`w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        {/* Header Bar */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b shrink-0 gap-3 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
            >
              <AlignVerticalJustifyCenter className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                  縦書き・合字スタジオ
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    config.enabled
                      ? themeClasses.accentBadge
                      : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
                  }`}
                >
                  {config.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${themeClasses.textMuted}`}>
                日本語縦書き・合字・ペア調整のビジュアル設計と検証
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
            {/* Global Feature Enable Toggle */}
            <button
              onClick={toggleFeaturesGlobal}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                config.enabled
                  ? `${themeClasses.accentBtn} border-transparent`
                  : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border} ${themeClasses.activeToolHover}`
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{config.enabled ? '有効' : '無効'}</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center px-3 sm:px-5 py-2 border-b shrink-0 text-xs font-bold gap-1 overflow-x-auto custom-scrollbar touch-scroll-x min-w-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {[
            {
              id: 'vert',
              label: '縦書き設定 (`vert`/`vhea`)',
              shortLabel: '縦書き',
              icon: AlignVerticalJustifyCenter,
              count: config.verticalWriting.substitutions.filter((s) => s.enabled).length,
            },
            {
              id: 'liga',
              label: '合字・リガチャー (`liga`/`dlig`)',
              shortLabel: '合字',
              icon: Layers,
              count: config.ligatures.filter((l) => l.enabled).length,
            },
            {
              id: 'gpos',
              label: 'カーニング・ペア調整 (GPOS)',
              shortLabel: 'カーニング',
              icon: ArrowUpDown,
              count: Object.keys(project.kerning || {}).length,
            },
            {
              id: 'palt',
              label: 'プロポーショナルメトリクス (`palt`/`vpal`)',
              shortLabel: '文字ツメ(palt)',
              icon: Sparkles,
              count: (config.palt?.paltList || []).filter((p) => p.enabled).length,
            },
            {
              id: 'preview',
              label: 'リアルタイム縦書き・合字プレビュー',
              shortLabel: 'プレビュー',
              icon: Eye,
              badge: 'LIVE',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isOpenTypeTab(tab.id)) {
                    setActiveTab(tab.id);
                  }
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center space-x-1.5 sm:space-x-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? themeClasses.accentBtn
                    : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: 縦書き設定 (vert / vhea / VORG) */}
          {activeTab === 'vert' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Vertical Writing Main Controls Card */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        config.verticalWriting.enabled
                          ? themeClasses.accentBadge
                          : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
                      }`}
                    >
                      <AlignVerticalJustifyCenter className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">日本語縦書き (OpenType `vert` & `vhea` Table)</h3>
                      <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                        縦書き時に句読点・鍵括弧・長音記号（ー）等を自動的に縦向きグリフに置換・配置します
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAutoDetectVerticalGlyphs}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>既存グリフから全自動バインド</span>
                    </button>

                    <button
                      onClick={toggleVerticalWriting}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        config.verticalWriting.enabled
                          ? themeClasses.accentBtn
                          : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
                      }`}
                    >
                      {config.verticalWriting.enabled ? '縦書き機能 ON' : '縦書き機能 OFF'}
                    </button>
                  </div>
                </div>

                {/* Vertical Metrics Global Settings */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${themeClasses.border}`}>
                  <div className="space-y-1">
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span>デフォルト縦向き全角送り幅 (`vertAdvanceHeight`)</span>
                      <span className={`font-mono ${themeClasses.accentText}`}>
                        {config.verticalWriting.defaultVertAdvance} units
                      </span>
                    </label>
                    <input
                      type="range"
                      min={500}
                      max={2000}
                      step={10}
                      value={config.verticalWriting.defaultVertAdvance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFeatures({
                          ...config,
                          verticalWriting: {
                            ...config.verticalWriting,
                            defaultVertAdvance: val,
                          },
                        });
                      }}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span>縦書きY原点 (`VORG` Table Origin)</span>
                      <span className={`font-mono ${themeClasses.accentText}`}>
                        {config.verticalWriting.vertOriginY} units
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1200}
                      step={10}
                      value={config.verticalWriting.vertOriginY}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFeatures({
                          ...config,
                          verticalWriting: {
                            ...config.verticalWriting,
                            vertOriginY: val,
                          },
                        });
                      }}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Glyph Replacement Rules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}>
                    <AlignVerticalJustifyCenter className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span>標準縦書き置換ルール一覧 (`vert` GSUB Table)</span>
                  </h4>
                  <span className={`text-xs ${themeClasses.textMuted}`}>
                    有効: {config.verticalWriting.substitutions.filter((s) => s.enabled).length} /{' '}
                    {config.verticalWriting.substitutions.length} 件
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {config.verticalWriting.substitutions.map((sub, idx) => {
                    const presetInfo = DEFAULT_VERT_PRESETS[idx];
                    const srcChar = presetInfo?.char || String.fromCharCode(sub.sourceUnicode);
                    const vertChar = presetInfo?.vertChar || String.fromCharCode(sub.vertUnicode);

                    return (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                          sub.enabled
                            ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                            : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <button
                            onClick={() => toggleVertSub(sub.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              sub.enabled
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : themeClasses.border
                            }`}
                          >
                            {sub.enabled && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm truncate">{presetInfo?.name || srcChar}</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 text-[11px] font-mono mt-0.5 ${themeClasses.textMuted}`}>
                              <span className={`px-1 py-0.2 rounded border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
                                {srcChar} (U+{sub.sourceUnicode.toString(16).toUpperCase()})
                              </span>
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span className={`px-1 py-0.2 rounded border font-bold ${themeClasses.accentBadge}`}>
                                {vertChar}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold shrink-0 ml-2 ${themeClasses.textMuted}`}>
                          `vert`
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 合字・リガチャー (GSUB liga/dlig) */}
          {activeTab === 'liga' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Ligature Overview & Add Form Card */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">標準・選択的合字 (OpenType `liga` & `dlig` GSUB)</h3>
                    <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                      特定の文字が連続して入力された際（例: `f` + `i` ＝ `fi`）、自動的に連結合字グリフに置換します
                    </p>
                  </div>
                </div>

                {/* Add Custom Ligature Form */}
                <div className={`pt-3 border-t space-y-3 ${themeClasses.border}`}>
                  <h4 className="text-xs font-bold">新しい合字ルールの定義・追加</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="合字名称 (例: トモダチ合字)"
                      value={newLigName}
                      onChange={(e) => setNewLigName(e.target.value)}
                      className={`px-3 py-2 rounded-xl border text-xs outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    />

                    <input
                      type="text"
                      placeholder="トリガー文字並び (例: fi または トモ)"
                      value={newLigInputs}
                      onChange={(e) => setNewLigInputs(e.target.value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    />

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="合字Unicode (例: U+FB01)"
                        value={newLigTargetUnicode}
                        onChange={(e) => setNewLigTargetUnicode(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                      />

                      <button
                        onClick={handleAddCustomLigature}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>追加</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registered Ligature List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}>
                    <Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span>登録済み合字ルール一覧 ({config.ligatures.length} 件)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.ligatures.map((lig) => (
                    <div
                      key={lig.id}
                      className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between ${
                        lig.enabled
                          ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                          : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button
                          onClick={() => toggleLigature(lig.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            lig.enabled
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : themeClasses.border
                          }`}
                        >
                          {lig.enabled && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm truncate">{lig.name}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                                lig.type === 'liga'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                              }`}
                            >
                              {lig.type}
                            </span>
                          </div>

                          <div className={`flex items-center space-x-1.5 text-xs font-mono mt-1 ${themeClasses.textMuted}`}>
                            <span className={`px-1.5 py-0.5 rounded border font-bold ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
                              {lig.inputChars.join(' + ')}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span className={`px-1.5 py-0.5 rounded border font-black ${themeClasses.accentBadge}`}>
                              U+{lig.substituteUnicode.toString(16).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveLigature(lig.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: カーニング GPOS */}
          {activeTab === 'gpos' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div
                className={`p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
                  >
                    <ArrowUpDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">文字ペア送り幅調整 (`kern` GPOS Table)</h3>
                    <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                      特定の文字同士が隣り合った際の文字間余白（カーニング）をデザインユニット単位で補正します
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-xs space-y-2">
                  <p>
                    現在、プロジェクト内には <strong>{Object.keys(project.kerning || {}).length} 件</strong> のアクティブなカーニングペアが登録されています。
                  </p>
                  <p className={themeClasses.textMuted}>
                    ※ より詳細な2Dカーニング調整やペアマトリクス編集は、ツールバーの「カーニング調整」モーダルからシームレスに行えます。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: プロポーショナルメトリクス (palt / vpal) */}
          {activeTab === 'palt' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div
                className={`p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        config.palt?.enabled
                          ? themeClasses.accentBadge
                          : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">
                        プロポーショナルメトリクス (`palt` / `vpal` GPOS Table)
                      </h3>
                      <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                        全角（1000 UPM）の仮想ボディから字面外の余白を詰め、ツメ組み時に文字固有の字幅で送る機能です
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAutoDerivePalt}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>全グリフの字面から一括自動算出</span>
                    </button>

                    <button
                      onClick={togglePaltGlobal}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        config.palt?.enabled
                          ? themeClasses.accentBtn
                          : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
                      }`}
                    >
                      {config.palt?.enabled ? 'palt機能 ON' : 'palt機能 OFF'}
                    </button>
                  </div>
                </div>

                {/* Optical Padding slider */}
                <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${themeClasses.border}`}>
                  <div className="space-y-0.5">
                    <span className="font-bold">
                      光学サイドベアリング余白比率（字面の左右に確保する最小余白）
                    </span>
                    <p className={`text-[11px] ${themeClasses.textMuted}`}>
                      手引き第12・14ページ準拠：字面輪郭（インク領域）の外側に付与する均等マージン率
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={opticalSideBearingPercent}
                      onChange={(e) => setOpticalSideBearingPercent(Number(e.target.value))}
                      className="w-32 accent-emerald-600"
                    />
                    <span className={`font-mono font-bold w-12 text-right ${themeClasses.accentText}`}>
                      {opticalSideBearingPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Registered / Derived Palt Glyph Metrics List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}>
                    <Type className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span>登録済みグリフのツメ量一覧 ({(config.palt?.paltList || []).length} 件)</span>
                  </h4>
                  <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>
                    有効: {(config.palt?.paltList || []).filter((p) => p.enabled).length} 件
                  </span>
                </div>

                {(config.palt?.paltList || []).length === 0 ? (
                  <div
                    className={`p-8 rounded-2xl border text-center space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                  >
                    <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">プロポーショナルメトリクス情報がまだ算出されていません</p>
                      <p className={`text-xs ${themeClasses.textMuted}`}>
                        「全グリフの字面から一括自動算出」をクリックすると、作成した漢字・かなのインク境界から自動でツメ幅を生成します。
                      </p>
                    </div>
                    <button
                      onClick={handleAutoDerivePalt}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
                    >
                      今すぐ自動算出する
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {config.palt!.paltList.map((metric) => (
                      <div
                        key={metric.unicode}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          metric.enabled
                            ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                            : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <button
                            onClick={() => togglePaltItem(metric.unicode)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              metric.enabled
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : themeClasses.border
                            }`}
                          >
                            {metric.enabled && <Check className="w-3 h-3" />}
                          </button>

                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
                            {metric.char}
                          </div>

                          <div className="min-w-0 font-mono text-[11px]">
                            <div className="font-sans font-bold truncate">
                              U+{metric.unicode.toString(16).toUpperCase()}
                            </div>
                            <div className={`text-[10px] ${themeClasses.textMuted}`}>
                              {metric.originalAdvance} → <strong className={themeClasses.accentText}>{metric.proportionalAdvance}</strong> ({metric.deltaAdvance})
                            </div>
                          </div>
                        </div>

                        <div className={`text-right text-[10px] font-mono ${themeClasses.textMuted}`}>
                          <div>L:{metric.opticalMarginLeft}</div>
                          <div>R:{metric.opticalMarginRight}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: リアルタイム縦書き・合字プレビュー */}
          {activeTab === 'preview' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div
                className={`p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
                      <Eye className={`w-4 h-4 ${themeClasses.accentText}`} />
                      <span>インタラクティブ縦書き＆合字レンダリング検証</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                      縦書きレイアウトと入力テキストを確認できます。GSUB (`vert`, `liga`) の最終的な適用は、書き出したフォント側で行われます
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setPreviewWritingMode((prev) =>
                          prev === 'vertical-rl' ? 'horizontal-tb' : 'vertical-rl'
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                    >
                      {previewWritingMode === 'vertical-rl' ? '縦書き (vertical-rl)' : '横書き (horizontal-tb)'}
                    </button>
                  </div>
                </div>

                {/* Input Control */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${themeClasses.textMuted}`}>
                    検証用テストテキスト入力:
                  </label>
                  <textarea
                    rows={2}
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs outline-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  />
                </div>

                {/* Live Writing Render Display Area */}
                <div
                  className={`p-6 rounded-2xl border min-h-[220px] flex items-center justify-center overflow-auto transition-colors shadow-inner ${themeClasses.cardBg} ${themeClasses.border}`}
                >
                  <div
                    style={{
                      writingMode: previewWritingMode,
                      fontFamily: `'${project.name}', serif, sans-serif`,
                      fontSize: '32px',
                      lineHeight: '1.8',
                      letterSpacing: '0.05em',
                    }}
                    className={`font-medium select-text max-h-[300px] ${themeClasses.textPrimary}`}
                  >
                    {previewText}
                  </div>
                </div>

                <div className={`flex items-center space-x-2 text-[11px] ${themeClasses.textMuted}`}>
                  <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                  <span>
                    この画面はブラウザの縦書きレイアウトを確認するプレビューです。設定した縦向き字形と合字は、書き出したフォントを対応アプリで検証してください。
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 text-xs ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141e17] border-[#223326]'
          }`}
        >
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>フォント出力（TTF/OTF/WOFF/WOFF2）時に OpenType 機能テーブルが自動バインドされます</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors "
          >
            完了・閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
