import React from 'react';
import { resolveCanvasMetrics } from '../../utils/font/constants';
import { useLiveViewportZoom } from './viewportStore';

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
    const liveZoom = useLiveViewportZoom(zoom);
    if (!showMetrics) return null;

    const z = liveZoom && liveZoom > 0 ? liveZoom : 1;
    const invZ = 1 / z;
    const { upm, baselineY, ascenderY, capHeightY, xHeightY, descenderY } =
      resolveCanvasMetrics({ unitsPerEm, ascender, descender, capHeight, xHeight }, unitsPerEm);
    const isKana = /[ぁ-んァ-ヶー]/.test(activeChar);
    const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(activeChar);
    const isJapanese = isKana || isKanji;

    const opacityScale = Math.min(1.1, Math.max(0.25, (gridOpacity ?? 30) / 45));

    // When drafting Japanese characters, keep Western-specific metrics subtle
    const latinMetricsOpacity = (isJapanese ? 0.28 : 0.65) * opacityScale;

    const centerX = upm / 2;
    const maxLineX = Math.max(upm, advanceWidth);
    const verticalTopY = Math.min(0, ascenderY);
    const verticalBottomY = Math.max(upm, descenderY);
    const labelColor = isLight ? '#64748b' : '#94a3b8';

    // Screen-constant dash helper so dash segments never crawl or stretch on zoom
    const dash = (a: number, b: number, c?: number, d?: number) =>
      c !== undefined && d !== undefined
        ? `${a * invZ} ${b * invZ} ${c * invZ} ${d * invZ}`
        : `${a * invZ} ${b * invZ}`;

    return (
      <g className="metrics-guides-layer select-none font-mono pointer-events-none">
        {/* Ascender */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={ascenderY}
            x2={maxLineX}
            y2={ascenderY}
            stroke="#3b82f6"
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(8, 4)}
          />
          <g transform={`translate(8, ${ascenderY}) scale(${invZ})`}>
            <text
              x={0}
              y={ascenderY <= 20 ? 12 : -5}
              fontSize={9.5}
              fill={labelColor}
              opacity={0.75}
            >
              Ascender
            </text>
          </g>
        </g>

        {/* Cap Height */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={capHeightY}
            x2={maxLineX}
            y2={capHeightY}
            stroke="#0ea5e9"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          <g transform={`translate(8, ${capHeightY}) scale(${invZ})`}>
            <text x={0} y={-5} fontSize={9.5} fill={labelColor} opacity={0.75}>
              Cap Height
            </text>
          </g>
        </g>

        {/* x-Height */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={xHeightY}
            x2={maxLineX}
            y2={xHeightY}
            stroke="#0284c7"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(2, 3)}
          />
          <g transform={`translate(8, ${xHeightY}) scale(${invZ})`}>
            <text x={0} y={-5} fontSize={9.5} fill={labelColor} opacity={0.75}>
              x-Height
            </text>
          </g>
        </g>

        {/* Baseline */}
        <g opacity={(isJapanese ? 0.5 : 0.85) * opacityScale}>
          <line
            x1={0}
            y1={baselineY}
            x2={maxLineX}
            y2={baselineY}
            stroke="#ef4444"
            strokeWidth={isJapanese ? 1.2 : 1.5}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={isJapanese ? dash(8, 4) : undefined}
          />
          <g transform={`translate(0, ${baselineY}) scale(${invZ})`}>
            <polygon points="0,-4 7,0 0,4" fill="#ef4444" opacity={0.85} />
            <text x={11} y={-5} fontSize={9.5} fill={labelColor} opacity={0.8}>
              Baseline
            </text>
          </g>
        </g>

        {/* Descender */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={descenderY}
            x2={maxLineX}
            y2={descenderY}
            stroke="#f97316"
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(6, 3, 2, 3)}
          />
          <g transform={`translate(8, ${descenderY}) scale(${invZ})`}>
            <text x={0} y={-5} fontSize={9.5} fill={labelColor} opacity={0.75}>
              Descender
            </text>
          </g>
        </g>

        {/* Vertical Center Axis */}
        {showVerticalCenter && (
          <g opacity={0.6 * opacityScale}>
            <line
              x1={centerX}
              y1={verticalTopY}
              x2={centerX}
              y2={verticalBottomY}
              stroke="#8b5cf6"
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={dash(6, 4)}
            />
            <g transform={`translate(${centerX}, 0) scale(${invZ})`}>
              <text x={5} y={13} fontSize={9.5} fill={labelColor} opacity={0.75}>
                Center ({centerX})
              </text>
            </g>
          </g>
        )}

        {/* LSB (Left Side Bearing) */}
        <g opacity={0.6 * opacityScale}>
          <line
            x1={lsb}
            y1={verticalTopY}
            x2={lsb}
            y2={verticalBottomY}
            stroke="#10b981"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          <g transform={`translate(${lsb}, 0) scale(${invZ})`}>
            <text x={5} y={26} fontSize={9.5} fill={labelColor} opacity={0.75}>
              LSB
            </text>
          </g>
        </g>

        {/* RSB / Advance Width */}
        <g opacity={0.6 * opacityScale}>
          <line
            x1={advanceWidth}
            y1={verticalTopY}
            x2={advanceWidth}
            y2={verticalBottomY}
            stroke="#10b981"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          <g transform={`translate(${advanceWidth}, 0) scale(${invZ})`}>
            <text
              x={advanceWidth > lsb + 160 ? -5 : 5}
              textAnchor={advanceWidth > lsb + 160 ? 'end' : 'start'}
              y={26}
              fontSize={9.5}
              fill={labelColor}
              opacity={0.75}
            >
              Adv
            </text>
          </g>
        </g>
      </g>
    );
  }
);
