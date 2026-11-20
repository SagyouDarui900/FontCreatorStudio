import { PathContour, SnapGuideLine, GridSettings } from '../../types';
import { getContoursBoundingBox } from '../pathUtils';
import { MetricsTargets, CustomGuideTarget } from './types';

/**
 * Build all potential horizontal snap target lines
 */
export function getHorizontalSnapTargets(
  metrics: MetricsTargets,
  otherContours: PathContour[],
  customGuides: CustomGuideTarget[] = [],
  gridSettings?: GridSettings,
  currentContourNodes?: { id?: string; x: number; y: number }[],
  excludeNodeId?: string
): { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] {
  const targets: { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] = [];
  const upm = metrics.upm ?? 1000;

  // 1. Baseline (Highest priority)
  const baselineY = metrics.baseline ?? Math.round(upm * 0.8);
  targets.push({
    position: baselineY,
    name: `ベースライン (Y: ${Math.round(baselineY)})`,
    type: 'baseline',
    color: '#ef4444', // Red
    priority: 10,
  });

  // 2. Standard Font Metrics (Ascender, CapHeight, xHeight, Descender)
  if (metrics.ascender !== undefined) {
    targets.push({
      position: metrics.ascender,
      name: `アセンダー (Y: ${Math.round(metrics.ascender)})`,
      type: 'metric',
      color: '#3b82f6', // Blue
      priority: 9,
    });
  }

  if (metrics.capHeight !== undefined) {
    targets.push({
      position: metrics.capHeight,
      name: `キャップハイト (Y: ${Math.round(metrics.capHeight)})`,
      type: 'metric',
      color: '#3b82f6',
      priority: 8,
    });
  }

  if (metrics.xHeight !== undefined) {
    targets.push({
      position: metrics.xHeight,
      name: `エックスハイト (Y: ${Math.round(metrics.xHeight)})`,
      type: 'metric',
      color: '#3b82f6',
      priority: 7,
    });
  }

  if (metrics.descender !== undefined) {
    targets.push({
      position: metrics.descender,
      name: `ディセンダー (Y: ${Math.round(metrics.descender)})`,
      type: 'metric',
      color: '#ef4444',
      priority: 9,
    });
  }

  // 3. Japanese Virtual Body & Jizura Frames (仮想ボディ & 実字面 82%)
  const half = upm / 2;
  const jizuraTop = Math.round(upm * 0.09);
  const jizuraBottom = Math.round(upm * 0.91);
  const third1 = Number((upm / 3).toFixed(1));
  const third2 = Number(((upm * 2) / 3).toFixed(1));
  const quarter1 = upm / 4;
  const quarter3 = (upm * 3) / 4;
  const bodyTop = upm * 0.075;
  const bodyBottom = upm * 0.925;
  const kanaTop = upm * 0.11;
  const kanaBottom = upm * 0.89;

  targets.push(
    { position: 0, name: 'ボディ枠上端 (Y: 0)', type: 'metric', color: '#10b981', priority: 8 },
    { position: upm, name: `ボディ枠下端 (Y: ${upm})`, type: 'metric', color: '#10b981', priority: 8 },
    { position: jizuraTop, name: `字面枠上端 (Y: ${jizuraTop})`, type: 'metric', color: '#059669', priority: 8 },
    { position: jizuraBottom, name: `字面枠下端 (Y: ${jizuraBottom})`, type: 'metric', color: '#059669', priority: 8 }
  );

  // 4. Canvas Center (十文字中央ガイド)
  targets.push({
    position: half,
    name: `十文字中央ガイド (Y: ${half})`,
    type: 'center',
    color: '#06b6d4',
    priority: 8,
  });

  // 5. Same-contour node alignment (水平整列)
  if (currentContourNodes && currentContourNodes.length > 0) {
    const seenPositions = new Set<number>();
    for (const node of currentContourNodes) {
      if (node.id && node.id === excludeNodeId) continue;
      const roundedY = Math.round(node.y);
      if (!seenPositions.has(roundedY)) {
        seenPositions.add(roundedY);
        targets.push({
          position: node.y,
          name: `同パス頂点 (Y: ${roundedY})`,
          type: 'node',
          color: '#06b6d4',
          priority: 8,
        });
      }
    }
  }

  // 6. Japanese Guide Frames (田字格、九宮格、漢字枠、仮名枠)
  if (gridSettings?.japaneseGuide === 'jiugong') {
    targets.push(
      { position: third1, name: `九宮格 (Y: ${Math.round(third1)})`, type: 'metric', color: '#0284c7', priority: 6 },
      { position: third2, name: `九宮格 (Y: ${Math.round(third2)})`, type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.japaneseGuide === 'sixteen') {
    targets.push(
      { position: quarter1, name: `十六宮格 (Y: ${quarter1})`, type: 'metric', color: '#0284c7', priority: 6 },
      { position: quarter3, name: `十六宮格 (Y: ${quarter3})`, type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.showBodyFrame) {
    targets.push(
      { position: bodyTop, name: `漢字字面枠上端 (Y: ${bodyTop})`, type: 'metric', color: '#059669', priority: 6 },
      { position: bodyBottom, name: `漢字字面枠下端 (Y: ${bodyBottom})`, type: 'metric', color: '#059669', priority: 6 }
    );
  }
  if (gridSettings?.showKanaFrame) {
    targets.push(
      { position: kanaTop, name: `仮名枠上端 (Y: ${kanaTop})`, type: 'metric', color: '#d97706', priority: 6 },
      { position: kanaBottom, name: `仮名枠下端 (Y: ${kanaBottom})`, type: 'metric', color: '#d97706', priority: 6 }
    );
  }

  // 7. Custom User Horizontal Guidelines
  for (const guide of customGuides) {
    if (guide.type === 'h') {
      targets.push({
        position: guide.position,
        name: `ガイド (Y: ${Math.round(guide.position)})`,
        type: 'custom',
        color: '#06b6d4',
        priority: 7,
      });
    }
  }

  // 8. Bounding boxes & nodes of other contours
  for (let i = 0; i < otherContours.length; i++) {
    const contour = otherContours[i];
    const bbox = getContoursBoundingBox([contour]);
    if (bbox.width > 0 || bbox.height > 0) {
      targets.push({
        position: bbox.minY,
        name: `他パーツ上端 (Y: ${Math.round(bbox.minY)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 4,
      });
      targets.push({
        position: bbox.centerY,
        name: `他パーツ中央 (Y: ${Math.round(bbox.centerY)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 3,
      });
      targets.push({
        position: bbox.maxY,
        name: `他パーツ下端 (Y: ${Math.round(bbox.maxY)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 4,
      });
    }
  }

  return targets;
}

/**
 * Build all potential vertical snap target lines
 */
export function getVerticalSnapTargets(
  metrics: MetricsTargets,
  otherContours: PathContour[],
  customGuides: CustomGuideTarget[] = [],
  gridSettings?: GridSettings,
  currentContourNodes?: { id?: string; x: number; y: number }[],
  excludeNodeId?: string
): { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] {
  const targets: { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] = [];
  const upm = metrics.upm ?? 1000;
  const half = upm / 2;
  const jizuraLeft = Math.round(upm * 0.09);
  const jizuraRight = Math.round(upm * 0.91);
  const third1 = Number((upm / 3).toFixed(1));
  const third2 = Number(((upm * 2) / 3).toFixed(1));
  const quarter1 = upm / 4;
  const quarter3 = (upm * 3) / 4;
  const bodyLeft = upm * 0.075;
  const bodyRight = upm * 0.925;
  const kanaLeft = upm * 0.11;
  const kanaRight = upm * 0.89;

  // 1. LSB (Left Side Bearing - Highest priority for X)
  targets.push({
    position: metrics.lsb,
    name: `左余白 (LSB: ${Math.round(metrics.lsb)})`,
    type: 'lsb',
    color: '#10b981', // Bright emerald
    priority: 10,
  });

  // 2. RSB (Advance Width)
  targets.push({
    position: metrics.advanceWidth,
    name: `送り幅 (RSB: ${Math.round(metrics.advanceWidth)})`,
    type: 'rsb',
    color: '#10b981',
    priority: 9,
  });

  // 3. Japanese Virtual Body & Jizura Frames (仮想ボディ & 実字面 82%)
  targets.push(
    { position: 0, name: 'ボディ枠左端 (X: 0)', type: 'metric', color: '#10b981', priority: 8 },
    { position: upm, name: `ボディ枠右端 (X: ${upm})`, type: 'metric', color: '#10b981', priority: 8 },
    { position: jizuraLeft, name: `字面枠左端 (X: ${jizuraLeft})`, type: 'metric', color: '#059669', priority: 8 },
    { position: jizuraRight, name: `字面枠右端 (X: ${jizuraRight})`, type: 'metric', color: '#059669', priority: 8 }
  );

  // 4. Canvas Center (十文字中央ガイド)
  targets.push({
    position: half,
    name: `十文字中央ガイド (X: ${half})`,
    type: 'center',
    color: '#06b6d4',
    priority: 8,
  });

  // 5. Same-contour node alignment (垂直整列)
  if (currentContourNodes && currentContourNodes.length > 0) {
    const seenPositions = new Set<number>();
    for (const node of currentContourNodes) {
      if (node.id && node.id === excludeNodeId) continue;
      const roundedX = Math.round(node.x);
      if (!seenPositions.has(roundedX)) {
        seenPositions.add(roundedX);
        targets.push({
          position: node.x,
          name: `同パス頂点 (X: ${roundedX})`,
          type: 'node',
          color: '#06b6d4',
          priority: 8,
        });
      }
    }
  }

  // 6. Japanese Guide Frames (九宮格、十六宮格、縦分割ガイド、漢字枠、仮名枠)
  if (gridSettings?.japaneseGuide === 'jiugong' || gridSettings?.verticalGuide === 'thirds') {
    targets.push(
      { position: third1, name: `九宮格/3分割 (X: ${Math.round(third1)})`, type: 'metric', color: '#0284c7', priority: 6 },
      { position: third2, name: `九宮格/3分割 (X: ${Math.round(third2)})`, type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (
    gridSettings?.japaneseGuide === 'sixteen' ||
    gridSettings?.verticalGuide === 'quarters' ||
    gridSettings?.verticalGuide === 'eighths'
  ) {
    targets.push(
      { position: quarter1, name: `4分割 (X: ${quarter1})`, type: 'metric', color: '#0284c7', priority: 6 },
      { position: quarter3, name: `4分割 (X: ${quarter3})`, type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.verticalGuide === 'eighths') {
    const e1 = Number((upm / 8).toFixed(1));
    const e3 = Number(((upm * 3) / 8).toFixed(1));
    const e5 = Number(((upm * 5) / 8).toFixed(1));
    const e7 = Number(((upm * 7) / 8).toFixed(1));
    targets.push(
      { position: e1, name: `8分割 (X: ${e1})`, type: 'metric', color: '#7c3aed', priority: 5 },
      { position: e3, name: `8分割 (X: ${e3})`, type: 'metric', color: '#7c3aed', priority: 5 },
      { position: e5, name: `8分割 (X: ${e5})`, type: 'metric', color: '#7c3aed', priority: 5 },
      { position: e7, name: `8分割 (X: ${e7})`, type: 'metric', color: '#7c3aed', priority: 5 }
    );
  }
  if (gridSettings?.showBodyFrame) {
    targets.push(
      { position: bodyLeft, name: `漢字字面枠左端 (X: ${bodyLeft})`, type: 'metric', color: '#059669', priority: 6 },
      { position: bodyRight, name: `漢字字面枠右端 (X: ${bodyRight})`, type: 'metric', color: '#059669', priority: 6 }
    );
  }
  if (gridSettings?.showKanaFrame) {
    targets.push(
      { position: kanaLeft, name: `仮名枠左端 (X: ${kanaLeft})`, type: 'metric', color: '#d97706', priority: 6 },
      { position: kanaRight, name: `仮名枠右端 (X: ${kanaRight})`, type: 'metric', color: '#d97706', priority: 6 }
    );
  }

  // 5. Custom User Vertical Guidelines
  for (const guide of customGuides) {
    if (guide.type === 'v') {
      targets.push({
        position: guide.position,
        name: `ガイド (X: ${Math.round(guide.position)})`,
        type: 'custom',
        color: '#06b6d4',
        priority: 7,
      });
    }
  }

  // 6. Bounding boxes of other contours
  for (let i = 0; i < otherContours.length; i++) {
    const contour = otherContours[i];
    const bbox = getContoursBoundingBox([contour]);
    if (bbox.width > 0 || bbox.height > 0) {
      targets.push({
        position: bbox.minX,
        name: `他パーツ左端 (X: ${Math.round(bbox.minX)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 4,
      });
      targets.push({
        position: bbox.centerX,
        name: `他パーツ中央 (X: ${Math.round(bbox.centerX)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 3,
      });
      targets.push({
        position: bbox.maxX,
        name: `他パーツ右端 (X: ${Math.round(bbox.maxX)})`,
        type: 'contour',
        color: '#d946ef',
        priority: 4,
      });
    }
  }

  return targets;
}
