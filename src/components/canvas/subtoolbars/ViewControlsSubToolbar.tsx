import React from 'react';
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Square,
} from 'lucide-react';
import { KANA_PAIRS } from '../../../data/unicodeTables';
import { DAKUTEN_MAPPINGS } from '../../../utils/dakutenHelper';

interface ViewControlsSubToolbarProps {
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  activeChar: string;
  selectedUnicode?: number;
  hasContours?: boolean;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  onDuplicateAsSmallKana?: (sourceUnicode: number) => void;
  onOpenGlyphSynthesisModal?: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  isOutlineMode: boolean;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  isLight: boolean;
}

export const ViewControlsSubToolbar: React.FC<ViewControlsSubToolbarProps> = ({
  onSelectPrevGlyph,
  onSelectNextGlyph,
  activeChar,
  selectedUnicode,
  hasContours = true,
  onGenerateDakutenTarget,
  onDuplicateAsSmallKana,
  onOpenGlyphSynthesisModal,
  showCanvasToast,
  showNodes,
  setShowNodes,
  isOutlineMode,
  setOutlineOnly,
  isLight,
}) => {
  const dInfo = DAKUTEN_MAPPINGS[activeChar];
  const smallPair = KANA_PAIRS[activeChar];

  return (
    <>
      {onSelectPrevGlyph && (
        <button
          type="button"
          onClick={onSelectPrevGlyph}
          className="p-1 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 cursor-pointer"
          title="前の文字 (Alt+←、選択中は0.1ナッジ)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-700 font-bold text-xs">
        <span className="text-emerald-950 dark:text-emerald-200 font-sans mr-1 text-xs">{activeChar}</span>
        <span className="text-[10px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
          U+{selectedUnicode?.toString(16).toUpperCase().padStart(4, '0')}
        </span>
      </div>

      {onSelectNextGlyph && (
        <button
          type="button"
          onClick={onSelectNextGlyph}
          className="p-1 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 cursor-pointer"
          title="次の文字 (Alt+→、選択中は0.1ナッジ)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Quick Dakuten / Handakuten / Small Kana buttons */}
      {(dInfo || smallPair) && (
        <div className="flex items-center space-x-1 ml-1">
          {dInfo?.type === 'seion' && dInfo.daku && onGenerateDakutenTarget && (
            <button
              type="button"
              onClick={() => {
                if (!hasContours) {
                  showCanvasToast(`「${activeChar}」にはまだ字形が作図されていません`);
                  return;
                }
                onGenerateDakutenTarget(dInfo.daku!, false);
              }}
              className={`px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-amber-200 cursor-pointer ${
                !hasContours ? 'opacity-50' : ''
              }`}
              title={`濁音「${dInfo.daku}」を自動合成`}
            >
              ＋濁点「{dInfo.daku}」
            </button>
          )}
          {dInfo?.type === 'seion' && dInfo.handaku && onGenerateDakutenTarget && (
            <button
              type="button"
              onClick={() => {
                if (!hasContours) {
                  showCanvasToast(`「${activeChar}」にはまだ字形が作図されていません`);
                  return;
                }
                onGenerateDakutenTarget(dInfo.handaku!, true);
              }}
              className={`px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-rose-200 cursor-pointer ${
                !hasContours ? 'opacity-50' : ''
              }`}
              title={`半濁音「${dInfo.handaku}」を自動合成`}
            >
              ＋半濁点「{dInfo.handaku}」
            </button>
          )}
          {smallPair && onDuplicateAsSmallKana && selectedUnicode !== undefined && (
            <button
              type="button"
              onClick={() => {
                if (!hasContours) {
                  showCanvasToast(`「${activeChar}」にはまだ字形が作図されていません`);
                  return;
                }
                onDuplicateAsSmallKana(selectedUnicode);
              }}
              className={`px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-indigo-200 flex items-center gap-0.5 cursor-pointer ${
                !hasContours ? 'opacity-50' : ''
              }`}
              title={`小書き文字「${smallPair.smallChar}」を自動生成`}
            >
              <ArrowRightLeft className="w-2.5 h-2.5" />
              <span>小書き「{smallPair.smallChar}」</span>
            </button>
          )}
          {onOpenGlyphSynthesisModal && (
            <button
              type="button"
              onClick={onOpenGlyphSynthesisModal}
              className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-emerald-200 flex items-center gap-0.5 cursor-pointer"
              title="濁点・小書き一括合成スタジオを開く"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>一括合成</span>
            </button>
          )}
        </div>
      )}

      {/* Primary View Controls */}
      <div className="flex items-center gap-1 pl-1 border-l border-stone-200 dark:border-stone-700 shrink-0">
        {/* Node Points Visibility Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !showNodes;
            setShowNodes(next);
            showCanvasToast(next ? '頂点・ハンドルを表示しました' : '頂点・ハンドルを非表示にしました');
          }}
          className={`px-1.5 py-0.5 rounded border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
            showNodes
              ? isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'border-stone-200 dark:border-stone-700 text-stone-400 bg-stone-100 dark:bg-stone-800'
          }`}
          title={showNodes ? '頂点とハンドルを隠して文字の形を確認 (クリックで非表示) [Nキー]' : '頂点とハンドルを表示 (クリックで表示) [Nキー]'}
        >
          {showNodes ? <Eye className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
          <span className="text-[11px] font-bold max-sm:hidden">
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
          className={`px-1.5 py-0.5 rounded border flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
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
            <Square className="w-3.5 h-3.5 shrink-0 stroke-[2.5] text-sky-500 fill-none" />
          ) : (
            <div className="w-3.5 h-3.5 shrink-0 rounded-xs border border-stone-500 bg-stone-700 dark:border-stone-400 dark:bg-stone-300" />
          )}
          <span className="text-[11px] font-bold max-sm:hidden">
            {isOutlineMode ? '輪郭モード' : '塗り表示'}
          </span>
        </button>
      </div>
    </>
  );
};
