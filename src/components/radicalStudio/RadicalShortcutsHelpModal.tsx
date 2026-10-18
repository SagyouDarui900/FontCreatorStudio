import React from 'react';
import { BookOpen, X, PenTool, Paintbrush, MousePointer } from 'lucide-react';

interface RadicalShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export const RadicalShortcutsHelpModal: React.FC<RadicalShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  isLight,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-[#c8ded3]' : 'bg-[#16221a] border-[#25362b]'
        }`}
      >
        <div className="p-3.5 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-sm font-bold">部首工房 ショートカット・操作ガイド</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs text-stone-700 dark:text-stone-300">
          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center space-x-1">
              <PenTool className="w-3.5 h-3.5" />
              <span>ベジェペンツール (P)</span>
            </h4>
            <ul className="space-y-1 list-disc list-inside text-[11.5px] text-stone-600 dark:text-stone-300">
              <li><strong>クリック</strong>: 直線の角頂点（Corner Node）を追加</li>
              <li><strong>クリック＆ドラッグ</strong>: 滑らかな曲率ハンドル（Smooth Node）を伸ばす</li>
              <li><strong>始点クリック / Enter</strong>: パスを閉じて輪郭として確定</li>
              <li><strong>Backspace / 1点戻す</strong>: 直前に打った頂点を取り消す</li>
              <li><strong>Esc</strong>: 作図中のパスをリセット</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center space-x-1">
              <Paintbrush className="w-3.5 h-3.5" />
              <span>手書き筆・ブラシツール (B)</span>
            </h4>
            <ul className="space-y-1 list-disc list-inside text-[11.5px] text-stone-600 dark:text-stone-300">
              <li><strong>低遅延RAF描画</strong>: 筆先ストロークが遅れずリアルタイムに追従</li>
              <li><strong>筆圧・描画速度連動</strong>: 毛筆・明朝・ゴシック・マーカー等で自然な止め・払い・抑揚を再現</li>
              <li><strong>Shiftキー / 直線モード</strong>: 押下しながら描くことで直線ストロークを作成</li>
              <li><strong>自動重なり結合</strong>: 描いたストロークが自動で既存輪郭と結合し、白抜けを防止</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center space-x-1">
              <MousePointer className="w-3.5 h-3.5" />
              <span>ツール切替 & 共通キー</span>
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">V</strong>: 選択 / 頂点編集</div>
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">P</strong>: ベジェペン</div>
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">B</strong>: 手書きブラシ</div>
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">E</strong>: 消しゴム</div>
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">Space / H</strong>: 画面スクロール</div>
              <div className="p-1.5 rounded bg-stone-100 dark:bg-[#1a281f]"><strong className="text-emerald-700 dark:text-emerald-300">Ctrl+Z / Y</strong>: 取消 / やり直し</div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t bg-stone-50 dark:bg-[#131d16] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
