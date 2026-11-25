import { PathContour, Point, BezierNode } from '../../types';
import {
  generateId,
  simplifyContour,
  smoothStrokeContour,
  optimizeContoursRedundantNodes,
} from '../pathUtils';
import {
  NodeDensityInfo,
  ContourDensityAnalysis,
  GlyphDensityAnalysis,
  ContourSimplificationResult,
} from './types';

export function analyzeGlyphContourDensity(
  contours: PathContour[],
  unicode: number = 0,
  char: string = ''
): GlyphDensityAnalysis {
  if (!contours || contours.length === 0) {
    return {
      unicode,
      char,
      totalNodes: 0,
      totalContours: 0,
      overallDensityScore: 0,
      criticalNodeCount: 0,
      denseNodeCount: 0,
      moderateNodeCount: 0,
      optimalNodeCount: 0,
      hotspots: [],
      contours: [],
    };
  }

  let totalNodes = 0;
  let totalCritical = 0;
  let totalDense = 0;
  let totalModerate = 0;
  let totalOptimal = 0;
  const rawHotspots: {
    x: number;
    y: number;
    contourIndex: number;
    nodeIndex: number;
    densityScore: number;
    level: 'dense' | 'critical';
  }[] = [];

  const analyzedContours: ContourDensityAnalysis[] = contours.map((contour, cIdx) => {
    const rawNodes = contour.nodes || [];
    const count = rawNodes.length;
    totalNodes += count;

    if (count === 0) {
      return {
        contourIndex: cIdx,
        contourId: contour.id || `c-${cIdx}`,
        nodeCount: 0,
        avgNodeDistance: 0,
        minNodeDistance: 0,
        maxNodeDistance: 0,
        densityScore: 0,
        criticalCount: 0,
        denseCount: 0,
        moderateCount: 0,
        optimalCount: 0,
        level: 'optimal',
        nodes: [],
        canSimplify: false,
        estimatedReduction: 0,
      };
    }

    let cDistSum = 0;
    let cMinDist = Infinity;
    let cMaxDist = 0;
    let cCrit = 0;
    let cDense = 0;
    let cMod = 0;
    let cOpt = 0;

    const nodeInfos: NodeDensityInfo[] = rawNodes.map((curr, nIdx) => {
      const prev = rawNodes[(nIdx - 1 + count) % count];
      const next = rawNodes[(nIdx + 1) % count];

      const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);
      const span = (dPrev + dNext) / 2;

      cDistSum += span;
      if (span < cMinDist) cMinDist = span;
      if (span > cMaxDist) cMaxDist = span;

      // 半径40em内の近傍ノード密集度チェック
      let clusterCount = 0;
      for (let j = 0; j < count; j++) {
        if (j === nIdx) continue;
        const other = rawNodes[j];
        if (Math.hypot(curr.x - other.x, curr.y - other.y) <= 40) {
          clusterCount++;
        }
      }

      // レベル判定とスコアリング (0: 疎〜100: 過密)
      let level: 'optimal' | 'moderate' | 'dense' | 'critical' = 'optimal';
      let densityScore = 15;
      let color = '#10b981'; // optimal: green

      if (span <= 14 || clusterCount >= 5) {
        level = 'critical';
        densityScore = Math.min(100, Math.round(90 + Math.max(0, 14 - span) * 0.7 + clusterCount * 2));
        color = '#ef4444'; // critical: red
        cCrit++;
      } else if (span <= 30 || clusterCount >= 3) {
        level = 'dense';
        densityScore = Math.min(88, Math.max(65, Math.round(68 + Math.max(0, 30 - span) * 0.6 + clusterCount * 2)));
        color = '#f97316'; // dense: orange
        cDense++;
      } else if (span <= 65) {
        level = 'moderate';
        densityScore = Math.min(64, Math.max(35, Math.round(35 + (65 - span) * 0.4)));
        color = '#eab308'; // moderate: yellow
        cMod++;
      } else {
        level = 'optimal';
        densityScore = Math.max(5, Math.round(30 - Math.min(25, span * 0.1)));
        color = '#10b981'; // optimal: green
        cOpt++;
      }

      const isHotspot = level === 'critical' || (level === 'dense' && clusterCount >= 2);
      if (isHotspot) {
        rawHotspots.push({
          x: curr.x,
          y: curr.y,
          contourIndex: cIdx,
          nodeIndex: nIdx,
          densityScore,
          level: level === 'critical' ? 'critical' : 'dense',
        });
      }

      return {
        nodeId: curr.id || `node-${cIdx}-${nIdx}`,
        contourIndex: cIdx,
        nodeIndex: nIdx,
        x: curr.x,
        y: curr.y,
        prevDist: Math.round(dPrev * 10) / 10,
        nextDist: Math.round(dNext * 10) / 10,
        span: Math.round(span * 10) / 10,
        clusterCount,
        densityScore,
        level,
        color,
        isHotspot,
      };
    });

    const avgDist = count > 0 ? Math.round((cDistSum / count) * 10) / 10 : 0;
    const contourDensityScore = count > 0
      ? Math.min(100, Math.round((cCrit * 100 + cDense * 70 + cMod * 35 + cOpt * 5) / count + (count > 40 ? Math.min(20, (count - 40) * 0.4) : 0)))
      : 0;

    let contourLevel: 'optimal' | 'moderate' | 'dense' | 'critical' = 'optimal';
    if (contourDensityScore >= 75 || cCrit >= 3) contourLevel = 'critical';
    else if (contourDensityScore >= 50 || cDense >= 3) contourLevel = 'dense';
    else if (contourDensityScore >= 28 || cMod >= count * 0.4) contourLevel = 'moderate';

    totalCritical += cCrit;
    totalDense += cDense;
    totalModerate += cMod;
    totalOptimal += cOpt;

    // 単純化による見込み削減ノード数
    const estimatedReduction = count > 6
      ? Math.max(0, Math.round(cCrit * 0.75 + cDense * 0.55 + cMod * 0.25))
      : 0;

    return {
      contourIndex: cIdx,
      contourId: contour.id || `c-${cIdx}`,
      nodeCount: count,
      avgNodeDistance: avgDist,
      minNodeDistance: cMinDist === Infinity ? 0 : Math.round(cMinDist * 10) / 10,
      maxNodeDistance: Math.round(cMaxDist * 10) / 10,
      densityScore: contourDensityScore,
      criticalCount: cCrit,
      denseCount: cDense,
      moderateCount: cMod,
      optimalCount: cOpt,
      level: contourLevel,
      nodes: nodeInfos,
      canSimplify: count > 5 && (cCrit > 0 || cDense > 0 || count > 30),
      estimatedReduction,
    };
  });

  // 近接ホットスポットの重複マージ
  const deduplicatedHotspots: GlyphDensityAnalysis['hotspots'] = [];
  rawHotspots.forEach((h) => {
    const exists = deduplicatedHotspots.some(
      (d) => Math.hypot(d.x - h.x, d.y - h.y) < 30
    );
    if (!exists) {
      deduplicatedHotspots.push(h);
    }
  });

  const overallScore = totalNodes > 0
    ? Math.min(100, Math.round((totalCritical * 100 + totalDense * 70 + totalModerate * 35 + totalOptimal * 5) / totalNodes + (totalNodes > 120 ? Math.min(25, (totalNodes - 120) * 0.3) : 0)))
    : 0;

  return {
    unicode,
    char,
    totalNodes,
    totalContours: contours.length,
    overallDensityScore: overallScore,
    criticalNodeCount: totalCritical,
    denseNodeCount: totalDense,
    moderateNodeCount: totalModerate,
    optimalNodeCount: totalOptimal,
    hotspots: deduplicatedHotspots,
    contours: analyzedContours,
  };
}

