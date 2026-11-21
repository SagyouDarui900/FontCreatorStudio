import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocusTrap } from '../modals/ModalStackFrame';

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

  const dividerClass = isLight ? 'border-stone-200' : 'border-[#25362b]';
  const headingText = isLight ? 'text-stone-900' : 'text-stone-100';
  const mutedText = isLight ? 'text-stone-600' : 'text-stone-300';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="部首工房 ショートカット・操作ガイド"
        tabIndex={-1}
        className={`w-full max-w-md rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-stone-200' : 'bg-[#16221a] border-[#25362b]'
        }`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between ${dividerClass}`}>
          <h3 className={`text-sm font-bold ${headingText}`}>
            部首工房 操作ガイド
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`p-5 space-y-5 text-xs ${mutedText}`}>
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
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                        isLight
                          ? 'bg-stone-50 border-stone-300 text-stone-800'
                          : 'bg-[#121c16] border-[#2c3d31] text-stone-200'
                      }`}
                    >
                      {item.key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className={`px-4 py-3 border-t ${dividerClass} flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
