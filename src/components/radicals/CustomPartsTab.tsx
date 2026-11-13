import React from 'react';
import { BookmarkPlus, Plus, Trash2, Sparkles, Layers } from 'lucide-react';
import { CustomPart, PathContour } from '../../types';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';

interface CustomPartsTabProps {
  isLight: boolean;
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
    <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2.5">
      {/* Informational Guidance Banner */}
      <div
        className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
          isLight
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-[#142319] border-[#223d2b] text-emerald-200'
        }`}
      >
        <div className="font-bold flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>メインキャンバス連動型マイパーツ</span>
        </div>
        <p className="text-[10px] text-stone-600 dark:text-stone-300">
          キャンバスで輪郭を選択し、上部ツールバーの<strong>「★ 部首パーツに登録」</strong>を押すと、1クリックで即時保存されます。
        </p>
      </div>

      {/* Manual Save & Name Frame Creation Actions */}
      {!showSaveInput ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(false);
              setShowSaveInput(true);
            }}
            disabled={!currentContours || currentContours.length === 0}
            className={`py-2 px-2 rounded-md border flex items-center justify-center space-x-1 transition-all font-bold text-xs cursor-pointer ${
              !currentContours || currentContours.length === 0
                ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700'
                : isLight
                ? 'bg-emerald-800 border-emerald-900 text-white hover:bg-emerald-900 shadow-xs'
                : 'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600 shadow-xs'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>現在の文字全体を保存</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(true);
              setShowSaveInput(true);
            }}
            className={`py-2 px-2 rounded-md border flex items-center justify-center space-x-1 transition-all font-bold text-xs cursor-pointer ${
              isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223127] shadow-xs'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>空の名前枠を作成</span>
          </button>
        </div>
      ) : (
        <div
          className={`p-2.5 rounded-lg border space-y-2 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#1a261f] border-[#25362b]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">
              {createOnlyFrame ? 'パーツ枠の名前を入力:' : '保存するパーツ名を入力:'}
            </span>
            <button
              type="button"
              onClick={() => setCreateOnlyFrame(!createOnlyFrame)}
              className="text-[10px] text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
            >
              {createOnlyFrame ? '→ 形状も保存する' : '→ 名前枠だけ作成する'}
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
          <div className="flex justify-end space-x-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowSaveInput(false)}
              className="px-2.5 py-1 rounded text-[11px] border border-stone-300 dark:border-stone-700 cursor-pointer"
            >
              キャンセル
            </button>
            {createOnlyFrame ? (
              <button
                type="button"
                onClick={() => handleCreateNameFrame()}
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer"
              >
                名前枠を作成
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveContoursAsPart(currentContours, `パーツ_${selectedChar || '無題'}`)}
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer"
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid grid-cols-2 gap-2 content-start pr-1 pb-28 sm:pb-8">
          {customParts.map((part) => {
            const hasContours = part.contours && part.contours.length > 0;

            return (
              <div
                key={part.id}
                onClick={() => {
                  if (hasContours) {
                    handleInsertWithPlacement(part.contours, part.name);
                  } else {
                    showNotice(`「${part.name}」には輪郭が未登録です。「現在の文字を割当」を押してください`);
                  }
                }}
                className={`relative flex flex-col justify-between p-2.5 rounded-lg border group transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-[#fbfdfc] shadow-xs'
                    : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
                }`}
              >
                {/* Batch Insert Button */}
                {hasContours && onBatchInsertCustomPart && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBatchInsertCustomPart(part);
                    }}
                    className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors z-10 flex items-center gap-0.5 cursor-pointer ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                        : 'bg-[#132219] border-emerald-700 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                    }`}
                    title={`「${part.name}」を複数漢字へ一括流し込み`}
                  >
                    <Layers className="w-2.5 h-2.5" />
                    <span>一括</span>
                  </button>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomParts((prev) => prev.filter((p) => p.id !== part.id));
                    showNotice(`「${part.name}」をマイパーツから削除しました`);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-stone-400 hover:text-red-600 transition-colors z-10 cursor-pointer"
                  title="パーツを削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {hasContours ? (
                  /* Vector Contour Preview */
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 flex items-center justify-center p-1 bg-stone-50 dark:bg-[#121c15] rounded border border-stone-100 dark:border-stone-800/60">
                      <GlyphPreviewSvg
                        contours={part.contours}
                        fill={isLight ? '#1f2937' : '#ecfdf5'}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[11px] font-bold mt-1.5 text-center truncate w-full">
                      {part.name}
                    </span>
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                      クリックで挿入
                    </span>
                  </div>
                ) : (
                  /* Minimal Name Frame Badge & Actions */
                  <div className="flex flex-col justify-between min-h-[72px]">
                    <div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 inline-block mb-1">
                        名前枠
                      </span>
                      <span className="text-xs font-bold text-stone-800 dark:text-emerald-100 block truncate">
                        {part.name}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-1">
                      {currentContours.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveContoursAsPart(currentContours, part.name);
                          }}
                          className="w-full text-[10px] font-bold py-1 px-1.5 rounded bg-emerald-800 text-white hover:bg-emerald-900 transition-colors text-center shadow-xs cursor-pointer"
                          title="現在のキャンバスの文字をこの名前枠に保存"
                        >
                          現在の文字を割当
                        </button>
                      ) : (
                        <span className="text-[9px] text-stone-400 block text-center w-full">
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
