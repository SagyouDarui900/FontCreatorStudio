import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Clipboard, Wand2, ArrowRightLeft, Trash2, Lock } from 'lucide-react';
import { FontProject } from '../../types';
import { ThemeMode, getThemeClasses } from '../../utils/theme';
import { DAKUTEN_MAPPINGS } from '../../utils/dakutenHelper';
import { KANA_PAIRS } from '../../data/unicodeTables';
import { ContextMenuState } from './types';

interface GlyphGridContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  isLight: boolean;
  theme?: ThemeMode;
  project: FontProject;
  hasClipboard?: boolean;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onSelectGlyph: (code: number, char: string) => void;
  onCopyGlyph: (code: number) => void;
  onPasteGlyph: (code: number) => void;
  onClearGlyph: (code: number) => void;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean, sourceChar?: string) => void;
  onDuplicateAsSmallKana?: (code: number) => void;
}

export const GlyphGridContextMenu: React.FC<GlyphGridContextMenuProps> = ({
  contextMenu,
  onClose,
  isLight,
  theme,
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
  const [pos, setPos] = useState<{ left: number; top: number }>(() => ({
    left: contextMenu ? contextMenu.x : 8,
    top: contextMenu ? contextMenu.y : 8,
  }));

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const el = contextMenuRef.current;
    const width = el.offsetWidth || 208;
    const height = el.offsetHeight || 260;
    const pad = 8;
    const maxLeft = Math.max(pad, window.innerWidth - width - pad);
    const maxTop = Math.max(pad, window.innerHeight - height - pad);

    const nextLeft = Math.min(Math.max(pad, contextMenu.x), maxLeft);
    let nextTop = contextMenu.y;
    if (nextTop + height > window.innerHeight - pad) {
      if (contextMenu.anchorTop !== undefined && contextMenu.anchorTop - height >= pad) {
        nextTop = contextMenu.anchorTop - height;
      } else {
        nextTop = maxTop;
      }
    }
    nextTop = Math.max(pad, Math.min(nextTop, maxTop));
    setPos({ left: nextLeft, top: nextTop });
  }, [contextMenu, hasClipboard, contextMenuRef]);

  if (!contextMenu || typeof document === 'undefined') return null;

  const { item } = contextMenu;
  const glyph = project.glyphs[item.code];
  const hasContours = Boolean(glyph?.contours?.length);
  const isLocked = Boolean(glyph?.locked);
  const resolvedTheme: ThemeMode = theme ?? (isLight ? 'light' : 'dark');
  const themeClasses = getThemeClasses(resolvedTheme);

  return createPortal(
    <div
      ref={contextMenuRef}
      style={{ top: pos.top, left: pos.left }}
      className={`fixed z-[60] w-52 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] overflow-y-auto p-1.5 rounded-md border shadow-xl anim-pop ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
    >
      <div className={`px-2 py-1 border-b text-[11px] font-bold flex items-center justify-between mb-1 ${themeClasses.border} ${themeClasses.accentText}`}>
        <span className="flex items-center gap-1 min-w-0 truncate">
          <span>
            「{item.char}」 U+{item.code.toString(16).toUpperCase().padStart(4, '0')}
          </span>
          {isLocked && (
            <span title="編集ロック中">
              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            </span>
          )}
        </span>
        <button
          onClick={onClose}
          className={`cursor-pointer shrink-0 ${themeClasses.textMuted}`}
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
          className={`w-full text-left px-2 py-1 rounded font-medium transition-colors cursor-pointer ${themeClasses.activeToolHover}`}
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
            className={`w-full text-left px-2 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${themeClasses.activeToolHover}`}
          >
            <Copy className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>形をコピー</span>
          </button>
        ) : null}

        {/* Paste */}
        {hasClipboard && (
          <button
            disabled={isLocked}
            onClick={() => {
              onPasteGlyph(item.code);
              onClose();
            }}
            title={isLocked ? '編集ロック中のため貼り付けできません' : 'コピーした字形をこの文字に貼り付け'}
            className={`w-full text-left px-2 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
          >
            <Clipboard className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>{isLocked ? '貼り付け (ロック中)' : 'コピーした形を貼り付け'}</span>
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
                      onGenerateDakutenTarget(dakuInfo.daku!, false, item.char);
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
                      onGenerateDakutenTarget(dakuInfo.handaku!, true, item.char);
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
            disabled={isLocked}
            onClick={() => {
              onClearGlyph(item.code);
              onClose();
            }}
            title={isLocked ? '編集ロック中のため消去できません' : 'この文字のパスを消去'}
            className="w-full text-left px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isLocked ? 'パスを消去 (ロック中)' : 'パスを消去'}</span>
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
