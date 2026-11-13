import React, { useEffect, useRef } from 'react';
import {
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Copy,
  Trash2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Repeat,
  Binary,
  Layers,
  Lock,
} from 'lucide-react';
import { isLightTheme, getThemeClasses, ThemeMode } from '../../utils/theme';

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  hasSelection: boolean;
  selectedContourCount: number;
  onFlipH?: () => void;
  onFlipV?: () => void;
  onRotate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRegisterRadical?: () => void;
  onConvertToQuadratic?: () => void;
  onConvertToCubic?: () => void;
  onReverseWinding?: () => void;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onSelectAllNodes?: () => void;
  isGlyphLocked?: boolean;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  theme,
  hasSelection,
  selectedContourCount,
  onFlipH,
  onFlipV,
  onRotate,
  onDuplicate,
  onDelete,
  onRegisterRadical,
  onConvertToQuadratic,
  onConvertToCubic,
  onReverseWinding,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  onSelectAllNodes,
  isGlyphLocked = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport clamping
  const menuWidth = 224;
  const menuHeight = 380;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 16);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{ left: Math.max(8, adjustedX), top: Math.max(8, adjustedY) }}
      className={`fixed z-50 w-56 rounded-xl border shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs animate-in fade-in duration-150 backdrop-blur-md select-none ${
        isLight
          ? 'bg-white/95 border-stone-200 text-stone-800 shadow-stone-400/30'
          : 'bg-[#151f19]/95 border-emerald-900/60 text-emerald-100 shadow-black/60'
      }`}
    >
      {/* Selection context label */}
      <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-stone-400 dark:text-emerald-500 uppercase border-b border-stone-200/60 dark:border-emerald-900/40 mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <span>キャンバス操作</span>
          {isGlyphLocked && (
            <span className="inline-flex items-center gap-0.5 text-amber-500">
              <Lock className="w-2.5 h-2.5" />
              ロック中
            </span>
          )}
        </span>
        {hasSelection && (
          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {selectedContourCount}個選択中
          </span>
        )}
      </div>

      {hasSelection ? (
        <>
          {onRegisterRadical && (
            <button
              onClick={() => {
                onRegisterRadical();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-colors`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>部首パーツに登録</span>
            </button>
          )}

          {onConvertToQuadratic && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onConvertToQuadratic();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>2次ベジェ化 (TTEdit互換)</span>
            </button>
          )}

          {onConvertToCubic && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onConvertToCubic();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>3次ベジェ化 (OTEdit互換)</span>
            </button>
          )}

          {onDuplicate && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onDuplicate();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-stone-500" />
              <span>選択輪郭を複製</span>
            </button>
          )}

          {onFlipH && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onFlipH();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-stone-500" />
              <span>左右反転 (水平)</span>
            </button>
          )}

          {onFlipV && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onFlipV();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <FlipVertical className="w-3.5 h-3.5 text-stone-500" />
              <span>上下反転 (垂直)</span>
            </button>
          )}

          {onRotate && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onRotate();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 text-stone-500" />
              <span>90° 右回転</span>
            </button>
          )}

          {onReverseWinding && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onReverseWinding();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : `hover:${themeClasses.activeToolHover} cursor-pointer`
              }`}
            >
              <Repeat className="w-3.5 h-3.5 text-stone-500" />
              <span>輪郭向き反転 (ワインディング)</span>
            </button>
          )}

          {onDelete && (
            <button
              disabled={isGlyphLocked}
              onClick={() => {
                if (isGlyphLocked) return;
                onDelete();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-600 dark:text-rose-400 transition-colors ${
                isGlyphLocked
                  ? 'opacity-45 cursor-not-allowed'
                  : 'hover:bg-rose-500/10 cursor-pointer'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>選択輪郭を削除</span>
            </button>
          )}

          <div className="my-1 border-t border-stone-200/60 dark:border-emerald-900/40" />
        </>
      ) : (
        <>
          {onSelectAllNodes && (
            <button
              onClick={() => {
                onSelectAllNodes();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:${themeClasses.activeToolHover} cursor-pointer transition-colors`}
            >
              <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
              <span>すべてのノードを選択</span>
            </button>
          )}
        </>
      )}

      {/* Glyph Navigation Items */}
      <div className="px-2 py-0.5 text-[10px] font-bold text-stone-400 dark:text-emerald-500 uppercase mt-0.5">
        文字送り
      </div>

      {onSelectPrevGlyph && (
        <button
          onClick={() => {
            onSelectPrevGlyph();
            onClose();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:${themeClasses.activeToolHover} cursor-pointer transition-colors`}
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5 text-stone-500" />
            <span>前のグリフへ</span>
          </div>
          <span className="font-mono text-[10px] opacity-60">[ または Alt+←</span>
        </button>
      )}

      {onSelectNextGlyph && (
        <button
          onClick={() => {
            onSelectNextGlyph();
            onClose();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:${themeClasses.activeToolHover} cursor-pointer transition-colors`}
        >
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
            <span>次のグリフへ</span>
          </div>
          <span className="font-mono text-[10px] opacity-60">] または Alt+→</span>
        </button>
      )}
    </div>
  );
};
