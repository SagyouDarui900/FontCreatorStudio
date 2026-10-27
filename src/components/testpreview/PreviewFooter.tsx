import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { FontProject } from '../../types';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface PreviewFooterProps {
  project: FontProject;
  state: TestPreviewState;
  onClose: () => void;
}

export const PreviewFooter: React.FC<PreviewFooterProps> = ({
  project,
  state,
  onClose,
}) => {
  const {
    hoveredGlyphInfo,
    writingMode,
    fontSize,
    autoBalanceMargins,
    isFullscreen,
    setIsFullscreen,
    isLight,
  } = state;

  return (
    <div
      className={`px-3 sm:px-4 py-1.5 sm:py-2 border-t flex items-center justify-between text-xs shrink-0 gap-2 ${
        isLight ? 'bg-[#edf5f0] border-[#d8e6df]' : 'bg-[#18231c] border-[#25362b]'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] overflow-x-auto min-w-0">
        {hoveredGlyphInfo ? (
          <div className="flex items-center space-x-1.5 font-mono whitespace-nowrap">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              「{hoveredGlyphInfo.char}」
            </span>
            <span className="hidden sm:inline">(U+{hoveredGlyphInfo.unicode.toString(16).toUpperCase()})</span>
            <span>送り: {hoveredGlyphInfo.adv}</span>
            <span className="hidden sm:inline">左: {hoveredGlyphInfo.lsb}px</span>
            <span className="hidden sm:inline">右: {hoveredGlyphInfo.rsb}px</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border inline-flex items-center gap-1 ${
                Math.abs(hoveredGlyphInfo.diff) <= 20
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : isLight
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
              title={
                Math.abs(hoveredGlyphInfo.diff) <= 20
                  ? '左右の余白バランスが均等に整っています'
                  : hoveredGlyphInfo.diff < 0
                  ? `左余白が狭く左側に偏っています (差: ${hoveredGlyphInfo.diff}px)`
                  : `右余白が狭く右側に偏っています (差: +${hoveredGlyphInfo.diff}px)`
              }
            >
              {Math.abs(hoveredGlyphInfo.diff) <= 20 ? (
                <>
                  <span className="text-emerald-700 dark:text-emerald-400">✓</span>
                  <span>均等</span>
                </>
              ) : hoveredGlyphInfo.diff < 0 ? (
                <>
                  <span className="text-amber-700 dark:text-amber-400">◀</span>
                  <span>左寄 ({Math.abs(Math.round(hoveredGlyphInfo.diff / 2))}px)</span>
                </>
              ) : (
                <>
                  <span className="text-amber-700 dark:text-amber-400">▶</span>
                  <span>右寄 ({Math.round(hoveredGlyphInfo.diff / 2)}px)</span>
                </>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 whitespace-nowrap text-stone-600 dark:text-emerald-400">
            <span className="font-medium truncate max-w-[120px] sm:max-w-none">
              {project.metadata.familyName || 'MyFont'}
            </span>
            <span className="font-mono text-stone-400">|</span>
            <span className="font-mono">
              {writingMode === 'vertical' ? '縦組' : '横組'} ({fontSize}px)
            </span>
            <span className={`hidden sm:inline text-[10px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {autoBalanceMargins ? '左右センタリング' : '位置優先'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-semibold border transition-colors flex items-center space-x-1 cursor-pointer ${
            isFullscreen
              ? isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                : 'bg-emerald-950 border-emerald-700 text-emerald-200 hover:bg-emerald-900'
              : isLight
              ? 'bg-white border-stone-300 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
              : 'bg-[#1e2a22] border-[#2b3d30] text-emerald-200 hover:bg-[#25362b]'
          }`}
          title={isFullscreen ? '通常表示に戻す (F / Esc)' : '全画面表示モード (ショートカット: F)'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">通常表示</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">全画面</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className={`h-7 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            isLight
              ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
              : 'bg-emerald-700 hover:bg-emerald-600 text-white'
          }`}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
