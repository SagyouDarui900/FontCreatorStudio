import React, { memo, useMemo } from 'react';
import { Lock, MoreHorizontal } from 'lucide-react';
import { GlyphData } from '../../types';
import { groupContoursForRendering } from '../../utils/pathUtils';
import { DAKUTEN_MAPPINGS } from '../../utils/dakutenHelper';
import { KANA_PAIRS } from '../../data/unicodeTables';
import { GridDensity, ContextMenuItem } from './types';

interface GlyphGridCardProps {
  item: ContextMenuItem;
  isSelected: boolean;
  glyphData?: GlyphData;
  isLight: boolean;
  density: GridDensity;
  unitsPerEm?: number;
  onSelectGlyph: (code: number, char: string) => void;
  onContextMenu: (e: React.MouseEvent, item: ContextMenuItem) => void;
}

export const GlyphGridCard = memo(
  ({
    item,
    isSelected,
    glyphData,
    isLight,
    density,
    unitsPerEm = 1000,
    onSelectGlyph,
    onContextMenu,
  }: GlyphGridCardProps) => {
    const strokeCount = glyphData?.contours?.length || 0;
    const hasContours = strokeCount > 0;
    const renderGroups = useMemo(() => {
      if (!hasContours || !glyphData?.contours) return [];
      return groupContoursForRendering(glyphData.contours);
    }, [hasContours, glyphData?.contours]);

    const pair = KANA_PAIRS[item.char];
    const dakutenInfo = DAKUTEN_MAPPINGS[item.char];

    // Explicit card height and font sizing to prevent CSS Grid row track collapse and overlapping
    const cardDimensionClass =
      density === 'large'
        ? 'h-[92px] min-h-[92px]'
        : density === 'medium'
        ? 'h-[76px] min-h-[76px]'
        : 'h-[62px] min-h-[62px]';

    const fallbackFontSize =
      density === 'large'
        ? 'text-3xl'
        : density === 'medium'
        ? 'text-2xl'
        : 'text-lg';

    return (
      <div
        onClick={() => onSelectGlyph(item.code, item.char)}
        onContextMenu={(e) => onContextMenu(e, item)}
        title={`「${item.char}」 U+${item.code.toString(16).toUpperCase().padStart(4, '0')} (${item.code})${
          hasContours ? ` · 作成済 (${strokeCount}画)` : ' · 未作成'
        } - 右クリックでメニュー`}
        className={`group relative flex flex-col items-center justify-between p-1 rounded-lg border w-full ${cardDimensionClass} cursor-pointer transition-all duration-150 select-none overflow-hidden ${
          isSelected
            ? isLight
              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/40 z-10'
              : 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 z-10'
            : hasContours
            ? isLight
              ? 'bg-white border-emerald-300/80 text-stone-900 hover:border-emerald-500'
              : 'bg-[#18231c] border-emerald-700/70 text-emerald-100 hover:border-emerald-400'
            : isLight
            ? 'bg-stone-50/90 border-stone-200/90 text-stone-400 hover:border-emerald-300 hover:bg-white hover:text-stone-700'
            : 'bg-[#131b16] border-[#223126] text-emerald-600/60 hover:border-emerald-700 hover:text-emerald-300'
        }`}
      >
        {/* Subtle Manuscript Guide Crosshairs */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
          <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
        </div>

        {/* Top Header: Unicode Hex code + Status indicator */}
        <div className="w-full flex items-center justify-between px-1 pt-0.5 z-10 leading-none shrink-0 gap-0.5">
          <span
            className={`font-mono text-[9px] tracking-tight truncate max-w-[80%] ${
              isSelected
                ? isLight
                  ? 'text-emerald-900 font-bold'
                  : 'text-emerald-300 font-bold'
                : hasContours
                ? isLight
                  ? 'text-emerald-800 font-semibold'
                  : 'text-emerald-400 font-semibold'
                : isLight
                ? 'text-stone-400'
                : 'text-emerald-800'
            }`}
          >
            {item.code.toString(16).toUpperCase().padStart(4, '0')}
          </span>

          {/* Status Indicator */}
          <div className="flex items-center space-x-1 shrink-0">
            {glyphData?.locked && (
              <span title="編集ロック中">
                <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
              </span>
            )}
            {hasContours ? (
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                  isLight ? 'bg-emerald-600' : 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                }`}
                title={`作成済 (${strokeCount}画)`}
              />
            ) : (
              <span className="inline-block w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700 opacity-30 shrink-0" />
            )}
          </div>
        </div>

        {/* Single Center Character Display */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0 min-w-0 overflow-hidden relative z-10 p-0.5 pointer-events-none">
          {hasContours && renderGroups.length > 0 ? (
            <svg
              viewBox={`0 0 ${unitsPerEm} ${unitsPerEm}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full max-w-[88%] max-h-[88%] object-contain"
            >
              {renderGroups.map((group) => (
                <path
                  key={group.id}
                  d={group.d}
                  fill={
                    isSelected
                      ? isLight
                        ? '#065f46'
                        : '#34d399'
                      : isLight
                      ? '#1f2937'
                      : '#ecfdf5'
                  }
                  stroke={
                    isSelected
                      ? isLight
                        ? '#047857'
                        : '#6ee7b7'
                      : isLight
                      ? '#374151'
                      : '#a7f3d0'
                  }
                  strokeWidth={1}
                  fillRule={group.fillRule}
                />
              ))}
            </svg>
          ) : item.code === 0x3000 ? (
            <div
              className={`text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded border border-dashed text-center leading-tight whitespace-nowrap ${
                isSelected
                  ? isLight
                    ? 'bg-amber-200 border-amber-500 text-amber-950'
                    : 'bg-amber-900 border-amber-400 text-amber-100'
                  : isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-amber-950/60 border-amber-700 text-amber-300'
              }`}
            >
              全角空白
            </div>
          ) : item.code === 0x0020 ? (
            <div
              className={`text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded border border-dashed text-center leading-tight whitespace-nowrap ${
                isSelected
                  ? isLight
                    ? 'bg-sky-200 border-sky-500 text-sky-950'
                    : 'bg-sky-900 border-sky-400 text-sky-100'
                  : isLight
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-sky-950/60 border-sky-700 text-sky-300'
              }`}
            >
              半角空白
            </div>
          ) : (
            <span
              className={`${fallbackFontSize} font-normal leading-none select-none transition-colors truncate ${
                isSelected
                  ? isLight
                    ? 'text-emerald-900 font-medium'
                    : 'text-emerald-200 font-medium'
                  : ''
              }`}
            >
              {item.char}
            </span>
          )}
        </div>

        {/* Bottom Bar: Mini badge if applicable */}
        <div className="w-full flex items-center justify-between px-1 pb-0.5 z-10 leading-none shrink-0 h-2.5">
          {hasContours ? (
            <span className="text-[8px] font-mono text-emerald-700 dark:text-emerald-400 font-bold opacity-80">
              {strokeCount}画
            </span>
          ) : dakutenInfo && dakutenInfo.type === 'seion' && dakutenInfo.daku ? (
            <span className="text-[7px] text-amber-600 dark:text-amber-400 font-semibold opacity-60">
              濁
            </span>
          ) : pair ? (
            <span className="text-[7px] text-indigo-500 dark:text-indigo-400 font-semibold opacity-60">
              小
            </span>
          ) : (
            <span />
          )}

          {/* Context menu hint on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, item);
            }}
            title="メニューを開く"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-stone-300/40 dark:hover:bg-stone-700/40 text-stone-500 dark:text-stone-400 transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.code === nextProps.item.code &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isLight === nextProps.isLight &&
      prevProps.density === nextProps.density &&
      prevProps.glyphData === nextProps.glyphData &&
      prevProps.glyphData?.locked === nextProps.glyphData?.locked &&
      prevProps.glyphData?.contours?.length === nextProps.glyphData?.contours?.length &&
      prevProps.onSelectGlyph === nextProps.onSelectGlyph &&
      prevProps.onContextMenu === nextProps.onContextMenu
    );
  }
);
