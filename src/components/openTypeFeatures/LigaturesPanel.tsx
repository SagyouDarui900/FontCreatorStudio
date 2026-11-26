import React from 'react';
import { ArrowRight, Check, Layers, Plus, Trash2 } from 'lucide-react';
import { OpenTypeFeatureLigature } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { safeFromCodePoint } from './openTypePresets';

interface LigaturesPanelProps {
  ligatures: OpenTypeFeatureLigature[];
  existingUnicodes?: Set<number>;
  themeClasses: ThemeClasses;
  newLigName: string;
  newLigType: 'liga' | 'dlig' | 'rlig';
  newLigInputs: string;
  newLigTargetUnicode: string;
  onChangeNewLigName: (value: string) => void;
  onChangeNewLigType: (value: 'liga' | 'dlig' | 'rlig') => void;
  onChangeNewLigInputs: (value: string) => void;
  onChangeNewLigTargetUnicode: (value: string) => void;
  onAddCustomLigature: () => void;
  onToggleLigature: (id: string) => void;
  onRemoveLigature: (id: string) => void;
}

export const LigaturesPanel: React.FC<LigaturesPanelProps> = ({
  ligatures,
  existingUnicodes,
  themeClasses,
  newLigName,
  newLigType,
  newLigInputs,
  newLigTargetUnicode,
  onChangeNewLigName,
  onChangeNewLigType,
  onChangeNewLigInputs,
  onChangeNewLigTargetUnicode,
  onAddCustomLigature,
  onToggleLigature,
  onRemoveLigature,
}) => {
  return (
    <div className="space-y-4">
      {/* Ligature Overview & Add Form Card */}
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-colors space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              標準・選択的・必須合字 (OpenType `liga` / `dlig` / `rlig` GSUB)
            </h3>
            <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
              特定の文字が連続して入力された際（例: `f` + `f` + `i` ＝ `ﬃ`）、自動的に連結合字グリフに置換します
            </p>
          </div>
        </div>

        {/* Add Custom Ligature Form */}
        <div className={`pt-3 border-t space-y-3 ${themeClasses.border}`}>
          <h4 className="text-xs font-bold">新しい合字ルールの定義・追加</h4>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="合字名称 (例: トモダチ合字)"
              value={newLigName}
              onChange={(e) => onChangeNewLigName(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />

            <select
              value={newLigType}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'liga' || v === 'dlig' || v === 'rlig') {
                  onChangeNewLigType(v);
                }
              }}
              aria-label="合字種別"
              className={`px-3 py-2 rounded-xl border text-xs outline-hidden cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              <option value="liga">liga（標準合字・常時ON）</option>
              <option value="dlig">dlig（選択的合字・装飾）</option>
              <option value="rlig">rlig（必須合字・強制）</option>
            </select>

            <input
              type="text"
              placeholder="トリガー文字並び (例: fi または トモ)"
              value={newLigInputs}
              onChange={(e) => onChangeNewLigInputs(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-mono outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="合字Unicode (例: U+FB01)"
                value={newLigTargetUnicode}
                onChange={(e) => onChangeNewLigTargetUnicode(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
              />

              <button
                onClick={onAddCustomLigature}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
              >
                <Plus className="w-4 h-4" />
                <span>追加</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registered Ligature List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4
            className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}
          >
            <Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>登録済み合字ルール一覧 ({ligatures.length} 件)</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {ligatures.map((lig) => {
            const targetChar = safeFromCodePoint(lig.substituteUnicode);
            const hasTarget = existingUnicodes
              ? existingUnicodes.has(lig.substituteUnicode)
              : true;
            const hasAllInputs = existingUnicodes
              ? lig.inputChars.every((c) => {
                  const cp = c.codePointAt(0);
                  return cp !== undefined && existingUnicodes.has(cp);
                })
              : true;
            const typeClass =
              lig.type === 'liga'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : lig.type === 'rlig'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-purple-500/10 text-purple-600 border-purple-500/30';

            return (
              <div
                key={lig.id}
                className={`p-2.5 sm:p-3 rounded-xl border transition-colors flex items-center justify-between ${
                  lig.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => onToggleLigature(lig.id)}
                    className={`w-8 h-8 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      lig.enabled
                        ? `${themeClasses.accentBtn} border-transparent`
                        : themeClasses.border
                    }`}
                  >
                    {lig.enabled && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="font-bold text-sm truncate">{lig.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${typeClass}`}
                      >
                        {lig.type}
                      </span>
                      {existingUnicodes && !hasTarget && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-rose-500/10 text-rose-600 border-rose-500/30"
                          title="変換先の合字グリフがまだ作成されていません"
                        >
                          合字未作成
                        </span>
                      )}
                      {existingUnicodes && hasTarget && !hasAllInputs && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/30"
                          title="入力側の文字の一部が未作成です"
                        >
                          入力字不足
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex items-center space-x-1.5 text-xs font-mono mt-1 ${themeClasses.textMuted}`}
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded border font-bold ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                      >
                        {lig.inputChars.join(' + ')}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      <span className={`px-1.5 py-0.5 rounded border font-black ${themeClasses.accentBadge}`}>
                        {targetChar ? `${targetChar} ` : ''}U+{lig.substituteUnicode.toString(16).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveLigature(lig.id)}
                  className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
