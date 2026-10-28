import { PathContour, Point, SnapGuideLine, GridSettings } from '../../types';
import { MetricsTargets, CustomGuideTarget, SnapMovementResult, SnapPointResult } from './types';
import { projectPointOntoLine } from './math';
import { getHorizontalSnapTargets, getVerticalSnapTargets } from './targets';

/**
 * Snap contour movement (dragging entire path) to Baseline, LSB, Metrics, and other contours
 */
export function snapContourMovement(
  initialBBox: { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number },
  rawDx: number,
  rawDy: number,
  otherContours: PathContour[],
  metrics: MetricsTargets,
  customGuides: CustomGuideTarget[] = [],
  threshold: number = 10,
  activeContourNodes?: { x: number; y: number }[],
  gridSettings?: GridSettings
): SnapMovementResult {
  const allowGuideSnap = gridSettings ? gridSettings.snapToGuides === true : true;
  const allowGridSnap = gridSettings ? gridSettings.snapToGrid === true : false;

  // If both guide snap and grid snap are disabled, return raw movement with zero snapping
  if (!allowGuideSnap && !allowGridSnap) {
    return { dx: rawDx, dy: rawDy, activeGuides: [] };
  }

  const hTargets = allowGuideSnap ? getHorizontalSnapTargets(metrics, otherContours, customGuides, gridSettings) : [];
  const vTargets = allowGuideSnap ? getVerticalSnapTargets(metrics, otherContours, customGuides, gridSettings) : [];

  const activeGuides: SnapGuideLine[] = [];

  // Current tentative positions with raw delta
  const curMinX = initialBBox.minX + rawDx;
  const curCenterX = initialBBox.centerX + rawDx;
  const curMaxX = initialBBox.maxX + rawDx;

  const curMinY = initialBBox.minY + rawDy;
  const curCenterY = initialBBox.centerY + rawDy;
  const curMaxY = initialBBox.maxY + rawDy;

  // --- Horizontal Snapping (Y-axis: Baseline, etc.) ---
  const ySources = [
    { pos: curMaxY, name: '下端', priority: 3 }, // Bottom edge (especially for baseline)
    { pos: curMinY, name: '上端', priority: 2 },
    { pos: curCenterY, name: '中央', priority: 1 },
  ];

  // Also include nodes if provided (up to 10 nodes to keep it fast)
  if (activeContourNodes && activeContourNodes.length > 0) {
    const sampledNodes = activeContourNodes.slice(0, 10);
    for (const node of sampledNodes) {
      ySources.push({ pos: node.y + rawDy, name: 'アンカー', priority: 2 });
    }
  }

  let bestSnapY: { delta: number; target: typeof hTargets[0]; source: typeof ySources[0]; score: number } | null = null;
  let minDiffY = threshold;

  for (const src of ySources) {
    for (const target of hTargets) {
      const diff = Math.abs(src.pos - target.position);
      if (diff <= threshold) {
        // Boost priority for baseline with bottom edge
        const isBaselineBottom = target.type === 'baseline' && src.name === '下端';
        // Priority gives a slight bonus (up to 4px) to favor key metrics when difference is similar
        const priorityBonus = (target.priority + src.priority + (isBaselineBottom ? 4 : 0)) * 0.3;
        const score = diff - priorityBonus;

        if (bestSnapY === null || score < bestSnapY.score) {
          bestSnapY = {
            delta: target.position - src.pos,
            target,
            source: src,
            score,
          };
          minDiffY = diff;
        }
      }
    }
  }

  // Check magnetic grid snap candidate
  let bestGridSnapY: { delta: number; nearestGridY: number; source: typeof ySources[0]; diff: number } | null = null;
  if (gridSettings?.snapToGrid && gridSettings.gridSize > 1) {
    const step = gridSettings.gridSize;
    for (const src of ySources) {
      const nearestGridY = Math.round(src.pos / step) * step;
      const diff = Math.abs(src.pos - nearestGridY);
      if (diff <= threshold) {
        if (bestGridSnapY === null || diff < bestGridSnapY.diff) {
          bestGridSnapY = {
            delta: nearestGridY - src.pos,
            nearestGridY,
            source: src,
            diff,
          };
        }
      }
    }
  }

  // Determine whether guide snap or grid snap wins for Y
  let finalDy = rawDy;
  // If snapToGrid is enabled, grid snap is chosen if no guide snap, or if grid snap is closer
  const useGridY = bestGridSnapY !== null && (bestSnapY === null || bestGridSnapY.diff < minDiffY - 1);

  if (useGridY && bestGridSnapY) {
    finalDy = rawDy + bestGridSnapY.delta;
    activeGuides.push({
      id: `snap-grid-h-${bestGridSnapY.nearestGridY}`,
      type: 'h',
      position: bestGridSnapY.nearestGridY,
      targetName: `グリッド線 (Y: ${bestGridSnapY.nearestGridY}) [${bestGridSnapY.source.name}吸着]`,
      targetType: 'grid',
      color: '#10b981',
      matchedSource: bestGridSnapY.source.name,
      snapPoint: { x: curCenterX, y: bestGridSnapY.nearestGridY },
    });
  } else if (bestSnapY) {
    finalDy = rawDy + bestSnapY.delta;
    activeGuides.push({
      id: `snap-h-${bestSnapY.target.type}-${bestSnapY.target.position}`,
      type: 'h',
      position: bestSnapY.target.position,
      targetName: `${bestSnapY.target.name} [${bestSnapY.source.name}吸着]`,
      targetType: bestSnapY.target.type,
      color: bestSnapY.target.color,
      matchedSource: bestSnapY.source.name,
      snapPoint: {
        x: curCenterX,
        y: bestSnapY.target.position,
      },
    });
  }

  // --- Vertical Snapping (X-axis: LSB, etc.) ---
  const xSources = [
    { pos: curMinX, name: '左端', priority: 3 }, // Left edge (especially for LSB)
    { pos: curCenterX, name: '中央', priority: 1 },
    { pos: curMaxX, name: '右端', priority: 2 },
  ];

  if (activeContourNodes && activeContourNodes.length > 0) {
    const sampledNodes = activeContourNodes.slice(0, 10);
    for (const node of sampledNodes) {
      xSources.push({ pos: node.x + rawDx, name: 'アンカー', priority: 2 });
    }
  }

  let bestSnapX: { delta: number; target: typeof vTargets[0]; source: typeof xSources[0]; score: number } | null = null;
  let minDiffX = threshold;

  for (const src of xSources) {
    for (const target of vTargets) {
      const diff = Math.abs(src.pos - target.position);
      if (diff <= threshold) {
        const isLsbLeft = target.type === 'lsb' && src.name === '左端';
        const priorityBonus = (target.priority + src.priority + (isLsbLeft ? 4 : 0)) * 0.3;
        const score = diff - priorityBonus;

        if (bestSnapX === null || score < bestSnapX.score) {
          bestSnapX = {
            delta: target.position - src.pos,
            target,
            source: src,
            score,
          };
          minDiffX = diff;
        }
      }
    }
  }

  // Check magnetic grid snap candidate for X
  let bestGridSnapX: { delta: number; nearestGridX: number; source: typeof xSources[0]; diff: number } | null = null;
  if (gridSettings?.snapToGrid && gridSettings.gridSize > 1) {
    const step = gridSettings.gridSize;
    for (const src of xSources) {
      const nearestGridX = Math.round(src.pos / step) * step;
      const diff = Math.abs(src.pos - nearestGridX);
      if (diff <= threshold) {
        if (bestGridSnapX === null || diff < bestGridSnapX.diff) {
          bestGridSnapX = {
            delta: nearestGridX - src.pos,
            nearestGridX,
            source: src,
            diff,
          };
        }
      }
    }
  }

  let finalDx = rawDx;
  const useGridX = bestGridSnapX !== null && (bestSnapX === null || bestGridSnapX.diff < minDiffX - 1);

  if (useGridX && bestGridSnapX) {
    finalDx = rawDx + bestGridSnapX.delta;
    activeGuides.push({
      id: `snap-grid-v-${bestGridSnapX.nearestGridX}`,
      type: 'v',
      position: bestGridSnapX.nearestGridX,
      targetName: `グリッド線 (X: ${bestGridSnapX.nearestGridX}) [${bestGridSnapX.source.name}吸着]`,
      targetType: 'grid',
      color: '#10b981',
      matchedSource: bestGridSnapX.source.name,
      snapPoint: { x: bestGridSnapX.nearestGridX, y: curCenterY + (finalDy - rawDy) },
    });
  } else if (bestSnapX) {
    finalDx = rawDx + bestSnapX.delta;
    activeGuides.push({
      id: `snap-v-${bestSnapX.target.type}-${bestSnapX.target.position}`,
      type: 'v',
      position: bestSnapX.target.position,
      targetName: `${bestSnapX.target.name} [${bestSnapX.source.name}吸着]`,
      targetType: bestSnapX.target.type,
      color: bestSnapX.target.color,
      matchedSource: bestSnapX.source.name,
      snapPoint: {
        x: bestSnapX.target.position,
        y: curCenterY + (finalDy - rawDy),
      },
    });
  }

  return {
    dx: Math.round(finalDx),
    dy: Math.round(finalDy),
    activeGuides,
  };
}

