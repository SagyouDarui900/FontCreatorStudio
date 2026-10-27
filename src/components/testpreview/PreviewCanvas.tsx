import React, { useMemo } from 'react';
import { FontProject } from '../../types';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface PreviewCanvasProps {
  project: FontProject;
  state: TestPreviewState;
  waterfallSizes?: number[];
  patternIdPrefix?: string;
  isTopMode?: boolean;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  project,
  state,
  waterfallSizes = [16, 20, 24, 32, 44, 60, 80],
  patternIdPrefix = 'split',
  isTopMode = false,
}) => {
  const {
    testText,
    writingMode,
    fontSize,
    lineHeight,
    letterSpacing,
    textAlign,
    useTsume,
    showSpaceMarkers,
    showGenkoGrid,
    showCharBoxes,
    showNotebookGuides,
    autoBalanceMargins,
    isWaterfall,
    fontFamilyName,
    errorMsg,
    selectedCharInfo,
    setSelectedCharInfo,
    adjustDx,
    setAdjustDx,
    adjustDy,
    setAdjustDy,
    adjustScaleX,
    setAdjustScaleX,
    adjustScaleY,
    setAdjustScaleY,
    handleVerticalWheel,
    setIsSideAdjusterOpen,
    setMobileTab,
    setHoveredGlyphInfo,
    isFullscreen,
    isLight,
    getGlyphMetric,
  } = state;

  // Highlight space tokens, character boxes, and interactive character tokens
  const renderedText = useMemo(() => {
    const lines = testText.split('\n');

    return lines.map((line, lIdx) => {
      const parts = [];
      const chars: string[] = Array.from(line);

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const code = ch.codePointAt(0) || ch.charCodeAt(0);
        const isSelected = selectedCharInfo && selectedCharInfo.unicode === code;

        if (ch === '　') {
          // 全角空白 U+3000
          if (showSpaceMarkers || showCharBoxes) {
            parts.push(
              <span
                key={`${lIdx}-${i}-fullspace`}
                className={`inline-block relative ${
                  isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950 text-amber-300'
                } border border-dashed ${isLight ? 'border-amber-400' : 'border-amber-600'}`}
                style={{ width: '1em', height: '1em', lineHeight: '1em', textAlign: 'center' }}
                title="全角空白 (U+3000)"
              >
                <span className="opacity-40 text-[0.6em] select-none">□</span>
              </span>
            );
          } else {
            parts.push(<span key={`${lIdx}-${i}-fullspace`}>　</span>);
          }
        } else if (ch === ' ') {
          // 半角空白 U+0020
          if (showSpaceMarkers || showCharBoxes) {
            parts.push(
              <span
                key={`${lIdx}-${i}-halfspace`}
                className={`inline-block relative ${
                  isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-950 text-sky-300'
                } border border-dashed ${isLight ? 'border-sky-400' : 'border-sky-600'}`}
                style={{ width: '0.5em', height: '1em', lineHeight: '1em', textAlign: 'center' }}
                title="半角空白 (U+0020)"
              >
                <span className="opacity-40 text-[0.5em] select-none">␣</span>
              </span>
            );
          } else {
            parts.push(<span key={`${lIdx}-${i}-halfspace`}> </span>);
          }
        } else if (showCharBoxes) {
          // Character Box mode (仮想ボディ枠と中心線の表示 + インタラクティブ選択)
          const metric = getGlyphMetric(ch);
          const hasCustomTransform =
            isSelected &&
            (adjustDx !== 0 || adjustDy !== 0 || adjustScaleX !== 100 || adjustScaleY !== 100);

          parts.push(
            <span
              key={`${lIdx}-${i}-charbox`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCharInfo({
                  char: ch,
                  unicode: code,
                  lineIndex: lIdx,
                  charIndex: i,
                });
                setMobileTab('adjust');
                setAdjustDx(0);
                setAdjustDy(0);
                setAdjustScaleX(100);
                setAdjustScaleY(100);
              }}
              onMouseEnter={() => metric && setHoveredGlyphInfo(metric)}
              className={`inline-flex items-center justify-center relative border border-dashed transition-all cursor-pointer select-none ${
                isSelected
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/25 border-emerald-500 text-emerald-950 dark:text-emerald-100 z-10'
                  : !metric
                  ? isLight
                    ? 'border-stone-400/50 bg-stone-100/40 text-stone-500 hover:border-emerald-500/60 hover:bg-emerald-50/20'
                    : 'border-stone-600/50 bg-stone-900/40 text-stone-400 hover:border-emerald-400/60 hover:bg-emerald-950/20'
                  : metric && Math.abs(metric.diff) > 25 && !autoBalanceMargins
                  ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/25'
                  : isLight
                  ? 'border-emerald-500/40 bg-emerald-50/25 hover:bg-emerald-100/60 hover:border-emerald-500'
                  : 'border-emerald-400/40 bg-emerald-950/25 hover:bg-emerald-900/60 hover:border-emerald-400'
              }`}
              style={{
                width: '1em',
                minWidth: '1em',
                height: '1em',
                minHeight: '1em',
                lineHeight: '1em',
                textAlign: 'center',
                boxSizing: 'border-box',
                transform: hasCustomTransform
                  ? `translate(${adjustDx * (fontSize / (project.metadata.unitsPerEm || 1000))}px, ${-adjustDy * (fontSize / (project.metadata.unitsPerEm || 1000))}px) scale(${adjustScaleX / 100}, ${adjustScaleY / 100})`
                  : undefined,
                transformOrigin: 'center center',
              }}
              title={
                !metric
                  ? `「${ch}」 (未作成・システムフォールバック / クリックで作字エディタへジャンプ)`
                  : metric
                  ? `「${ch}」 (自作グリフ / 送り幅:${metric.adv} 左余白:${metric.lsb} 右余白:${metric.rsb} 差:${metric.diff > 0 ? '+' : ''}${metric.diff})`
                  : `「${ch}」 (クリックで簡易移動・変形 / メイン編集へジャンプ)`
              }
            >
              {/* Center vertical crosshair */}
              <span className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-emerald-500/25 pointer-events-none" />
              {/* Center horizontal crosshair */}
              <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-emerald-500/25 pointer-events-none" />
              {ch}
            </span>
          );
        } else {
          // Interactive Character Token mode
          const metric = getGlyphMetric(ch);
          const hasCustomTransform =
            isSelected &&
            (adjustDx !== 0 || adjustDy !== 0 || adjustScaleX !== 100 || adjustScaleY !== 100);

          parts.push(
            <span
              key={`${lIdx}-${i}-${ch}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCharInfo({
                  char: ch,
                  unicode: code,
                  lineIndex: lIdx,
                  charIndex: i,
                });
                setIsSideAdjusterOpen(true);
                setMobileTab('adjust');
                setAdjustDx(0);
                setAdjustDy(0);
                setAdjustScaleX(100);
                setAdjustScaleY(100);
              }}
              onMouseEnter={() => metric && setHoveredGlyphInfo(metric)}
              className={`inline-block relative transition-all cursor-pointer select-none rounded px-0.5 ${
                isSelected
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 z-10'
                  : !metric
                  ? 'hover:bg-stone-500/15 hover:ring-1 hover:ring-stone-400/60 opacity-90'
                  : 'hover:bg-emerald-500/15 hover:ring-1 hover:ring-emerald-400/80'
              }`}
              style={{
                transform: hasCustomTransform
                  ? `translate(${adjustDx * (fontSize / (project.metadata.unitsPerEm || 1000))}px, ${-adjustDy * (fontSize / (project.metadata.unitsPerEm || 1000))}px) scale(${adjustScaleX / 100}, ${adjustScaleY / 100})`
                  : undefined,
                transformOrigin: 'center center',
              }}
              title={
                !metric
                  ? `「${ch}」 (未作成・システムフォールバック / クリックで作字へジャンプ)`
                  : `「${ch}」 (自作グリフ / クリックで位置・変形ツール表示)`
              }
            >
              {ch}
            </span>
          );
        }
      }

      return (
        <div key={lIdx} className="relative group/line">
          <div className="relative z-10">
            {parts}
            {lIdx < lines.length - 1 ? '\n' : ''}
          </div>
        </div>
      );
    });
  }, [
    testText,
    showSpaceMarkers,
    showCharBoxes,
    autoBalanceMargins,
    isLight,
    selectedCharInfo,
    adjustDx,
    adjustDy,
    adjustScaleX,
    adjustScaleY,
    fontSize,
    project.metadata.unitsPerEm,
    getGlyphMetric,
    setSelectedCharInfo,
    setMobileTab,
    setIsSideAdjusterOpen,
    setAdjustDx,
    setAdjustDy,
    setAdjustScaleX,
    setAdjustScaleY,
    setHoveredGlyphInfo,
  ]);

  const patternId = `notebook-ruling-${writingMode === 'vertical' ? 'v' : 'h'}-${patternIdPrefix}`;

  const containerClassName = isTopMode
    ? `flex-1 min-h-0 overflow-auto overscroll-contain p-3 sm:p-8 select-text relative min-h-[250px] ${
        isLight ? 'bg-[#eef4f0]' : 'bg-[#0b100d]'
      } ${
        showGenkoGrid
          ? isLight
            ? 'bg-[radial-gradient(#c8ded3_1px,transparent_1px)] [background-size:24px_24px]'
            : 'bg-[radial-gradient(#25362b_1px,transparent_1px)] [background-size:24px_24px]'
          : ''
      }`
    : `order-1 md:order-2 w-full h-[40vh] sm:h-[44vh] md:h-full md:flex-1 shrink-0 md:shrink min-h-0 flex flex-col overflow-auto overscroll-contain p-2.5 sm:p-8 select-text relative border-b md:border-b-0 ${
        isLight ? 'bg-[#eef4f0]' : 'bg-[#0b100d]'
      } ${
        showGenkoGrid
          ? isLight
            ? 'bg-[radial-gradient(#c8ded3_1px,transparent_1px)] [background-size:24px_24px]'
            : 'bg-[radial-gradient(#25362b_1px,transparent_1px)] [background-size:24px_24px]'
          : ''
      }`;

  return (
    <div className={containerClassName}>
      {errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded text-rose-700 text-xs">
          {errorMsg}
        </div>
      ) : isWaterfall ? (
        <div
          className={`mx-auto flex flex-col ${
            isTopMode
              ? isFullscreen
                ? 'max-w-6xl space-y-8 py-4'
                : 'max-w-4xl space-y-6'
              : 'max-w-5xl space-y-8 py-4'
          }`}
        >
          {waterfallSizes.map((size) => (
            <div
              key={size}
              className={`flex flex-col space-y-1.5 border-b pb-4 ${
                isLight ? 'border-emerald-200' : 'border-[#1f2d24]'
              }`}
            >
              <span className={`text-[10px] font-mono ${isLight ? 'text-stone-500' : 'text-emerald-500'}`}>
                {size}px
              </span>
              <div
                style={{
                  fontFamily: `'${fontFamilyName}', sans-serif`,
                  fontSize: `${size}px`,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}em`,
                  textAlign: textAlign,
                  writingMode: writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: writingMode === 'vertical' ? 'mixed' : undefined,
                  fontFeatureSettings: useTsume ? '"palt" 1, "pkna" 1' : 'normal',
                }}
                className={`whitespace-pre-wrap ${writingMode === 'vertical' ? 'min-h-[140px] w-max break-normal overflow-x-auto py-1' : 'break-words'} ${isLight ? 'text-stone-900' : 'text-emerald-100'}`}
              >
                {renderedText}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Full-Height Paper Layout for Proofing */
        <div className="w-full flex items-start min-h-full py-1 sm:py-2">
          <div
            onWheel={handleVerticalWheel}
            className={`transition-all rounded-lg shadow-sm border p-4 sm:p-12 mx-auto ${
              writingMode === 'vertical'
                ? 'min-w-[280px] sm:min-w-[360px] max-w-full overflow-x-auto overscroll-contain min-h-[calc(100dvh-260px)] md:min-h-[calc(100vh-220px)]'
                : 'w-full max-w-3xl lg:max-w-4xl min-h-[calc(100dvh-260px)] md:min-h-[calc(100vh-220px)]'
            } ${
              isLight
                ? 'bg-white border-[#d8e6df]'
                : 'bg-[#151e18] border-[#25362b]'
            }`}
          >
            {/* Notebook Guide Legend Badge */}
            {showNotebookGuides && (
              <div className="mb-3 px-2.5 py-1 rounded bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 text-[10px] flex flex-wrap items-center gap-3 shrink-0 select-none pointer-events-none opacity-90">
                <span className="font-bold text-stone-700 dark:text-stone-300">ノートガイド凡例:</span>
                {writingMode === 'horizontal' ? (
                  <>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 bg-indigo-500 rounded-full"></span>
                      <span>ベースライン (主罫線・実線)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dashed border-emerald-500"></span>
                      <span>中心軸線 (破線)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dotted border-sky-400"></span>
                      <span>上限線 Cap (点線)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dashed border-rose-500"></span>
                      <span>下限線 Base (一点鎖線)</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dashed border-emerald-500"></span>
                      <span>縦中心軸線 (破線)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dotted border-sky-400"></span>
                      <span>右境界線 (点線)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-3.5 h-0.5 border-b-2 border-dashed border-rose-500"></span>
                      <span>左境界線 (一点鎖線)</span>
                    </span>
                  </>
                )}
              </div>
            )}

            <div className={`relative ${writingMode === 'vertical' ? 'w-max min-w-full' : 'w-full overflow-hidden'}`}>
              {/* Multi-line Notebook Ruling Layer */}
              {showNotebookGuides && (
                writingMode === 'horizontal' ? (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{ minHeight: '100%' }}
                  >
                    <defs>
                      <pattern
                        id={patternId}
                        width="100%"
                        height={fontSize * lineHeight}
                        patternUnits="userSpaceOnUse"
                      >
                        {/* Top Cap Line */}
                        <line
                          x1="0"
                          y1={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.1}
                          x2="100%"
                          y2={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.1}
                          stroke={isLight ? '#0284c7' : '#38bdf8'}
                          strokeDasharray="3 3"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                        {/* Center Axis Line */}
                        <line
                          x1="0"
                          y1={(fontSize * lineHeight) / 2}
                          x2="100%"
                          y2={(fontSize * lineHeight) / 2}
                          stroke={isLight ? '#059669' : '#10b981'}
                          strokeDasharray="6 4"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                        {/* Baseline (Main Ruled Line) */}
                        <line
                          x1="0"
                          y1={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.8}
                          x2="100%"
                          y2={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.8}
                          stroke={isLight ? '#4f46e5' : '#818cf8'}
                          strokeWidth="1.5"
                          strokeOpacity="0.85"
                        />
                        {/* Bottom Descender Line */}
                        <line
                          x1="0"
                          y1={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.95}
                          x2="100%"
                          y2={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.95}
                          stroke={isLight ? '#e11d48' : '#fb7185'}
                          strokeDasharray="8 3 2 3"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#${patternId})`} />
                  </svg>
                ) : (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{ minHeight: '100%' }}
                  >
                    <defs>
                      <pattern
                        id={patternId}
                        width={fontSize * lineHeight}
                        height="100%"
                        patternUnits="userSpaceOnUse"
                      >
                        {/* Left Boundary */}
                        <line
                          x1={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.05}
                          y1="0"
                          x2={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.05}
                          y2="100%"
                          stroke={isLight ? '#e11d48' : '#fb7185'}
                          strokeDasharray="8 3 2 3"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                        {/* Vertical Center Axis */}
                        <line
                          x1={(fontSize * lineHeight) / 2}
                          y1="0"
                          x2={(fontSize * lineHeight) / 2}
                          y2="100%"
                          stroke={isLight ? '#059669' : '#10b981'}
                          strokeDasharray="6 4"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                        {/* Right Boundary */}
                        <line
                          x1={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.95}
                          y1="0"
                          x2={((lineHeight - 1) * fontSize) / 2 + fontSize * 0.95}
                          y2="100%"
                          stroke={isLight ? '#0284c7' : '#38bdf8'}
                          strokeDasharray="3 3"
                          strokeWidth="1"
                          strokeOpacity="0.8"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#${patternId})`} />
                  </svg>
                )
              )}

              <div
                style={{
                  fontFamily: `'${fontFamilyName}', sans-serif`,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}em`,
                  textAlign: textAlign,
                  writingMode: writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: writingMode === 'vertical' ? 'mixed' : undefined,
                  fontFeatureSettings: useTsume ? '"palt" 1, "pkna" 1' : 'normal',
                }}
                className={`relative z-10 whitespace-pre-wrap select-text min-h-[300px] ${
                  isLight ? 'text-stone-900' : 'text-emerald-50'
                } ${writingMode === 'vertical' ? 'h-full w-max break-normal' : 'w-full break-words'}`}
              >
                {renderedText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
