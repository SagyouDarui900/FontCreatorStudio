import React, { useMemo } from 'react';
import { ThemeMode } from '../../utils/theme';
import { PathContour } from '../../types';
import { contoursToSvgPath, groupContoursForRendering, RenderGroup } from '../../utils/pathUtils';

export interface MainGlyphContoursLayerProps {
  contours?: PathContour[];
  mainSvgPath?: string;
  isLight: boolean;
  theme?: ThemeMode;
  outlineOnly?: boolean;
}

export const MainGlyphContoursLayer: React.FC<MainGlyphContoursLayerProps> = React.memo(
  ({ contours, mainSvgPath, isLight, theme = 'light', outlineOnly = false }) => {
    const renderGroups = useMemo(() => {
      if (contours !== undefined) {
        if (!contours || contours.length === 0) return [];
        return groupContoursForRendering(contours);
      }
      if (mainSvgPath) {
        return [{ id: 'main-fallback', d: mainSvgPath, fillRule: 'nonzero' as const }];
      }
      return [];
    }, [contours, mainSvgPath]);

    if (renderGroups.length === 0 && (!contours || contours.length === 0)) return null;

    const fillColor =
      theme === 'sepia'
        ? '#2d2217'
        : theme === 'warm'
        ? '#292019'
        : theme === 'nord'
        ? '#eceff4'
        : theme === 'monochrome'
        ? '#000000'
        : isLight
        ? '#1f2937'
        : '#ecfdf5';

    const strokeColor =
      theme === 'sepia'
        ? '#8c673b'
        : theme === 'warm'
        ? '#ea580c'
        : theme === 'nord'
        ? '#88c0d0'
        : theme === 'monochrome'
        ? '#000000'
        : isLight
        ? '#065f46'
        : '#34d399';

    const outlineStrokeColor =
      theme === 'sepia'
        ? (isLight ? '#78350f' : '#fbbf24')
        : theme === 'warm'
        ? (isLight ? '#c2410c' : '#fb923c')
        : theme === 'nord'
        ? (isLight ? '#5e81ac' : '#88c0d0')
        : theme === 'monochrome'
        ? (isLight ? '#0f172a' : '#f8fafc')
        : isLight
        ? '#0284c7'
        : '#38bdf8';

    // Outline stroke width is fixed at a crisp 1.5px on screen using non-scaling-stroke so zoom does not distort thickness
    const outlineStrokeWidth = 1.5;

    // When Outline Mode (輪郭のみモード) is active, remove fills entirely and stroke every contour outline
    if (outlineOnly) {
      return (
        <g id="main-glyph-contours-layer">
          {contours && contours.length > 0 ? (
            contours.map((contour: PathContour, idx: number) => {
              const d = contoursToSvgPath([contour]);
              if (!d) return null;
              return (
                <path
                  key={`outline-contour-${contour.id || idx}`}
                  d={d}
                  fill="none"
                  stroke={outlineStrokeColor}
                  strokeWidth={outlineStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })
          ) : (
            renderGroups.map((group) => (
              <path
                key={`glyph-path-group-${group.id}`}
                d={group.d}
                fill="none"
                stroke={outlineStrokeColor}
                strokeWidth={outlineStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))
          )}
        </g>
      );
    }

    return (
      <g id="main-glyph-contours-layer">
        {renderGroups.map((group) => (
          <path
            key={`glyph-path-group-${group.id}`}
            d={group.d}
            fill={fillColor}
            fillRule={group.fillRule}
            stroke="none"
          />
        ))}
      </g>
    );
  }
);

