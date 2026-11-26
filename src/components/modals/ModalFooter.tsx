import React, { type ReactNode } from 'react';
import { getThemeClasses, type ThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * ModalFooter — フッターのボタン配置（監査 (d) 6、M-03 / M-10 対応）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <ModalShell ... footer={
 *   <ModalFooter
 *     primaryLabel="ダウンロード"
 *     primaryIcon={<Download className="w-4 h-4 shrink-0" />}
 *     onPrimary={handleExport}
 *     primaryDisabled={!validation.valid}
 *     onCancel={onClose}
 *     theme={theme}
 *   />
 * }>
 * ```
 * - 配置は「左にキャンセル、右に主ボタン」。モバイルでは `flex-col-reverse` で
 *   主ボタンを上に置く（BatchNormalizeModal の形）。
 * - 主ボタンは `themeClasses.accentBtn` で固定する。Export の iOS だけ amber に
 *   なる違い（M-03）はここでは作らない。iOS での色の違いが必要なら、props
 *   ではなくテーマ側で決める。
 * - `onCancel` を渡さない場合はキャンセルボタンを出さない（OpenType / IVS の
 *   主ボタンのみの形）。`leftInfo` はキャンセルの右に出す補足表示（件数など）。
 */

export interface ModalFooterProps {
  /** 渡さない場合はキャンセルボタンを表示しない。 */
  onCancel?: () => void;
  cancelLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** 主ボタンの先頭に出すアイコン。 */
  primaryIcon?: ReactNode;
  /** 左側（キャンセルの右）に出す補足表示。 */
  leftInfo?: ReactNode;
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
  primaryTitle?: string;
  /** 主ボタンの type。既定 'button'。フォーム送信の場合は 'submit' と primaryForm を渡す。 */
  primaryType?: 'button' | 'submit';
  /** 主ボタンが submit の場合に対象とするフォームの id。 */
  primaryForm?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  cancelLabel = 'キャンセル',
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryIcon,
  leftInfo,
  theme = 'light',
  themeClasses: passedThemeClasses,
  primaryTitle,
  primaryType = 'button',
  primaryForm,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  return (
    <div
      className={`px-3.5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3 sm:pb-3 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
          >
            {cancelLabel}
          </button>
        )}
        {leftInfo}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <button
          type={primaryType}
          form={primaryForm}
          onClick={onPrimary}
          disabled={primaryDisabled}
          title={primaryTitle}
          className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 disabled:opacity-50 whitespace-nowrap cursor-pointer ${themeClasses.accentBtn}`}
        >
          {primaryIcon}
          <span>{primaryLabel}</span>
        </button>
      </div>
    </div>
  );
};
