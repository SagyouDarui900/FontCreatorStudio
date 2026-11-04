import React, { useState, useMemo } from 'react';
import { Sliders, X } from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';
import {
  flipContoursHorizontal,
  flipContoursVertical,
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
  onChangeAdvanceWidth: (val: number) => void;
  onChangeLsb: (val: number) => void;
  contours: PathContour[];
  onChangeContours: (contours: PathContour[]) => void;
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
}) => {
  const upm = unitsPerEm || 1000;
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
    transform: true,
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

  // Handle Simplify execution
  const handleExecuteSimplify = () => {
    if (contours.length === 0) {
      onShowToast?.('単純化する輪郭がありません', 'warning');
      return;
    }

    if (onSimplifyGlyph) {
      onSimplifyGlyph(simplifyLevel);
      return;
    }

    // Direct fallback
    onCommitHistory();
    const result = simplifyGlyphContours(contours, {
      level: simplifyLevel,
      preserveSharpCorners: true,
    });

    onChangeContours(result.contours);
    if (result.changed) {
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
    onChangeContours(result.contours);
    onChangeAdvanceWidth(result.advanceWidth);
    onChangeLsb(result.lsb);

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

  // Horizontal Centering within current Advance Width
  const handleCenterWithinAdvance = () => {
    if (contours.length === 0 || bbox.width <= 0) {
      onShowToast?.('センタリングする輪郭がありません', 'warning');
      return;
    }
    onCommitHistory();
    const currentAdv = advanceWidth || upm;
    const targetLsb = Math.round((currentAdv - bbox.width) / 2);
    const deltaX = targetLsb - bbox.minX;

    const shifted = deltaX !== 0 ? transformContours(contours, (p) => ({ x: Math.round(p.x + deltaX), y: p.y })) : contours;

    onChangeContours(shifted);
    onChangeLsb(targetLsb);
    onShowToast?.(`文字を送り幅(${currentAdv}px)の中央に配置しました (LSB/RSB: ${targetLsb}px)`, 'success');
  };

  // Step adjustments for Advance & LSB
  const handleStepAdvance = (delta: number) => {
    const nextVal = Math.max(100, Math.round((advanceWidth || upm) + delta));
    onChangeAdvanceWidth(nextVal);
    onCommitHistory();
  };

  const handleStepLsb = (delta: number) => {
    const nextVal = Math.round((lsb ?? 50) + delta);
    onChangeLsb(nextVal);
    onCommitHistory();
  };

  // Preset Advance width setters
  const handleSetAdvancePreset = (preset: number) => {
    onChangeAdvanceWidth(preset);
    onCommitHistory();
    onShowToast?.(`送り幅を ${preset}px に設定しました`, 'info');
  };

  const handleSetLsbPreset = (preset: number) => {
    onChangeLsb(preset);
    onCommitHistory();
    onShowToast?.(`左余白(LSB)を ${preset}px に設定しました`, 'info');
  };

  // Transformation actions
  const handleFlipH = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(flipContoursHorizontal(contours));
  };

  const handleFlipV = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(flipContoursVertical(contours));
  };

  const handleSlant = (degrees: number) => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(slantContours(contours, degrees));
  };

  const handleScale = (factor: number) => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(scaleContours(contours, factor, factor));
  };

  const handleAspectScale = (scaleX: number, scaleY: number) => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(scaleContours(contours, scaleX, scaleY));
  };

  const handleSmoothAndFix = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    const cleaned = smoothAndFixTransformedContours(contours);
    onChangeContours(cleaned);
    onShowToast?.('輪郭のガタツキと変形歪みを滑らかに補正しました', 'success');
  };

  const handleCenter = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(centerContoursInBox(contours, upm, Math.round(upm * 0.8)));
  };

  const handleFitToEmBox = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    const isKana = /[ぁ-んァ-ヶー]/.test(selectedChar);
    const targetRatio = isKana ? 0.78 : 0.85;
    const fitted = fitContoursToEmBox(contours, upm, upm, targetRatio);
    onChangeContours(fitted);
    onShowToast?.(`文字の輪郭をキャンバス枠内（字面枠 ${Math.round(targetRatio * 100)}%基準）に最適化しました`, 'success');
  };

  const handleExecuteClear = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours([]);
    setIsConfirmingClear(false);
  };

  const handleOutlineStrokePaths = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    const transformed = contours.map((c) => (c.closed ? c : outlineOpenContour(c, strokeOutlineWidth)));
    onChangeContours(transformed);
  };

  const handleConvertToSmallKana = () => {
    if (contours.length === 0) return;
    onCommitHistory();
    onChangeContours(createSmallKanaContours(contours));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile/Overlay Click-Outside Dismiss (Transparent, non-darkening) */}
      {effectiveIsOverlay && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-transparent sm:hidden z-40 pointer-events-auto"
        />
      )}

      <div
        className={`${
          effectiveIsOverlay
            ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-full shadow-2xl animate-in slide-in-from-right duration-200'
            : 'relative z-10 w-72 lg:w-80 shadow-none shrink-0'
        } border-l flex flex-col h-full overflow-hidden select-none transition-colors ${themeClasses.sidebarBg} ${themeClasses.border}`}
      >
        {/* Sticky Mobile/Desktop Header */}
        <div
          className={`flex items-center justify-between p-3 border-b shrink-0 z-10 ${themeClasses.headerBg} ${themeClasses.border}`}
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 8px, 12px)' }}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${themeClasses.toolbarBg} ${themeClasses.accentText}`}>
              <Sliders className="w-4 h-4 shrink-0" />
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

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={handleToggleAll}
              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
              title={isAllExpanded ? 'すべての項目を折りたたむ' : 'すべての項目を展開'}
            >
              {isAllExpanded ? '全閉' : '全開'}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-xs font-bold active:scale-95 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                title="パネルを閉じる (作図エリアへ戻る)"
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>閉じる</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Panel Content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3"
          style={{
            paddingBottom: effectiveIsOverlay
              ? 'max(env(safe-area-inset-bottom, 0px) + 80px, 90px)'
              : 'max(env(safe-area-inset-bottom, 0px) + 20px, 24px)',
          }}
        >
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
            onChangeAdvanceWidth={onChangeAdvanceWidth}
            onChangeLsb={onChangeLsb}
            onCommitHistory={onCommitHistory}
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
          />
        </div>
      </div>
    </>
  );
});

MetricsPanel.displayName = 'MetricsPanel';
export default MetricsPanel;
