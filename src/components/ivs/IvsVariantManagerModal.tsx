import React, { useState } from 'react';
import { X, Layers, Sparkles, BookOpen, ExternalLink, ArrowRight } from 'lucide-react';
import { IVS_PRESETS, IvsPresetEntry, IvsVariant } from '../../data/ivsPresets';
import { isLightTheme, getThemeClasses, ThemeMode } from '../../utils/theme';
import { GlyphData } from '../../types';

export interface IvsVariantManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnicode: number;
  selectedChar: string;
  glyphs: Record<number, GlyphData>;
  onSelectGlyph: (unicode: number) => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeMode;
}

export const IvsVariantManagerModal: React.FC<IvsVariantManagerModalProps> = ({
  isOpen,
  onClose,
  selectedUnicode,
  selectedChar,
  glyphs,
  onSelectGlyph,
  onShowToast,
  theme,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const [activeTab, setActiveTab] = useState<'presets' | 'about'>('presets');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${themeClasses.textPrimary}`}>
                IVS 異体字セレクタ（Ideographic Variation Sequence）管理
              </h2>
              <p className={`text-xs ${themeClasses.textMuted}`}>
                辻・葛・辺など、1つのコードポイントに対して規格や伝統字形を切り替えるUnicode標準異体字シーケンス
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer ${themeClasses.activeToolHover}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-5 py-2 border-b flex items-center gap-2 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'presets'
                ? themeClasses.accentBtn
                : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
            }`}
          >
            代表的なIVS漢字プリセット
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'about'
                ? themeClasses.accentBtn
                : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
            }`}
          >
            IVS規格とフォント出力仕様について
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'presets' ? (
            <div className="space-y-4">
              <p className={`text-xs ${themeClasses.textMuted}`}>
                人名や自治体名などで字形差が問題となる主要な漢字です。該当文字をクリックして直ちにエディタで編集できます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {IVS_PRESETS.map((item) => {
                  const isCurrent = item.baseChar === selectedChar;
                  const glyph = glyphs[item.baseUnicode];
                  const hasContours = glyph && glyph.contours && glyph.contours.length > 0;

                  return (
                    <div
                      key={item.baseChar}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/30'
                          : isLight
                          ? 'bg-stone-50/60 border-stone-200 hover:border-stone-300'
                          : 'bg-stone-900/40 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-serif font-bold leading-none">{item.baseChar}</span>
                            <div>
                              <span className="font-bold text-xs block">{item.name}</span>
                              <span className="font-mono text-[10px] text-stone-400">
                                U+{item.baseUnicode.toString(16).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10">
                            {item.category}
                          </span>
                        </div>

                        {/* Variants breakdown */}
                        <div className="space-y-1.5 mt-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                          {item.variants.map((v) => (
                            <div key={v.selectorCode} className="text-xs bg-white dark:bg-stone-950 p-2 rounded-lg border border-stone-200/60 dark:border-stone-800">
                              <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                                <span className="text-emerald-700 dark:text-emerald-300">{v.selectorName}</span>
                                <span className="font-mono text-[10px] opacity-60">U+{v.selectorCode.toString(16).toUpperCase()}</span>
                              </div>
                              <p className="text-[11px] text-stone-600 dark:text-stone-400">{v.description}</p>
                              <span className="inline-block mt-1 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                                特徴: {v.distinction}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 font-mono">
                          {hasContours ? '作図データあり' : '未作成'}
                        </span>
                        <button
                          onClick={() => {
                            onSelectGlyph(item.baseUnicode);
                            onClose();
                            onShowToast(`「${item.baseChar}」のエディタを開きました`, 'success');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>エディタで開く</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">IVS（Ideographic Variation Sequence）とは？</h3>
              <p>
                従来のUnicodeでは「辻」や「葛」といった漢字は1つのコードポイント（例: 辻=U+8FBB）しか割り当てられていませんでしたが、
                人名・地名における「一点しんにょう」と「二点しんにょう」のように、微細だが法的に重要な字形差を区別するために制定された仕組みです。
              </p>
              <p>
                親文字（基底漢字）の直後に「異体字セレクタ（Variation Selector: VS1〜VS16 / Moji_Joho IVS）」を付与することで、
                同一コードポイントでありながら異なるグリフ（字形）を呼び出すことができます。
              </p>

              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-4">武蔵システム OTEdit / TTEdit との互換性</h3>
              <p>
                本アプリで作成したフォントは、OpenType の <code>cmap format 14 (Unicode Variation Sequences)</code> テーブルに対応したメタデータを保持し、
                Adobe InDesign、Illustrator、Word などのIVS対応環境で標準文字と異体字の両立を実現できます。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex justify-end shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} hover:${themeClasses.activeToolHover}`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
