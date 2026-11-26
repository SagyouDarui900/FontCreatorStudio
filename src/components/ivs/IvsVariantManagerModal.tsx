import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, BookOpen, ExternalLink, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { IVS_PRESETS, IvsPresetEntry, IvsVariant } from '../../data/ivsPresets';
import { isLightTheme, getThemeClasses, ThemeMode } from '../../utils/theme';
import { GlyphData } from '../../types';
import { useIsTopModal, useDialogFocusTrap } from '../modals/ModalStackFrame';
import { ModalTabs } from '../modals/ModalTabs';
import { ModalFooter } from '../modals/ModalFooter';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isTopModal = useIsTopModal();

  useDialogFocusTrap(modalRef, isOpen && isTopModal, () => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      onClose();
    }
  });

  // F toggles fullscreen outside form fields
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="IVS 異体字セレクタ管理"
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        ref={modalRef}
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-5xl border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 sm:pt-2.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-base font-bold flex items-center gap-2 truncate ${themeClasses.textPrimary}`}>
                IVS 異体字セレクタ（Ideographic Variation Sequence）管理
              </h2>
              <p className={`hidden sm:block text-xs ${themeClasses.textMuted}`}>
                辻・葛・辺など、1つのコードポイントに対して規格や伝統字形を切り替えるUnicode標準異体字シーケンス
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`p-2 max-sm:min-w-[40px] max-sm:min-h-[40px] flex items-center justify-center rounded-xl border transition-colors shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <ModalTabs
          tabs={[
            { id: 'presets', label: '代表的なIVS漢字プリセット', shortLabel: 'プリセット', count: IVS_PRESETS.length },
            { id: 'about', label: 'IVS規格とフォント出力仕様について', shortLabel: 'IVS規格' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="IVS管理のタブ"
        />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <p className={`text-xs ${themeClasses.textMuted}`}>
                人名や自治体名などで字形差が問題となる主要な漢字です。該当文字をクリックして直ちにエディタで編集できます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {IVS_PRESETS.map((item) => {
                  const isCurrent = item.baseChar === selectedChar;
                  const glyph = glyphs[item.baseUnicode];
                  const hasContours = glyph && glyph.contours && glyph.contours.length > 0;

                  return (
                    <div
                      key={item.baseChar}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${themeClasses.cardBg} ${
                        isCurrent
                          ? `${themeClasses.accentBorder} ring-1 ring-emerald-500/30`
                          : themeClasses.border
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
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${themeClasses.accentBadge}`}>
                            {item.category}
                          </span>
                        </div>

                        {/* Variants breakdown */}
                        <div className={`space-y-1.5 mt-3 pt-2 border-t ${themeClasses.border}`}>
                          {item.variants.map((v) => (
                            <div key={v.selectorCode} className={`text-xs p-2 rounded-lg border ${themeClasses.toolbarBg} ${themeClasses.border}`}>
                              <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                                <span className={themeClasses.accentText}>{v.selectorName}</span>
                                <span className="font-mono text-[10px] opacity-60">U+{v.selectorCode.toString(16).toUpperCase()}</span>
                              </div>
                              <p className={`text-[11px] ${themeClasses.textMuted}`}>{v.description}</p>
                              <span className={`inline-block mt-1 text-[10px] font-bold ${themeClasses.accentText}`}>
                                特徴: {v.distinction}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 flex items-center justify-between">
                        <span className={`text-[10px] font-mono ${themeClasses.textMuted}`}>
                          {hasContours ? '作図データあり' : '未作成'}
                        </span>
                        <button
                          onClick={() => {
                            onSelectGlyph(item.baseUnicode);
                            onClose();
                            onShowToast(`「${item.baseChar}」のエディタを開きました`, 'success');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${themeClasses.accentBtn}`}
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
            <div className={`space-y-4 text-xs leading-relaxed ${themeClasses.textPrimary}`}>
              <h3 className={`text-xs font-bold ${themeClasses.textPrimary}`}>IVS（Ideographic Variation Sequence）とは？</h3>
              <p>
                従来のUnicodeでは「辻」や「葛」といった漢字は1つのコードポイント（例: 辻=U+8FBB）しか割り当てられていませんでしたが、
                人名・地名における「一点しんにょう」と「二点しんにょう」のように、微細だが法的に重要な字形差を区別するために制定された仕組みです。
              </p>
              <p>
                親文字（基底漢字）の直後に「異体字セレクタ（Variation Selector: VS1〜VS16 / Moji_Joho IVS）」を付与することで、
                同一コードポイントでありながら異なるグリフ（字形）を呼び出すことができます。
              </p>

              <h3 className={`text-xs font-bold mt-4 ${themeClasses.textPrimary}`}>OpenType IVS 仕様と本アプリでの扱い</h3>
              <p>
                OpenType 規格では <code>cmap format 14 (Unicode Variation Sequences)</code> テーブルによって同一コードポイントに対する異体字字形を切り替えます。
                本アプリでは代表的な IVS 対象漢字の基底コードポイントを素早く呼び出して作図・調整するためのガイドとしてご活用いただけます。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <ModalFooter
          onCancel={onClose}
          cancelLabel="キャンセル"
          primaryLabel="閉じる"
          onPrimary={onClose}
          theme={theme}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};
