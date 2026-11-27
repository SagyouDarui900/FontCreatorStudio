import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BURASAGARI_CHARS, FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';
import { MOJIKUMI_Q_TO_PX } from './mojikumiScale';

interface ManuscriptViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  zoom: number;
  // L19: charsPerLine was declared here but never used (the manuscript
  // sheet is always 20x20); removed from the props.
  // M15: previously not passed, so the view was always vertical 20x20
  // with no line-feed effect. Horizontal mode and line feed are now
  // reflected; showGrid toggles the cell ruling like the other views.
  isVertical: boolean;
  lineFeedH: number;
  showGrid: boolean;
  /** M20: changes when the layout, work or text switches; resets the sheet position. */
  pageResetKey?: string;
}

interface ManuscriptCell {
  char: string;
  hangingChar?: string;
  // M19: a tate-chu-yoko run occupies one cell, drawn horizontally.
  tateChuYoko?: boolean;
}

const ROWS = 20;
const COLS = 20;

function createEmptySheet(): ManuscriptCell[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ char: '' }))
  );
}

interface ManuscriptUnit {
  text: string;
  tateChuYoko: boolean;
  // L21: set from the engine glyph's isHanging, so a hanging punctuation
  // mark is attached to the previous cell instead of taking a cell.
  isHanging?: boolean;
}

// Group one layout line into placeable units. In vertical mode a run of
// tateChuYoko glyphs is one unit; otherwise every glyph is its own unit.
function lineUnits(
  glyphs: FormattedLayoutResult['lines'][number]['glyphs'],
  isVertical: boolean
): ManuscriptUnit[] {
  const units: ManuscriptUnit[] = [];
  for (const g of glyphs) {
    const last = units[units.length - 1];
    if (isVertical && g.tateChuYoko && last && last.tateChuYoko) {
      last.text += g.char;
    } else {
      units.push({
        text: g.char,
        tateChuYoko: Boolean(isVertical && g.tateChuYoko),
        isHanging: g.isHanging || undefined,
      });
    }
  }
  return units;
}

/**
 * Reflows FormattedLayoutResult into traditional 20x20 (400-char) manuscript sheets
 * without dropping characters when charsPerLine > 20 or line count > 20.
 * Vertical: each layout line becomes a column of up to 20 cells.
 * Horizontal: each layout line becomes rows of up to 20 cells.
 */
