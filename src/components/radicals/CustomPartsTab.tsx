import React from 'react';
import { BookmarkPlus, Plus, Trash2, Sparkles, Layers } from 'lucide-react';
import { CustomPart, PathContour } from '../../types';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { RadicalsDensity } from './types';

interface CustomPartsTabProps {
  isLight: boolean;
  gridDensity?: RadicalsDensity;
  showSaveInput: boolean;
  setShowSaveInput: (s: boolean) => void;
  createOnlyFrame: boolean;
  setCreateOnlyFrame: (c: boolean) => void;
  newPartName: string;
  setNewPartName: (n: string) => void;
  selectedChar: string;
  currentContours: PathContour[];
  customParts: CustomPart[];
  setCustomParts: React.Dispatch<React.SetStateAction<CustomPart[]>>;
  handleCreateNameFrame: (name?: string) => void;
  handleSaveContoursAsPart: (contours: PathContour[], defaultName: string) => void;
  handleInsertWithPlacement: (contours: PathContour[], name?: string) => void;
  onBatchInsertCustomPart?: (part: CustomPart) => void;
  showNotice: (msg: string) => void;
}

export const CustomPartsTab: React.FC<CustomPartsTabProps> = ({
  isLight,
  gridDensity = 'medium',
  showSaveInput,
  setShowSaveInput,
  createOnlyFrame,
  setCreateOnlyFrame,
  newPartName,
  setNewPartName,
  selectedChar,
  currentContours,
  customParts,
  setCustomParts,
  handleCreateNameFrame,
  handleSaveContoursAsPart,
  handleInsertWithPlacement,
  onBatchInsertCustomPart,
  showNotice,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 space-y-2">
      {/* Informational Guidance Banner */}
      {customParts.length === 0 ? (
        <div
          className={`p-2 rounded-lg border text-[11px] leading-relaxed shrink-0 ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#142319] border-[#223d2b] text-emerald-200'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>メインキャンバス連動型マイパーツ</span>
          </div>
          <p className="text-[10px] text-stone-600 dark:text-stone-300">
            キャンバスで輪郭を選択し、上部ツールバーの<strong>「★ 部首パーツに登録」</strong>を押すと1クリックで即時保存されます。
          </p>
        </div>
      ) : (
        <div
          className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1.5 shrink-0 min-w-0 ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#142319] border-[#223d2b] text-emerald-200'
          }`}
        >
          <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="truncate">ツールバーの「★ 部首パーツに登録」からも即時追加可能</span>
        </div>
      )}

      {/* Manual Save & Name Frame Creation Actions */}
      {!showSaveInput ? (
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(false);
              setShowSaveInput(true);
            }}
            disabled={!currentContours || currentContours.length === 0}
            className={`min-w-0 overflow-hidden py-1.5 px-1.5 rounded-md border flex items-center justify-center gap-1 transition-colors font-bold text-[10.5px] cursor-pointer ${
              !currentContours || currentContours.length === 0
                ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700'
                : isLight
                ? 'bg-emerald-800 border-emerald-900 text-white hover:bg-emerald-900 shadow-xs'
                : 'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600 shadow-xs'
            }`}
            title="現在の文字全体をマイパーツに保存"
          >
            <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">現在文字を保存</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(true);
              setShowSaveInput(true);
            }}
            className={`min-w-0 overflow-hidden py-1.5 px-1.5 rounded-md border flex items-center justify-center gap-1 transition-colors font-bold text-[10.5px] cursor-pointer ${
              isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223127] shadow-xs'
            }`}
            title="空の名前枠を作成"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate whitespace-nowrap">空の枠を作成</span>
          </button>
        </div>
      ) : (
        <div
          className={`p-2 rounded-lg border space-y-1.5 shrink-0 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#1a261f] border-[#25362b]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] font-bold truncate min-w-0">
              {createOnlyFrame ? 'パーツ枠の名前を入力:' : '保存するパーツ名を入力:'}
            </span>
            <button
              type="button"
              onClick={() => setCreateOnlyFrame(!createOnlyFrame)}
              className="text-[10px] text-emerald-700 dark:text-emerald-400 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              {createOnlyFrame ? '→ 形状も保存' : '→ 名前枠だけ作成'}
            </button>
          </div>
          <input
            type="text"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
            placeholder={createOnlyFrame ? '例: さんずい, きへん, 自作枠1' : `例: ${selectedChar || '無題'}のへん`}
            className={`w-full px-2.5 py-1.5 rounded border text-xs font-bold ${
              isLight ? 'bg-[#f7faf8] border-stone-300 text-stone-800' : 'bg-[#101813] border-[#25362b] text-emerald-100'
            }`}
            autoFocus
          />
          <div className="flex justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setShowSaveInput(false)}
              className="px-2.5 py-1 rounded text-[11px] border border-stone-300 dark:border-stone-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              キャンセル
            </button>
            {createOnlyFrame ? (
              <button
                type="button"
                onClick={() => handleCreateNameFrame()}
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                名前枠を作成
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveContoursAsPart(currentContours, `パーツ_${selectedChar || '無題'}`)}
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                保存
              </button>
            )}
          </div>
        </div>
      )}

      {/* Saved Parts Grid / Name Frame Cards */}
      {customParts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
          <BookmarkPlus className="w-10 h-10 opacity-30 text-emerald-600" />
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">マイパーツはまだありません</p>
          <p className="text-[10px] leading-relaxed max-w-xs text-stone-500">
            キャンバス上で偏や旁のパスを選択し、上部ツールバーの「★ 部首パーツに登録」をクリックすると、ここに1クリックで保存されます。
          </p>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid gap-1.5 content-start pr-0.5 pb-28 sm:pb-8"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${
              gridDensity === 'large' ? 108 : gridDensity === 'compact' ? 72 : 88
            }px, 1fr))`,
          }}
        >
          {customParts.map((part) => {
            const hasContours = part.contours && part.contours.length > 0;

            return (
              <div
                key={part.id}
                onClick={() => {
                  if (hasContours) {
                    handleInsertWithPlacement(part.contours, part.name);
                  } else {
                    showNotice(`「${part.name}」には輪郭が未登録です。「割当」を押してください`);
                  }
                }}
                title={hasContours ? `${part.name} をキャンバスに挿入` : `${part.name}（未割当の名前枠）`}
                className={`relative flex flex-col justify-between ${
                  gridDensity === 'compact' ? 'p-1.5' : 'p-2'
                } rounded-lg border overflow-hidden min-w-0 group transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50/40 shadow-xs'
                    : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
                }`}
              >
                {/* Card Top Actions Row (compact, non-overlapping) */}
                <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                  {hasContours && onBatchInsertCustomPart ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchInsertCustomPart(part);
                      }}
                      className={`p-0.5 rounded text-[9px] font-bold border transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                          : 'bg-[#132219] border-emerald-700 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                      }`}
                      title={`「${part.name}」を複数漢字へ一括流し込み`}
                    >
                      <Layers className="w-2.5 h-2.5 shrink-0" />
                    </button>
                  ) : (
                    <span className="text-[8.5px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 whitespace-nowrap shrink-0 leading-none">
                      枠
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomParts((prev) => prev.filter((p) => p.id !== part.id));
                      showNotice(`「${part.name}」をマイパーツから削除しました`);
                    }}
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-stone-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                    title="パーツを削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {hasContours ? (
                  /* Vector Contour Preview */
                  <div className="flex flex-col items-center min-w-0">
                    <div
                      className={`shrink-0 ${
                        gridDensity === 'large'
                          ? 'w-14 h-14'
                          : gridDensity === 'compact'
                          ? 'w-8 h-8'
                          : 'w-11 h-11'
                      } flex items-center justify-center p-0.5 bg-stone-50 dark:bg-[#121c15] rounded border border-stone-100 dark:border-stone-800/60 overflow-hidden`}
                    >
                      <GlyphPreviewSvg
                        contours={part.contours}
                        fill={isLight ? '#1f2937' : '#ecfdf5'}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold mt-1 text-center w-full leading-[1.25] break-words line-clamp-2">
                      {part.name}
                    </span>
                  </div>
                ) : (
                  /* Minimal Name Frame Badge & Actions */
                  <div className="flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-stone-800 dark:text-emerald-100 text-center w-full leading-[1.25] break-words line-clamp-2">
                      {part.name}
                    </span>

                    <div className="flex items-center">
                      {currentContours.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveContoursAsPart(currentContours, part.name);
                          }}
                          className="w-full min-w-0 text-[9.5px] font-bold py-1 px-1 rounded bg-emerald-800 text-white hover:bg-emerald-900 transition-colors text-center shadow-xs cursor-pointer whitespace-nowrap truncate"
                          title="現在のキャンバスの文字をこの名前枠に保存"
                        >
                          文字割当
                        </button>
                      ) : (
                        <span className="text-[9px] text-stone-400 block text-center w-full truncate">
                          未割当
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
