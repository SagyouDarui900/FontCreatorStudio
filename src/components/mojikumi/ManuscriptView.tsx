import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BURASAGARI_CHARS, FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';

interface ManuscriptViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  zoom: number;
  charsPerLine: number;
}

interface ManuscriptCell {
  char: string;
  hangingChar?: string;
}

const ROWS = 20;
const COLS = 20;

function createEmptySheet(): ManuscriptCell[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ char: '' }))
  );
}

/**
 * Reflows FormattedLayoutResult into traditional 20x20 (400-char) manuscript sheets
 * without dropping characters when charsPerLine > 20 or line count > 20.
 */
function buildManuscriptSheets(layout: FormattedLayoutResult): ManuscriptCell[][][] {
  const columns: ManuscriptCell[][] = [];

  for (const line of layout.lines) {
    if (line.glyphs.length === 0) {
      // Blank paragraph line occupies one empty column
      columns.push(Array.from({ length: ROWS }, () => ({ char: '' })));
      continue;
    }

    let currentCol = Array.from({ length: ROWS }, () => ({ char: '' } as ManuscriptCell));
    let row = 0;

    for (let i = 0; i < line.glyphs.length; i++) {
      const g = line.glyphs[i];
      if (row >= ROWS) {
        // Hanging punctuation fits at the bottom margin of the 20th cell
        if (BURASAGARI_CHARS.has(g.char) && !currentCol[ROWS - 1].hangingChar) {
          currentCol[ROWS - 1].hangingChar = g.char;
          continue;
        }
        columns.push(currentCol);
        currentCol = Array.from({ length: ROWS }, () => ({ char: '' } as ManuscriptCell));
        row = 0;
      }
      currentCol[row] = { char: g.char };
      row++;
    }
    columns.push(currentCol);
  }

  if (columns.length === 0) {
    return [createEmptySheet()];
  }

  const sheets: ManuscriptCell[][][] = [];
  for (let start = 0; start < columns.length; start += COLS) {
    const sheet = createEmptySheet();
    for (let c = 0; c < COLS && start + c < columns.length; c++) {
      sheet[c] = columns[start + c];
    }
    sheets.push(sheet);
  }
  return sheets;
}

