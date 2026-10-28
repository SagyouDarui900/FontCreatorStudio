import { useCallback } from 'react';
import { FontProject } from '../../../types';
import {
  checkFontQuality,
  fixQualityIssue,
  batchFixQualityIssues,
  batchOptimizeProjectNodes,
  batchEqualizeProjectStrokes,
  batchOptimizeProjectExtrema,
  QualityIssue,
  QualityIssueType,
} from '../../../utils/qualityChecker';
import { runProjectDiagnostics, DiagnosticScope } from '../../../utils/projectDiagnostics';
import { QualityState } from './useQualityState';

interface UseQualityActionsProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onSelectGlyph?: (unicode: number) => void;
  onClose: () => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitHistory?: () => void;
  state: QualityState;
}

export function useQualityActions({
  project,
  setProject,
  onSelectGlyph,
  onClose,
  onShowToast,
  commitHistory,
  state,
}: UseQualityActionsProps) {
  const {
    setIsScanning,
    setReport,
    setIsDiagScanning,
    setDiagReport,
    diagScope,
    report,
    filteredIssues,
    optScope,
    optLevel,
    isOptimizing,
    setIsOptimizing,
    setLastOptimizationResult,
    eqScope,
    eqMode,
    eqStrength,
    isEqualizing,
    setIsEqualizing,
    setLastEqualizationResult,
    extScope,
    extSensitivity,
    extAlignAxis,
    isOptimizingExtrema,
    setIsOptimizingExtrema,
    setLastExtremaResult,
  } = state;

  const notify = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      if (onShowToast) {
        onShowToast(text, type);
      }
    },
    [onShowToast]
  );

  // Run or refresh quality scan
  const runScan = useCallback(
    (targetProject?: FontProject) => {
      setIsScanning(true);
      const proj = targetProject || project;
      setTimeout(() => {
        const rep = checkFontQuality(proj);
        setReport(rep);
        setIsScanning(false);
      }, 50);
    },
    [project, setIsScanning, setReport]
  );

  // Run project diagnostics
  const runDiagnostics = useCallback(
    (scope?: DiagnosticScope, targetProject?: FontProject) => {
      setIsDiagScanning(true);
      const targetScope = scope || diagScope;
      const proj = targetProject || project;
      setTimeout(() => {
        const rep = runProjectDiagnostics(proj, { scope: targetScope, includeCompletedInItems: true });
        setDiagReport(rep);
        setIsDiagScanning(false);
      }, 40);
    },
    [project, diagScope, setIsDiagScanning, setDiagReport]
  );

  // Single Fix
  const handleFixIssue = useCallback(
    (issue: QualityIssue) => {
      if (commitHistory) commitHistory();
      const res = fixQualityIssue(project, issue);
      if (res.success) {
        setProject(res.updatedProject);
        notify(res.message, 'success');
        runScan(res.updatedProject);
      } else {
        notify(res.message, 'error');
      }
    },
    [commitHistory, project, setProject, notify, runScan]
  );

  // Batch Fix by Type
  const handleBatchFix = useCallback(
    (type?: QualityIssueType) => {
      if (!report) return;
      if (commitHistory) commitHistory();
      const res = batchFixQualityIssues(project, report.issues, type);
      if (res.fixedCount > 0) {
        setProject(res.updatedProject);
        notify(`${res.fixedCount} 件の問題を一括修正しました`, 'success');
        runScan(res.updatedProject);
      } else {
        notify('自動修正可能な対象がありませんでした', 'info');
      }
    },
    [report, commitHistory, project, setProject, notify, runScan]
  );

  // Node Optimization
  const handleRunNodeOptimization = useCallback(() => {
    if (isOptimizing) return;
    setIsOptimizing(true);

    setTimeout(() => {
      try {
        if (commitHistory) commitHistory();

        let targetUnicodes: number[] | undefined = undefined;
        if (optScope === 'excessive') {
          const excIssues = (report?.issues || []).filter((i) => i.type === 'excessive_nodes');
          targetUnicodes = Array.from(new Set(excIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('過剰ノードとして指摘された文字はありません', 'info');
            setIsOptimizing(false);
            return;
          }
        } else if (optScope === 'filtered') {
          targetUnicodes = Array.from(new Set(filteredIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('現在表示されている文字がありません', 'info');
            setIsOptimizing(false);
            return;
          }
        }

        const res = batchOptimizeProjectNodes(project, targetUnicodes, {
          level: optLevel,
          preserveSharpCorners: true,
          maxBboxDeviation: 1.5,
        });

        setLastOptimizationResult(res);

        if (res.totalReducedNodes > 0) {
          setProject(res.updatedProject);
          notify(
            `${res.optimizedGlyphsCount} 文字の直線冗長ノード ${res.totalReducedNodes} 個を間引き、パスを滑らかに最適化しました（削減率: ${res.reductionPercentage}%）`,
            'success'
          );
          runScan(res.updatedProject);
        } else {
          notify('直線上の冗長ノードは見つかりませんでした（すでに最適化されています）', 'info');
        }
      } catch (err) {
        console.error('Node optimization error:', err);
        notify('ノード最適化処理中にエラーが発生しました', 'error');
      } finally {
        setIsOptimizing(false);
      }
    }, 50);
  }, [
    isOptimizing,
    setIsOptimizing,
    commitHistory,
    optScope,
    report?.issues,
    notify,
    filteredIssues,
    project,
    optLevel,
    setLastOptimizationResult,
    setProject,
    runScan,
  ]);

  // Single glyph node optimization
  const handleOptimizeSingleGlyph = useCallback(
    (unicode: number, char: string) => {
      if (commitHistory) commitHistory();
      const res = batchOptimizeProjectNodes(project, [unicode], {
        level: optLevel,
        preserveSharpCorners: true,
        maxBboxDeviation: 1.5,
      });

      if (res.totalReducedNodes > 0) {
        setProject(res.updatedProject);
        notify(
          `文字「${char}」の直線冗長ノード ${res.totalReducedNodes} 個を間引き、パスを滑らかに最適化しました`,
          'success'
        );
        runScan(res.updatedProject);
      } else {
        notify(`文字「${char}」には直線上の冗長ノードは見つかりませんでした`, 'info');
      }
    },
    [commitHistory, project, optLevel, setProject, notify, runScan]
  );

  // Stroke Equalization
  const handleRunStrokeEqualization = useCallback(() => {
    if (isEqualizing) return;
    setIsEqualizing(true);

    setTimeout(() => {
      try {
        if (commitHistory) commitHistory();

        let targetUnicodes: number[] | undefined = undefined;
        if (eqScope === 'uneven') {
          const unevenIssues = (report?.issues || []).filter((i) => i.type === 'uneven_stroke');
          targetUnicodes = Array.from(new Set(unevenIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('線幅の不均一として指摘された文字はありません', 'info');
            setIsEqualizing(false);
            return;
          }
        } else if (eqScope === 'filtered') {
          targetUnicodes = Array.from(new Set(filteredIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('現在表示されている文字がありません', 'info');
            setIsEqualizing(false);
            return;
          }
        }

        const res = batchEqualizeProjectStrokes(project, targetUnicodes, {
          mode: eqMode,
          strength: eqStrength,
          preserveSharpCorners: true,
        });

        setLastEqualizationResult(res);

        if (res.equalizedGlyphsCount > 0) {
          setProject(res.updatedProject);
          notify(
            `${res.equalizedGlyphsCount} 文字のストローク線幅を均一化しました (細線補強: ${res.totalThinFixed}箇所, 太線調整: ${res.totalThickFixed}箇所)`,
            'success'
          );
          runScan(res.updatedProject);
        } else {
          notify('線幅の調整対象は見つかりませんでした（すでに均一です）', 'info');
        }
      } catch (err) {
        console.error('Stroke equalization error:', err);
        notify('ストローク均一化処理中にエラーが発生しました', 'error');
      } finally {
        setIsEqualizing(false);
      }
    }, 50);
  }, [
    isEqualizing,
    setIsEqualizing,
    commitHistory,
    eqScope,
    report?.issues,
    notify,
    filteredIssues,
    project,
    eqMode,
    eqStrength,
    setLastEqualizationResult,
    setProject,
    runScan,
  ]);

  // Single glyph stroke equalization
  const handleEqualizeSingleGlyph = useCallback(
    (unicode: number, char: string) => {
      if (commitHistory) commitHistory();
      const res = batchEqualizeProjectStrokes(project, [unicode], {
        mode: eqMode,
        strength: eqStrength,
        preserveSharpCorners: true,
      });

      if (res.equalizedGlyphsCount > 0) {
        setProject(res.updatedProject);
        notify(
          `文字「${char}」のストローク線幅を均一化しました (補強: ${res.totalThinFixed}箇所, 調整: ${res.totalThickFixed}箇所)`,
          'success'
        );
        runScan(res.updatedProject);
      } else {
        notify(`文字「${char}」の線幅はすでにバランスが取れています`, 'info');
      }
    },
    [commitHistory, project, eqMode, eqStrength, setProject, notify, runScan]
  );

  // Extrema Optimization
  const handleRunExtremaOptimization = useCallback(() => {
    if (isOptimizingExtrema) return;
    setIsOptimizingExtrema(true);

    setTimeout(() => {
      try {
        if (commitHistory) commitHistory();

        let targetUnicodes: number[] | undefined = undefined;
        if (extScope === 'missing') {
          const missingIssues = (report?.issues || []).filter((i) => i.type === 'missing_extrema');
          targetUnicodes = Array.from(new Set(missingIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('極点ノードの不足として指摘された文字はありません', 'info');
            setIsOptimizingExtrema(false);
            return;
          }
        } else if (extScope === 'filtered') {
          targetUnicodes = Array.from(new Set(filteredIssues.map((i) => i.unicode)));
          if (targetUnicodes.length === 0) {
            notify('現在表示されている文字がありません', 'info');
            setIsOptimizingExtrema(false);
            return;
          }
        }

        const minDist = extSensitivity === 'strict' ? 8 : extSensitivity === 'fine' ? 3 : 5;
        const res = batchOptimizeProjectExtrema(project, targetUnicodes, {
          alignHandlesToAxis: extAlignAxis,
          minDistanceThreshold: minDist,
          minParameterThreshold: 0.03,
        });

        setLastExtremaResult(res);

        if (res.optimizedGlyphsCount > 0) {
          setProject(res.updatedProject);
          notify(
            `${res.optimizedGlyphsCount} 文字のベジェ曲線極点に合計 ${res.totalNodesAdded} 個のノードを追加・最適化しました`,
            'success'
          );
          runScan(res.updatedProject);
        } else {
          notify('極点ノードの追加対象は見つかりませんでした（すでに最適化されています）', 'info');
        }
      } catch (err) {
        console.error('Extrema optimization error:', err);
        notify('極点最適化処理中にエラーが発生しました', 'error');
      } finally {
        setIsOptimizingExtrema(false);
      }
    }, 50);
  }, [
    isOptimizingExtrema,
    setIsOptimizingExtrema,
    commitHistory,
    extScope,
    report?.issues,
    notify,
    filteredIssues,
    extSensitivity,
    project,
    extAlignAxis,
    setLastExtremaResult,
    setProject,
    runScan,
  ]);

  // Single glyph extrema optimization
  const handleOptimizeSingleGlyphExtrema = useCallback(
    (unicode: number, char: string) => {
      if (commitHistory) commitHistory();
      const minDist = extSensitivity === 'strict' ? 8 : extSensitivity === 'fine' ? 3 : 5;
      const res = batchOptimizeProjectExtrema(project, [unicode], {
        alignHandlesToAxis: extAlignAxis,
        minDistanceThreshold: minDist,
        minParameterThreshold: 0.03,
      });

      if (res.optimizedGlyphsCount > 0) {
        setProject(res.updatedProject);
        notify(
          `文字「${char}」のベジェ曲線極点にノードを ${res.totalNodesAdded} 箇所追加・最適化しました`,
          'success'
        );
        runScan(res.updatedProject);
      } else {
        notify(`文字「${char}」の極点ノードはすでに最適化されています`, 'info');
      }
    },
    [commitHistory, extSensitivity, project, extAlignAxis, setProject, notify, runScan]
  );

  // Jump to character in Canvas
  const handleGoToGlyph = useCallback(
    (unicode: number) => {
      if (onSelectGlyph) {
        onSelectGlyph(unicode);
        onClose();
      }
    },
    [onSelectGlyph, onClose]
  );

  return {
    notify,
    runScan,
    runDiagnostics,
    handleFixIssue,
    handleBatchFix,
    handleRunNodeOptimization,
    handleOptimizeSingleGlyph,
    handleRunStrokeEqualization,
    handleEqualizeSingleGlyph,
    handleRunExtremaOptimization,
    handleOptimizeSingleGlyphExtrema,
    handleGoToGlyph,
  };
}
