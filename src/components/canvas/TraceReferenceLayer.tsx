import React, { useEffect, useRef, useState } from 'react';
import { TraceSettings, ToolMode } from '../../types';
import { computeTraceCharMetrics } from './traceCharMetrics';
import { TRACE_DEFAULT_OPACITY } from './traceOptions';
import { resolveBaselineY } from '../../utils/font/constants';
import { useLiveViewportZoom } from './viewportStore';

// Corner handles only. All four corners scale from the center by the
// pointer distance ratio, so no edge (n/s/e/w) handle exists.
export type TraceResizeHandle = 'nw' | 'ne' | 'se' | 'sw';

interface TraceReferenceLayerProps {
  traceSettings: TraceSettings;
  isLight: boolean;
  activeChar: string;
  selectedUnicode?: string;
  toolMode: ToolMode;
  unitsPerEm?: number;
  ascender?: number;
  advanceWidth?: number;
  onPointerDownImage?: (e: React.PointerEvent) => void;
  onPointerDownResize?: (e: React.PointerEvent, handle: TraceResizeHandle) => void;
  onDoubleClickReset?: () => void;
  isResizing?: boolean;
  onTraceImageError?: () => void;
}

export const TraceReferenceLayer: React.FC<TraceReferenceLayerProps> = React.memo(
  ({
    traceSettings,
    isLight,
    activeChar,
    selectedUnicode,
    toolMode,
    unitsPerEm = 1000,
    ascender,
    advanceWidth,
    onPointerDownImage,
    onPointerDownResize,
    onDoubleClickReset,
    onTraceImageError,
  }) => {
    // L4: use the live pinch zoom so the adjust-handle sizes track the gesture.
    const liveZoom = useLiveViewportZoom();
    const z = liveZoom && liveZoom > 0 ? liveZoom : 1;
    const upm = unitsPerEm || 1000;
    const half = upm / 2;
    const baselineY = resolveBaselineY(ascender, upm);

    const scale = traceSettings.scale ?? 1;
    const offsetX = traceSettings.offsetX ?? 0;
    const offsetY = traceSettings.offsetY ?? 0;
    const isAdjustMode = toolMode === 'trace_adjust';

    const charToRender = traceSettings.text || activeChar || 'あ';
    const {
      anchorX,
      effectiveFontSize,
      effectiveY,
      dominantBaseline,
      charBoxSize,
      charBoxX,
      charBoxY,
    } = computeTraceCharMetrics({
      charToRender,
      unitsPerEm: upm,
      fontSize: traceSettings.fontSize,
      advanceWidth,
      baselineY,
    });

    const fontFamily = traceSettings.fontFamily || "'Noto Sans JP', sans-serif";

    const unicodeNum = selectedUnicode != null ? Number(selectedUnicode) : null;
    const currentImageSrc =
      (unicodeNum !== null && !Number.isNaN(unicodeNum)
        ? traceSettings.charImages?.[unicodeNum]
        : undefined) || traceSettings.imageSrc;

    // Image natural size, measured on load so a non-square image gets a
    // frame that matches its real aspect ratio instead of a square.
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const reportedImageErrorRef = useRef<string | null>(null);

    useEffect(() => {
      setImageLoadFailed(false);
      reportedImageErrorRef.current = null;
      if (!currentImageSrc) {
        setImageSize(null);
        return;
      }
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.onerror = () => {
        if (!cancelled) setImageSize(null);
      };
      img.src = currentImageSrc;
      return () => {
        cancelled = true;
      };
    }, [currentImageSrc]);

    const handleImageError = () => {
      setImageLoadFailed(true);
      if (reportedImageErrorRef.current !== currentImageSrc) {
        reportedImageErrorRef.current = currentImageSrc ?? null;
        onTraceImageError?.();
      }
    };

    // Trace font loading: wait for the selected underdrawing font before
    // treating the render as ready, and report loading or failure.
    const [traceFontStatus, setTraceFontStatus] = useState<'ready' | 'loading' | 'error'>('ready');
    useEffect(() => {
      if (traceSettings.type !== 'char' || !traceSettings.enabled) return;
      if (typeof document === 'undefined' || !document.fonts) {
        setTraceFontStatus('ready');
        return;
      }
      let cancelled = false;
      setTraceFontStatus('loading');
      document.fonts
        .load(`400 ${effectiveFontSize}px ${fontFamily}`)
        .then(() => document.fonts.ready)
        .then(() => {
          if (!cancelled) setTraceFontStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setTraceFontStatus('error');
        });
      return () => {
        cancelled = true;
      };
    }, [traceSettings.type, traceSettings.enabled, fontFamily, effectiveFontSize, charToRender]);

    if (!traceSettings.enabled) return null;

    // Center-anchored scale transformation around (half, half). The same
    // transform is applied to the content layer and to the handles layer.
    const contentTransform = `translate(${offsetX}, ${offsetY}) translate(${half}, ${half}) scale(${scale}) translate(${-half}, ${-half})`;

    // Image bounding box, fitted inside the EM square with the real aspect
    // ratio. A square image keeps the previous 0, 0, upm, upm frame.
    const aspect =
      imageSize && imageSize.width > 0 && imageSize.height > 0
        ? imageSize.width / imageSize.height
        : 1;
    const imgBoxW = aspect >= 1 ? upm : upm * aspect;
    const imgBoxH = aspect >= 1 ? upm / aspect : upm;
    const imgBoxX = (upm - imgBoxW) / 2;
    const imgBoxY = (upm - imgBoxH) / 2;

    const activeBoxX = traceSettings.type === 'char' ? charBoxX : imgBoxX;
    const activeBoxY = traceSettings.type === 'char' ? charBoxY : imgBoxY;
    const activeBoxW = traceSettings.type === 'char' ? charBoxSize : imgBoxW;
    const activeBoxH = traceSettings.type === 'char' ? charBoxSize : imgBoxH;

    const handleStroke = isLight ? '#0284c7' : '#38bdf8';

    return (
      <>
        <g
          className="trace-reference-layer"
          opacity={traceSettings.opacity ?? TRACE_DEFAULT_OPACITY}
          transform={contentTransform}
        >
          {traceSettings.type === 'char' ? (
            <g>
              {/* Standard OpenType EM/Baseline Rendering without double-shrinking */}
              <g transform={`rotate(${traceSettings.rotation || 0}, ${half}, ${half})`}>
                <text
                  x={anchorX}
                  y={effectiveY}
                  textAnchor="middle"
                  dominantBaseline={dominantBaseline}
                  fontSize={effectiveFontSize}
                  fontFamily={fontFamily}
                  fill={isLight ? '#0284c7' : '#38bdf8'}
                  className="font-normal pointer-events-none select-none"
                >
                  {charToRender}
                </text>
              </g>

              {/* In Trace Adjust Mode: Interactive Move Backdrop for Char */}
              {isAdjustMode && (
                <rect
                  x={charBoxX}
                  y={charBoxY}
                  width={charBoxSize}
                  height={charBoxSize}
                  fill="transparent"
                  stroke={handleStroke}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="6 4"
                  className="cursor-move pointer-events-auto hover:stroke-emerald-500 transition-colors"
                  onPointerDown={onPointerDownImage}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onDoubleClickReset?.();
                  }}
                />
              )}
            </g>
          ) : (
            (() => {
              if (!currentImageSrc) return null;

              const contrast = traceSettings.contrast ?? 1;
              const brightness = traceSettings.brightness ?? 1;
              const hasFilter = contrast !== 1 || brightness !== 1 || Boolean(traceSettings.grayscale) || Boolean(traceSettings.invert);
              const filterStyle: React.CSSProperties | undefined = hasFilter
                ? {
                    filter: [
                      contrast !== 1 ? `contrast(${contrast})` : '',
                      brightness !== 1 ? `brightness(${brightness})` : '',
                      traceSettings.grayscale ? 'grayscale(100%)' : '',
                      traceSettings.invert ? 'invert(100%)' : '',
                    ]
                      .filter(Boolean)
                      .join(' '),
                  }
                : undefined;

              return (
                <g
                  transform={`
                    rotate(${traceSettings.rotation || 0}, ${half}, ${half})
                    scale(${traceSettings.flipH ? -1 : 1}, ${traceSettings.flipV ? -1 : 1})
                  `}
                  style={{ transformOrigin: `${half}px ${half}px` }}
                >
                  {imageLoadFailed ? (
                    <g>
                      <rect
                        x={imgBoxX}
                        y={imgBoxY}
                        width={imgBoxW}
                        height={imgBoxH}
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="6 4"
                      />
                      <text
                        x={half}
                        y={half}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={28 / z}
                        fill="#e11d48"
                        fontFamily="sans-serif"
                        className="pointer-events-none select-none"
                      >
                        下絵画像を読み込めませんでした
                      </text>
                    </g>
                  ) : (
                    <image
                      href={currentImageSrc}
                      x={imgBoxX}
                      y={imgBoxY}
                      width={imgBoxW}
                      height={imgBoxH}
                      preserveAspectRatio="xMidYMid meet"
                      style={filterStyle}
                      className="pointer-events-none select-none"
                      onError={handleImageError}
                    />
                  )}
                  {isAdjustMode && (
                    <rect
                      x={imgBoxX}
                      y={imgBoxY}
                      width={imgBoxW}
                      height={imgBoxH}
                      fill="transparent"
                      stroke={handleStroke}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="6 4"
                      className="cursor-move pointer-events-auto hover:stroke-emerald-500 transition-colors"
                      onPointerDown={onPointerDownImage}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onDoubleClickReset?.();
                      }}
                    />
                  )}
                </g>
              );
            })()
          )}
        </g>

        {/* Handles, scale tag and font status live in a separate layer with
            the same transform but no opacity, so they stay fully visible
            even when the underdrawing is faint. */}
        <g transform={contentTransform}>
          {/* INTERACTIVE RESIZE BOUNDING BOX & CORNER HANDLES IN ADJUST MODE */}
          {isAdjustMode && (
            <g className="trace-adjust-handles pointer-events-auto select-none">
              {/* Center Cross Indicator */}
              <line
                x1={half - 15 / z}
                y1={half}
                x2={half + 15 / z}
                y2={half}
                stroke={handleStroke}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={half}
                y1={half - 15 / z}
                x2={half}
                y2={half + 15 / z}
                stroke={handleStroke}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />

              {/* Corner Resize Handles */}
              {/* Top-Left (NW) */}
              <g
                transform={`translate(${activeBoxX}, ${activeBoxY})`}
                className="cursor-nwse-resize"
                onPointerDown={(e) => onPointerDownResize?.(e, 'nw')}
              >
                <rect
                  x={-9 / z}
                  y={-9 / z}
                  width={18 / z}
                  height={18 / z}
                  fill={isLight ? '#ffffff' : '#0f172a'}
                  stroke={handleStroke}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  rx={3 / z}
                  className="hover:fill-emerald-400 hover:stroke-emerald-600 transition-colors"
                />
              </g>

              {/* Top-Right (NE) */}
              <g
                transform={`translate(${activeBoxX + activeBoxW}, ${activeBoxY})`}
                className="cursor-nesw-resize"
                onPointerDown={(e) => onPointerDownResize?.(e, 'ne')}
              >
                <rect
                  x={-9 / z}
                  y={-9 / z}
                  width={18 / z}
                  height={18 / z}
                  fill={isLight ? '#ffffff' : '#0f172a'}
                  stroke={handleStroke}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  rx={3 / z}
                  className="hover:fill-emerald-400 hover:stroke-emerald-600 transition-colors"
                />
              </g>

              {/* Bottom-Right (SE) */}
              <g
                transform={`translate(${activeBoxX + activeBoxW}, ${activeBoxY + activeBoxH})`}
                className="cursor-nwse-resize"
                onPointerDown={(e) => onPointerDownResize?.(e, 'se')}
              >
                <rect
                  x={-9 / z}
                  y={-9 / z}
                  width={18 / z}
                  height={18 / z}
                  fill={isLight ? '#ffffff' : '#0f172a'}
                  stroke={handleStroke}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  rx={3 / z}
                  className="hover:fill-emerald-400 hover:stroke-emerald-600 transition-colors"
                />
              </g>

              {/* Bottom-Left (SW) */}
              <g
                transform={`translate(${activeBoxX}, ${activeBoxY + activeBoxH})`}
                className="cursor-nesw-resize"
                onPointerDown={(e) => onPointerDownResize?.(e, 'sw')}
              >
                <rect
                  x={-9 / z}
                  y={-9 / z}
                  width={18 / z}
                  height={18 / z}
                  fill={isLight ? '#ffffff' : '#0f172a'}
                  stroke={handleStroke}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  rx={3 / z}
                  className="hover:fill-emerald-400 hover:stroke-emerald-600 transition-colors"
                />
              </g>

              {/* Scale % Tag at Top-Center of Bounding Box */}
              <g
                transform={`translate(${half}, ${activeBoxY - 14 / z})`}
                className="pointer-events-none"
              >
                <rect
                  x={-42 / z}
                  y={-14 / z}
                  width={84 / z}
                  height={20 / z}
                  rx={10 / z}
                  fill={isLight ? '#0284c7' : '#0369a1'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize={11 / z}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {Math.round(scale * 100)}%
                </text>
              </g>
            </g>
          )}

          {/* Trace font load status for character underdrawings */}
          {traceSettings.type === 'char' && traceFontStatus !== 'ready' && (
            <g
              transform={`translate(${half}, ${activeBoxY + activeBoxH + 18 / z})`}
              className="pointer-events-none"
            >
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill={traceFontStatus === 'error' ? '#e11d48' : isLight ? '#b45309' : '#fbbf24'}
                fontSize={12 / z}
                fontFamily="sans-serif"
              >
                {traceFontStatus === 'error'
                  ? '下絵フォント読込失敗（代替フォントで表示）'
                  : '下絵フォント読込中…'}
              </text>
            </g>
          )}
        </g>
      </>
    );
  }
);
