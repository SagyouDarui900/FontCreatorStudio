import React, { useRef } from 'react';
import { Sliders } from 'lucide-react';
import { PressureCurveConfig, PressureCurvePoint } from '../../types';
import { evaluatePressureCurve } from '../../utils/pathUtils';
import { DEFAULT_PRESSURE_CURVES } from '../../utils/presetData';
import { CURVE_PRESET_LABELS } from './constants';

interface PressureGraphProps {
  curveConfig: PressureCurveConfig;
  onChangeCurveConfig: (config: PressureCurveConfig) => void;
}

export const PressureGraph: React.FC<PressureGraphProps> = ({
  curveConfig,
  onChangeCurveConfig,
}) => {
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const draggingHandleRef = useRef<'p1' | 'p2' | null>(null);

  const graphMargin = 20;
  const graphW = 200;
  const graphH = 120;
  const p1: PressureCurvePoint = curveConfig.p1 || { x: 0.25, y: 0.1 };
  const p2: PressureCurvePoint = curveConfig.p2 || { x: 0.25, y: 1.0 };

  const curvePoints: { x: number; y: number }[] = [];
  const numSteps = 50;
  for (let i = 0; i <= numSteps; i++) {
    const rawX = i / numSteps;
    const evaluatedY = evaluatePressureCurve(rawX, curveConfig);
    const svgX = graphMargin + rawX * graphW;
    const svgY = graphMargin + (1.0 - evaluatedY) * graphH;
    curvePoints.push({ x: svgX, y: svgY });
  }

  const curveSvgPathD = curvePoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const p1SvgX = graphMargin + p1.x * graphW;
  const p1SvgY = graphMargin + (1.0 - p1.y) * graphH;
  const p2SvgX = graphMargin + p2.x * graphW;
  const p2SvgY = graphMargin + (1.0 - p2.y) * graphH;

  const handleGraphPointerDown = (handle: 'p1' | 'p2') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    draggingHandleRef.current = handle;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleGraphPointerMove = (e: React.PointerEvent) => {
    if (!draggingHandleRef.current || !graphSvgRef.current) return;
    const rect = graphSvgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const normX = Math.max(0.01, Math.min(0.99, (mouseX - graphMargin) / graphW));
    const normY = Math.max(0.0, Math.min(1.0, 1.0 - (mouseY - graphMargin) / graphH));

    const handle = draggingHandleRef.current;
    const newConfig: PressureCurveConfig = {
      ...curveConfig,
      enabled: true,
      presetId: 'custom',
      [handle]: { x: Math.round(normX * 100) / 100, y: Math.round(normY * 100) / 100 },
    };

    onChangeCurveConfig(newConfig);
  };

  const handleGraphPointerUp = (e: React.PointerEvent) => {
    if (!draggingHandleRef.current) return;
    draggingHandleRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  return (
    <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-500" />
          <span>筆圧カーブ調整 (Pressure Response Curve)</span>
        </span>
        <button
          type="button"
          onClick={() =>
            onChangeCurveConfig({
              ...curveConfig,
              enabled: !curveConfig.enabled,
            })
          }
          className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
            curveConfig.enabled
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
          }`}
        >
          {curveConfig.enabled ? 'カーブ有効' : 'カーブ無効 (リニア)'}
        </button>
      </div>

      {/* Preset Curves Selector */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {Object.entries(DEFAULT_PRESSURE_CURVES).map(([key, def]) => {
          const isSelected = curveConfig.presetId === key;
          const label = CURVE_PRESET_LABELS[key] || { name: key, desc: '' };
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeCurveConfig({ ...def, enabled: true })}
              className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 hover:border-stone-300'
              }`}
              title={label.desc}
            >
              <div
                className={`text-[11px] font-bold truncate ${
                  isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                {label.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Bezier Curve Graph */}
      <div className="pt-2 flex flex-col items-center">
        <div className="relative border border-stone-200 dark:border-stone-800 rounded-lg p-1 bg-white dark:bg-stone-950 shadow-inner">
          <svg
            ref={graphSvgRef}
            width={graphW + graphMargin * 2}
            height={graphH + graphMargin * 2}
            onPointerMove={handleGraphPointerMove}
            onPointerUp={handleGraphPointerUp}
            onPointerCancel={handleGraphPointerUp}
            className="touch-none select-none"
          >
            {/* Grid & Reference lines */}
            <line
              x1={graphMargin}
              y1={graphMargin + graphH}
              x2={graphMargin + graphW}
              y2={graphMargin}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            {/* Bezier Guide Handles */}
            <line
              x1={graphMargin}
              y1={graphMargin + graphH}
              x2={p1SvgX}
              y2={p1SvgY}
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              opacity={0.7}
            />
            <line
              x1={graphMargin + graphW}
              y1={graphMargin}
              x2={p2SvgX}
              y2={p2SvgY}
              stroke="#0284c7"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              opacity={0.7}
            />

            {/* Response Curve Path */}
            <path
              d={curveSvgPathD}
              fill="none"
              stroke="#10b981"
              strokeWidth={2.5}
            />

            {/* Draggable P1 Control Point */}
            <circle
              cx={p1SvgX}
              cy={p1SvgY}
              r={6}
              fill="#059669"
              stroke="#ffffff"
              strokeWidth={2}
              className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              onPointerDown={handleGraphPointerDown('p1')}
            />

            {/* Draggable P2 Control Point */}
            <circle
              cx={p2SvgX}
              cy={p2SvgY}
              r={6}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={2}
              className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              onPointerDown={handleGraphPointerDown('p2')}
            />
          </svg>
        </div>
        <div className="flex items-center justify-between w-full max-w-[240px] pt-1 text-[10px] text-stone-500">
          <span>0 (最弱筆圧)</span>
          <span>入力筆圧 → 出力太さ</span>
          <span>1.0 (最大筆圧)</span>
        </div>
      </div>
    </div>
  );
};
