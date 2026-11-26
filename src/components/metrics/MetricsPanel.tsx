import React, { useState, useMemo } from 'react';
import { Sliders, X, Layers, Lock } from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';
import { PrecisionInspector } from '../precision/PrecisionInspector';
import {
  flipMultipleContoursH,
  flipMultipleContoursV,
  slantContours,
  scaleContours,
  centerContoursInBox,
  fitContoursToEmBox,
  getContoursBoundingBox,
  outlineOpenContour,
  createSmallKanaContours,
  simplifyGlyphContours,
  smoothAndFixTransformedContours,
  transformContours,
} from '../../utils/path';
import {
  calculateOptimalSpacing,
  AutoSpacingPreset,
} from '../../utils/metricsHelper';
import { ThemeMode, isLightTheme, getThemeClasses } from '../../utils/theme';

import { NavigationSection } from './NavigationSection';
import { AdvanceWidthSection } from './AdvanceWidthSection';
import { AutoSpaceSection } from './AutoSpaceSection';
import { SimplifySection } from './SimplifySection';
import { TransformSection } from './TransformSection';

export interface MetricsPanelProps {
  advanceWidth: number;
  lsb: number;
  onChangeAdvanceWidth: (val: number, options?: { skipHistory?: boolean }) => void;
  onChangeLsb: (val: number, options?: { skipHistory?: boolean }) => void;
  contours: PathContour[];
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory: () => void;
  selectedChar: string;
  selectedUnicode: number;
  isOpen?: boolean;
  onClose?: () => void;
  theme: ThemeMode;
  isOverlay?: boolean;
  // Navigation Callbacks
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
  unitsPerEm?: number;
  // Feature Callbacks
  onAutoSpaceGlyph?: (preset: AutoSpacingPreset) => void;
  onSimplifyGlyph?: (level: 'mild' | 'normal' | 'strong') => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  selectedContourIds?: string[];
  selectedNodeId?: string | null;
  selectedHandleType?: 'node' | 'handleIn' | 'handleOut' | null;
  isGlyphLocked?: boolean;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = React.memo(({
  advanceWidth,
  lsb,
  onChangeAdvanceWidth,
  onChangeLsb,
  contours,
  onChangeContours,
  onCommitHistory,
  selectedChar,
  selectedUnicode,
  isOpen = true,
  onClose,
  theme,
  isOverlay,
  unitsPerEm = 1000,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  onSelectPrevUncompletedGlyph,
  onSelectNextUncompletedGlyph,
  onAutoSpaceGlyph,
  onSimplifyGlyph,
  onShowToast,
  selectedContourIds = [],
  selectedNodeId = null,
  selectedHandleType = null,
  isGlyphLocked = false,
}) => {
  const upm = unitsPerEm || 1000;
  const [activeTab, setActiveTab] = useState<'metrics' | 'precision'>('metrics');
  const [strokeOutlineWidth, setStrokeOutlineWidth] = useState<number>(60);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [simplifyLevel, setSimplifyLevel] = useState<'mild' | 'normal' | 'strong'>('normal');
  const [spacingPreset, setSpacingPreset] = useState<AutoSpacingPreset>('smart');
  const [expandedSections, setExpandedSections] = useState<{
    nav: boolean;
    simplify: boolean;
    autospace: boolean;
    metrics: boolean;
    transform: boolean;
    outline: boolean;
  }>({
    nav: true,
    simplify: false,
    autospace: false,
    metrics: true,
    transform: typeof window !== 'undefined' ? window.innerWidth >= 640 : true,
    outline: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllExpanded = Object.values(expandedSections).every(Boolean);
  const handleToggleAll = () => {
    const next = !isAllExpanded;
    setExpandedSections({
      nav: next,
      simplify: next,
      autospace: next,
      metrics: next,
      transform: next,
      outline: next,
    });
  };

  const bbox = useMemo(() => getContoursBoundingBox(contours), [contours]);
  const isLight = isLightTheme(theme);
  const themeClasses: ThemeClasses = getThemeClasses(theme);
  const effectiveIsOverlay = isOverlay !== undefined ? isOverlay : false;

  // Node count summary
  const totalNodes = useMemo(() => {
    return contours.reduce((acc, c) => acc + (c.nodes ? c.nodes.length : 0), 0);
  }, [contours]);
  const hasContourNodes = totalNodes > 0;

  const syncLsbFromContours = (nextContours: PathContour[]) => {
    if (!nextContours.some((c) => c.nodes && c.nodes.length > 0)) return;
    const nextBBox = getContoursBoundingBox(nextContours);
    const nextLsb = Math.round(nextBBox.minX);
    if (nextLsb !== lsb) {
      onChangeLsb(nextLsb, { skipHistory: true });
    }
  };

  const guardLocked = () => {
    if (isGlyphLocked) {
      onShowToast?.('この文字は編集ロックされています', 'warning');
      return true;
    }
    return false;
  };

  // Handle Simplify execution
  const handleExecuteSimplify = () => {
    if (guardLocked()) return;
    if (contours.length === 0) {
      onShowToast?.('単純化する輪郭がありません', 'warning');
      return;
    }

    if (onSimplifyGlyph) {
      onSimplifyGlyph(simplifyLevel);
      return;
    }

    // Direct fallback
    const result = simplifyGlyphContours(contours, {
      level: simplifyLevel,
      preserveSharpCorners: true,
    });

    if (result.changed) {
      onCommitHistory();
      onChangeContours(result.contours, { skipHistory: true });
      onShowToast?.(
        `輪郭を単純化しました: 頂点数 ${result.originalNodeCount}点 → ${result.optimizedNodeCount}点 (${result.reductionPercentage}% 削減)`,
        'success'
      );
    } else {
      onShowToast?.('既に最適な頂点配置です (削除対象の重複・余剰ノードなし)', 'info');
    }
  };

  // Handle Auto-Spacing execution
  const handleExecuteAutoSpacing = (preset: AutoSpacingPreset = spacingPreset) => {
    if (guardLocked()) return;
    if (contours.length === 0) {
      onShowToast?.('字形が作図されていません', 'warning');
      return;
    }

    if (onAutoSpaceGlyph) {
      onAutoSpaceGlyph(preset);
      return;
    }

    // Direct fallback
    onCommitHistory();
    const result = calculateOptimalSpacing(selectedUnicode, contours, preset, upm);
    onChangeContours(result.contours, { skipHistory: true });
    onChangeAdvanceWidth(result.advanceWidth, { skipHistory: true });
    onChangeLsb(result.lsb, { skipHistory: true });

    const presetLabel =
      preset === 'smart'
        ? 'スマート自動'
        : preset === 'japanese-fullwidth'
        ? `和文全角センタリング (${upm}EM)`
        : preset === 'proportional-tight'
        ? '欧文タイト'
        : preset === 'proportional-loose'
        ? '欧文ルーズ'
        : '欧文プロポーショナル';

    onShowToast?.(
      `オートスペーシング適用 [${presetLabel}]: 送り幅 ${result.advanceWidth}px, 左余白 ${result.lsb}px`,
      'success'
    );
  };

  // Apply target LSB by shifting glyph contours horizontally and syncing glyph.lsb
  const applyTargetLsb = (targetLsb: number) => {
    const nextLsb = Math.round(targetLsb);
    if (hasContourNodes) {
      const deltaX = nextLsb - Math.round(bbox.minX);
      if (deltaX !== 0) {
        onCommitHistory();
        const shifted = transformContours(contours, (p) => ({
          x: Math.round(p.x + deltaX),
          y: p.y,
        }));
        onChangeContours(shifted, { skipHistory: true });
        onChangeLsb(nextLsb, { skipHistory: true });
      } else if (lsb !== nextLsb) {
        onCommitHistory();
        onChangeLsb(nextLsb, { skipHistory: true });
      }
    } else if (lsb !== nextLsb) {
      onCommitHistory();
      onChangeLsb(nextLsb, { skipHistory: true });
    }
  };

  // Horizontal Centering within current Advance Width
  const handleCenterWithinAdvance = () => {
    if (guardLocked()) return;
    if (!hasContourNodes) {
      onShowToast?.('センタリングする輪郭がありません', 'warning');
      return;
    }
    onCommitHistory();
    const currentAdv = advanceWidth ?? upm;
    const targetLsb = Math.round((currentAdv - bbox.width) / 2);
    const deltaX = targetLsb - bbox.minX;

    const shifted =
      deltaX !== 0
        ? transformContours(contours, (p) => ({ x: Math.round(p.x + deltaX), y: p.y }))
        : contours;

    onChangeContours(shifted, { skipHistory: true });
    onChangeLsb(targetLsb, { skipHistory: true });
    onShowToast?.(`文字を送り幅(${currentAdv}px)の中央に配置しました (LSB/RSB: ${targetLsb}px)`, 'success');
  };

  // Step adjustments for Advance & LSB
  const handleStepAdvance = (delta: number) => {
    if (guardLocked()) return;
    const nextVal = Math.max(50, Math.round((advanceWidth ?? upm) + delta));
    if (nextVal === advanceWidth) return;
    onCommitHistory();
    onChangeAdvanceWidth(nextVal, { skipHistory: true });
  };

  const handleStepLsb = (delta: number) => {
    if (guardLocked()) return;
    const baseLsb = hasContourNodes ? Math.round(bbox.minX) : (lsb ?? 50);
    const nextVal = Math.round(baseLsb + delta);
    applyTargetLsb(nextVal);
  };

  // Preset Advance width setters
  const handleSetAdvancePreset = (preset: number) => {
    if (guardLocked()) return;
    if (advanceWidth !== preset) {
      onCommitHistory();
      onChangeAdvanceWidth(preset, { skipHistory: true });
    }
    onShowToast?.(`送り幅を ${preset}px に設定しました`, 'info');
  };

  const handleSetLsbPreset = (preset: number) => {
    if (guardLocked()) return;
    applyTargetLsb(preset);
    onShowToast?.(`左余白(LSB)を ${preset}px に設定しました`, 'info');
  };

  // Transformation actions
  const handleFlipH = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const nextContours = flipMultipleContoursH(contours);
    onChangeContours(nextContours, { skipHistory: true });
    syncLsbFromContours(nextContours);
  };

  const handleFlipV = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const nextContours = flipMultipleContoursV(contours);
    onChangeContours(nextContours, { skipHistory: true });
    syncLsbFromContours(nextContours);
  };

  const handleSlant = (degrees: number) => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const nextContours = slantContours(contours, degrees);
    onChangeContours(nextContours, { skipHistory: true });
    syncLsbFromContours(nextContours);
  };

  const handleScale = (factor: number) => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const nextContours = scaleContours(contours, factor, factor);
    onChangeContours(nextContours, { skipHistory: true });
    syncLsbFromContours(nextContours);
  };