/**
 * 特定の1輪郭に対して、文字形状と角を保護しながら即時単純化を適用
 */
export function simplifySingleContourInGlyph(
  contours: PathContour[],
  contourIndex: number,
  tolerance: number = 3.5
): ContourSimplificationResult {
  if (!contours || contourIndex < 0 || contourIndex >= contours.length) {
    const total = contours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
    return {
      updatedContours: contours || [],
      beforeNodeCount: total,
      afterNodeCount: total,
      reducedCount: 0,
      reductionPercentage: 0,
      simplifiedContourIndices: [],
    };
  }

  const beforeTotal = contours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const target = contours[contourIndex];
  const targetBefore = target.nodes?.length || 0;

  if (targetBefore <= 4) {
    return {
      updatedContours: contours,
      beforeNodeCount: beforeTotal,
      afterNodeCount: beforeTotal,
      reducedCount: 0,
      reductionPercentage: 0,
      simplifiedContourIndices: [],
    };
  }

  // 1. まず角保護付き平滑化を実行
  let simplifiedTarget = smoothStrokeContour(target, {
    tolerance,
    level: tolerance >= 5 ? 'strong' : tolerance <= 2 ? 'mild' : 'standard',
    preserveCorners: true,
  }).contour;

  // 2. 冗長直線の最適化も適用
  const redundantClean = optimizeContoursRedundantNodes([simplifiedTarget], {
    level: 'normal',
    preserveSharpCorners: true,
  });
  if (redundantClean.contours.length > 0) {
    simplifiedTarget = redundantClean.contours[0];
  }

  // もし削減が不十分でノード数が依然として多すぎる場合はRDP法も併用
  if (simplifiedTarget.nodes.length > 25 && simplifiedTarget.nodes.length >= targetBefore * 0.85) {
    const rdpSimplified = simplifyContour(simplifiedTarget, tolerance * 1.2);
    if (rdpSimplified.nodes.length >= 4) {
      simplifiedTarget = rdpSimplified;
    }
  }

  const updatedContours = contours.map((c, idx) => (idx === contourIndex ? simplifiedTarget : c));
  const afterTotal = updatedContours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const reduced = beforeTotal - afterTotal;

  return {
    updatedContours,
    beforeNodeCount: beforeTotal,
    afterNodeCount: afterTotal,
    reducedCount: Math.max(0, reduced),
    reductionPercentage: beforeTotal > 0 ? Math.round((Math.max(0, reduced) / beforeTotal) * 100) : 0,
    simplifiedContourIndices: [contourIndex],
  };
}

