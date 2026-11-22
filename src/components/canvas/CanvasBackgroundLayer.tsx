import React, { useMemo } from 'react';
import { ThemeMode } from '../../utils/theme';

interface CanvasBackgroundLayerProps {
  isLight: boolean;
  theme?: ThemeMode;
  showGrid: boolean;
  gridSize: number;
  gridOpacity?: number;
  unitsPerEm?: number;
  zoom?: number;
}

export const CanvasBackgroundLayer: React.FC<CanvasBackgroundLayerProps> = React.memo(
  ({ isLight, theme = 'light', showGrid, gridSize, gridOpacity = 30, unitsPerEm = 1000, zoom = 1 }) => {
    const z = zoom && zoom > 0 ? zoom : 1;
    const size = Math.max(5, gridSize || 50);
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

    // Calm, neutral drafting grid colors so contours and guides remain primary
    const minorStroke =
      theme === 'sepia'
        ? 'rgb(120, 90, 58)'
        : theme === 'warm'
        ? 'rgb(148, 88, 52)'
        : theme === 'nord'
        ? 'rgb(129, 161, 193)'
        : theme === 'monochrome'
        ? 'rgb(82, 82, 91)'
        : isLight
        ? 'rgb(100, 116, 139)'
        : 'rgb(148, 163, 184)';

    const majorStroke =
      theme === 'sepia'
        ? 'rgb(96, 68, 40)'
        : theme === 'warm'
        ? 'rgb(124, 68, 36)'
        : theme === 'nord'
        ? 'rgb(143, 188, 187)'
        : theme === 'monochrome'
        ? 'rgb(39, 39, 42)'
        : isLight
        ? 'rgb(71, 85, 105)'
        : 'rgb(203, 213, 225)';

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
        ? 'rgba(15, 30, 20, 0.03)'
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
        ? 'rgba(140, 103, 59, 0.4)'
        : theme === 'warm'
        ? 'rgba(194, 65, 12, 0.35)'
        : theme === 'nord'
        ? 'rgba(94, 129, 172, 0.45)'
        : theme === 'monochrome'
        ? 'rgba(24, 24, 27, 0.35)'
        : isLight
        ? 'rgba(71, 85, 105, 0.35)'
        : 'rgba(148, 163, 184, 0.3)';

    const cropMarkStroke =
      theme === 'sepia'
        ? 'rgba(161, 98, 7, 0.45)'
        : theme === 'warm'
        ? 'rgba(234, 88, 12, 0.45)'
        : theme === 'nord'
        ? 'rgba(136, 192, 208, 0.5)'
        : theme === 'monochrome'
        ? 'rgba(24, 24, 27, 0.35)'
        : isLight
        ? 'rgba(71, 85, 105, 0.4)'
        : 'rgba(148, 163, 184, 0.4)';

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

        {/* Corner Crop / Register Marks (トンボ) */}
        <g opacity={0.45}>
          <path d="M -24 0 L 0 0 M 0 -24 L 0 0" stroke={cropMarkStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={`M ${upm + 24} 0 L ${upm} 0 M ${upm} -24 L ${upm} 0`} stroke={cropMarkStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={`M -24 ${upm} L 0 ${upm} M 0 ${upm + 24} L 0 ${upm}`} stroke={cropMarkStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={`M ${upm + 24} ${upm} L ${upm} ${upm} M ${upm} ${upm + 24} L ${upm} ${upm}`} stroke={cropMarkStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
    );
  }
);