  const handleAspectScale = (scaleX: number, scaleY: number) => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const nextContours = scaleContours(contours, scaleX, scaleY);
    onChangeContours(nextContours, { skipHistory: true });
    syncLsbFromContours(nextContours);
  };

  const handleSmoothAndFix = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const cleaned = smoothAndFixTransformedContours(contours);
    onChangeContours(cleaned, { skipHistory: true });
    syncLsbFromContours(cleaned);
    onShowToast?.('輪郭のガタツキと変形歪みを滑らかに補正しました', 'success');
  };

  const handleCenter = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const centered = centerContoursInBox(contours, upm, Math.round(upm * 0.8), upm);
    onChangeContours(centered, { skipHistory: true });
    syncLsbFromContours(centered);
  };

  const handleFitToEmBox = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const isKana = /[ぁ-んァ-ヶー]/.test(selectedChar);
    const targetRatio = isKana ? 0.78 : 0.85;
    const fitted = fitContoursToEmBox(contours, upm, upm, targetRatio);
    onChangeContours(fitted, { skipHistory: true });
    syncLsbFromContours(fitted);
    onShowToast?.(`文字の輪郭をキャンバス枠内（字面枠 ${Math.round(targetRatio * 100)}%基準）に最適化しました`, 'success');
  };

  const handleExecuteClear = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours([], { skipHistory: true });
    setIsConfirmingClear(false);
  };

  const handleOutlineStrokePaths = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    const hasOpenContour = contours.some((c) => !c.closed);
    if (!hasOpenContour) {
      onShowToast?.('開いた骨格線（ペン線など）がないため、アウトライン化は不要です', 'info');
      return;
    }
    onCommitHistory();
    const transformed = contours.map((c) => (c.closed ? c : outlineOpenContour(c, strokeOutlineWidth)));
    onChangeContours(transformed, { skipHistory: true });
    syncLsbFromContours(transformed);
    onShowToast?.(`骨格線を太さ ${strokeOutlineWidth}px でアウトライン化しました`, 'success');
  };

  const handleConvertToSmallKana = () => {
    if (guardLocked()) return;
    if (contours.length === 0) return;
    onCommitHistory();
    const smallKana = createSmallKanaContours(contours, { weightDelta: 4, unitsPerEm: upm });
    onChangeContours(smallKana, { skipHistory: true });
    syncLsbFromContours(smallKana);
    onShowToast?.('小文字サイズ・位置に変換しました', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className={`relative z-10 w-full min-w-0 flex flex-col h-full overflow-hidden select-none transition-colors ${
        effectiveIsOverlay ? 'anim-slide-right' : ''
      } ${themeClasses.sidebarBg}`}
    >
      {/* Panel Header */}
      <div
        className={`flex items-center justify-between gap-1.5 px-2.5 py-2 border-b shrink-0 z-10 min-w-0 ${themeClasses.headerBg} ${themeClasses.border}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={`p-1 rounded-md shrink-0 ${themeClasses.toolbarBg} ${themeClasses.accentText}`}>
            <Sliders className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-bold truncate ${themeClasses.textPrimary}`}>
              メトリクス・文字ツール
            </span>
            <span className={`text-[10px] ${themeClasses.textMuted} truncate`}>
              送り幅・余白・変形・単純化
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeTab === 'metrics' && (
            <button
              onClick={handleToggleAll}
              className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title={isAllExpanded ? 'すべての項目を折りたたむ' : 'すべての項目を展開'}
            >
              {isAllExpanded ? '全閉' : '全開'}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={`h-6 px-1.5 rounded transition-colors flex items-center gap-0.5 text-[11px] font-bold active:scale-95 cursor-pointer border whitespace-nowrap ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="パネルを閉じる (作図エリアへ戻る)"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">閉じる</span>
            </button>
          )}
        </div>
      </div>

        {/* Panel Tabs: Metrics vs Precision Design */}
        <div className={`flex border-b px-2 py-1 gap-1 shrink-0 ${themeClasses.border} ${themeClasses.cardBg}`}>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 max-sm:px-1 rounded text-xs max-sm:text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === 'metrics'
                ? `${themeClasses.activeTool} shadow-sm`
                : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>メトリクス</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('precision')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 max-sm:px-1 rounded text-xs max-sm:text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === 'precision'
                ? `${themeClasses.activeTool} shadow-sm`
                : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>精密整列・数値</span>
            {selectedContourIds && selectedContourIds.length > 0 && (
              <span className="ml-0.5 px-1 py-0.5 text-[10px] font-mono tabular-nums font-bold rounded bg-emerald-500 text-white">
                {selectedContourIds.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'precision' ? (
          <div
            className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y p-2"
            style={{
              paddingBottom: effectiveIsOverlay
                ? 'max(env(safe-area-inset-bottom, 0px) + 24px, 24px)'
                : 'max(env(safe-area-inset-bottom, 0px) + 16px, 20px)',
            }}
          >
            <PrecisionInspector
              contours={contours}
              selectedContourIds={selectedContourIds || []}
              selectedNodeId={selectedNodeId || null}
              selectedHandleType={selectedHandleType || null}
              onChangeContours={(nextContours, options) => {
                onChangeContours(nextContours, options);
                syncLsbFromContours(nextContours);
              }}
              onCommitHistory={onCommitHistory}
              unitsPerEm={upm}
              advanceWidth={advanceWidth}
              showToast={(title, desc) => onShowToast?.(desc ? `${title}: ${desc}` : title, 'info')}
              isLight={isLight}
              themeClasses={themeClasses}
              isGlyphLocked={isGlyphLocked}
            />
          </div>
        ) : (
          /* Scrollable Panel Content */
          <div
            className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y p-2 space-y-2"
            style={{
              paddingBottom: effectiveIsOverlay
                ? 'max(env(safe-area-inset-bottom, 0px) + 24px, 24px)'
                : 'max(env(safe-area-inset-bottom, 0px) + 16px, 20px)',
            }}
          >
          {isGlyphLocked && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[11px] font-semibold">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>編集ロック中（移動・変形は無効）</span>
            </div>
          )}
          {/* 1. Fast Glyph Navigation & Active Character Card */}
          <NavigationSection
            selectedChar={selectedChar}
            selectedUnicode={selectedUnicode}
            contours={contours}
            totalNodes={totalNodes}
            isExpanded={expandedSections.nav}
            onToggle={() => toggleSection('nav')}
            themeClasses={themeClasses}
            onSelectPrevGlyph={onSelectPrevGlyph}
            onSelectNextGlyph={onSelectNextGlyph}
            onSelectPrevUncompletedGlyph={onSelectPrevUncompletedGlyph}
            onSelectNextUncompletedGlyph={onSelectNextUncompletedGlyph}
          />

          {/* 2. Manual Metrics Adjustment (送り幅 & LSB) */}
          <AdvanceWidthSection
            advanceWidth={advanceWidth}
            lsb={lsb}
            upm={upm}
            contours={contours}
            bbox={bbox}
            isExpanded={expandedSections.metrics}
            onToggle={() => toggleSection('metrics')}
            isLight={isLight}
            themeClasses={themeClasses}
            selectedUnicode={selectedUnicode}
            isGlyphLocked={isGlyphLocked}
            onChangeAdvanceWidth={(v) => {
              if (guardLocked()) return;
              const nextVal = Math.max(50, Math.round(v));
              if (nextVal === advanceWidth) return;
              onCommitHistory();
              onChangeAdvanceWidth(nextVal, { skipHistory: true });
            }}
            onChangeLsb={(v) => {
              if (guardLocked()) return;
              applyTargetLsb(v);
            }}
            onStepAdvance={handleStepAdvance}
            onStepLsb={handleStepLsb}
            onSetAdvancePreset={handleSetAdvancePreset}
            onSetLsbPreset={handleSetLsbPreset}
            onCenterWithinAdvance={handleCenterWithinAdvance}
          />

          {/* 3. Auto-Spacing (サイドベアリング自動設定) Section */}
          <AutoSpaceSection
            contours={contours}
            upm={upm}
            spacingPreset={spacingPreset}
            setSpacingPreset={setSpacingPreset}
            onExecuteAutoSpacing={handleExecuteAutoSpacing}
            isExpanded={expandedSections.autospace}
            onToggle={() => toggleSection('autospace')}
            themeClasses={themeClasses}
            isGlyphLocked={isGlyphLocked}
          />

          {/* 4. Simplify (輪郭の単純化・頂点数削減) Section */}
          <SimplifySection
            contours={contours}
            totalNodes={totalNodes}
            simplifyLevel={simplifyLevel}
            setSimplifyLevel={setSimplifyLevel}
            onExecuteSimplify={handleExecuteSimplify}
            isExpanded={expandedSections.simplify}
            onToggle={() => toggleSection('simplify')}
            themeClasses={themeClasses}
            isGlyphLocked={isGlyphLocked}
          />

          {/* 5. Transform Tools & Outline & Clear */}
          <TransformSection
            contours={contours}
            upm={upm}
            selectedChar={selectedChar}
            isExpanded={expandedSections.transform}
            onToggle={() => toggleSection('transform')}
            isOutlineExpanded={expandedSections.outline}
            onToggleOutline={() => toggleSection('outline')}
            strokeOutlineWidth={strokeOutlineWidth}
            setStrokeOutlineWidth={setStrokeOutlineWidth}
            onOutlineStrokePaths={handleOutlineStrokePaths}
            onFlipH={handleFlipH}
            onFlipV={handleFlipV}
            onSlant={handleSlant}
            onScale={handleScale}
            onAspectScale={handleAspectScale}
            onSmoothAndFix={handleSmoothAndFix}
            onCenter={handleCenter}
            onFitToEmBox={handleFitToEmBox}
            onConvertToSmallKana={handleConvertToSmallKana}
            isConfirmingClear={isConfirmingClear}
            setIsConfirmingClear={setIsConfirmingClear}
            onExecuteClear={handleExecuteClear}
            isLight={isLight}
            themeClasses={themeClasses}
            isGlyphLocked={isGlyphLocked}
          />
        </div>
      )}
    </div>
  );
});

MetricsPanel.displayName = 'MetricsPanel';
export default MetricsPanel;
