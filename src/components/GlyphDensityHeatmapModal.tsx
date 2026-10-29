import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Flame,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontProject, GlyphData, PathContour } from '../types';
import { ThemeMode, isLightTheme } from '../utils/theme';
import {
  analyzeGlyphContourDensity,
  simplifySingleContourInGlyph,
  simplifyContourClusterInGlyph,
  simplifyAllDenseContoursInGlyph,
  safePreservingNodeOptimization,
  GlyphDensityAnalysis,
  NodeDensityInfo,
} from '../utils/qualityChecker';
import { HeatmapCanvasView, HeatmapContourSidebar, HeatmapTopBar } from './density';

interface GlyphDensityHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  unicode: number | null;
  onSelectUnicode?: (unicode: number) => void;
  allProblemUnicodes?: number[];
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onSelectGlyph?: (unicode: number) => void;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitHistory?: () => void;
  onRefreshQualityReport?: () => void;
}

export const GlyphDensityHeatmapModal: React.FC<GlyphDensityHeatmapModalProps> = ({
  isOpen,
  onClose,
  unicode,
  onSelectUnicode,
  allProblemUnicodes = [],
  project,
  setProject,
  onSelectGlyph,
  theme,
  onShowToast,
  commitHistory,
  onRefreshQualityReport,
}) => {
  const isLight = isLightTheme(theme);

  // Interaction State
  const [tolerance, setTolerance] = useState<number>(3.5);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDensityInfo | null>(null);
  const [showHeatmapNodes, setShowHeatmapNodes] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showMetricsGuides, setShowMetricsGuides] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [hoveredContourIndex, setHoveredContourIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Undo history stack for the current glyph
  const [undoStack, setUndoStack] = useState<PathContour[][]>([]);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const glyph = unicode !== null ? project.glyphs?.[unicode] : undefined;
  const char = glyph?.char || (unicode !== null ? String.fromCodePoint(unicode) : '');
  const contours = glyph?.contours || [];

  // Compute live density analysis
  const densityAnalysis: GlyphDensityAnalysis = useMemo(() => {
    if (unicode === null) {
      return {
        unicode: 0,
        char: '',
        totalNodes: 0,
        totalContours: 0,
        contours: [],
        criticalNodeCount: 0,
        denseNodeCount: 0,
        moderateNodeCount: 0,
        optimalNodeCount: 0,
        overallDensityScore: 0,
        hotspots: [],
      };
    }
    return analyzeGlyphContourDensity(contours, unicode, char);
  }, [contours, unicode, char]);

  const notify = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(text, type);
    }
  };

  // Push previous contours to undo stack before mutation
  const pushUndo = (currentContours: PathContour[]) => {
    setUndoStack((prev) => [...prev.slice(-10), currentContours]);
  };

  // Handle single contour simplification
  const handleSimplifyContour = (contourIndex: number) => {
    if (!glyph || !glyph.contours || contourIndex < 0 || contourIndex >= glyph.contours.length || unicode === null) return;
    if (commitHistory) commitHistory();
    pushUndo(glyph.contours);

    const result = simplifySingleContourInGlyph(glyph.contours, contourIndex, tolerance);

    if (result.reducedCount > 0) {
      const updatedGlyph: GlyphData = {
        ...glyph,
        contours: result.updatedContours,
      };
      setProject((prev) => ({
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [unicode]: updatedGlyph,
        },
      }));

      const msg = `輪郭 #${contourIndex + 1} を単純化: ${result.beforeNodeCount} → ${result.afterNodeCount} ノード (${result.reducedCount}個削減)`;
      setLastActionMessage(msg);
      notify(msg, 'success');
      if (onRefreshQualityReport) onRefreshQualityReport();
    } else {
      notify(`輪郭 #${contourIndex + 1} はすでに最適なアンカー数です`, 'info');
    }
  };

  // Handle cluster simplification around clicked node
  const handleSimplifyNodeCluster = (node: NodeDensityInfo) => {
    if (!glyph || !glyph.contours || unicode === null) return;
    if (commitHistory) commitHistory();
    pushUndo(glyph.contours);

    const result = simplifyContourClusterInGlyph(glyph.contours, node.contourIndex, node.nodeIndex, 60, tolerance);

    if (result.reducedCount > 0) {
      const updatedGlyph: GlyphData = {
        ...glyph,
        contours: result.updatedContours,
      };
      setProject((prev) => ({
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [unicode]: updatedGlyph,
        },
      }));

      const msg = `ノード #${node.nodeIndex + 1} 周辺の密集クラスタを単純化: -${result.reducedCount} ノード削減`;
      setLastActionMessage(msg);
      notify(msg, 'success');
      setSelectedNode(null);
      if (onRefreshQualityReport) onRefreshQualityReport();
    } else {
      notify('指定ノード周辺はすでに最適化されています', 'info');
    }
  };

  // Handle simplify all dense contours in this glyph
  const handleSimplifyAllDense = () => {
    if (!glyph || !glyph.contours || glyph.contours.length === 0 || unicode === null) return;
    if (commitHistory) commitHistory();
    pushUndo(glyph.contours);

    const result = simplifyAllDenseContoursInGlyph(glyph.contours, tolerance, 30);

    if (result.reducedCount > 0) {
      const updatedGlyph: GlyphData = {
        ...glyph,
        contours: result.updatedContours,
      };
      setProject((prev) => ({
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [unicode]: updatedGlyph,
        },
      }));

      const msg = `文字「${char}」の過密輪郭を一括単純化: ${result.beforeNodeCount} → ${result.afterNodeCount} ノード (-${result.reducedCount}個 / -${result.reductionPercentage}%)`;
      setLastActionMessage(msg);
      notify(msg, 'success');
      if (onRefreshQualityReport) onRefreshQualityReport();
    } else {
      notify('過密な輪郭は見つかりませんでした（すでに最適化されています）', 'info');
    }
  };

  // Handle safe full glyph optimization
  const handleSafeOptimizeAll = () => {
    if (!glyph || !glyph.contours || glyph.contours.length === 0 || unicode === null) return;
    if (commitHistory) commitHistory();
    pushUndo(glyph.contours);

    const beforeCount = glyph.contours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
    const optimizedContours = safePreservingNodeOptimization(glyph.contours, {
      level: tolerance >= 5 ? 'strong' : tolerance <= 2 ? 'mild' : 'normal',
      preserveSharpCorners: true,
      maxBboxDeviation: 1.5,
    });
    const afterCount = optimizedContours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
    const reduced = beforeCount - afterCount;

    if (reduced > 0) {
      const updatedGlyph: GlyphData = {
        ...glyph,
        contours: optimizedContours,
      };
      setProject((prev) => ({
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [unicode]: updatedGlyph,
        },
      }));

      const msg = `文字「${char}」の形状を保護して最適化: ${beforeCount} → ${afterCount} ノード (-${reduced}個)`;
      setLastActionMessage(msg);
      notify(msg, 'success');
      if (onRefreshQualityReport) onRefreshQualityReport();
    } else {
      notify(`文字「${char}」はすでに直線・角が最適化されています`, 'info');
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (undoStack.length === 0 || !glyph || unicode === null) return;
    const prevContours = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    const updatedGlyph: GlyphData = {
      ...glyph,
      contours: prevContours,
    };
    setProject((prev) => ({
      ...prev,
      glyphs: {
        ...prev.glyphs,
        [unicode]: updatedGlyph,
      },
    }));

    notify('直前の単純化を取り消しました', 'info');
    setLastActionMessage('元に戻しました');
    if (onRefreshQualityReport) onRefreshQualityReport();
  };

  // Previous & Next Problematic Glyph Navigation
  const currentIndexInProblems = unicode !== null ? allProblemUnicodes.indexOf(unicode) : -1;
  const hasPrev = currentIndexInProblems > 0;
  const hasNext = currentIndexInProblems !== -1 && currentIndexInProblems < allProblemUnicodes.length - 1;

  const handlePrevGlyph = () => {
    if (hasPrev && onSelectUnicode) {
      onSelectUnicode(allProblemUnicodes[currentIndexInProblems - 1]);
      setSelectedContourIndex(null);
      setSelectedNode(null);
      setUndoStack([]);
    }
  };

  const handleNextGlyph = () => {
    if (hasNext && onSelectUnicode) {
      onSelectUnicode(allProblemUnicodes[currentIndexInProblems + 1]);
      setSelectedContourIndex(null);
      setSelectedNode(null);
      setUndoStack([]);
    }
  };

  // Keyboard shortcut listener for Density Heatmap Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedNode) {
          setSelectedNode(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSimplifyAllDense();
        return;
      }

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setTolerance(2.0);
          notify('単純化強度: 軽度 (2.0px) に設定しました', 'info');
        } else if (e.key === '2') {
          e.preventDefault();
          setTolerance(3.5);
          notify('単純化強度: 標準 (3.5px) に設定しました', 'info');
        } else if (e.key === '3') {
          e.preventDefault();
          setTolerance(5.0);
          notify('単純化強度: 強力 (5.0px) に設定しました', 'info');
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setShowHeatmapNodes((prev) => !prev);
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setShowHotspots((prev) => !prev);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          setShowMetricsGuides((prev) => !prev);
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setZoomLevel((z) => Math.min(3.0, Math.round(z * 1.25 * 10) / 10));
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoomLevel((z) => Math.max(0.4, Math.round((z / 1.25) * 10) / 10));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1.0);
        } else if (e.key === 'ArrowLeft') {
          if (hasPrev) {
            e.preventDefault();
            handlePrevGlyph();
          }
        } else if (e.key === 'ArrowRight') {
          if (hasNext) {
            e.preventDefault();
            handleNextGlyph();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    selectedNode,
    isFullscreen,
    onClose,
    handleUndo,
    handleSimplifyAllDense,
    hasPrev,
    hasNext,
    handlePrevGlyph,
    handleNextGlyph,
  ]);

  if (!isOpen || unicode === null) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 animate-fade-in ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-5'
    }`}>
      <div
        className={`w-full rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'h-full max-h-full rounded-none border-0' : 'max-w-6xl max-h-[94vh]'
        } ${
          isLight
            ? 'bg-stone-50 border-stone-300 text-stone-900 '
            : 'bg-[#101813] border-[#223528] text-emerald-50 '
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-[#142018] border-[#243a2b]'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold truncate">輪郭密度ヒートマップ診断 & 単純化</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  }`}
                >
                  {char} (U+{unicode.toString(16).toUpperCase()})
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                過剰なアンカー密度をヒートマップで視覚化し、クリックで局所または輪郭単位の単純化を即時適用できます
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Prev/Next Problem Glyphs Navigation */}
            {allProblemUnicodes.length > 1 && (
              <div className="flex items-center space-x-1 border rounded-lg p-0.5 border-stone-200 dark:border-[#2a4030]">
                <button
                  onClick={handlePrevGlyph}
                  disabled={!hasPrev}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    hasPrev
                      ? isLight
                        ? 'hover:bg-stone-100 text-stone-700'
                        : 'hover:bg-[#1e3023] text-emerald-200'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  title="前の過密文字へ"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] px-1 font-mono text-stone-500 dark:text-stone-400">
                  {currentIndexInProblems + 1}/{allProblemUnicodes.length}
                </span>
                <button
                  onClick={handleNextGlyph}
                  disabled={!hasNext}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    hasNext
                      ? isLight
                        ? 'hover:bg-stone-100 text-stone-700'
                        : 'hover:bg-[#1e3023] text-emerald-200'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  title="次の過密文字へ"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Jump to Canvas */}
            {onSelectGlyph && (
              <button
                onClick={() => {
                  onSelectGlyph(unicode);
                  onClose();
                }}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  isLight
                    ? 'bg-stone-100 border-stone-300 hover:bg-stone-200 text-stone-800'
                    : 'bg-[#1b2a20] border-[#2c4433] hover:bg-[#24392b] text-emerald-200'
                }`}
                title="通常のエディタキャンバスでこの文字を開く"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">エディタで開く</span>
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl transition-colors ${
                isLight ? 'hover:bg-stone-100 text-stone-600' : 'hover:bg-[#1b2b20] text-stone-400 hover:text-white'
              }`}
              title={isFullscreen ? '通常表示 (F)' : '全画面表示 (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isLight ? 'hover:bg-stone-100 text-stone-600' : 'hover:bg-[#1b2b20] text-stone-400 hover:text-white'
              }`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Tolerance Top Bar */}
        <HeatmapTopBar
          isLight={isLight}
          tolerance={tolerance}
          setTolerance={setTolerance}
          undoStackLength={undoStack.length}
          handleUndo={handleUndo}
          handleSimplifyAllDense={handleSimplifyAllDense}
          handleSafeOptimizeAll={handleSafeOptimizeAll}
        />

        {/* Modal Main Content: SVG Canvas + Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <HeatmapCanvasView
            isLight={isLight}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            showHeatmapNodes={showHeatmapNodes}
            setShowHeatmapNodes={setShowHeatmapNodes}
            showHotspots={showHotspots}
            setShowHotspots={setShowHotspots}
            showMetricsGuides={showMetricsGuides}
            setShowMetricsGuides={setShowMetricsGuides}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            selectedContourIndex={selectedContourIndex}
            setSelectedContourIndex={setSelectedContourIndex}
            hoveredContourIndex={hoveredContourIndex}
            setHoveredContourIndex={setHoveredContourIndex}
            contours={contours}
            densityAnalysis={densityAnalysis}
            handleSimplifyContour={handleSimplifyContour}
            handleSimplifyNodeCluster={handleSimplifyNodeCluster}
          />

          <HeatmapContourSidebar
            isLight={isLight}
            densityAnalysis={densityAnalysis}
            lastActionMessage={lastActionMessage}
            selectedContourIndex={selectedContourIndex}
            setSelectedContourIndex={setSelectedContourIndex}
            setHoveredContourIndex={setHoveredContourIndex}
            handleSimplifyContour={handleSimplifyContour}
          />
        </div>
      </div>
    </div>
  );
};
