import React, { memo, useMemo, useRef, useState } from 'react';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { getThemeClasses, type ThemeMode } from '../../utils/theme';
import type { FontProject, GlyphData } from '../../types';
import {
  CHARACTER_LIST_GROUPS,
  countWritten,
  getCharacterListChars,
  getRadicalSections,
  isGlyphWritten,
  uniqueChars,
  type CharacterListGroupId,
  type CharacterListItem,
} from './characterListData';

export interface CharacterListTabProps {
  project: FontProject;
  selectedUnicode: number;
  onSelectGlyph: (unicode: number, char: string) => void;
  theme: ThemeMode;
}

type ThemeClasses = ReturnType<typeof getThemeClasses>;

interface CharacterCellProps {
  item: CharacterListItem;
  glyph: GlyphData | undefined;
  unitsPerEm: number;
  isSelected: boolean;
  onSelect: (code: number, char: string) => void;
  themeClasses: ThemeClasses;
}

/**
 * One character in the specimen list. A written glyph shows its own
 * outlines; an unwritten glyph shows the character itself in a faint
 * semi-transparent system font, so missing characters stay visible.
 */
const CharacterCell = memo(
  ({ item, glyph, unitsPerEm, isSelected, onSelect, themeClasses }: CharacterCellProps) => {
    const written = isGlyphWritten(glyph);
    const codeLabel = `U+${item.code.toString(16).toUpperCase().padStart(4, '0')}`;
    return (
      <button
        type="button"
        onClick={() => onSelect(item.code, item.char)}
        title={written ? `${item.char} ${codeLabel}` : `${item.char} ${codeLabel}（未作成）`}
        aria-label={written ? `${item.char} ${codeLabel}` : `${item.char} ${codeLabel} 未作成`}
        aria-pressed={isSelected}
        className={`w-full aspect-square min-w-0 rounded flex items-center justify-center cursor-pointer border transition-colors ${
          isSelected
            ? `${themeClasses.accentBadge} border-current`
            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
        }`}
      >
        {written && glyph ? (
          <GlyphPreviewSvg
            contours={glyph.contours}
            unitsPerEm={unitsPerEm}
            className="w-full h-full p-[3px]"
          />
        ) : (
          <span className="opacity-30 text-[20px] leading-none select-none">
            {item.char}
          </span>
        )}
      </button>
    );
  }
);

function CharacterCells({
  chars,
  glyphs,
  unitsPerEm,
  selectedUnicode,
  onSelect,
  themeClasses,
}: {
  chars: CharacterListItem[];
  glyphs: Record<number, GlyphData>;
  unitsPerEm: number;
  selectedUnicode: number;
  onSelect: (code: number, char: string) => void;
  themeClasses: ThemeClasses;
}) {
  return (
    <div
      className="grid gap-1 content-start"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))' }}
    >
      {chars.map((item) => (
        <CharacterCell
          key={item.code}
          item={item}
          glyph={glyphs[item.code]}
          unitsPerEm={unitsPerEm}
          isSelected={selectedUnicode === item.code}
          onSelect={onSelect}
          themeClasses={themeClasses}
        />
      ))}
    </div>
  );
}

export const CharacterListTab: React.FC<CharacterListTabProps> = ({
  project,
  selectedUnicode,
  onSelectGlyph,
  theme,
}) => {
  const themeClasses = getThemeClasses(theme);
  const [activeGroup, setActiveGroup] = useState<CharacterListGroupId>('hiragana');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const unitsPerEm = project.metadata?.unitsPerEm || 1000;
  const glyphs = project.glyphs || {};

  const flatChars = useMemo(
    () => (activeGroup === 'radical' ? [] : getCharacterListChars(activeGroup)),
    [activeGroup]
  );
  const radicalSections = useMemo(
    () => (activeGroup === 'radical' ? getRadicalSections() : []),
    [activeGroup]
  );
  const progressChars = useMemo(() => {
    if (activeGroup === 'radical') {
      return uniqueChars(radicalSections.flatMap((section) => section.chars));
    }
    return flatChars;
  }, [activeGroup, flatChars, radicalSections]);
  const writtenCount = useMemo(
    () => countWritten(progressChars, glyphs),
    [progressChars, glyphs]
  );
  const totalCount = progressChars.length;
  const progressPercent = totalCount > 0 ? Math.round((writtenCount / totalCount) * 100) : 0;

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current.get(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Group selector */}
      <div
        className={`flex flex-wrap gap-1 px-2 py-2 border-b shrink-0 ${themeClasses.border}`}
        role="tablist"
        aria-label="文字の種類"
      >
        {CHARACTER_LIST_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={activeGroup === group.id}
            onClick={() => setActiveGroup(group.id)}
            title={`${group.label}（${group.hint}）`}
            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer border transition-colors ${
              activeGroup === group.id
                ? themeClasses.activeTool
                : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className={`px-3 py-1.5 border-b shrink-0 ${themeClasses.border}`}>
        <div className={`flex items-center justify-between text-[11px] ${themeClasses.textMuted}`}>
          <span>
            作成済み {writtenCount} / {totalCount}字
          </span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
        <div
          className={`mt-1 h-1 rounded-full overflow-hidden ${themeClasses.canvasOuterBg}`}
          role="progressbar"
          aria-valuenow={writtenCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label="作成済みの文字の割合"
        >
          <div
            className="h-full bg-emerald-500 transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Radical index */}
      {activeGroup === 'radical' && (
        <div
          className={`flex flex-wrap gap-0.5 px-2 py-1.5 border-b shrink-0 max-h-20 overflow-y-auto ${themeClasses.border}`}
          aria-label="部首の一覧"
        >
          {radicalSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              title={`${section.name}（${section.strokes}画）`}
              className={`w-6 h-6 rounded text-xs leading-none cursor-pointer border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              {section.char}
            </button>
          ))}
        </div>
      )}

      {/* Character list */}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 ${themeClasses.canvasOuterBg}`}
      >
        {activeGroup === 'radical' ? (
          radicalSections.map((section) => (
            <div
              key={section.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(section.id, el);
                else sectionRefs.current.delete(section.id);
              }}
              className="mb-3 scroll-mt-2"
            >
              <div
                className={`flex items-baseline gap-1.5 px-1 pb-1 text-xs ${themeClasses.textMuted}`}
              >
                <span className={`text-base font-bold leading-none ${themeClasses.textPrimary}`}>
                  {section.char}
                </span>
                <span className="font-bold truncate">{section.name}</span>
                <span className="shrink-0 tabular-nums">
                  {section.strokes}画・{section.chars.length}字
                </span>
              </div>
              <CharacterCells
                chars={section.chars}
                glyphs={glyphs}
                unitsPerEm={unitsPerEm}
                selectedUnicode={selectedUnicode}
                onSelect={onSelectGlyph}
                themeClasses={themeClasses}
              />
            </div>
          ))
        ) : (
          <CharacterCells
            chars={flatChars}
            glyphs={glyphs}
            unitsPerEm={unitsPerEm}
            selectedUnicode={selectedUnicode}
            onSelect={onSelectGlyph}
            themeClasses={themeClasses}
          />
        )}
      </div>
    </div>
  );
};
