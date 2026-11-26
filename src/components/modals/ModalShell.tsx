import React, { type ReactNode } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { getThemeClasses, type ThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * ModalShell — 全モーダル共通の枠（監査 (a) a-4 / (d) 1）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <ModalShell
 *   title="フォント出力"
 *   subtitle="OpenType (CFF) 規格準拠のフォントファイルを生成します"
 *   icon={<Download className="w-4 h-4 sm:w-5 sm:h-5" />}
 *   theme={theme}
 *   maxWidth="5xl"
 *   isFullscreen={isFullscreen}
 *   onToggleFullscreen={() => setIsFullscreen((v) => !v)}
 *   onClose={onClose}
 *   footer={<ModalFooter primaryLabel="ダウンロード" onPrimary={handleExport} onCancel={onClose} theme={theme} />}
 * >
 *   ...本体...
 * </ModalShell>
 * ```
 * - フォーカストラップ / Escape 処理は ModalStackFrame 側が持つため、ここでは行わない。
 * - `onToggleFullscreen` を渡さないモーダルでは全画面ボタンは出ない（M-11）。
 * - `footer` はそのまま描画する。ModalFooter がフッターのバー自体を描画するため、
 *   二重のバーにならないよう Shell 側ではラッパーを付けない。
 * - `maxWidth="full"` は `sm:max-w-none`（外側の sm:p-4 まで広がる）。Mojikumi の
 *   `sm:max-w-[1540px]` のようなモーダル固有の任意幅は、必要なら `maxWidth="full"` で置き換える。
 */

export type ModalMaxWidth = '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

const MAX_WIDTH_CLASSES: Record<ModalMaxWidth, string> = {
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
  full: 'sm:max-w-none',
};

export interface ModalShellProps {
  title: string;
  subtitle?: ReactNode;
  /** ヘッダーのアイコン枠（hidden sm:flex）に入るアイコン。呼び出し側で w-4 h-4 sm:w-5 sm:h-5 を付ける。 */
  icon?: ReactNode;
  onClose: () => void;
  isFullscreen?: boolean;
  /** 渡さない場合は全画面切替ボタンを表示しない。 */
  onToggleFullscreen?: () => void;
  maxWidth?: ModalMaxWidth;
  /** フッター（通常は <ModalFooter ... />）。Shell はラッパーを付けずそのまま描画する。 */
  footer?: ReactNode;
  children: ReactNode;
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
  /** aria-label。未指定時は title を使う。 */
  ariaLabel?: string;
  /** 本体に追加するクラス。 */
  bodyClassName?: string;
  /** ヘッダーのタイトル横に出す追加要素（バッジなど）。 */
  headerExtra?: ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  icon,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  maxWidth = '5xl',
  footer,
  children,
  theme = 'light',
  themeClasses: passedThemeClasses,
  ariaLabel,
  bodyClassName,
  headerExtra,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  return (
    <div
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto ${MAX_WIDTH_CLASSES[maxWidth]} border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header: px-3.5 py-2.5 sm:px-5 sm:py-2.5 border-b + headerBg（監査 a-3） */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 sm:pt-2.5 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            {icon && (
              <div
                className={`hidden sm:flex w-8 h-8 rounded-xl border items-center justify-center shrink-0 ${themeClasses.accentBadge}`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
                <span className="truncate">{title}</span>
                {isFullscreen && (
                  <span
                    className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${themeClasses.accentBtn}`}
                  >
                    全画面
                  </span>
                )}
              </h2>
              {subtitle && (
                <p className={`text-[11px] truncate ${themeClasses.textMuted}`}>{subtitle}</p>
              )}
            </div>
            {headerExtra}
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 cursor-pointer ${
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
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg border flex items-center justify-center cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Body: p-3.5 sm:p-4、本文は text-xs が基準（監査 a-2 / a-3） */}
        <div className={`flex-1 overflow-y-auto p-3.5 sm:p-4 text-xs ${bodyClassName ?? ''}`}>
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
};