/**
 * 密集ホットスポット周辺の局所ノード群をピンポイントで即時単純化
 *
 * nodeIndex を中心に、輪郭の順序に沿って radius 以内にあるノードだけを
 * 対象範囲として単純化する。範囲外のノードは位置も順序も変更しない。
 * 対象範囲が輪郭全体に及ぶ場合は全体単純化に委譲する。
 */
export function simplifyContourClusterInGlyph(
  contours: PathContour[],
  contourIndex: number,
  nodeIndex: number,
  radius: number = 60,
  tolerance: number = 4.0
): ContourSimplificationResult {
  const emptyResult = (): ContourSimplificationResult => {
    const total = (contours || []).reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
    return {
      updatedContours: contours || [],
      beforeNodeCount: total,
      afterNodeCount: total,
      reducedCount: 0,
      reductionPercentage: 0,
      simplifiedContourIndices: [],
    };
  };

  if (!contours || contourIndex < 0 || contourIndex >= contours.length) {
    return emptyResult();
  }

  const target = contours[contourIndex];
  const nodes = target.nodes || [];
  if (nodeIndex < 0 || nodeIndex >= nodes.length) {
    return emptyResult();
  }

  const beforeTotal = contours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const center = nodes[nodeIndex];
  const count = nodes.length;

  // nodeIndex を中心に、輪郭の順序に沿って radius 以内の連続範囲を求める。
  // 閉じた輪郭では端をまたいで広がる場合がある。
  const withinRadius = (idx: number) =>
    Math.hypot(nodes[idx].x - center.x, nodes[idx].y - center.y) <= radius;

  let startOffset = 0;
  while (startOffset + 1 < count) {
    const idx = target.closed
      ? (nodeIndex - startOffset - 1 + count) % count
      : nodeIndex - startOffset - 1;
    if (idx < 0 || !withinRadius(idx)) break;
    startOffset++;
  }
  let endOffset = 0;
  while (endOffset + 1 < count) {
    const idx = target.closed
      ? (nodeIndex + endOffset + 1) % count
      : nodeIndex + endOffset + 1;
    if (idx >= count || !withinRadius(idx)) break;
    endOffset++;
  }

  const windowLength = startOffset + 1 + endOffset;
  if (windowLength >= count) {
    // 対象範囲が輪郭全体に及ぶ場合は全体単純化と同じ結果になる。
    return simplifySingleContourInGlyph(contours, contourIndex, tolerance);
  }
  if (windowLength <= 4) {
    return emptyResult();
  }

  const startIndex = target.closed
    ? (nodeIndex - startOffset + count) % count
    : nodeIndex - startOffset;
  const windowIndices: number[] = [];
  for (let i = 0; i < windowLength; i++) {
    windowIndices.push(target.closed ? (startIndex + i) % count : startIndex + i);
  }
  const windowNodes = windowIndices.map((idx) => nodes[idx]);

  // 対象範囲だけを開いた部分輪郭として単純化する（全体単純化と同じ手順）。
  const subContour: PathContour = {
    ...target,
    nodes: [...windowNodes],
    closed: false,
  };
  let simplifiedSub = smoothStrokeContour(subContour, {
    tolerance,
    level: tolerance >= 5 ? 'strong' : tolerance <= 2 ? 'mild' : 'standard',
    preserveCorners: true,
  }).contour;

  const redundantClean = optimizeContoursRedundantNodes([simplifiedSub], {
    level: 'normal',
    preserveSharpCorners: true,
  });
  if (redundantClean.contours.length > 0) {
    simplifiedSub = redundantClean.contours[0];
  }

  if (simplifiedSub.nodes.length > 25 && simplifiedSub.nodes.length >= windowNodes.length * 0.85) {
    const rdpSimplified = simplifyContour(simplifiedSub, tolerance * 1.2);
    if (rdpSimplified.nodes.length >= 4) {
      simplifiedSub = rdpSimplified;
    }
  }

  const simplifiedNodes = simplifiedSub.nodes || [];
  // 削減が無い、または範囲が潰れる場合は変更しない。
  if (simplifiedNodes.length >= windowNodes.length || simplifiedNodes.length < 2) {
    return emptyResult();
  }

  // 範囲の両端を元のノード位置に固定し、範囲外との接続を保つ。
  simplifiedNodes[0] = { ...simplifiedNodes[0], x: windowNodes[0].x, y: windowNodes[0].y };
  const lastIdx = simplifiedNodes.length - 1;
  simplifiedNodes[lastIdx] = {
    ...simplifiedNodes[lastIdx],
    x: windowNodes[windowNodes.length - 1].x,
    y: windowNodes[windowNodes.length - 1].y,
  };

  // 範囲外のノードはそのまま残し、対象範囲だけを置き換える。
  let newNodes: BezierNode[];
  if (target.closed && startIndex + windowLength > count) {
    // 範囲が末尾と先頭にまたがる場合、残りの弧を範囲の後に続ける。
    const complement: BezierNode[] = [];
    for (let i = windowLength; i < count; i++) {
      complement.push(nodes[(startIndex + i) % count]);
    }
    newNodes = [...simplifiedNodes, ...complement];
  } else {
    newNodes = [
      ...nodes.slice(0, startIndex),
      ...simplifiedNodes,
      ...nodes.slice(startIndex + windowLength),
    ];
  }

  const updatedContour: PathContour = { ...target, nodes: newNodes };
  const updatedContours = contours.map((c, idx) => (idx === contourIndex ? updatedContour : c));
  const afterTotal = updatedContours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const reduced = beforeTotal - afterTotal;

  return {
    updatedContours,
    beforeNodeCount: beforeTotal,
    afterNodeCount: afterTotal,
    reducedCount: Math.max(0, reduced),
    reductionPercentage: beforeTotal > 0 ? Math.round((Math.max(0, reduced) / beforeTotal) * 100) : 0,
    simplifiedContourIndices: [contourIndex],
  };
}

