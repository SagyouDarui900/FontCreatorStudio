import React from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';

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

export const ManuscriptView: React.FC<ManuscriptViewProps> = ({
  layout,
  title,
  author,
  isLight,
  fontFamily,
  fontSizeQ,
  zoom,
}) => {
  // Manuscript paper is standard 20 characters per line x 20 lines (400 characters)
  const ROWS = 20;
  const COLS = 20;

  // Flatten the layout glyphs into a 20x20 grid of characters
  // In traditional vertical Japanese manuscript paper:
  // - Columns flow from Right to Left (col 19 down to col 0)
  // - Characters flow from Top to Bottom (row 0 to row 19)
  const gridCells: { char: string; isHanging?: boolean; isYakumono?: boolean }[][] = Array.from(
    { length: COLS },
    () => Array.from({ length: ROWS }, () => ({ char: '' }))
  );

  let currentLineIdx = 0;
  for (const line of layout.lines) {
    if (currentLineIdx >= COLS) break;
    let charRow = 0;
    for (const g of line.glyphs) {
      if (charRow >= ROWS) {
        // Hanging character on last row
        if (gridCells[currentLineIdx] && gridCells[currentLineIdx][ROWS - 1]) {
          gridCells[currentLineIdx][ROWS - 1].isHanging = true;
        }
        break;
      }
      const isYakumono = g.kind === 'kuten' || g.kind === 'touten' || g.kind === 'end_bracket' || g.kind === 'start_bracket';
      gridCells[currentLineIdx][charRow] = {
        char: g.char,
        isHanging: g.isHanging,
        isYakumono,
      };
      charRow++;
    }
    currentLineIdx++;
  }

  // Visual sizing
  const cellSizePx = Math.max(16, Math.min(32, Math.round(fontSizeQ * 1.5 * zoom)));

  // Classic manuscript ruled colors (traditionally light green or terracotta orange)
  const paperBg = isLight ? 'bg-[#faf7ee]' : 'bg-[#152017]';
  const gridColor = isLight ? 'border-emerald-600/30' : 'border-emerald-500/25';
  const headerBorder = isLight ? 'border-emerald-700/40 text-emerald-950' : 'border-emerald-500/40 text-emerald-300';
  const textColor = isLight ? 'text-[#1e2a22]' : 'text-[#e6f4ea]';

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6 select-none overflow-x-auto custom-scrollbar">
      {/* 400-Character Manuscript Paper Frame */}
      <div
        className={`rounded-2xl border-2 p-4 sm:p-8 shadow-xl transition-all flex flex-col items-center ${paperBg} ${gridColor} ${textColor}`}
        style={{ minWidth: `${cellSizePx * 22 + 80}px` }}
      >
        {/* Manuscript Paper Title Header */}
        <div className={`w-full pb-4 mb-4 border-b-2 flex items-center justify-between text-xs font-serif ${headerBorder}`}>
          <div className="flex items-center space-x-4">
            <span className="font-bold text-sm tracking-wider">四百字詰原稿用紙（二〇字×二〇行）</span>
            <span className="text-[11px] font-mono opacity-70">JIS 規格 B4 版準拠</span>
          </div>
          <div className="flex items-center space-x-6 text-xs font-serif">
            <div>題名：<strong>『{title}』</strong></div>
            <div>氏名：<strong>{author}</strong></div>
          </div>
        </div>

        {/* 20x20 Manuscript Grid Layout (Right to Left vertical columns) */}
        <div className="relative flex flex-row-reverse items-center justify-center border-2 border-emerald-700/50 dark:border-emerald-500/50 bg-white/40 dark:bg-black/20 p-2 rounded-lg">
          {/* Halfway central separator (魚尾 / ぎょび) between line 10 and line 11 */}
          <div className="flex flex-row-reverse items-center">
            {/* First half: Lines 1 to 10 (displayed right to left) */}
            <div className="flex flex-row-reverse">
              {gridCells.slice(0, 10).map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col">
                  {col.map((cell, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`relative flex items-center justify-center border ${gridColor} transition-all`}
                      style={{
                        width: `${cellSizePx}px`,
                        height: `${cellSizePx}px`,
                        fontFamily,
                      }}
                    >
                      {/* Character inside square */}
                      <span
                        className={`leading-none select-text ${
                          cell.isYakumono ? 'translate-x-[20%] -translate-y-[20%]' : ''
                        }`}
                        style={{ fontSize: `${cellSizePx * 0.78}px` }}
                      >
                        {cell.char}
                      </span>

                      {/* Small cell dots guide */}
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-emerald-600/10 dark:border-emerald-400/10 pointer-events-none" />
                    </div>
                  ))}
                  {/* Column index indicator at bottom */}
                  <div className="h-4 text-[9px] font-mono text-center text-stone-400 pt-0.5">
                    {(colIdx + 1) % 5 === 0 ? colIdx + 1 : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Traditional Fish Tail Center (魚尾) Margin */}
            <div
              className="flex flex-col items-center justify-between border-x-2 border-emerald-700/50 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/40 px-1 py-2 mx-1 select-none"
              style={{ width: `${Math.max(22, cellSizePx * 0.9)}px`, height: `${cellSizePx * 20}px` }}
            >
              <div className="text-[9px] font-serif writing-mode-vertical text-emerald-800 dark:text-emerald-300 tracking-widest">
                二十×二十
              </div>
              {/* Fish tail diamond symbol */}
              <div className="w-2.5 h-2.5 rotate-45 border border-emerald-600 dark:border-emerald-400 bg-emerald-700 dark:bg-emerald-300" />
              <div className="text-[9px] font-serif writing-mode-vertical text-emerald-800 dark:text-emerald-300 tracking-widest">
                四百字詰
              </div>
            </div>

            {/* Second half: Lines 11 to 20 */}
            <div className="flex flex-row-reverse">
              {gridCells.slice(10, 20).map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col">
                  {col.map((cell, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`relative flex items-center justify-center border ${gridColor} transition-all`}
                      style={{
                        width: `${cellSizePx}px`,
                        height: `${cellSizePx}px`,
                        fontFamily,
                      }}
                    >
                      <span
                        className={`leading-none select-text ${
                          cell.isYakumono ? 'translate-x-[20%] -translate-y-[20%]' : ''
                        }`}
                        style={{ fontSize: `${cellSizePx * 0.78}px` }}
                      >
                        {cell.char}
                      </span>
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-emerald-600/10 dark:border-emerald-400/10 pointer-events-none" />
                    </div>
                  ))}
                  <div className="h-4 text-[9px] font-mono text-center text-stone-400 pt-0.5">
                    {(colIdx + 11) % 5 === 0 ? colIdx + 11 : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Manuscript Footer Info */}
        <div className="w-full mt-4 pt-3 border-t border-emerald-700/20 dark:border-emerald-500/20 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <div>原稿用紙マス目組版シミュレーター（字間・約物の升目内アキ検証）</div>
          <div>文字サイズ: {fontSizeQ}Q · 1マス均等全角配置</div>
        </div>
      </div>
    </div>
  );
};
