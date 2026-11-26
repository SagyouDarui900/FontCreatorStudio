import React, { type ReactNode } from 'react';
import {
  getThemeClasses,
  isLightTheme,
  type ThemeClasses,
  type ThemeMode,
} from '../../utils/theme';

/**
 * ToolMenuCard — 機能メニュー用のカード（監査 (d) 7、H-1 / H-2 / H-3 / M-13 対応）。
 *
 * 置き場所: 監査は `src/components/header/ToolMenuCard.tsx` を提案しているが、
 * このタスクの指示により `src/components/modals/` に置く。組み込み側で
 * `src/components/header/ToolsMenuDropdown.tsx` から import して使う。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
 *   <ToolMenuCard
 *     icon={<Layers className="w-4 h-4" />}
 *     title="下絵トレース"
 *     description="手書きノートや画像からの輪郭抽出"
 *     onClick={() => { onOpenTraceModal(); onClose(); }}
 *     theme={theme}
 *   />
 *   <ToolMenuCard ... span={2} />  // SVGインポートのように2列分を使うカード
 * </div>
 * ```
 * - タイトルは `truncate` せず折り返しで全文表示する（H-1）。`title` 属性は付けない。
 * - 説明文には `.jp-wrap` を付け、右端で切れないようにする（H-2）。
 * - カードの高さを揃えるため `h-full` を付ける（H-3）。グリッドの親で
 *   `items-stretch`（既定）が効くことが前提。
 * - アイコンの色は `accent` から決める。emerald は `themeClasses.accentBadge` を
 *   使い、それ以外はメニュー内の区分を示す固定の意味色（violet / amber / purple）で、
 *   light / dark を `isLightTheme(theme)` で切り替える（M-13 の例外）。
 */

export type ToolMenuAccent = 'emerald' | 'violet' | 'amber' | 'purple';

function getAccentClasses(accent: ToolMenuAccent, isLight: boolean): string {
  switch (accent) {
    case 'violet':
      return isLight
        ? 'bg-violet-100 text-violet-700 border-violet-300'
        : 'bg-violet-950/80 text-violet-300 border-violet-800';
    case 'amber':
      return isLight
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-amber-950/80 text-amber-300 border-amber-800';
    case 'purple':
      return isLight
        ? 'bg-purple-100 text-purple-700 border-purple-300'
        : 'bg-purple-950/80 text-purple-300 border-purple-800';
    case 'emerald':
    default:
      return '';
  }
}

export interface ToolMenuCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  /** 2列グリッドで2列分を使う場合に 2 を渡す（SVGインポートの形）。 */
  span?: 1 | 2;
  accent?: ToolMenuAccent;
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
  disabled?: boolean;
}

export const ToolMenuCard: React.FC<ToolMenuCardProps> = ({
  icon,
  title,
  description,
  onClick,
  span = 1,
  accent = 'emerald',
  theme = 'light',
  themeClasses: passedThemeClasses,
  disabled = false,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  const accentClasses =
    accent === 'emerald'
      ? themeClasses.accentBadge
      : getAccentClasses(accent, isLightTheme(theme));
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-card text-left p-2 rounded-xl border flex items-start space-x-2 h-full w-full group cursor-pointer disabled:opacity-50 ${
        span === 2 ? 'col-span-1 sm:col-span-2' : ''
      } ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
    >
      <div
        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${accentClasses}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold leading-snug">{title}</div>
        <div className={`text-[10.5px] leading-snug jp-wrap ${themeClasses.textMuted}`}>
          {description}
        </div>
      </div>
    </button>
  );
};
