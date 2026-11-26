import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocusTrap } from '../modals/ModalStackFrame';
import { getThemeClasses } from '../../utils/theme';

interface RadicalShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

const RADICAL_SHORTCUTS = [
  { key: 'V', label: '選択・頂点編集' },
  { key: 'P', label: 'ベジェペン' },
  { key: 'B', label: '筆ツール' },
  { key: 'E', label: '消しゴム' },
  { key: 'Space / H', label: '画面移動' },
  { key: 'Ctrl + Z / Y', label: '元に戻す / やり直す' },
];

export const RadicalShortcutsHelpModal: React.FC<RadicalShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  isLight,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useDialogFocusTrap(modalRef, isOpen, onClose);

  if (!isOpen) return null;

  const themeClasses = getThemeClasses(isLight ? 'light' : 'dark');
  const dividerClass = themeClasses.border;
  const headingText = themeClasses.textPrimary;
  const mutedText = themeClasses.textMuted;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 anim-fade select-none">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="部首工房 ショートカット・操作ガイド"
        tabIndex={-1}
        className={`w-full max-w-md rounded-xl border shadow-2xl flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        <div className={`px-3.5 py-2.5 sm:px-5 sm:py-2.5 border-b flex items-center justify-between ${dividerClass} ${themeClasses.headerBg}`}>
          <h2 className={`text-sm sm:text-base font-bold ${headingText}`}>
            部首工房 操作ガイド
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className={`p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className={`p-3.5 sm:p-4 space-y-3 text-xs ${mutedText}`}>
          <section className="space-y-1.5">
            <h4 className={`font-bold ${headingText}`}>ペンツール (P)</h4>
            <ul className="space-y-1 list-disc list-inside leading-relaxed">
              <li>クリック: コーナー点（角）を追加</li>
              <li>ドラッグ: ハンドル付きスムーズ点（曲線）を追加</li>
              <li>始点クリック / Enter: パスを閉じて確定</li>
              <li>Backspace: 直前の頂点を取り消し</li>
              <li>Esc: 作成中のパスを破棄</li>
            </ul>
          </section>

          <section className={`pt-4 border-t ${dividerClass} space-y-1.5`}>
            <h4 className={`font-bold ${headingText}`}>筆ツール (B)</h4>
            <ul className="space-y-1 list-disc list-inside leading-relaxed">
              <li>筆圧と移動速度に応じて線幅を変化させます</li>
              <li>Shift + ドラッグ: 直線ストロークを描画</li>
              <li>既存の輪郭と重なる場合、設定に応じて外周を統合します</li>
            </ul>
          </section>

          <section className={`pt-4 border-t ${dividerClass} space-y-2`}>
            <h4 className={`font-bold ${headingText}`}>ショートカットキー</h4>
            <dl className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-[#25362b]'} border-t ${dividerClass}`}>
              {RADICAL_SHORTCUTS.map((item) => (
                <div key={item.key} className="py-1.5 flex items-center justify-between gap-3">
                  <dt className={mutedText}>{item.label}</dt>
                  <dd>
                    <kbd
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    >
                      {item.key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className={`px-3.5 py-2.5 sm:px-5 sm:py-3 border-t ${dividerClass} ${themeClasses.headerBg} flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] sm:min-h-0 px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${themeClasses.accentBtn}`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
