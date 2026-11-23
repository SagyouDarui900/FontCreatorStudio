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
  suppressCenterLine?: boolean;
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
    suppressCenterLine = false,
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

    // When drafting Japanese characters, keep Western-specific metrics very subtle and suppress Latin text clutter inside/near the glyph
    const latinMetricsOpacity = (isJapanese ? 0.2 : 0.58) * opacityScale;

    const centerX = upm / 2;
    const maxLineX = Math.max(upm, advanceWidth);
    const verticalTopY = Math.min(0, ascenderY);
    const verticalBottomY = Math.max(upm, descenderY);
    const labelColor = isLight ? '#64748b' : '#94a3b8';
    const latinLineColor = isLight ? '#475569' : '#94a3b8';
    const baselineColor = isLight ? '#dc2626' : '#f87171';
    const sidebearingColor = isLight ? '#059669' : '#34d399';
    const marginShadeColor = isLight ? '#0f172a' : '#94a3b8';

    const clampedLsb = Math.max(0, Math.min(upm, lsb));
    const clampedAdv = Math.max(0, Math.min(upm, advanceWidth));
    const sideLabelsTight = advanceWidth <= lsb + 140;

    // Screen-constant dash helper so dash segments never crawl or stretch on zoom
    const dash = (a: number, b: number, c?: number, d?: number) =>
      c !== undefined && d !== undefined
        ? `${a * invZ} ${b * invZ} ${c * invZ} ${d * invZ}`
        : `${a * invZ} ${b * invZ}`;

    return (
      <g className="metrics-guides-layer select-none font-mono pointer-events-none">
        {/* Sidebearing Margin Shading (Glyphs / FontLab style outer advance clarity) */}
        {clampedLsb > 0 && (
          <rect
            x={0}
            y={verticalTopY}
            width={clampedLsb}
            height={verticalBottomY - verticalTopY}
            fill={marginShadeColor}
            opacity={0.032}
          />
        )}
        {clampedAdv < upm && (
          <rect
            x={clampedAdv}
            y={verticalTopY}
            width={upm - clampedAdv}
            height={verticalBottomY - verticalTopY}
            fill={marginShadeColor}
            opacity={0.032}
          />
        )}

        {/* Ascender */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={ascenderY}
            x2={maxLineX}
            y2={ascenderY}
            stroke={latinLineColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(8, 4)}
          />
          {!isJapanese && (
            <g transform={`translate(${maxLineX}, ${ascenderY}) scale(${invZ})`}>
              <text x={8} y={3} fontSize={9.5} fill={labelColor} opacity={0.8}>
                Ascender
              </text>
            </g>
          )}
        </g>

        {/* Cap Height */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={capHeightY}
            x2={maxLineX}
            y2={capHeightY}
            stroke={latinLineColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          {!isJapanese && (
            <g transform={`translate(${maxLineX}, ${capHeightY}) scale(${invZ})`}>
              <text x={8} y={3} fontSize={9.5} fill={labelColor} opacity={0.8}>
                Cap Height
              </text>
            </g>
          )}
        </g>

        {/* x-Height */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={xHeightY}
            x2={maxLineX}
            y2={xHeightY}
            stroke={latinLineColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(2, 3)}
          />
          {!isJapanese && (
            <g transform={`translate(${maxLineX}, ${xHeightY}) scale(${invZ})`}>
              <text x={8} y={3} fontSize={9.5} fill={labelColor} opacity={0.8}>
                x-Height
              </text>
            </g>
          )}
        </g>

        {/* Baseline */}
        <g opacity={(isJapanese ? 0.38 : 0.8) * opacityScale}>
          <line
            x1={0}
            y1={baselineY}
            x2={maxLineX}
            y2={baselineY}
            stroke={baselineColor}
            strokeWidth={isJapanese ? 1.1 : 1.4}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={isJapanese ? dash(8, 4) : undefined}
          />
          <g transform={`translate(0, ${baselineY}) scale(${invZ})`}>
            <polygon points="-7,-3.5 0,0 -7,3.5" fill={baselineColor} opacity={0.85} />
            {!isJapanese && (
              <text x={-11} y={3} textAnchor="end" fontSize={9.5} fill={labelColor} opacity={0.85}>
                Baseline
              </text>
            )}
          </g>
        </g>

        {/* Descender */}
        <g opacity={latinMetricsOpacity}>
          <line
            x1={0}
            y1={descenderY}
            x2={maxLineX}
            y2={descenderY}
            stroke={latinLineColor}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(6, 3, 2, 3)}
          />
          {!isJapanese && (
            <g transform={`translate(${maxLineX}, ${descenderY}) scale(${invZ})`}>
              <text x={8} y={3} fontSize={9.5} fill={labelColor} opacity={0.8}>
                Descender
              </text>
            </g>
          )}
        </g>

        {/* Vertical Center Axis (suppressed when JapaneseGuidesLayer already renders center line) */}
        {showVerticalCenter && !suppressCenterLine && (
          <g opacity={0.55 * opacityScale}>
            <line
              x1={centerX}
              y1={verticalTopY}
              x2={centerX}
              y2={verticalBottomY}
              stroke="#6366f1"
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={dash(6, 4)}
            />
            <g transform={`translate(${centerX}, ${verticalBottomY}) scale(${invZ})`}>
              <text x={0} y={14} textAnchor="middle" fontSize={9.5} fill={labelColor} opacity={0.78}>
                Center ({centerX})
              </text>
            </g>
          </g>
        )}

        {/* LSB (Left Side Bearing) */}
        <g opacity={0.58 * opacityScale}>
          <line
            x1={lsb}
            y1={verticalTopY}
            x2={lsb}
            y2={verticalBottomY}
            stroke={sidebearingColor}
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          <g transform={`translate(${lsb}, ${verticalTopY}) scale(${invZ})`}>
            <text
              x={sideLabelsTight ? -5 : 4}
              textAnchor={sideLabelsTight ? 'end' : 'start'}
              y={-6}
              fontSize={9.5}
              fill={labelColor}
              opacity={0.78}
            >
              LSB {Math.round(lsb)}
            </text>
          </g>
        </g>

        {/* RSB / Advance Width */}
        <g opacity={0.58 * opacityScale}>
          <line
            x1={advanceWidth}
            y1={verticalTopY}
            x2={advanceWidth}
            y2={verticalBottomY}
            stroke={sidebearingColor}
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dash(4, 3)}
          />
          <g transform={`translate(${advanceWidth}, ${verticalTopY}) scale(${invZ})`}>
            <text
              x={sideLabelsTight ? 5 : -4}
              textAnchor={sideLabelsTight ? 'start' : 'end'}
              y={-6}
              fontSize={9.5}
              fill={labelColor}
              opacity={0.78}
            >
              Adv {Math.round(advanceWidth)}
            </text>
          </g>
        </g>
      </g>
    );
  }
);
