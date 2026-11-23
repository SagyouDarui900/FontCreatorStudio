import React, { useMemo } from 'react';
import { ThemeMode } from '../../utils/theme';
import { JapaneseGuidePattern, VerticalGuidePattern } from '../../types';
import { useLiveViewportZoom } from './viewportStore';

interface JapaneseGuidesLayerProps {
  guideType?: JapaneseGuidePattern;
  verticalGuide?: VerticalGuidePattern;
  showBodyFrame?: boolean;
  showKanaFrame?: boolean;
  isLight: boolean;
  theme?: ThemeMode;
  activeChar?: string;
  gridOpacity?: number;
  unitsPerEm?: number;
  zoom?: number;
}

export const JapaneseGuidesLayer: React.FC<JapaneseGuidesLayerProps> = React.memo(
  ({
    guideType = 'none',
    verticalGuide = 'none',
    showBodyFrame,
    showKanaFrame,
    isLight,
    theme = 'light',
    gridOpacity = 30,
    unitsPerEm = 1000,
    zoom = 1,
  }) => {
    const liveZoom = useLiveViewportZoom(zoom);

    const upm = unitsPerEm || 1000;
    const z = liveZoom && liveZoom > 0 ? liveZoom : 1;
    const invZ = 1 / z;
    const half = upm / 2;
    const third1 = Number((upm / 3).toFixed(1));
    const third2 = Number(((upm * 2) / 3).toFixed(1));
    const q1 = upm / 4;
    const q3 = (upm * 3) / 4;

    const paths = useMemo(() => {
      const e1 = Number((upm / 8).toFixed(1));
      const e2 = Number((upm / 4).toFixed(1));
      const e3 = Number(((upm * 3) / 8).toFixed(1));
      const e4 = Number((upm / 2).toFixed(1));
      const e5 = Number(((upm * 5) / 8).toFixed(1));
      const e6 = Number(((upm * 3) / 4).toFixed(1));
      const e7 = Number(((upm * 7) / 8).toFixed(1));

      return {
        verticalCenter: `M ${half} 0 L ${half} ${upm}`,
        verticalThirds: `M ${third1} 0 L ${third1} ${upm} M ${third2} 0 L ${third2} ${upm}`,
        verticalQuartersNoCenter: `M ${q1} 0 L ${q1} ${upm} M ${q3} 0 L ${q3} ${upm}`,
        verticalQuarters: `M ${q1} 0 L ${q1} ${upm} M ${half} 0 L ${half} ${upm} M ${q3} 0 L ${q3} ${upm}`,
        verticalEighthsNoCenter: `M ${e1} 0 L ${e1} ${upm} M ${e2} 0 L ${e2} ${upm} M ${e3} 0 L ${e3} ${upm} M ${e5} 0 L ${e5} ${upm} M ${e6} 0 L ${e6} ${upm} M ${e7} 0 L ${e7} ${upm}`,
        verticalEighths: `M ${e1} 0 L ${e1} ${upm} M ${e2} 0 L ${e2} ${upm} M ${e3} 0 L ${e3} ${upm} M ${e4} 0 L ${e4} ${upm} M ${e5} 0 L ${e5} ${upm} M ${e6} 0 L ${e6} ${upm} M ${e7} 0 L ${e7} ${upm}`,
        cross: `M ${half} 0 L ${half} ${upm} M 0 ${half} L ${upm} ${half}`,
        tianTicks: `M ${q1} 0 V ${upm * 0.03} M ${q3} 0 V ${upm * 0.03} M ${q1} ${upm} V ${upm * 0.97} M ${q3} ${upm} V ${upm * 0.97} M 0 ${q1} H ${upm * 0.03} M 0 ${q3} H ${upm * 0.03} M ${upm} ${q1} H ${upm * 0.97} M ${upm} ${q3} H ${upm * 0.97}`,
        jiugong: `M ${third1} 0 L ${third1} ${upm} M ${third2} 0 L ${third2} ${upm} M 0 ${third1} L ${upm} ${third1} M 0 ${third2} L ${upm} ${third2}`,
        sixteen: `M ${q1} 0 L ${q1} ${upm} M ${q3} 0 L ${q3} ${upm} M 0 ${q1} L ${upm} ${q1} M 0 ${q3} L ${upm} ${q3}`,
        mi: `M 0 0 L ${upm} ${upm} M ${upm} 0 L 0 ${upm}`,
      };
    }, [upm, half, third1, third2, q1, q3]);

    if (
      guideType === 'none' &&
      verticalGuide === 'none' &&
      !showBodyFrame &&
      !showKanaFrame
    ) {
      return null;
    }

    const opacityScale = Math.min(1.1, Math.max(0.25, (gridOpacity ?? 30) / 45));
    const labelColor = isLight ? '#64748b' : '#94a3b8';

    const primaryColor =
      theme === 'sepia'
        ? '#92400e'
        : theme === 'warm'
        ? '#c2410c'
        : theme === 'nord'
        ? '#88c0d0'
        : theme === 'monochrome'
        ? '#52525b'
        : isLight
        ? '#059669'
        : '#34d399';

    const secondaryColor =
      theme === 'sepia'
        ? '#a16207'
        : theme === 'warm'
        ? '#b45309'
        : theme === 'nord'
        ? '#81a1c1'
        : theme === 'monochrome'
        ? '#71717a'
        : isLight
        ? '#0284c7'
        : '#38bdf8';

    const verticalGuideColor =
      theme === 'sepia'
        ? '#78350f'
        : theme === 'warm'
        ? '#b45309'
        : theme === 'nord'
        ? '#81a1c1'
        : theme === 'monochrome'
        ? '#52525b'
        : isLight
        ? '#7c3aed'
        : '#a78bfa';

    const kanjiFrameColor =
      theme === 'sepia'
        ? '#8c531b'
        : theme === 'warm'
        ? '#b45309'
        : theme === 'nord'
        ? '#88c0d0'
        : theme === 'monochrome'
        ? '#52525b'
        : isLight
        ? '#059669'
        : '#34d399';

    const kanaFrameColor =
      theme === 'sepia'
        ? '#a16207'
        : theme === 'warm'
        ? '#ea580c'
        : theme === 'nord'
        ? '#a3be8c'
        : theme === 'monochrome'
        ? '#71717a'
        : isLight
        ? '#d97706'
        : '#f59e0b';

    const guideHasCenterLine =
      guideType === 'cross' || guideType === 'tian' || guideType === 'sixteen' || guideType === 'mi';

    const verticalGuidePath =
      verticalGuide === 'center'
        ? guideHasCenterLine
          ? null
          : paths.verticalCenter
        : verticalGuide === 'thirds'
        ? paths.verticalThirds
        : verticalGuide === 'quarters'
        ? guideHasCenterLine
          ? paths.verticalQuartersNoCenter
          : paths.verticalQuarters
        : verticalGuide === 'eighths'
        ? guideHasCenterLine
          ? paths.verticalEighthsNoCenter
          : paths.verticalEighths
        : null;

    const dash = (a: number, b: number, c?: number, d?: number) =>
      c !== undefined && d !== undefined
        ? `${a * invZ} ${b * invZ} ${c * invZ} ${d * invZ}`
        : `${a * invZ} ${b * invZ}`;

    // Body Frame (85% Kanji Frame) & Kana Frame (78% Kana Frame) proportional to upm
    const bodyInset = upm * 0.075;
    const bodySize = upm * 0.85;
    const kanaInset = upm * 0.11;
    const kanaSize = upm * 0.78;
    const cornerLen = upm * 0.035;

    return (
      <g
        className="japanese-guides-layer pointer-events-none select-none font-mono"
        opacity={Math.min(0.85, 0.65 * opacityScale)}
      >
        {/* 1. Dedicated Vertical Guideline System */}
        {(verticalGuidePath || verticalGuide === 'center') && (
          <>
            {verticalGuidePath && (
              <path
                d={verticalGuidePath}
                stroke={verticalGuideColor}
                strokeDasharray={dash(5, 3)}
                strokeWidth={1.1}
                vectorEffect="non-scaling-stroke"
                opacity={0.55}
              />
            )}
            {verticalGuide === 'center' && (
              <g transform={`translate(${half}, ${upm}) scale(${invZ})`}>
                <text x={0} y={13} fill={labelColor} textAnchor="middle" fontSize={9.5} opacity={0.75}>
                  X:{half}
                </text>
              </g>
            )}
            {verticalGuide === 'thirds' && (
              <>
                <g transform={`translate(${third1}, ${upm}) scale(${invZ})`}>
                  <text x={0} y={13} fill={labelColor} textAnchor="middle" fontSize={9.5} opacity={0.75}>
                    X:{third1}
                  </text>
                </g>
                <g transform={`translate(${third2}, ${upm}) scale(${invZ})`}>
                  <text x={0} y={13} fill={labelColor} textAnchor="middle" fontSize={9.5} opacity={0.75}>
                    X:{third2}
                  </text>
                </g>
              </>
            )}
          </>
        )}

        {/* 2. 和文目安ガイド */}
        {(guideType === 'cross' || guideType === 'tian') && (
          <g opacity={0.52}>
            <path
              d={paths.cross}
              stroke={primaryColor}
              strokeDasharray={dash(6, 4)}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />
            {guideType === 'tian' && (
              <path
                d={paths.tianTicks}
                stroke={primaryColor}
                strokeWidth={1.1}
                vectorEffect="non-scaling-stroke"
                opacity={0.75}
              />
            )}
            <circle cx={half} cy={half} r={2.4 * invZ} fill={primaryColor} />
          </g>
        )}

        {guideType === 'jiugong' && (
          <g opacity={0.45}>
            <path
              d={paths.jiugong}
              stroke={primaryColor}
              strokeDasharray={dash(5, 3)}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={paths.mi}
              stroke={secondaryColor}
              strokeDasharray={dash(4, 4)}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
              opacity={0.45}
            />
          </g>
        )}

        {guideType === 'sixteen' && (
          <g opacity={0.45}>
            <path
              d={paths.sixteen}
              stroke={primaryColor}
              strokeDasharray={dash(5, 3)}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={paths.cross}
              stroke={secondaryColor}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              opacity={0.65}
            />
            <path
              d={paths.mi}
              stroke={secondaryColor}
              strokeDasharray={dash(4, 4)}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
              opacity={0.4}
            />
          </g>
        )}

        {guideType === 'mi' && (
          <g opacity={0.48}>
            <path
              d={paths.mi}
              stroke={primaryColor}
              strokeDasharray={dash(5, 3)}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={paths.cross}
              stroke={secondaryColor}
              strokeDasharray={dash(4, 4)}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={half} cy={half} r={2.4 * invZ} fill={primaryColor} />
          </g>
        )}

        {/* 3. 漢字字面枠 (85%) — sharp 90° corners + non-colliding top-left border label */}
        {showBodyFrame && (
          <g opacity={0.62}>
            <rect
              x={bodyInset}
              y={bodyInset}
              width={bodySize}
              height={bodySize}
              fill="none"
              stroke={kanjiFrameColor}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={dash(10, 4, 2, 4)}
            />
            <path
              d={`M ${bodyInset} ${bodyInset + cornerLen} V ${bodyInset} H ${bodyInset + cornerLen} M ${bodyInset + bodySize - cornerLen} ${bodyInset} H ${bodyInset + bodySize} V ${bodyInset + cornerLen} M ${bodyInset} ${bodyInset + bodySize - cornerLen} V ${bodyInset + bodySize} H ${bodyInset + cornerLen} M ${bodyInset + bodySize - cornerLen} ${bodyInset + bodySize} H ${bodyInset + bodySize} V ${bodyInset + bodySize - cornerLen}`}
              fill="none"
              stroke={kanjiFrameColor}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <g transform={`translate(${bodyInset}, ${bodyInset}) scale(${invZ})`}>
              <text x={4} y={-4} fill={labelColor} fontSize={9.5} opacity={0.78}>
                漢字枠 (85%)
              </text>
            </g>
          </g>
        )}

        {/* 4. 仮名字面枠 (78%) — sharp 90° corners + top-right border label (never collides with 漢字枠) */}
        {showKanaFrame && (
          <g opacity={0.62}>
            <rect
              x={kanaInset}
              y={kanaInset}
              width={kanaSize}
              height={kanaSize}
              fill="none"
              stroke={kanaFrameColor}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={dash(3, 3)}
            />
            <g transform={`translate(${kanaInset + kanaSize}, ${kanaInset}) scale(${invZ})`}>
              <text x={-4} y={-4} fill={labelColor} fontSize={9.5} textAnchor="end" opacity={0.78}>
                かな枠 (78%)
              </text>
            </g>
          </g>
        )}
      </g>
    );
  }
);
