import { Point, SnapGuideLine, GridSettings } from '../../types';

export interface MetricsTargets {
  lsb: number;
  advanceWidth: number;
  baseline?: number; // 800
  ascender?: number; // 200
  capHeight?: number; // 300
  xHeight?: number; // 500
  descender?: number; // 1000
}

export interface CustomGuideTarget {
  id: string;
  type: 'h' | 'v' | 'diagonal';
  position: number;
  p1?: Point;
  p2?: Point;
  angle?: number;
  label?: string;
  color?: string;
}

export interface SnapOptions {
  gridSettings?: GridSettings;
  strictGridSnap?: boolean; // When shift is held or strict mode is desired
}

export interface SnapMovementResult {
  dx: number;
  dy: number;
  activeGuides: SnapGuideLine[];
}

export interface SnapPointResult {
  point: Point;
  activeGuides: SnapGuideLine[];
}