export const ManuscriptView: React.FC<ManuscriptViewProps> = ({
  layout,
  title,
  author,
  isLight,
  fontFamily,
  fontSizeQ,
  zoom,
}) => {
  const [sheetIdx, setSheetIdx] = useState(0);

  const sheets = useMemo(() => buildManuscriptSheets(layout), [layout]);
  const safeSheetIdx = Math.min(sheetIdx, Math.max(0, sheets.length - 1));
  const gridCells = sheets[safeSheetIdx];

  // Visual sizing
  const cellSizePx = Math.max(16, Math.min(30, Math.round(fontSizeQ * 1.45 * zoom)));

  // Classic manuscript ruled colors
  const paperBg = isLight ? 'bg-[#faf7ee]' : 'bg-[#152017]';
  const gridColor = isLight ? 'border-emerald-600/30' : 'border-emerald-500/25';
  const headerBorder = isLight
    ? 'border-emerald-700/40 text-emerald-950'
    : 'border-emerald-500/40 text-emerald-300';
  const textColor = isLight ? 'text-[#1e2a22]' : 'text-[#e6f4ea]';

  const renderHalfBlock = (colsSlice: ManuscriptCell[][], startColNum: number) => (
    <div className="flex flex-row-reverse">
      {colsSlice.map((col, colIdx) => {
        const lineNum = startColNum + colIdx;
        return (
          <div key={colIdx} className="flex flex-col">
            {col.map((cell, rowIdx) => {
              const vertStyle = getVerticalGlyphStyle(cell.char, true);
              const hangingVertStyle = cell.hangingChar
                ? getVerticalGlyphStyle(cell.hangingChar, true)
                : undefined;
              return (
                <div
                  key={rowIdx}
                  className={`relative flex items-center justify-center border ${gridColor}`}
                  style={{
                    width: `${cellSizePx}px`,
                    height: `${cellSizePx}px`,
                    fontFamily,
                  }}
                >
                  {cell.char ? (
                    <span
                      className="leading-none select-text flex items-center justify-center"
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${cellSizePx * 0.78}px`,
                      }}
                    >
                      <span style={vertStyle}>{cell.char}</span>
                    </span>
                  ) : null}

                  {/* Hanging punctuation rendered below 20th cell */}
                  {cell.hangingChar && rowIdx === ROWS - 1 && (
                    <span
                      className="absolute -bottom-3 right-0 leading-none text-amber-600 dark:text-amber-400 font-bold pointer-events-none"
                      style={{ fontSize: `${Math.max(10, cellSizePx * 0.55)}px` }}
                      title={`ぶら下がり約物「${cell.hangingChar}」`}
                    >
                      <span style={hangingVertStyle}>{cell.hangingChar}</span>
                    </span>
                  )}

                  {/* Small cell center guide */}
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-emerald-600/10 dark:border-emerald-400/10 pointer-events-none" />
                </div>
              );
            })}
            {/* Column index indicator at bottom */}
            <div className="h-4 text-[9px] font-mono text-center text-stone-400 pt-0.5">
              {lineNum % 5 === 0 ? lineNum : ''}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center justify-start p-1 sm:p-5 select-none">
      {/* 400-Character Manuscript Paper Frame */}
      <div
        className={`w-full max-w-4xl rounded-2xl border-2 p-3 sm:p-7 shadow-md flex flex-col items-center overflow-hidden ${paperBg} ${gridColor} ${textColor}`}
      >
        {/* Manuscript Paper Title Header */}
        <div
          className={`w-full pb-3 mb-3 border-b-2 flex flex-wrap items-center justify-between gap-2 text-xs font-serif ${headerBorder}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-sm tracking-wider">四百字詰原稿用紙（二〇字×二〇行）</span>
            <span className="text-[11px] font-mono opacity-70">JIS 規格 B4 版準拠</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-serif">
            <div>
              題名：<strong>『{title}』</strong>
            </div>
            <div>
              氏名：<strong>{author}</strong>
            </div>
          </div>
        </div>

        {/* Multi-sheet Pager */}
        {sheets.length > 1 && (
          <div className="w-full mb-3 flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="font-mono text-[11px] font-bold">
              原稿用紙 第 {safeSheetIdx + 1} 枚 / {sheets.length} 枚（計 {layout.totalChars} 文字）
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeSheetIdx === 0}
                onClick={() => setSheetIdx((p) => Math.max(0, p - 1))}
                className="px-2 py-1 rounded-md border border-emerald-600/30 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>前枚</span>
              </button>
              <button
                type="button"
                disabled={safeSheetIdx >= sheets.length - 1}
                onClick={() => setSheetIdx((p) => Math.min(sheets.length - 1, p + 1))}
                className="px-2 py-1 rounded-md border border-emerald-600/30 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
              >
                <span>次枚</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 20x20 Manuscript Grid Layout: RTL scroll container starts at rightmost col (line 1) */}
        <div
          dir="rtl"
          className="w-full overflow-x-auto custom-scrollbar pb-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            dir="ltr"
            className="w-max mx-auto relative flex items-center justify-center border-2 border-emerald-700/50 dark:border-emerald-500/50 bg-white/40 dark:bg-black/20 p-2 pb-4 rounded-lg"
            style={{ fontFeatureSettings: '"vert" 0, "vrt2" 0' }}
          >
            <div className="flex flex-row-reverse items-center">
              {/* First half: Lines 1 to 10 (col 0 is rightmost) */}
              {renderHalfBlock(gridCells.slice(0, 10), 1)}

              {/* Traditional Fish Tail Center (魚尾) Margin */}
              <div
                className="flex flex-col items-center justify-between border-x-2 border-emerald-700/50 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/40 px-1 py-2 mx-1 select-none"
                style={{ width: `${Math.max(22, cellSizePx * 0.9)}px`, height: `${cellSizePx * 20}px` }}
              >
                <div className="text-[9px] font-serif text-emerald-800 dark:text-emerald-300 tracking-widest flex flex-col items-center">
                  <span>二</span>
                  <span>十</span>
                  <span>×</span>
                  <span>二</span>
                  <span>十</span>
                </div>
                {/* Fish tail diamond symbol */}
                <div className="w-2.5 h-2.5 rotate-45 border border-emerald-600 dark:border-emerald-400 bg-emerald-700 dark:bg-emerald-300" />
                <div className="text-[9px] font-serif text-emerald-800 dark:text-emerald-300 tracking-widest flex flex-col items-center">
                  <span>四</span>
                  <span>百</span>
                  <span>字</span>
                  <span>詰</span>
                </div>
              </div>

              {/* Second half: Lines 11 to 20 */}
              {renderHalfBlock(gridCells.slice(10, 20), 11)}
            </div>
          </div>
        </div>

        {/* Manuscript Footer Info */}
        <div className="w-full mt-3 pt-2.5 border-t border-emerald-700/20 dark:border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-500">
          <div>原稿用紙マス目組版シミュレーター（20字折り返し・約物ぶら下がり対応）</div>
          <div>文字サイズ: {fontSizeQ}Q · 1マス均等全角配置</div>
        </div>
      </div>
    </div>
  );
};
