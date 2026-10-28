import React from 'react';
import { X, Copy, Clipboard, Wand2, ArrowRightLeft, Trash2 } from 'lucide-react';
import { FontProject } from '../../types';
import { DAKUTEN_MAPPINGS } from '../../utils/dakutenHelper';
import { KANA_PAIRS } from '../../data/unicodeTables';
import { ContextMenuState } from './types';

interface GlyphGridContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  isLight: boolean;
  project: FontProject;
  hasClipboard?: boolean;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onSelectGlyph: (code: number, char: string) => void;
  onCopyGlyph: (code: number) => void;
  onPasteGlyph: (code: number) => void;
  onClearGlyph: (code: number) => void;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  onDuplicateAsSmallKana?: (code: number) => void;
}

export const GlyphGridContextMenu: React.FC<GlyphGridContextMenuProps> = ({
  contextMenu,
  onClose,
  isLight,
  project,
  hasClipboard,
  contextMenuRef,
  onSelectGlyph,
  onCopyGlyph,
  onPasteGlyph,
  onClearGlyph,
  onGenerateDakutenTarget,
  onDuplicateAsSmallKana,
}) => {
  if (!contextMenu) return null;

  const { item, x, y } = contextMenu;
  const glyph = project.glyphs[item.code];
  const hasContours = Boolean(glyph?.contours?.length);

  return (
    <div
      ref={contextMenuRef}
      style={{ top: y, left: x }}
      className={`fixed z-60 w-52 p-1.5 rounded-lg border shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
        isLight
          ? 'bg-white/98 border-[#c8ded3] text-stone-800'
          : 'bg-[#16211a]/98 border-[#2e4235] text-emerald-100'
      }`}
    >
      <div className="px-2 py-1 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
        <span>
          「{item.char}」 U+{item.code.toString(16).toUpperCase().padStart(4, '0')}
        </span>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col space-y-0.5 text-xs">
        <button
          onClick={() => {
            onSelectGlyph(item.code, item.char);
            onClose();
          }}
          className="w-full text-left px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-[#203024] font-medium transition-colors cursor-pointer"
        >
          この文字を編集
        </button>

        {/* Copy */}
        {hasContours ? (
          <button
            onClick={() => {
              onCopyGlyph(item.code);
              onClose();
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-[#203024] flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>形をコピー</span>
          </button>
        ) : null}

        {/* Paste */}
        {hasClipboard && (
          <button
            onClick={() => {
              onSelectGlyph(item.code, item.char);
              onPasteGlyph(item.code);
              onClose();
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-[#203024] flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
            <span>コピーした形を貼り付け</span>
          </button>
        )}

        {/* Dakuten generator */}
        {(() => {
          const dakuInfo = DAKUTEN_MAPPINGS[item.char];
          if (hasContours && dakuInfo?.type === 'seion' && onGenerateDakutenTarget) {
            return (
              <>
                {dakuInfo.daku && (
                  <button
                    onClick={() => {
                      onSelectGlyph(item.code, item.char);
                      onGenerateDakutenTarget(dakuInfo.daku!, false);
                      onClose();
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>濁音「{dakuInfo.daku}」を生成</span>
                  </button>
                )}
                {dakuInfo.handaku && (
                  <button
                    onClick={() => {
                      onSelectGlyph(item.code, item.char);
                      onGenerateDakutenTarget(dakuInfo.handaku!, true);
                      onClose();
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>半濁音「{dakuInfo.handaku}」を生成</span>
                  </button>
                )}
              </>
            );
          }
          return null;
        })()}

        {/* Kana pair small duplicate */}
        {(() => {
          const pair = KANA_PAIRS[item.char];
          if (hasContours && pair && onDuplicateAsSmallKana) {
            return (
              <button
                onClick={() => {
                  onDuplicateAsSmallKana(item.code);
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950/60 flex items-center gap-1.5 font-medium text-indigo-900 dark:text-indigo-200 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>小文字「{pair.smallChar}」へ縮小複製</span>
              </button>
            );
          }
          return null;
        })()}

        {/* Clear */}
        {hasContours ? (
          <button
            onClick={() => {
              onClearGlyph(item.code);
              onClose();
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>パスを消去</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
