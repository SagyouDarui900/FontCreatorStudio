import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Square,
  CircleDot,
} from 'lucide-react';
import { GridSettings } from '../../../types';
import { DAKUTEN_MAPPINGS } from '../../../utils/dakutenHelper';

interface ViewControlsSubToolbarProps {
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  activeChar: string;
  selectedUnicode?: number;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  isOutlineMode: boolean;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  isLight: boolean;
}

export const ViewControlsSubToolbar: React.FC<ViewControlsSubToolbarProps> = ({
  onSelectPrevGlyph,
  onSelectNextGlyph,
  activeChar,
  selectedUnicode,
  onGenerateDakutenTarget,
  showCanvasToast,
  showNodes,
  setShowNodes,
  isOutlineMode,
  setOutlineOnly,
  gridSettings,
  onChangeGridSettings,
  isLight,
}) => {
  const dInfo = DAKUTEN_MAPPINGS[activeChar];

  return (
    <>
      {onSelectPrevGlyph && (
        <button
          type="button"
          onClick={onSelectPrevGlyph}
          className="p-1.5 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 transition-colors cursor-pointer"
          title="前の文字 (Shift+Enter)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-700 font-bold text-xs">
        <span className="text-emerald-950 dark:text-emerald-200 font-sans mr-1.5 text-sm">{activeChar}</span>
        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
          U+{selectedUnicode?.toString(16).toUpperCase().padStart(4, '0')}
        </span>
      </div>

      {onSelectNextGlyph && (
        <button
          type="button"
          onClick={onSelectNextGlyph}
          className="p-1.5 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 transition-colors cursor-pointer"
          title="次の文字 (Enter)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Quick Dakuten / Handakuten button if Kana */}
      {dInfo && (
        <div className="flex items-center space-x-1 ml-1">
          {dInfo.type === 'seion' && dInfo.daku && onGenerateDakutenTarget && (
            <button
              type="button"
              onClick={() => {
                onGenerateDakutenTarget(dInfo.daku!, false);
                showCanvasToast(`濁音「${dInfo.daku}」を自動生成しました！`);
              }}
              className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-amber-200 transition-colors cursor-pointer"
              title={`濁音「${dInfo.daku}」を自動合成`}
            >
              ＋濁点「{dInfo.daku}」
            </button>
          )}
          {dInfo.type === 'seion' && dInfo.handaku && onGenerateDakutenTarget && (
            <button
              type="button"
              onClick={() => {
                onGenerateDakutenTarget(dInfo.handaku!, true);
                showCanvasToast(`半濁音「${dInfo.handaku}」を自動生成しました！`);
              }}
              className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-rose-200 transition-colors cursor-pointer"
              title={`半濁音「${dInfo.handaku}」を自動合成`}
            >
              ＋半濁点「{dInfo.handaku}」
            </button>
          )}
        </div>
      )}

      {/* Primary View Controls */}
      <div className="flex items-center space-x-1 pl-1 border-l border-stone-200 dark:border-stone-700 shrink-0">
        {/* Node Points Visibility Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !showNodes;
            setShowNodes(next);
            showCanvasToast(next ? '頂点・ハンドルを表示しました' : '頂点・ハンドルを非表示にしました');
          }}
          className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
            showNodes
              ? isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'border-stone-200 dark:border-stone-700 text-stone-400 bg-stone-100 dark:bg-stone-800'
          }`}
          title={showNodes ? '頂点とハンドルを隠して文字の形を確認 (クリックで非表示) [Nキー]' : '頂点とハンドルを表示 (クリックで表示) [Nキー]'}
        >
          {showNodes ? <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-bold">
            {showNodes ? '頂点表示' : '頂点隠す'}
          </span>
        </button>

        {/* Outline-Only (Wireframe) Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !isOutlineMode;
            setOutlineOnly(next);
            showCanvasToast(
              next
                ? '輪郭モードを有効にしました（パスの重なりや形状を透過確認）'
                : '塗りつぶし表示モードに戻しました'
            );
          }}
          className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
            isOutlineMode
              ? isLight
                ? 'bg-sky-50 border-sky-400 text-sky-800'
                : 'bg-sky-950 border-sky-600 text-sky-200'
              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title={
            isOutlineMode
              ? '輪郭モードON（クリックで塗りつぶし表示に戻す）[Shift+O / Alt+O]'
              : '輪郭モード（ワイヤーフレーム：パスの重なりや曲線の形を確認）[Shift+O / Alt+O]'
          }
        >
          {isOutlineMode ? (
            <Square className="w-3.5 h-3.5 stroke-[2.5] text-sky-500 fill-none" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-xs border border-stone-500 bg-stone-700 dark:border-stone-400 dark:bg-stone-300" />
          )}
          <span className="text-[11px] font-bold">
            {isOutlineMode ? '輪郭モード' : '塗り表示'}
          </span>
        </button>

        {/* Pointer / Crosshair Reticle Toggle */}
        {onChangeGridSettings && (
          <button
            type="button"
            onClick={() => {
              const next = !gridSettings.showCursorCrosshair;
              onChangeGridSettings((prev) => ({
                ...prev,
                showCursorCrosshair: next,
                highContrastCursor: next,
              }));
              showCanvasToast(
                next ? '照準ポインター十字線: 表示 (ON)' : '照準ポインター十字線: 非表示 (OFF)',
                next ? '高精度十字線ガイドを作図位置に表示' : '軽量標準ポインターのみ表示'
              );
            }}
            className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
              gridSettings.showCursorCrosshair
                ? isLight
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                  : 'bg-emerald-950 border-emerald-600 text-emerald-200 font-bold'
                : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800'
            }`}
            title={`照準ポインター十字線: ${gridSettings.showCursorCrosshair ? '表示中 (クリックで非表示)' : '非表示 (クリックで表示)'} [Hキー]`}
          >
            <CircleDot className={`w-3.5 h-3.5 ${gridSettings.showCursorCrosshair ? 'text-amber-600 dark:text-emerald-400' : 'text-stone-400'}`} />
            <span className="text-[11px] font-bold">
              {gridSettings.showCursorCrosshair ? '照準ON' : '照準OFF'}
            </span>
          </button>
        )}
      </div>
    </>
  );
};
