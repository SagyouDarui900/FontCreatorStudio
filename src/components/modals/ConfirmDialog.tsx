import React, { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * ConfirmDialog — window.confirm の置き換えとなるカスタム確認ダイアログ。
 *
 * window.confirm は iFrame / PWA 環境で表示が抑制される場合があるため、
 * アプリ内のモーダルと同じ見た目のダイアログで確認する。
 * 文言は呼び出し側が従来の window.confirm と同じ文字列を渡し、
 * OK が従来の「OK」、キャンセルが従来の「キャンセル」に対応する。
 *
 * 使い方（コンポーネントとして組み込む場合）:
 * ```tsx
 * {isConfirmOpen && (
 *   <ConfirmDialog
 *     message="保存されていない変更があります。閉じると変更は破棄されます。閉じますか？"
 *     theme={theme}
 *     onConfirm={handleDiscard}
 *     onCancel={() => setIsConfirmOpen(false)}
 *   />
 * )}
 * ```
 *
 * 使い方（フックなど描画を持たない場所から呼ぶ場合）:
 * ```ts
 * if (!(await requestConfirm('「ぁ」には既に字形があります。上書きしますか？'))) return;
 * ```
 * requestConfirm は描画を持たない呼び出し側の形を変えないための手段で、
 * 内部で document.body に一時的な React ルートを作って同じ
 * ConfirmDialog を表示する。確認が終わるとルートを破棄する。
 */

export interface ConfirmDialogProps {
  /** 従来の window.confirm に渡していた確認文と同じ文字列。 */
  message: string;
  /** OK ボタンの表示。未指定時は 'OK'。 */
  confirmLabel?: string;
  /** キャンセルボタンの表示。未指定時は 'キャンセル'。 */
  cancelLabel?: string;
  theme?: ThemeMode;
  onConfirm: () => void;
  onCancel: () => void;
}

const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'sepia', 'warm', 'nord', 'monochrome'];

/** document.documentElement の data-theme から現在のテーマを読む。読めない場合は light。 */
function readThemeFromDocument(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr && (VALID_THEMES as string[]).includes(attr) ? (attr as ThemeMode) : 'light';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  theme = 'light',
  onConfirm,
  onCancel,
}) => {
  const themeClasses = getThemeClasses(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // window.confirm と同じ既定操作（Enter で OK）に合わせ、OK ボタンに
  // フォーカスを移す。Escape はキャンセルとして扱う。
  useEffect(() => {
    confirmButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // キャプチャ段階で止め、背後のモーダルやドロワーの Escape 処理が
        // 同じキーで動かないようにする。
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        // フォーカスをダイアログ内に留める。
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label="確認"
        className={`w-full max-w-xs rounded-lg border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3 space-y-2 shadow-xl ${themeClasses.cardBg} ${themeClasses.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={`text-[12px] leading-relaxed ${themeClasses.textPrimary}`}>{message}</p>
        <div className="flex gap-1.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 px-3 py-1.5 rounded text-[11px] font-bold border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 px-3 py-1.5 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PendingConfirm {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: boolean) => void;
}

// requestConfirm の待ち行列。ダイアログは一度に1件だけ表示し、
// 複数の確認が重なった場合は前の確認が終わってから次を表示する。
const confirmQueue: PendingConfirm[] = [];
let confirmActive = false;

function pumpConfirmQueue(): void {
  if (confirmActive) return;
  const next = confirmQueue.shift();
  if (!next) return;
  if (typeof document === 'undefined') {
    next.resolve(false);
    pumpConfirmQueue();
    return;
  }
  confirmActive = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const finish = (value: boolean) => {
    // 遅れて届いたクリックで二重に解決しないようにする。
    if (!confirmActive) return;
    confirmActive = false;
    root.unmount();
    container.remove();
    next.resolve(value);
    pumpConfirmQueue();
  };
  root.render(
    <ConfirmDialog
      message={next.message}
      confirmLabel={next.confirmLabel}
      cancelLabel={next.cancelLabel}
      theme={readThemeFromDocument()}
      onConfirm={() => finish(true)}
      onCancel={() => finish(false)}
    />
  );
}

/**
 * window.confirm の非同期版。同じ確認文をカスタムダイアログで表示し、
 * OK なら true、キャンセルなら false で解決する。
 * 呼び出し側は `await requestConfirm(...)` で結果を待ってから進む。
 */
export function requestConfirm(
  message: string,
  options?: { confirmLabel?: string; cancelLabel?: string }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    confirmQueue.push({
      message,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      resolve,
    });
    pumpConfirmQueue();
  });
}
