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
  gridSettings?: GridSettings
): { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] {
  const targets: { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] = [];

  // 1. Baseline (Highest priority)
  const baselineY = metrics.baseline ?? 800;
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
      priority: 8,
    });
  }

  if (metrics.capHeight !== undefined) {
    targets.push({
      position: metrics.capHeight,
      name: `キャップハイト (Y: ${Math.round(metrics.capHeight)})`,
      type: 'metric',
      color: '#3b82f6',
      priority: 7,
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
      priority: 8,
    });
  }

  // 3. Canvas Center (Y: 500)
  targets.push({
    position: 500,
    name: 'キャンバス中央 (Y: 500)',
    type: 'center',
    color: '#8b5cf6',
    priority: 5,
  });

  // 4. Japanese Guide Frames (田字格、九宮格、漢字枠、仮名枠)
  if (gridSettings?.japaneseGuide === 'tian' || gridSettings?.japaneseGuide === 'mi') {
    // 500 is already added
  }
  if (gridSettings?.japaneseGuide === 'jiugong') {
    targets.push(
      { position: 333.3, name: '九宮格 (Y: 333)', type: 'metric', color: '#0284c7', priority: 6 },
      { position: 666.7, name: '九宮格 (Y: 667)', type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.japaneseGuide === 'sixteen') {
    targets.push(
      { position: 250, name: '十六宮格 (Y: 250)', type: 'metric', color: '#0284c7', priority: 6 },
      { position: 750, name: '十六宮格 (Y: 750)', type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.showBodyFrame) {
    targets.push(
      { position: 75, name: '漢字字面枠上端 (Y: 75)', type: 'metric', color: '#059669', priority: 6 },
      { position: 925, name: '漢字字面枠下端 (Y: 925)', type: 'metric', color: '#059669', priority: 6 }
    );
  }
  if (gridSettings?.showKanaFrame) {
    targets.push(
      { position: 110, name: '仮名枠上端 (Y: 110)', type: 'metric', color: '#d97706', priority: 6 },
      { position: 890, name: '仮名枠下端 (Y: 890)', type: 'metric', color: '#d97706', priority: 6 }
    );
  }

  // 5. Custom User Horizontal Guidelines
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

  // 6. Bounding boxes & nodes of other contours
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
  gridSettings?: GridSettings
): { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] {
  const targets: { position: number; name: string; type: SnapGuideLine['targetType']; color: string; priority: number }[] = [];

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

  // 3. Canvas Center (X: 500)
  targets.push({
    position: 500,
    name: 'キャンバス中央 (X: 500)',
    type: 'center',
    color: '#8b5cf6',
    priority: 5,
  });

  // 4. Japanese Guide Frames (九宮格、十六宮格、縦分割ガイド、漢字枠、仮名枠)
  if (gridSettings?.japaneseGuide === 'jiugong' || gridSettings?.verticalGuide === 'thirds') {
    targets.push(
      { position: 333.3, name: '九宮格/3分割 (X: 333)', type: 'metric', color: '#0284c7', priority: 6 },
      { position: 666.7, name: '九宮格/3分割 (X: 667)', type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (
    gridSettings?.japaneseGuide === 'sixteen' ||
    gridSettings?.verticalGuide === 'quarters' ||
    gridSettings?.verticalGuide === 'eighths'
  ) {
    targets.push(
      { position: 250, name: '4分割 (X: 250)', type: 'metric', color: '#0284c7', priority: 6 },
      { position: 750, name: '4分割 (X: 750)', type: 'metric', color: '#0284c7', priority: 6 }
    );
  }
  if (gridSettings?.verticalGuide === 'eighths') {
    targets.push(
      { position: 125, name: '8分割 (X: 125)', type: 'metric', color: '#7c3aed', priority: 5 },
      { position: 375, name: '8分割 (X: 375)', type: 'metric', color: '#7c3aed', priority: 5 },
      { position: 625, name: '8分割 (X: 625)', type: 'metric', color: '#7c3aed', priority: 5 },
      { position: 875, name: '8分割 (X: 875)', type: 'metric', color: '#7c3aed', priority: 5 }
    );
  }
  if (gridSettings?.showBodyFrame) {
    targets.push(
      { position: 75, name: '漢字字面枠左端 (X: 75)', type: 'metric', color: '#059669', priority: 6 },
      { position: 925, name: '漢字字面枠右端 (X: 925)', type: 'metric', color: '#059669', priority: 6 }
    );
  }
  if (gridSettings?.showKanaFrame) {
    targets.push(
      { position: 110, name: '仮名枠左端 (X: 110)', type: 'metric', color: '#d97706', priority: 6 },
      { position: 890, name: '仮名枠右端 (X: 890)', type: 'metric', color: '#d97706', priority: 6 }
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
