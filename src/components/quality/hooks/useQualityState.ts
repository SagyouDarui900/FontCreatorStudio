import { useState, useMemo, useRef } from 'react';
import { ShieldCheck, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { FontProject } from '../../../types';
import { isLightTheme, ThemeMode } from '../../../utils/theme';
import {
  FontQualityReport,
  QualitySeverity,
  BatchNodeOptimizationResult,
  BatchStrokeEqualizationResult,
  BatchExtremaOptimizationResult,
} from '../../../utils/qualityChecker';
import {
  ProjectDiagnosticsReport,
  DiagnosticScope,
} from '../../../utils/projectDiagnostics';
import {
  TabFilter,
  OptimizationLevel,
  OptimizationScope,
  EqualizationMode,
  EqualizationScope,
  ExtremaSensitivity,
  ExtremaScope,
} from '../types';

export function useQualityState(project: FontProject, theme: ThemeMode) {
  const isLight = isLightTheme(theme);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | QualitySeverity>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [report, setReport] = useState<FontQualityReport | null>(null);

  // Node Optimization panel state
  const [isOptimizePanelOpen, setIsOptimizePanelOpen] = useState<boolean>(false);
  const [optLevel, setOptLevel] = useState<OptimizationLevel>('normal');
  const [optScope, setOptScope] = useState<OptimizationScope>('all');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [lastOptimizationResult, setLastOptimizationResult] = useState<BatchNodeOptimizationResult | null>(null);

  // Stroke Equalization panel state
  const [isEqualizePanelOpen, setIsEqualizePanelOpen] = useState<boolean>(false);
  const [eqMode, setEqMode] = useState<EqualizationMode>('balanced');
  const [eqStrength, setEqStrength] = useState<number>(0.65);
  const [eqScope, setEqScope] = useState<EqualizationScope>('all');
  const [isEqualizing, setIsEqualizing] = useState<boolean>(false);
  const [lastEqualizationResult, setLastEqualizationResult] = useState<BatchStrokeEqualizationResult | null>(null);

  // Extrema Optimization panel state
  const [isExtremaPanelOpen, setIsExtremaPanelOpen] = useState<boolean>(false);
  const [extAlignAxis, setExtAlignAxis] = useState<boolean>(true);
  const [extSensitivity, setExtSensitivity] = useState<ExtremaSensitivity>('normal');
  const [extScope, setExtScope] = useState<ExtremaScope>('all');
  const [isOptimizingExtrema, setIsOptimizingExtrema] = useState<boolean>(false);
  const [lastExtremaResult, setLastExtremaResult] = useState<BatchExtremaOptimizationResult | null>(null);

  // Density Heatmap Inspector state
  const [heatmapModalUnicode, setHeatmapModalUnicode] = useState<number | null>(null);

  // Main View: 'quality' or 'diagnostics'
  const [mainView, setMainView] = useState<'quality' | 'diagnostics'>('quality');

  // Project Diagnostics state
  const [diagScope, setDiagScope] = useState<DiagnosticScope>('standard_japanese');
  const [diagFilter, setDiagFilter] = useState<'all_attention' | 'all' | 'empty' | 'critically_low' | 'draft' | 'complete'>('all_attention');
  const [diagCategoryFilter, setDiagCategoryFilter] = useState<string>('all');
  const [diagSortBy, setDiagSortBy] = useState<'complexity_asc' | 'complexity_desc' | 'nodes_asc' | 'unicode' | 'severity'>('complexity_asc');
  const [diagSearchQuery, setDiagSearchQuery] = useState<string>('');
  const [diagReport, setDiagReport] = useState<ProjectDiagnosticsReport | null>(null);
  const [isDiagScanning, setIsDiagScanning] = useState<boolean>(false);

  // Fullscreen view mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // List of unicodes that have excessive_nodes issues
  const excessiveNodesUnicodes = useMemo(() => {
    if (!report || !report.issues) return [];
    const list: number[] = [];
    report.issues.forEach((iss) => {
      if (iss.type === 'excessive_nodes' && !list.includes(iss.unicode)) {
        list.push(iss.unicode);
      }
    });
    return list;
  }, [report]);

  // Filtered issue list
  const filteredIssues = useMemo(() => {
    if (!report) return [];
    return report.issues.filter((issue) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'excessive_nodes') {
          if (issue.type !== 'excessive_nodes' && issue.type !== 'isolated_node') {
            return false;
          }
        } else if (issue.type !== activeTab) {
          return false;
        }
      }
      // Severity filter
      if (severityFilter !== 'all' && issue.severity !== severityFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const charMatch = issue.char.toLowerCase().includes(query);
        const nameMatch = issue.glyphName.toLowerCase().includes(query);
        const hexMatch = issue.unicode.toString(16).toLowerCase().includes(query);
        const titleMatch = issue.title.toLowerCase().includes(query);
        if (!charMatch && !nameMatch && !hexMatch && !titleMatch) {
          return false;
        }
      }
      return true;
    });
  }, [report, activeTab, severityFilter, searchQuery]);

  // Quality Health status and stats computations
  const totalAutoFixableCount = useMemo(() => {
    if (!report?.issues) return 0;
    return report.issues.filter((iss) => iss.canAutoFix).length;
  }, [report]);

  const healthStatus = useMemo(() => {
    const score = report?.score ?? 100;
    if (score >= 90) {
      return {
        label: '優良',
        subtitle: 'すべての品質基準を満たしており、フォント出力準備が整っています',
        colorText: isLight ? 'text-emerald-800' : 'text-emerald-400',
        colorBg: isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-950/40 border-emerald-800/60',
        badgeBg: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-800',
        icon: ShieldCheck,
      };
    }
    if (score >= 70) {
      return {
        label: '概ね良好',
        subtitle: '軽微な調整推奨項目がありますが、通常利用可能です',
        colorText: isLight ? 'text-sky-800' : 'text-sky-400',
        colorBg: isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/40 border-sky-800/60',
        badgeBg: isLight ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-sky-950 text-sky-300 border-sky-800',
        icon: Info,
      };
    }
    if (score >= 50) {
      return {
        label: '改善推奨',
        subtitle: '白抜きや線幅の偏りなどの警告が検出されています',
        colorText: isLight ? 'text-amber-800' : 'text-amber-400',
        colorBg: isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-950/40 border-amber-800/60',
        badgeBg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-950 text-amber-300 border-amber-800',
        icon: AlertTriangle,
      };
    }
    return {
      label: '要修正',
      subtitle: 'フォント描画や出力に影響するエラーが検出されています',
      colorText: isLight ? 'text-rose-800' : 'text-rose-400',
      colorBg: isLight ? 'bg-rose-50/80 border-rose-200' : 'bg-rose-950/40 border-rose-800/60',
      badgeBg: isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-950 text-rose-300 border-rose-800',
      icon: AlertCircle,
    };
  }, [report, isLight]);

  return {
    isLight,
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    searchQuery,
    setSearchQuery,
    isScanning,
    setIsScanning,
    report,
    setReport,
    isOptimizePanelOpen,
    setIsOptimizePanelOpen,
    optLevel,
    setOptLevel,
    optScope,
    setOptScope,
    isOptimizing,
    setIsOptimizing,
    lastOptimizationResult,
    setLastOptimizationResult,
    isEqualizePanelOpen,
    setIsEqualizePanelOpen,
    eqMode,
    setEqMode,
    eqStrength,
    setEqStrength,
    eqScope,
    setEqScope,
    isEqualizing,
    setIsEqualizing,
    lastEqualizationResult,
    setLastEqualizationResult,
    isExtremaPanelOpen,
    setIsExtremaPanelOpen,
    extAlignAxis,
    setExtAlignAxis,
    extSensitivity,
    setExtSensitivity,
    extScope,
    setExtScope,
    isOptimizingExtrema,
    setIsOptimizingExtrema,
    lastExtremaResult,
    setLastExtremaResult,
    heatmapModalUnicode,
    setHeatmapModalUnicode,
    mainView,
    setMainView,
    diagScope,
    setDiagScope,
    diagFilter,
    setDiagFilter,
    diagCategoryFilter,
    setDiagCategoryFilter,
    diagSortBy,
    setDiagSortBy,
    diagSearchQuery,
    setDiagSearchQuery,
    diagReport,
    setDiagReport,
    isDiagScanning,
    setIsDiagScanning,
    isFullscreen,
    setIsFullscreen,
    searchInputRef,
    scanTimerRef,
    excessiveNodesUnicodes,
    filteredIssues,
    totalAutoFixableCount,
    healthStatus,
  };
}

export type QualityState = ReturnType<typeof useQualityState>;