/**
 * グリフ内の過密・高密度な輪郭を一括で即時単純化
 */
export function simplifyAllDenseContoursInGlyph(
  contours: PathContour[],
  tolerance: number = 3.5,
  minDensityScore: number = 35
): ContourSimplificationResult {
  if (!contours || contours.length === 0) {
    return {
      updatedContours: [],
      beforeNodeCount: 0,
      afterNodeCount: 0,
      reducedCount: 0,
      reductionPercentage: 0,
      simplifiedContourIndices: [],
    };
  }

  const beforeTotal = contours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const density = analyzeGlyphContourDensity(contours);
  const simplifiedIndices: number[] = [];

  const updatedContours = contours.map((contour, cIdx) => {
    const cAnalysis = density.contours[cIdx];
    const shouldSimplify = cAnalysis && (cAnalysis.densityScore >= minDensityScore || cAnalysis.criticalCount > 0 || cAnalysis.nodeCount > 35);

    if (shouldSimplify && contour.nodes && contour.nodes.length > 4) {
      simplifiedIndices.push(cIdx);
      let res = smoothStrokeContour(contour, {
        tolerance,
        level: tolerance >= 5 ? 'strong' : 'standard',
        preserveCorners: true,
      }).contour;

      const opt = optimizeContoursRedundantNodes([res], { level: 'normal', preserveSharpCorners: true });
      if (opt.contours.length > 0) res = opt.contours[0];
      return res;
    }
    return contour;
  });

  const afterTotal = updatedContours.reduce((sum, c) => sum + (c.nodes?.length || 0), 0);
  const reduced = beforeTotal - afterTotal;

  return {
    updatedContours,
    beforeNodeCount: beforeTotal,
    afterNodeCount: afterTotal,
    reducedCount: Math.max(0, reduced),
    reductionPercentage: beforeTotal > 0 ? Math.round((Math.max(0, reduced) / beforeTotal) * 100) : 0,
    simplifiedContourIndices: simplifiedIndices,
  };
}
