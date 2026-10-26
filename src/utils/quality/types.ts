import { FontProject, Point, PathContour } from '../../types';

export type QualityIssueType =
  | 'duplicate_shape'
  | 'path_intersection'
  | 'excessive_nodes'
  | 'baseline_deviation'
  | 'uneven_stroke'
  | 'isolated_node'
  | 'extreme_bounds'
  | 'missing_extrema';

export type QualitySeverity = 'error' | 'warning' | 'info';

export interface QualityIssue {
  id: string;
  unicode: number;
  char: string;
  glyphName: string;
  type: QualityIssueType;
  severity: QualitySeverity;
  title: string;
  description: string;
  recommendation?: string;
  details?: {
    duplicateWithUnicode?: number;
    duplicateWithChar?: string;
    intersectionCount?: number;
    nodeCount?: number;
    maxContourNodes?: number;
    currentBaselineY?: number;
    targetBaselineY?: number;
    deviationPx?: number;
    deviationType?: 'floating' | 'dropped' | 'overflow_top' | 'overflow_bottom';
    intersectionPoints?: Point[];
    minStrokeWidth?: number;
    maxStrokeWidth?: number;
    medianStrokeWidth?: number;
    avgStrokeWidth?: number;
    stdDevStrokeWidth?: number;
    thinPoints?: Point[];
    thickPoints?: Point[];
    missingExtremaCount?: number;
    extremaPoints?: Point[];
    densityAnalysis?: GlyphDensityAnalysis;
  };
  canAutoFix: boolean;
  autoFixType?:
    | 'simplify_nodes'
    | 'align_baseline'
    | 'remove_isolated'
    | 'merge_intersection'
    | 'equalize_strokes'
    | 'optimize_extrema';
}

export interface FontQualityReport {
  timestamp: number;
  totalGlyphsChecked: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number; // 0 to 100
  categoryCounts: {
    duplicate_shape: number;
    path_intersection: number;
    excessive_nodes: number;
    baseline_deviation: number;
    uneven_stroke: number;
    missing_extrema: number;
    other: number;
  };
  issues: QualityIssue[];
}

export interface QualityCheckOptions {
  maxNodesPerContour?: number;
  maxNodesPerGlyph?: number;
  baselineY?: number;
  checkIntersections?: boolean;
  checkDuplicates?: boolean;
}

export interface NodeDensityInfo {
  nodeId: string;
  contourIndex: number;
  nodeIndex: number;
  x: number;
  y: number;
  prevDist: number;
  nextDist: number;
  span: number;
  clusterCount: number;
  densityScore: number; // 0 (最適・疎) 〜 100 (過剰・極度密集)
  level: 'optimal' | 'moderate' | 'dense' | 'critical';
  color: string;
  isHotspot: boolean;
}

export interface ContourDensityAnalysis {
  contourIndex: number;
  contourId: string;
  nodeCount: number;
  avgNodeDistance: number;
  minNodeDistance: number;
  maxNodeDistance: number;
  densityScore: number; // 0 〜 100
  criticalCount: number;
  denseCount: number;
  moderateCount: number;
  optimalCount: number;
  level: 'optimal' | 'moderate' | 'dense' | 'critical';
  nodes: NodeDensityInfo[];
  canSimplify: boolean;
  estimatedReduction: number;
}

export interface GlyphDensityAnalysis {
  unicode: number;
  char: string;
  totalNodes: number;
  totalContours: number;
  overallDensityScore: number; // 0 〜 100
  criticalNodeCount: number;
  denseNodeCount: number;
  moderateNodeCount: number;
  optimalNodeCount: number;
  hotspots: {
    x: number;
    y: number;
    contourIndex: number;
    nodeIndex: number;
    densityScore: number;
    level: 'dense' | 'critical';
  }[];
  contours: ContourDensityAnalysis[];
}

export interface ContourSimplificationResult {
  updatedContours: PathContour[];
  beforeNodeCount: number;
  afterNodeCount: number;
  reducedCount: number;
  reductionPercentage: number;
  simplifiedContourIndices: number[];
}

export interface BatchNodeOptimizationResult {
  updatedProject: FontProject;
  processedGlyphsCount: number;
  optimizedGlyphsCount: number;
  totalOriginalNodes: number;
  totalOptimizedNodes: number;
  totalReducedNodes: number;
  reductionPercentage: number;
  details: {
    unicode: number;
    char: string;
    originalNodes: number;
    optimizedNodes: number;
    reduced: number;
  }[];
}

export interface BatchStrokeEqualizationDetail {
  unicode: number;
  char: string;
  originalMin: number;
  originalMax: number;
  newMin: number;
  newMax: number;
  thinFixed: number;
  thickFixed: number;
}

export interface BatchStrokeEqualizationResult {
  updatedProject: FontProject;
  processedGlyphsCount: number;
  equalizedGlyphsCount: number;
  totalThinFixed: number;
  totalThickFixed: number;
  details: BatchStrokeEqualizationDetail[];
}

export interface BatchExtremaOptimizationDetail {
  unicode: number;
  char: string;
  missingBefore: number;
  missingAfter: number;
  nodesAdded: number;
}

export interface BatchExtremaOptimizationResult {
  updatedProject: FontProject;
  processedGlyphsCount: number;
  optimizedGlyphsCount: number;
  totalNodesAdded: number;
  details: BatchExtremaOptimizationDetail[];
}

export interface BatchResolveIntersectionsResult {
  updatedProject: FontProject;
  processedGlyphsCount: number;
  resolvedGlyphsCount: number;
}
