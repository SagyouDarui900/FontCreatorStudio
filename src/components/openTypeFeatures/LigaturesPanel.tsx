import React from 'react';
import { ArrowRight, Check, Layers, Plus, Trash2 } from 'lucide-react';
import { OpenTypeFeatureLigature } from '../../types';
import { ThemeClasses } from '../../utils/theme';

interface LigaturesPanelProps {
  ligatures: OpenTypeFeatureLigature[];
  themeClasses: ThemeClasses;
  newLigName: string;
  newLigInputs: string;
  newLigTargetUnicode: string;
  onChangeNewLigName: (value: string) => void;
  onChangeNewLigInputs: (value: string) => void;
  onChangeNewLigTargetUnicode: (value: string) => void;
  onAddCustomLigature: () => void;
  onToggleLigature: (id: string) => void;
  onRemoveLigature: (id: string) => void;
}

export const LigaturesPanel: React.FC<LigaturesPanelProps> = ({
  ligatures,
  themeClasses,
  newLigName,
  newLigInputs,
  newLigTargetUnicode,
  onChangeNewLigName,
  onChangeNewLigInputs,
  onChangeNewLigTargetUnicode,
  onAddCustomLigature,
  onToggleLigature,
  onRemoveLigature,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Ligature Overview & Add Form Card */}
      <div
        className={`p-4 sm:p-5 rounded-xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              標準・選択的合字 (OpenType `liga` &amp; `dlig` GSUB)
            </h3>
            <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
              特定の文字が連続して入力された際（例: `f` + `i` ＝ `fi`）、自動的に連結合字グリフに置換します
            </p>
          </div>
        </div>

        {/* Add Custom Ligature Form */}
        <div className={`pt-3 border-t space-y-3 ${themeClasses.border}`}>
          <h4 className="text-xs font-bold">新しい合字ルールの定義・追加</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              placeholder="合字名称 (例: トモダチ合字)"
              value={newLigName}
              onChange={(e) => onChangeNewLigName(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ligatures.map((lig) => (
            <div
              key={lig.id}
              className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between ${
                lig.enabled
                  ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                  : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => onToggleLigature(lig.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                    lig.enabled
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : themeClasses.border
                  }`}
                >
                  {lig.enabled && <Check className="w-3.5 h-3.5" />}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm truncate">{lig.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        lig.type === 'liga'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                      }`}
                    >
                      {lig.type}
                    </span>
                  </div>

                  <div
                    className={`flex items-center space-x-1.5 text-xs font-mono mt-1 ${themeClasses.textMuted}`}
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded border font-bold ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                    >
                      {lig.inputChars.join(' + ')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className={`px-1.5 py-0.5 rounded border font-black ${themeClasses.accentBadge}`}>
                      U+{lig.substituteUnicode.toString(16).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveLigature(lig.id)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
