import React, { useMemo } from 'react';
import { ThemeMode } from '../../utils/theme';
import { DEFAULT_GRID_OPACITY, DEFAULT_GRID_SIZE } from '../../utils/gridDefaults';
import { useLiveViewportZoom } from './viewportStore';

interface CanvasBackgroundLayerProps {
  isLight: boolean;
  theme?: ThemeMode;
  showGrid: boolean;
  gridSize: number;
  gridOpacity?: number;
  unitsPerEm?: number;
}

export const CanvasBackgroundLayer: React.FC<CanvasBackgroundLayerProps> = React.memo(
  ({ isLight, theme = 'light', showGrid, gridSize, gridOpacity = DEFAULT_GRID_OPACITY, unitsPerEm = 1000 }) => {
    // L4/M6: use the live pinch zoom so the minor-line fade tracks the
    // gesture instead of snapping when the pointer is released.
    const liveZoom = useLiveViewportZoom();
    const z = liveZoom && liveZoom > 0 ? liveZoom : 1;
    const size = Math.max(5, gridSize || DEFAULT_GRID_SIZE);
    const upm = unitsPerEm || 1000;
    const opacityFactor = Math.min(1, Math.max(0.08, gridOpacity / 100));

    // Direct crisp vector grid lines centered on upm / 2 (no SVG <pattern> tile clipping or zoom jitter)
    const { minorPath, majorPath } = useMemo(() => {
      if (!showGrid) return { minorPath: '', majorPath: '' };
      const center = upm / 2;
      const majorEvery = size <= 15 ? 5 : size <= 30 ? 4 : 2;
      const maxSteps = Math.ceil(upm / size) + 1;

      const minorSegs: string[] = [];
      const majorSegs: string[] = [];

      for (let k = -maxSteps; k <= maxSteps; k++) {
        const pos = Number((center + k * size).toFixed(3));
        if (pos <= 0.001 || pos >= upm - 0.001) continue;
        const target = k % majorEvery === 0 ? majorSegs : minorSegs;
        target.push(`M${pos} 0V${upm}`, `M0 ${pos}H${upm}`);
      }

      return {
        minorPath: minorSegs.join(''),
        majorPath: majorSegs.join(''),
      };
    }, [showGrid, size, upm]);

    // Fade minor subdivisions cleanly only when cells become < 6 screen px wide to prevent moiré
    const cellScreenPx = size * z;
    const minorZoomFade = cellScreenPx >= 6 ? 1 : Math.max(0, (cellScreenPx - 2.5) / 3.5);

    // Green drafting grid colors (pre-faead31), so contours and guides
    // stay distinguishable from the neutral UI. Minor and major tiers
    // share one hue and differ only in opacity.
    const minorStroke =
      theme === 'sepia'
        ? 'rgb(140, 103, 59)'
        : theme === 'warm'
        ? 'rgb(194, 65, 12)'
        : theme === 'nord'
        ? 'rgb(129, 161, 193)'
        : theme === 'monochrome'
        ? 'rgb(24, 24, 27)'
        : isLight
        ? 'rgb(5, 150, 105)'
        : 'rgb(52, 211, 153)';

    const majorStroke = minorStroke;

    const dimmingFill =
      theme === 'sepia'
        ? 'rgba(60, 45, 30, 0.05)'
        : theme === 'warm'
        ? 'rgba(70, 45, 20, 0.04)'
        : theme === 'nord'
        ? 'rgba(0, 0, 0, 0.25)'
        : theme === 'monochrome'
        ? 'rgba(0, 0, 0, 0.05)'
        : isLight
        ? 'rgba(15, 30, 20, 0.035)'
        : 'rgba(0, 0, 0, 0.25)';

    const emBoxFill =
      theme === 'sepia'
        ? '#faf5eb'
        : theme === 'warm'
        ? '#fffdf7'
        : theme === 'nord'
        ? '#2e3440'
        : theme === 'monochrome'
        ? '#ffffff'
        : isLight
        ? '#ffffff'
        : '#161f19';

    const emBoxStroke =
      theme === 'sepia'
        ? 'rgba(140, 103, 59, 0.45)'
        : theme === 'warm'
        ? 'rgba(194, 65, 12, 0.38)'
        : theme === 'nord'
        ? 'rgba(94, 129, 172, 0.5)'
        : theme === 'monochrome'
        ? 'rgba(24, 24, 27, 0.4)'
        : isLight
        ? 'rgba(71, 85, 105, 0.4)'
        : 'rgba(148, 163, 184, 0.35)';

    const cropMarkStroke =
      theme === 'sepia'
        ? 'rgba(161, 98, 7, 0.5)'
        : theme === 'warm'
        ? 'rgba(234, 88, 12, 0.5)'
        : theme === 'nord'
        ? 'rgba(136, 192, 208, 0.55)'
        : theme === 'monochrome'
        ? 'rgba(24, 24, 27, 0.4)'
        : isLight
        ? 'rgba(71, 85, 105, 0.45)'
        : 'rgba(148, 163, 184, 0.45)';

    const q1 = upm * 0.25;
    const half = upm * 0.5;
    const q3 = upm * 0.75;

    return (
      <g className="canvas-background-layer pointer-events-none select-none">
        {/* Surrounding Outer Area Dimming Frame */}
        <path
          d={`M -4000 -4000 H 5000 V 5000 H -4000 Z M 0 0 V ${upm} H ${upm} V 0 Z`}
          fill={dimmingFill}
          fillRule="evenodd"
        />

        {/* Em Square Box Background */}
        <rect
          x={0}
          y={0}
          width={upm}
          height={upm}
          fill={emBoxFill}
          stroke={emBoxStroke}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />

        {/* Crisp Grid Overlay (minor + major hierarchy, constant 1px screen stroke) */}
        {showGrid && (
          <g>
            {minorPath && minorZoomFade > 0.02 && (
              <path
                data-grid-tier="minor"
                d={minorPath}
                fill="none"
                stroke={minorStroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                opacity={opacityFactor * 0.36 * minorZoomFade}
              />
            )}
            {majorPath && (
              <path
                data-grid-tier="major"
                d={majorPath}
                fill="none"
                stroke={majorStroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                opacity={opacityFactor * 0.72}
              />
            )}
          </g>
        )}

        {/* Quarter & Center Outer Edge Ticks + Corner Crop Marks (トンボ) */}
        <g opacity={0.55}>
          <path
            d={`M -20 0 H 0 V -20 M ${upm + 20} 0 H ${upm} V -20 M -20 ${upm} H 0 V ${upm + 20} M ${upm + 20} ${upm} H ${upm} V ${upm + 20}`}
            fill="none"
            stroke={cropMarkStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M ${q1} -8 V 0 M ${half} -14 V 0 M ${q3} -8 V 0 M ${q1} ${upm} V ${upm + 8} M ${half} ${upm} V ${upm + 14} M ${q3} ${upm} V ${upm + 8} M -8 ${q1} H 0 M -14 ${half} H 0 M -8 ${q3} H 0 M ${upm} ${q1} H ${upm + 8} M ${upm} ${half} H ${upm + 14} M ${upm} ${q3} H ${upm + 8}`}
            fill="none"
            stroke={cropMarkStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    );
  }
);
