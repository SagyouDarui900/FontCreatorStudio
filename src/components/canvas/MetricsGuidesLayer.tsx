import React from 'react';
import { resolveCanvasMetrics } from '../../utils/font/constants';

interface MetricsGuidesLayerProps {
  showMetrics: boolean;
  lsb: number;
  advanceWidth: number;
  activeChar?: string;
  isLight?: boolean;
  showVerticalCenter?: boolean;
  gridOpacity?: number;
  unitsPerEm?: number;
  ascender?: number;
  descender?: number;
  capHeight?: number;
  xHeight?: number;
  zoom?: number;
}

export const MetricsGuidesLayer: React.FC<MetricsGuidesLayerProps> = React.memo(
  ({
    showMetrics,
    lsb,
    advanceWidth,
    activeChar = '',
    isLight = true,
    showVerticalCenter = true,
    gridOpacity = 30,
    unitsPerEm = 1000,
    ascender,
    descender,
    capHeight,
    xHeight,
    zoom = 1,
  }) => {
    if (!showMetrics) return null;

    const z = zoom && zoom > 0 ? zoom : 1;
    const { upm, baselineY, ascenderY, capHeightY, xHeightY, descenderY } =
      resolveCanvasMetrics({ unitsPerEm, ascender, descender, capHeight, xHeight }, unitsPerEm);
    const isKana = /[ぁ-んァ-ヶー]/.test(activeChar);
    const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(activeChar);
    const isJapanese = isKana || isKanji;

    const opacityScale = Math.min(1.2, Math.max(0.2, (gridOpacity ?? 30) / 45));

    // When drafting Japanese characters, dim Western-specific metrics to avoid visual confusion
    const latinMetricsOpacity = (isJapanese ? 0.25 : 0.65) * opacityScale;

    const centerX = upm / 2;
    const verticalTopY = Math.min(0, ascenderY);
    const verticalBottomY = Math.max(upm, descenderY);
    const ascenderLabelY = ascenderY <= 20 ? ascenderY + 14 / z : ascenderY - 8 / z;

    return (
      <g className="metrics-guides-layer select-none font-mono text-[11px] pointer-events-none">
        {/* Ascender - Distinct long-dash pattern (10 4) */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={ascenderY}
            x2={Math.max(upm, advanceWidth)}
            y2={ascenderY}
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={2.8}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="10 4"
            strokeOpacity={0.6}
          />
          <line
            x1={0}
            y1={ascenderY}
            x2={Math.max(upm, advanceWidth)}
            y2={ascenderY}
            stroke="#3b82f6"
            strokeWidth={1.3}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="10 4"
          />
          <text
            fontSize={11 / z}
            x={12 / z}
            y={ascenderLabelY}
            fill="#3b82f6"
            fontWeight="bold"
            opacity={0.9}
            paintOrder="stroke"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            Ascender ──
          </text>
        </g>

        {/* Cap Height - Fine dash pattern (4 2) */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={capHeightY}
            x2={Math.max(upm, advanceWidth)}
            y2={capHeightY}
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 2"
            strokeOpacity={0.5}
          />
          <line
            x1={0}
            y1={capHeightY}
            x2={Math.max(upm, advanceWidth)}
            y2={capHeightY}
            stroke="#0ea5e9"
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 2"
          />
          <text
            fontSize={11 / z}
            x={12 / z}
            y={capHeightY - 8 / z}
            fill="#0ea5e9"
            fontWeight="bold"
            opacity={0.9}
            paintOrder="stroke"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            Cap Height ┄┄
          </text>
        </g>

        {/* X-Height - Fine dot pattern (2 2) */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={xHeightY}
            x2={Math.max(upm, advanceWidth)}
            y2={xHeightY}
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2 2"
            strokeOpacity={0.5}
          />
          <line
            x1={0}
            y1={xHeightY}
            x2={Math.max(upm, advanceWidth)}
            y2={xHeightY}
            stroke="#0284c7"
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2 2"
          />
          <text
            fontSize={11 / z}
            x={12 / z}
            y={xHeightY - 8 / z}
            fill="#0284c7"
            fontWeight="bold"
            opacity={0.9}
            paintOrder="stroke"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            x-Height ┈┈
          </text>
        </g>

        {/* Baseline - Solid line with Distinct Arrow Marker & High-Contrast Halo */}
        <g opacity={(isJapanese ? 0.45 : 0.85) * opacityScale}>
          <line
            x1={0}
            y1={baselineY}
            x2={Math.max(upm, advanceWidth)}
            y2={baselineY}
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3.2}
            vectorEffect="non-scaling-stroke"
            strokeOpacity={0.7}
          />
          <line
            x1={0}
            y1={baselineY}
            x2={Math.max(upm, advanceWidth)}
            y2={baselineY}
            stroke="#ef4444"
            strokeWidth={isJapanese ? 1.4 : 1.8}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={isJapanese ? '8 4' : undefined}
          />
          {/* Distinct Shape Marker (Filled Triangle) at origin for color-blind identification */}
          <polygon
            points={`0,${baselineY - 5 / z} ${8 / z},${baselineY} 0,${baselineY + 5 / z}`}
            fill="#ef4444"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            fontSize={11 / z}
            x={14 / z}
            y={baselineY - 7 / z}
            fill="#ef4444"
            fontWeight="bold"
            opacity={0.95}
            paintOrder="stroke"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            ▶ Baseline {isJapanese ? '(欧文底線)' : '(底線)'}
          </text>
        </g>

        {/* Descender - Dash-dot-dot pattern (6 2 2 2) */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={descenderY}
            x2={Math.max(upm, advanceWidth)}
            y2={descenderY}
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={2.8}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 2 2 2"
            strokeOpacity={0.6}
          />
          <line
            x1={0}
            y1={descenderY}
            x2={Math.max(upm, advanceWidth)}
            y2={descenderY}
            stroke="#f97316"
            strokeWidth={1.3}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 2 2 2"
          />
          <text
            fontSize={11 / z}
            x={12 / z}
            y={descenderY - 8 / z}
            fill="#f97316"
            fontWeight="bold"
            opacity={0.9}
            paintOrder="stroke"
            stroke={isLight ? '#ffffff' : '#000000'}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            Descender ─・
          </text>
        </g>

        {/* Vertical Center Axis */}
        {showVerticalCenter && (
          <g opacity={0.7 * opacityScale}>
            <line
              x1={centerX}
              y1={verticalTopY}
              x2={centerX}
              y2={verticalBottomY}
              stroke={isLight ? '#ffffff' : '#000000'}
              strokeWidth={2.8}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
            />
            <line
              x1={centerX}
              y1={verticalTopY}
              x2={centerX}
              y2={verticalBottomY}
              stroke="#8b5cf6"
              strokeWidth={1.3}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="6 4"
            />
            <text
              fontSize={11 / z}
              x={centerX + 6 / z}
              y={24 / z}
              fill="#8b5cf6"
              fontWeight="bold"
              opacity={0.95}
              paintOrder="stroke"
              stroke={isLight ? '#ffffff' : '#000000'}
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            >
              | Center ({centerX})
            </text>
          </g>
        )}

        {/* LSB (Left Side Bearing) */}
        <g opacity={0.65 * opacityScale}>
          <line
            x1={lsb}
            y1={verticalTopY}
            x2={lsb}
            y2={verticalBottomY}
            stroke="#10b981"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 2"
          />
          <text fontSize={11 / z} x={lsb + 6 / z} y={42 / z} fill="#10b981" fontWeight="bold" opacity={0.9}>LSB: {lsb}</text>
        </g>

        {/* RSB / Advance Width */}
        <g opacity={0.65 * opacityScale}>
          <line
            x1={advanceWidth}
            y1={verticalTopY}
            x2={advanceWidth}
            y2={verticalBottomY}
            stroke="#10b981"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 2"
          />
          <text
            fontSize={11 / z}
            x={advanceWidth > lsb + 160 ? advanceWidth - 6 / z : advanceWidth + 6 / z}
            textAnchor={advanceWidth > lsb + 160 ? 'end' : 'start'}
            y={42 / z}
            fill="#10b981"
            fontWeight="bold"
            opacity={0.9}
          >
            Adv: {advanceWidth}
          </text>
        </g>
      </g>
    );
  }
);
