import { FontProject, PathContour } from '../../types';
import {
  getContoursBoundingBox,
  resolveContourOverlaps,
  unionContours,
  equalizeContoursStrokeWidth,
  optimizeContoursExtrema,
} from '../pathUtils';
import {
  QualityIssue,
  QualityIssueType,
} from './types';
import { safePreservingNodeOptimization } from './nodeOptimizer';
import { findContourIntersections } from './intersectionResolver';
import { DEFAULT_BASELINE_Y } from './checker';

export function fixQualityIssue(
  project: FontProject,
  issue: QualityIssue
): { updatedProject: FontProject; success: boolean; message: string } {
  const glyph = project.glyphs?.[issue.unicode];
  if (!glyph || !glyph.contours || glyph.contours.length === 0) {
    return { updatedProject: project, success: false, message: '対象グリフが存在しません' };
  }

  const updatedGlyphs = { ...project.glyphs };
  let newContours: PathContour[] = [...glyph.contours];

  let successMessage = `文字「${issue.char}」の「${issue.title}」を安全に修正しました`;

  switch (issue.autoFixType) {
    case 'remove_isolated': {
      newContours = newContours.filter((c) => c.nodes && c.nodes.length > 1);
      successMessage = `文字「${issue.char}」の無効な孤立頂点を安全に除去しました`;
      break;
    }

    case 'simplify_nodes': {
      // 文字の形・角・筆先・曲率を崩さない厳格な保護型最適化
      newContours = safePreservingNodeOptimization(newContours);
      successMessage = `文字「${issue.char}」の形状を崩さずに、過剰ノードを安全に最適化しました`;
      break;
    }

    case 'align_baseline': {
      const bbox = getContoursBoundingBox(newContours);
      const targetBaselineY = issue.details?.targetBaselineY ?? DEFAULT_BASELINE_Y;
      let deltaY = 0;

      if (issue.details?.deviationType === 'overflow_top') {
        deltaY = 30 - bbox.minY; // 上端がはみ出しているため下へ移動
        if (bbox.maxY + deltaY > 970) {
          deltaY = Math.max(0, 970 - bbox.maxY);
        }
      } else if (issue.details?.deviationType === 'overflow_bottom') {
        deltaY = 960 - bbox.maxY; // 下端が床を突き抜けているため上へ移動
        if (bbox.minY + deltaY < 30) {
          deltaY = 30 - bbox.minY;
        }
      } else {
        deltaY = targetBaselineY - bbox.maxY;
        // 文字の形・縦横比を一切変えず、位置のみを平行移動
        // 仮想ボディの上端 (Y=30) を突き抜けてクリッピングされないよう安全リミット
        if (bbox.minY + deltaY < 30) {
          deltaY = 30 - bbox.minY;
        }
        // 仮想ボディの下端 (Y=970) を突き抜けないよう安全リミット
        if (bbox.maxY + deltaY > 970) {
          deltaY = 970 - bbox.maxY;
        }
      }

      // 微小な差 (<= 2px) の場合は形を最優先して移動しない
      if (Math.abs(deltaY) <= 2) {
        return {
          updatedProject: project,
          success: true,
          message: `文字「${issue.char}」は許容範囲内のため位置を維持しました`,
        };
      }

      newContours = newContours.map((c) => ({
        ...c,
        nodes: (c.nodes || []).map((n) => ({
          ...n,
          y: Math.round(n.y + deltaY),
          handleIn: n.handleIn ? { ...n.handleIn, y: Math.round(n.handleIn.y + deltaY) } : null,
          handleOut: n.handleOut ? { ...n.handleOut, y: Math.round(n.handleOut.y + deltaY) } : null,
        })),
      }));
      successMessage = `文字「${issue.char}」の形状を維持したまま、ベースライン位置へ平行移動しました`;
      break;
    }

    case 'merge_intersection': {
      const resolved = resolveContourOverlaps(newContours);
      if (resolved && resolved.length > 0) {
        newContours = resolved;
        successMessage = `文字「${issue.char}」の一筆書き交差・重なり部分を自動結合し、白抜きを解消しました`;
      } else {
        return {
          updatedProject: project,
          success: false,
          message: `文字「${issue.char}」の交差結合処理に失敗しました`,
        };
      }
      break;
    }

    case 'equalize_strokes': {
      const eqResult = equalizeContoursStrokeWidth(newContours, {
        mode: 'balanced',
        strength: 0.65,
        preserveSharpCorners: true,
      });
      newContours = eqResult.contours;
      successMessage = `文字「${issue.char}」のストローク線幅を均一化しました (補強: ${eqResult.thinFixedCount}箇所, 調整: ${eqResult.thickFixedCount}箇所)`;
      break;
    }

    case 'optimize_extrema': {
      const extResult = optimizeContoursExtrema(newContours, {
        alignHandlesToAxis: true,
        minDistanceThreshold: 5,
      });
      newContours = extResult.contours;
      successMessage = `文字「${issue.char}」のベジェ曲線極点にノードを ${extResult.addedNodesCount} 箇所追加し、軸整列を完了しました`;
      break;
    }

    default:
      return { updatedProject: project, success: false, message: 'この問題の自動修正には対応していません' };
  }

  updatedGlyphs[issue.unicode] = {
    ...glyph,
    contours: newContours,
    modified: true,
  };

  return {
    updatedProject: {
      ...project,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    },
    success: true,
    message: successMessage,
  };
}

export function batchFixQualityIssues(
  project: FontProject,
  issues: QualityIssue[],
  filterType?: QualityIssueType
): { updatedProject: FontProject; fixedCount: number } {
  let currentProject = project;
  let fixedCount = 0;

  const targetIssues = filterType
    ? issues.filter((iss) => {
        if (!iss.canAutoFix) return false;
        if (filterType === 'excessive_nodes') {
          return iss.type === 'excessive_nodes' || iss.type === 'isolated_node';
        }
        return iss.type === filterType;
      })
    : issues.filter((iss) => iss.canAutoFix);

  // 同一文字に対して同一種類の修正が重複適用されないよう整理
  const appliedFixes = new Set<string>();

  for (const iss of targetIssues) {
    const fixKey = `${iss.unicode}:${iss.autoFixType || iss.type}`;
    if (appliedFixes.has(fixKey)) continue;
    appliedFixes.add(fixKey);

    const res = fixQualityIssue(currentProject, iss);
    if (res.success) {
      currentProject = res.updatedProject;
      fixedCount++;
    }
  }

  return {
    updatedProject: currentProject,
    fixedCount,
  };
}