/**
 * Snap a single point (Node drag, Pen tool, Shape drawing) to Baseline, LSB, Metrics, Guides, and Grid
 */
export function snapSinglePoint(
  rawPos: Point,
  otherContours: PathContour[],
  metrics: MetricsTargets,
  customGuides: CustomGuideTarget[] = [],
  threshold: number = 10,
  gridSettings?: GridSettings
): SnapPointResult {
  const allowGuideSnap = gridSettings ? gridSettings.snapToGuides === true : true;
  const allowGridSnap = gridSettings ? gridSettings.snapToGrid === true : false;

  // If both guide snap and grid snap are disabled, return raw point directly with zero snapping
  if (!allowGuideSnap && !allowGridSnap) {
    return { point: { x: Math.round(rawPos.x), y: Math.round(rawPos.y) }, activeGuides: [] };
  }

  const hTargets = allowGuideSnap ? getHorizontalSnapTargets(metrics, otherContours, customGuides, gridSettings) : [];
  const vTargets = allowGuideSnap ? getVerticalSnapTargets(metrics, otherContours, customGuides, gridSettings) : [];

  const activeGuides: SnapGuideLine[] = [];

  // Y axis snap
  let snappedY = rawPos.y;
  let bestTargetY: typeof hTargets[0] | null = null;
  let minDiffY = threshold;

  for (const target of hTargets) {
    const diff = Math.abs(rawPos.y - target.position);
    if (diff <= minDiffY) {
      minDiffY = diff;
      bestTargetY = target;
    }
  }

  // Evaluate grid snap for Y
  let gridSnapY: number | null = null;
  let gridDiffY = threshold + 1;
  if (gridSettings?.snapToGrid && gridSettings.gridSize > 1) {
    const step = gridSettings.gridSize;
    const nearestGridY = Math.round(rawPos.y / step) * step;
    const diff = Math.abs(rawPos.y - nearestGridY);
    if (diff <= threshold) {
      gridSnapY = nearestGridY;
      gridDiffY = diff;
    }
  }

  // If snapToGrid is active, grid snap wins if it's closer than the nearest guide, or if guide is absent
  const useGridY = gridSnapY !== null && (bestTargetY === null || gridDiffY < minDiffY);

  if (useGridY && gridSnapY !== null) {
    snappedY = gridSnapY;
    activeGuides.push({
      id: `snap-pt-grid-h-${gridSnapY}`,
      type: 'h',
      position: gridSnapY,
      targetName: `グリッド線 (Y: ${gridSnapY})`,
      targetType: 'grid',
      color: '#10b981',
      snapPoint: { x: rawPos.x, y: gridSnapY },
    });
  } else if (bestTargetY) {
    snappedY = bestTargetY.position;
    activeGuides.push({
      id: `snap-pt-h-${bestTargetY.type}-${bestTargetY.position}`,
      type: 'h',
      position: bestTargetY.position,
      targetName: bestTargetY.name,
      targetType: bestTargetY.type,
      color: bestTargetY.color,
      snapPoint: { x: rawPos.x, y: bestTargetY.position },
    });
  }

  // X axis snap
  let snappedX = rawPos.x;
  let bestTargetX: typeof vTargets[0] | null = null;
  let minDiffX = threshold;

  for (const target of vTargets) {
    const diff = Math.abs(rawPos.x - target.position);
    if (diff <= minDiffX) {
      minDiffX = diff;
      bestTargetX = target;
    }
  }

  // Evaluate grid snap for X
  let gridSnapX: number | null = null;
  let gridDiffX = threshold + 1;
  if (gridSettings?.snapToGrid && gridSettings.gridSize > 1) {
    const step = gridSettings.gridSize;
    const nearestGridX = Math.round(rawPos.x / step) * step;
    const diff = Math.abs(rawPos.x - nearestGridX);
    if (diff <= threshold) {
      gridSnapX = nearestGridX;
      gridDiffX = diff;
    }
  }

  // If snapToGrid is active, grid snap wins if it's closer than the nearest guide, or if guide is absent
  const useGridX = gridSnapX !== null && (bestTargetX === null || gridDiffX < minDiffX);

  if (useGridX && gridSnapX !== null) {
    snappedX = gridSnapX;
    activeGuides.push({
      id: `snap-pt-grid-v-${gridSnapX}`,
      type: 'v',
      position: gridSnapX,
      targetName: `グリッド線 (X: ${gridSnapX})`,
      targetType: 'grid',
      color: '#10b981',
      snapPoint: { x: gridSnapX, y: snappedY },
    });
  } else if (bestTargetX) {
    snappedX = bestTargetX.position;
    activeGuides.push({
      id: `snap-pt-v-${bestTargetX.type}-${bestTargetX.position}`,
      type: 'v',
      position: bestTargetX.position,
      targetName: bestTargetX.name,
      targetType: bestTargetX.type,
      color: bestTargetX.color,
      snapPoint: { x: bestTargetX.position, y: snappedY },
    });
  }

  // Diagonal Guidelines snap evaluation
  if (allowGuideSnap) {
    let bestDiagGuide: CustomGuideTarget | null = null;
    let minDiagDist = threshold;
    let bestDiagProj: Point | null = null;

    for (const guide of customGuides) {
      if (guide.type === 'diagonal' && guide.p1) {
        const { projected, distance } = projectPointOntoLine(rawPos, guide.p1, guide.p2, guide.angle);
        if (distance <= minDiagDist) {
          minDiagDist = distance;
          bestDiagGuide = guide;
          bestDiagProj = projected;
        }
      }
    }

    if (bestDiagGuide && bestDiagProj) {
      const hasBothHV = (bestTargetX !== null || (useGridX && gridSnapX !== null)) && 
                        (bestTargetY !== null || (useGridY && gridSnapY !== null));
      if (!hasBothHV || minDiagDist < Math.min(minDiffX, minDiffY)) {
        snappedX = bestDiagProj.x;
        snappedY = bestDiagProj.y;
        activeGuides.push({
          id: `snap-pt-diag-${bestDiagGuide.id}`,
          type: 'diagonal',
          position: 0,
          targetName: bestDiagGuide.label || `斜めガイド (${Math.round(bestDiagGuide.angle ?? 0)}°)`,
          targetType: 'custom',
          color: bestDiagGuide.color || '#06b6d4',
          snapPoint: { x: snappedX, y: snappedY },
          p1: bestDiagGuide.p1,
          p2: bestDiagGuide.p2,
          angle: bestDiagGuide.angle,
        });
      }
    }
  }

  return {
    point: { x: Math.round(snappedX), y: Math.round(snappedY) },
    activeGuides,
  };
}
