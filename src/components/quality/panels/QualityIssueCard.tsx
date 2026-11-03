import React from 'react';
import {
  Scale,
  Compass,
  Sparkles,
  Wand2,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { FontProject, Point } from '../../../types';
import {
  contoursToSvgPath,
  normalizeGlyphContoursWinding,
} from '../../../utils/pathUtils';
import { QualityIssue } from '../types';

interface QualityIssueCardProps {
  issue: QualityIssue;
  project: FontProject;
  isLight: boolean;
  onFixIssue: (issue: QualityIssue) => void;
  onGoToGlyph: (unicode: number) => void;
  onOpenHeatmap: (unicode: number) => void;
}

export const QualityIssueCard: React.FC<QualityIssueCardProps> = ({
  issue,
  project,
  isLight,
  onFixIssue,
  onGoToGlyph,
  onOpenHeatmap,
}) => {
  const glyphData = project.glyphs?.[issue.unicode];
  const contours = glyphData?.contours || [];
  const svgPath = contoursToSvgPath(normalizeGlyphContoursWinding(contours));

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row gap-4 transition-all ${
        isLight
          ? 'bg-white border-stone-200 hover:border-stone-300'
          : 'bg-[#162119] border-[#25362b] hover:border-stone-700'
      }`}
    >
      {/* Glyph Preview Tile */}
      <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-2 shrink-0">
        <div
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border overflow-hidden flex items-center justify-center ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#0f1611] border-[#223025]'
          }`}
        >
          {/* Grid / Metrics Guide Overlay */}
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full pointer-events-none absolute inset-0"
          >
            {/* Baseline Guide (Y = 800) */}
            <line
              x1="0"
              y1="800"
              x2="1000"
              y2="800"
              stroke={isLight ? '#ef4444' : '#f87171'}
              strokeWidth="12"
              strokeDasharray="24 24"
              opacity="0.65"
            />
            {/* Ascender / Descender Lines */}
            <line
              x1="0"
              y1="200"
              x2="1000"
              y2="200"
              stroke={isLight ? '#94a3b8' : '#475569'}
              strokeWidth="8"
              strokeDasharray="16 16"
              opacity="0.4"
            />
            {/* Render Glyph Contour Path */}
            {svgPath && (
              <path
                d={svgPath}
                fill={isLight ? '#1c1917' : '#ecfdf5'}
                fillRule="nonzero"
              />
            )}
            {/* Intersection Marker Points */}
            {issue.details?.intersectionPoints?.map((pt: Point, pIdx: number) => (
              <circle
                key={pIdx}
                cx={pt.x}
                cy={pt.y}
                r="32"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="8"
              />
            ))}
            {/* Thin stroke marker points */}
            {issue.details?.thinPoints?.map((pt: Point, pIdx: number) => (
              <circle
                key={`thin-${pIdx}`}
                cx={pt.x}
                cy={pt.y}
                r="28"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="6"
              />
            ))}
            {/* Thick stroke marker points */}
            {issue.details?.thickPoints?.map((pt: Point, pIdx: number) => (
              <circle
                key={`thick-${pIdx}`}
                cx={pt.x}
                cy={pt.y}
                r="28"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="6"
              />
            ))}
            {/* Extrema marker points */}
            {issue.details?.extremaPoints?.map((pt: Point, pIdx: number) => (
              <g key={`ext-${pIdx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="26"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="6"
                />
                <line
                  x1={pt.x - 14}
                  y1={pt.y}
                  x2={pt.x + 14}
                  y2={pt.y}
                  stroke="#ffffff"
                  strokeWidth="4"
                />
                <line
                  x1={pt.x}
                  y1={pt.y - 14}
                  x2={pt.x}
                  y2={pt.y + 14}
                  stroke="#ffffff"
                  strokeWidth="4"
                />
              </g>
            ))}
            {/* Excessive Nodes / Density Heatmap Dots in Mini Preview */}
            {issue.type === 'excessive_nodes' && issue.details?.densityAnalysis && (
              <g>
                {issue.details.densityAnalysis.contours.flatMap((c: any) =>
                  c.nodes.map((n: any, nIdx: number) => (
                    <circle
                      key={`dn-${c.contourIndex}-${nIdx}`}
                      cx={n.x}
                      cy={n.y}
                      r={n.level === 'critical' ? 24 : n.level === 'dense' ? 18 : 12}
                      fill={n.color}
                      opacity={n.level === 'optimal' ? 0.6 : 0.95}
                    />
                  ))
                )}
              </g>
            )}
          </svg>
        </div>

        <div className="text-center sm:w-20">
          <div className="text-xs font-bold truncate">{issue.char}</div>
          <div className="text-[10px] text-stone-400 font-mono">
            U+{issue.unicode.toString(16).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Issue Information Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Severity Badge */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              issue.severity === 'error'
                ? isLight
                  ? 'bg-rose-100 text-rose-900 border-rose-200'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
                : issue.severity === 'warning'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
                : isLight
                ? 'bg-sky-100 text-sky-900 border-sky-200'
                : 'bg-sky-950 text-sky-300 border-sky-800'
            }`}
          >
            {issue.severity === 'error'
              ? 'エラー'
              : issue.severity === 'warning'
              ? '警告'
              : '情報'}
          </span>

          {/* Issue Category Pill */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              isLight
                ? 'bg-stone-100 text-stone-700 border-stone-200'
                : 'bg-[#1e2a21] text-stone-300 border-[#25362b]'
            }`}
          >
            {issue.type === 'duplicate_shape'
              ? '字形の重複'
              : issue.type === 'path_intersection'
              ? 'パス交差'
              : issue.type === 'excessive_nodes'
              ? '過剰ノード数'
              : issue.type === 'missing_extrema'
              ? '極点ノード不足'
              : issue.type === 'uneven_stroke'
              ? '線幅の偏り'
              : issue.type === 'baseline_deviation'
              ? 'ベースライン逸脱'
              : issue.type === 'isolated_node'
              ? '孤立頂点'
              : '境界逸脱'}
          </span>

          {/* Issue Title */}
          <h4 className="text-xs font-bold text-stone-900 dark:text-white">
            {issue.title}
          </h4>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          {issue.description}
        </p>

        {/* Density Heatmap Statistics details if excessive_nodes */}
        {issue.type === 'excessive_nodes' && issue.details?.densityAnalysis && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
            <div
              className={`px-2 py-1 rounded-md border font-mono flex items-center gap-1.5 ${
                isLight
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>総アンカー: <strong>{issue.details.nodeCount || 0}個</strong></span>
              <span className="text-stone-300 dark:text-stone-600">/</span>
              <span>
                過密箇所: <strong className="text-rose-500 font-bold">{issue.details.densityAnalysis.criticalNodeCount}点</strong>
              </span>
              <span className="text-stone-300 dark:text-stone-600">/</span>
              <span>単一輪郭最大: <strong>{issue.details.maxContourNodes}点</strong></span>
            </div>
          </div>
        )}

        {/* Stroke Width Stats details if available */}
        {issue.details?.minStrokeWidth !== undefined && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
            <div
              className={`px-2 py-1 rounded-md border font-mono flex items-center gap-1.5 ${
                isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-700'
                  : 'bg-[#101912] border-[#223326] text-emerald-200'
              }`}
            >
              <Scale className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>
                最小: <strong className="text-amber-600 dark:text-amber-400">{issue.details.minStrokeWidth}px</strong>
              </span>
              <span className="text-stone-300 dark:text-stone-600">/</span>
              <span>
                中央値: <strong>{issue.details.medianStrokeWidth}px</strong>
              </span>
              <span className="text-stone-300 dark:text-stone-600">/</span>
              <span>
                最大: <strong className="text-purple-600 dark:text-purple-400">{issue.details.maxStrokeWidth}px</strong>
              </span>
            </div>
          </div>
        )}

        {issue.recommendation && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#111913] p-2 rounded-lg border border-stone-200/60 dark:border-[#223025]">
            <span className="font-bold text-stone-700 dark:text-stone-300">改善指針: </span>
            {issue.recommendation}
          </p>
        )}
      </div>

      {/* Actions Column */}
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-[#223025]">
        {/* Primary Auto-Fix Action */}
        {issue.canAutoFix && (
          <button
            onClick={() => onFixIssue(issue)}
            title="輪郭の重なりや極点を自動修正します"
            className={`w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              issue.autoFixType === 'merge_intersection'
                ? isLight
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500'
                : issue.autoFixType === 'optimize_extrema'
                ? isLight
                  ? 'bg-cyan-700 hover:bg-cyan-800 text-white border border-cyan-800'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500'
                : isLight
                ? 'bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-800'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500'
            }`}
          >
            {issue.autoFixType === 'equalize_strokes' ? (
              <>
                <Scale className="w-3.5 h-3.5" />
                <span>線幅を均一化</span>
              </>
            ) : issue.autoFixType === 'optimize_extrema' ? (
              <>
                <Compass className="w-3.5 h-3.5" />
                <span>極点を最適化</span>
              </>
            ) : issue.autoFixType === 'merge_intersection' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>白抜きを解消</span>
              </>
            ) : issue.autoFixType === 'simplify_nodes' ? (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>ノード間引き</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>自動修正</span>
              </>
            )}
          </button>
        )}

        {/* Density Heatmap Modal Button if excessive nodes */}
        {issue.type === 'excessive_nodes' && (
          <button
            onClick={() => onOpenHeatmap(issue.unicode)}
            title="この文字の輪郭密度ヒートマップを開き、過密アンカー箇所を可視化してクリックで即時単純化します"
            className={`w-full sm:w-auto px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors border shrink-0 cursor-pointer ${
              isLight
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>ヒートマップ診断</span>
          </button>
        )}

        {/* Open in Canvas button */}
        <button
          onClick={() => onGoToGlyph(issue.unicode)}
          className={`w-full sm:w-auto px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors border shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              : 'bg-[#1b261f] border-[#25362b] text-emerald-200 hover:bg-[#233329]'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>キャンバスで開く</span>
        </button>
      </div>
    </div>
  );
};
