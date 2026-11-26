import React, { type ReactNode } from 'react';
import { getThemeClasses, type ThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * ModalSection — セクション見出し＋カード（監査 (d) 2、M-01 / M-02 / M-05 対応）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <ModalSection title="ファイル形式" icon={<FileCode className="w-3.5 h-3.5" />}>
 *   ...設定コントロール...
 * </ModalSection>
 * <ModalSection title="処理対象の文字グループ" step={1}>...</ModalSection>
 * ```
 * - 見出しは `text-xs font-bold` で統一。プレビュー側の `tracking-tight` の有無の違い（M-05）は付けない。
 * - 番号付き見出し（M-04）は `step` に数値を渡す。タイトル文字列に「① …」を直接
 *   書く方法と併用しないこと（二重表示になる）。
 * - カードの余白は既定 `p-3`。詰めたいカードだけ `padding="sm"`（`p-2.5`）を使う。
 */

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export interface ModalSectionProps {
  title: string;
  /** 見出しの先頭に出すアイコン（w-3.5 h-3.5 程度）。 */
  icon?: ReactNode;
  /** 見出しの末尾に出す追加要素（件数バッジなど）。 */
  badge?: ReactNode;
  /** 番号付き見出しにする場合の番号（1 から）。渡すと「①」のような丸数字が付く。 */
  step?: number;
  children: ReactNode;
  /** カードの内側余白。既定 'md'（p-3）。 */
  padding?: 'sm' | 'md';
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
  className?: string;
}

export const ModalSection: React.FC<ModalSectionProps> = ({
  title,
  icon,
  badge,
  step,
  children,
  padding = 'md',
  theme = 'light',
  themeClasses: passedThemeClasses,
  className,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  const stepLabel =
    step !== undefined ? CIRCLED_NUMBERS[step - 1] ?? `${step}.` : null;
  return (
    <section className={`space-y-1.5 ${className ?? ''}`}>
      <h3 className="text-xs font-bold flex items-center gap-1.5">
        {stepLabel && (
          <span aria-hidden="true" className="shrink-0">
            {stepLabel}
          </span>
        )}
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span className="min-w-0">{title}</span>
        {badge}
      </h3>
      <div
        className={`${padding === 'sm' ? 'p-2.5' : 'p-3'} rounded-xl border ${
          themeClasses.cardBg
        }`}
      >
        {children}
      </div>
    </section>
  );
};
