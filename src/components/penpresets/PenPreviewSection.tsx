import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import { UserPenPreset, StrokePoint, BezierNode } from '../../types';
import { strokePointsToOutline, contoursToSvgPath } from '../../utils/pathUtils';

interface PenPreviewSectionProps {
  workingPreset: UserPenPreset;
  previewPattern: 'scurve' | 'straight' | 'loop';
  setPreviewPattern: (p: 'scurve' | 'straight' | 'loop') => void;
  showWireframe: boolean;
  setShowWireframe: (show: boolean | ((prev: boolean) => boolean)) => void;
  isLight: boolean;
}

export const PenPreviewSection: React.FC<PenPreviewSectionProps> = ({
  workingPreset,
  previewPattern,
  setPreviewPattern,
  showWireframe,
  setShowWireframe,
  isLight,
}) => {
  const previewData = useMemo<{ svgPath: string; nodes: BezierNode[] }>(() => {
    const pts: StrokePoint[] = [];
    const w = 600;
    const h = 130;
    const centerY = h / 2;
    const maxHalfW = Math.min(32, workingPreset.brushWidth * 0.45);

    if (previewPattern === 'straight') {
      const startX = 45;
      const endX = w - 45;
      const spanX = endX - startX;
      const numPoints = 90;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = startX + t * spanX;
        const y = centerY;
        const basePres = Math.sin(t * Math.PI);
        const pres =
          workingPreset.pressureSensitivity === 'off'
            ? 0.5
            : Math.max(0.06, Math.min(1.0, Math.pow(basePres, 0.82) * 0.95 + 0.05));
        pts.push({ x, y, pressure: pres, time: t * 1000 });
      }
    } else if (previewPattern === 'loop') {
      const cx = w / 2;
      const cy = centerY;
      const rx = 180;
      const ry = Math.max(16, Math.min(34, cy - maxHalfW - 10));
      const numPoints = 120;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const theta = t * Math.PI * 2;
        const denom = 1 + Math.sin(theta) * Math.sin(theta);
        const x = cx + (rx * Math.cos(theta)) / denom;
        const y = cy + (ry * Math.sin(theta) * Math.cos(theta) * 1.5) / denom;
        const pres =
          workingPreset.pressureSensitivity === 'off'
            ? 0.5
            : 0.35 + 0.55 * Math.sin(t * Math.PI);
        pts.push({ x, y, pressure: pres, time: t * 1500 });
      }
    } else {
      const startX = 40;
      const endX = w - 40;
      const spanX = endX - startX;
      const numPoints = 120;
      const amp = Math.max(10, Math.min(24, (centerY - maxHalfW - 12) * 0.72));

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x = startX + t * spanX;
        const y = centerY - Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2) * amp;
        const basePres = Math.sin(t * Math.PI);
        const pres =
          workingPreset.pressureSensitivity === 'off'
            ? 0.5
            : Math.max(0.06, Math.min(1.0, Math.pow(basePres, 0.85) * 0.95 + 0.05));

        pts.push({ x, y, pressure: pres, time: t * 1200 });
      }
    }

    const contour = strokePointsToOutline(
      pts,
      workingPreset.brushWidth,
      workingPreset.brushStyle,
      true,
      workingPreset.pressureSensitivity,
      workingPreset.pressureCurve,
      workingPreset.smoothingIntensity ?? 50,
      { customPreset: workingPreset, disableAutoStraight: true }
    );

    return {
      svgPath: contoursToSvgPath([contour]),
      nodes: contour.nodes || [],
    };
  }, [workingPreset, previewPattern]);

  return (
    <div className="p-2 sm:p-3 bg-stone-100/70 dark:bg-[#121c16]/90 border-b border-stone-200 dark:border-stone-800 shrink-0">
      <div className="relative w-full h-24 sm:h-28 md:h-32 rounded-lg overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-inner bg-stone-200/30 dark:bg-stone-900/40">
        {/* Checkerboard Pattern for Transparency Visibility */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="preview-checker" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#888888" />
              <rect x="8" y="8" width="8" height="8" fill="#888888" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#preview-checker)" />
        </svg>

        {/* Rendered Live Brush Path */}
        <svg
          viewBox="0 0 600 130"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          {previewData.svgPath && (
            <path
              d={previewData.svgPath}
              fill={isLight ? '#18181b' : '#f8fafc'}
            />
          )}
          {showWireframe && previewData.nodes.length > 0 && (
            <g className="pointer-events-none">
              <path
                d={previewData.svgPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.8}
              />
              {previewData.nodes.map((node) => (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={2}
                  fill="#38bdf8"
                />
              ))}
            </g>
          )}
        </svg>

        {/* Bottom-left preview metadata tag */}
        <div className="absolute bottom-2 left-3 flex items-center space-x-2 pointer-events-none">
          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-black/60 px-2 py-0.5 rounded">
            {workingPreset.name} · {workingPreset.brushWidth}px
          </span>
        </div>

        {/* Top-right pattern & wireframe controls */}
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white/85 dark:bg-stone-900/85 p-1 rounded-lg border border-stone-200/80 dark:border-stone-800 text-[11px]">
          <button
            type="button"
            onClick={() => setPreviewPattern('scurve')}
            className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              previewPattern === 'scurve'
                ? 'bg-emerald-500 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="S字カーブ（入り抜き・うねり・抑揚）"
          >
            S字
          </button>
          <button
            type="button"
            onClick={() => setPreviewPattern('straight')}
            className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              previewPattern === 'straight'
                ? 'bg-emerald-500 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="直線（純粋な入り抜き長さ・芯の太さ）"
          >
            直線
          </button>
          <button
            type="button"
            onClick={() => setPreviewPattern('loop')}
            className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              previewPattern === 'loop'
                ? 'bg-emerald-500 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="ループ（全方向の角度・扁平率・回転追従）"
          >
            ループ
          </button>

          <div className="h-3 w-px bg-stone-300 dark:bg-stone-700 mx-0.5" />

          <button
            type="button"
            onClick={() => setShowWireframe((prev) => !prev)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              showWireframe
                ? 'bg-sky-500 text-white'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
            title={showWireframe ? 'ベクター制御点を隠す' : 'ベクター制御点とワイヤーフレームを表示'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