function buildManuscriptSheets(
  layout: FormattedLayoutResult,
  isVertical: boolean
): ManuscriptCell[][][] {
  if (!isVertical) {
    const rows: ManuscriptCell[][] = [];
    for (const line of layout.lines) {
      const units = lineUnits(line.glyphs, false);
      if (units.length === 0) {
        rows.push(Array.from({ length: COLS }, () => ({ char: '' })));
        continue;
      }
      let currentRow = Array.from({ length: COLS }, () => ({ char: '' } as ManuscriptCell));
      let col = 0;
      for (const unit of units) {
        // L21: a glyph the engine marked as hanging does not take a cell;
        // it hangs from the previous cell in the row instead.
        if (unit.isHanging && unit.text.length === 1 && col > 0) {
          const target = currentRow[col - 1];
          target.hangingChar = `${target.hangingChar ?? ''}${unit.text}`;
          continue;
        }
        if (col >= COLS) {
          rows.push(currentRow);
          currentRow = Array.from({ length: COLS }, () => ({ char: '' } as ManuscriptCell));
          col = 0;
        }
        currentRow[col] = { char: unit.text };
        col++;
      }
      rows.push(currentRow);
    }
    if (rows.length === 0) {
      return [createEmptySheet()];
    }
    const sheets: ManuscriptCell[][][] = [];
    for (let start = 0; start < rows.length; start += ROWS) {
      const sheet = createEmptySheet();
      for (let r = 0; r < ROWS && start + r < rows.length; r++) {
        sheet[r] = rows[start + r];
      }
      sheets.push(sheet);
    }
    return sheets;
  }

  const columns: ManuscriptCell[][] = [];

  for (const line of layout.lines) {
    const units = lineUnits(line.glyphs, true);
    if (units.length === 0) {
      // Blank paragraph line occupies one empty column
      columns.push(Array.from({ length: ROWS }, () => ({ char: '' })));
      continue;
    }

    let currentCol = Array.from({ length: ROWS }, () => ({ char: '' } as ManuscriptCell));
    let row = 0;

    for (const unit of units) {
      // L21: a glyph the engine marked as hanging does not take a cell;
      // it hangs from the previous cell in the column instead, even when
      // the column is not yet full. Consecutive hanging marks append to
      // the same cell (e.g. 。」).
      if (unit.isHanging && unit.text.length === 1 && row > 0) {
        const target = currentCol[Math.min(row - 1, ROWS - 1)];
        target.hangingChar = `${target.hangingChar ?? ''}${unit.text}`;
        continue;
      }
      if (row >= ROWS) {
        // Hanging punctuation fits at the bottom margin of the 20th cell
        if (
          unit.text.length === 1 &&
          BURASAGARI_CHARS.has(unit.text)
        ) {
          currentCol[ROWS - 1].hangingChar = `${currentCol[ROWS - 1].hangingChar ?? ''}${unit.text}`;
          continue;
        }
        columns.push(currentCol);
        currentCol = Array.from({ length: ROWS }, () => ({ char: '' } as ManuscriptCell));
        row = 0;
      }
      currentCol[row] = { char: unit.text, tateChuYoko: unit.tateChuYoko || undefined };
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
  isVertical,
  lineFeedH,
  showGrid,
  pageResetKey,
}) => {
  const [sheetIdx, setSheetIdx] = useState(0);

  // M20: switching the layout, work or text returns to the first sheet.
  useEffect(() => {
    setSheetIdx(0);
  }, [pageResetKey]);

  const sheets = useMemo(() => buildManuscriptSheets(layout, isVertical), [layout, isVertical]);
  const safeSheetIdx = Math.min(sheetIdx, Math.max(0, sheets.length - 1));
  const gridCells = sheets[safeSheetIdx];

  // Visual sizing (L15: shared Q-to-px factor).
  const cellSizePx = Math.max(16, Math.min(30, Math.round(fontSizeQ * MOJIKUMI_Q_TO_PX * zoom)));
  // M15: line feed sets the pitch between lines (columns in vertical mode,
  // rows in horizontal mode); the gap is the pitch minus one cell.
  const lineGapPx = Math.max(0, Math.round((lineFeedH - fontSizeQ) * MOJIKUMI_Q_TO_PX * zoom));

  // Classic manuscript ruled colors
  const paperBg = isLight ? 'bg-[#faf7ee]' : 'bg-[#152017]';
  const gridColor = isLight ? 'border-emerald-600/30' : 'border-emerald-500/25';
  const headerBorder = isLight
    ? 'border-emerald-700/40 text-emerald-950'
    : 'border-emerald-500/40 text-emerald-300';
  const textColor = isLight ? 'text-[#1e2a22]' : 'text-[#e6f4ea]';

  const renderCellContent = (cell: ManuscriptCell) => {
    if (!cell.char) return null;
    if (cell.tateChuYoko) {
      // M19: the run is drawn horizontally inside one cell.
      const len = Math.max(1, cell.char.length);
      return (
        <span
          data-tate-chu-yoko="true"
          title={`縦中横「${cell.char}」`}
          className="leading-none select-text flex items-center justify-center whitespace-nowrap"
          style={{
            width: '100%',
            height: '100%',
            fontSize: `${(cellSizePx * 0.78) / len}px`,
          }}
        >
          {Array.from(cell.char).map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </span>
      );
    }
    const vertStyle = getVerticalGlyphStyle(cell.char, isVertical);
    return (
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
    );
  };

  const renderCell = (cell: ManuscriptCell, key: number | string) => {
    const hangingVertStyle = cell.hangingChar
      ? getVerticalGlyphStyle(cell.hangingChar, isVertical)
      : undefined;
    return (
      <div
        key={key}
        className={`relative flex items-center justify-center border ${gridColor}`}
        style={{
          width: `${cellSizePx}px`,
          height: `${cellSizePx}px`,
          fontFamily,
        }}
      >
        {renderCellContent(cell)}

        {/* Hanging punctuation rendered below the cell in vertical mode,
            or to the right of the cell in horizontal mode (L21) */}
        {cell.hangingChar && (
          <span
            className={`absolute leading-none text-amber-600 dark:text-amber-400 font-bold pointer-events-none ${
              isVertical ? '-bottom-3 right-0' : '-right-3 top-1/2 -translate-y-1/2'
            }`}
            style={{ fontSize: `${Math.max(10, cellSizePx * 0.55)}px` }}
            title={`ぶら下がり約物「${cell.hangingChar}」`}
          >
            <span style={hangingVertStyle}>{cell.hangingChar}</span>
          </span>
        )}

        {/* Small cell center guide */}
        {showGrid && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-emerald-600/10 dark:border-emerald-400/10 pointer-events-none" />
        )}
      </div>
    );
  };

  const renderHalfBlock = (colsSlice: ManuscriptCell[][], startColNum: number) => (
    <div className="flex flex-row-reverse" style={{ gap: `${lineGapPx}px` }}>
      {colsSlice.map((col, colIdx) => {
        const lineNum = startColNum + colIdx;
        return (
          <div key={colIdx} className="flex flex-col">
            {col.map((cell, rowIdx) => renderCell(cell, rowIdx))}
            {/* Column index indicator at bottom */}
            <div className="h-4 text-[9px] font-mono text-center text-stone-400 pt-0.5">
              {lineNum % 5 === 0 ? lineNum : ''}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderHalfRows = (rowsSlice: ManuscriptCell[][], startRowNum: number) => (
    <div className="flex flex-col" style={{ gap: `${lineGapPx}px` }}>
      {rowsSlice.map((row, rowIdx) => {
        const lineNum = startRowNum + rowIdx;
        return (
          <div key={rowIdx} className="flex flex-row items-center">
            <div className="w-4 text-[9px] font-mono text-center text-stone-400 pr-0.5 shrink-0">
              {lineNum % 5 === 0 ? lineNum : ''}
            </div>
            <div className="flex flex-row">
              {row.map((cell, colIdx) => renderCell(cell, colIdx))}
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
            <span className="text-[11px] font-mono opacity-70">
              {isVertical ? '縦書き' : '横書き'}
            </span>
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
                className="px-2.5 py-1.5 min-h-[36px] md:min-h-0 md:px-2 md:py-1 rounded-md border border-emerald-600/30 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>前枚</span>
              </button>
              <button
                type="button"
                disabled={safeSheetIdx >= sheets.length - 1}
                onClick={() => setSheetIdx((p) => Math.min(sheets.length - 1, p + 1))}
                className="px-2.5 py-1.5 min-h-[36px] md:min-h-0 md:px-2 md:py-1 rounded-md border border-emerald-600/30 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
              >
                <span>次枚</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {isVertical ? (
          /* 20x20 Manuscript Grid Layout: RTL scroll container starts at rightmost col (line 1) */
          <div
            dir="rtl"
            className="w-full overflow-x-auto touch-pan-both custom-scrollbar pb-2"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
          >
            <div
              dir="ltr"
              className="w-max mx-auto relative flex items-center justify-center border-2 border-emerald-700/50 dark:border-emerald-500/50 bg-white/40 dark:bg-black/20 p-2 pb-4 rounded-lg"
              style={{ fontFeatureSettings: '"vert" 0, "vrt2" 0' }}
            >
              <div className="flex flex-row-reverse items-start">
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
        ) : (
          /* M15: horizontal manuscript: rows run left to right, 20 rows per sheet */
          <div
            className="w-full overflow-x-auto touch-pan-both custom-scrollbar pb-2"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
          >
            <div
              className="w-max mx-auto relative flex flex-col items-center justify-center border-2 border-emerald-700/50 dark:border-emerald-500/50 bg-white/40 dark:bg-black/20 p-2 pr-4 rounded-lg"
              style={{ fontFeatureSettings: '"vert" 0, "vrt2" 0' }}
            >
              <div className="flex flex-col items-center">
                {/* First half: Rows 1 to 10 */}
                {renderHalfRows(gridCells.slice(0, 10), 1)}

                {/* Traditional Fish Tail Center (魚尾) Margin, horizontal */}
                <div
                  className="flex flex-row items-center justify-between border-y-2 border-emerald-700/50 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/40 px-2 py-1 my-1 select-none"
                  style={{ width: `${cellSizePx * 20}px`, height: `${Math.max(22, cellSizePx * 0.9)}px` }}
                >
                  <div className="text-[9px] font-serif text-emerald-800 dark:text-emerald-300 tracking-widest">
                    二十×二十
                  </div>
                  <div className="w-2.5 h-2.5 rotate-45 border border-emerald-600 dark:border-emerald-400 bg-emerald-700 dark:bg-emerald-300" />
                  <div className="text-[9px] font-serif text-emerald-800 dark:text-emerald-300 tracking-widest">
                    四百字詰
                  </div>
                </div>

                {/* Second half: Rows 11 to 20 */}
                {renderHalfRows(gridCells.slice(10, 20), 11)}
              </div>
            </div>
          </div>
        )}

        {/* Manuscript Footer Info */}
        <div className="w-full mt-3 pt-2.5 border-t border-emerald-700/20 dark:border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-500">
          <div>原稿用紙マス目組版シミュレーター（20字折り返し・約物ぶら下がり対応）</div>
          <div>
            文字サイズ: {fontSizeQ}Q · 行送り: {lineFeedH}H · 1マス均等全角配置
            {!showGrid && ' · マス目非表示'}
          </div>
        </div>
      </div>
    </div>
  );
};
