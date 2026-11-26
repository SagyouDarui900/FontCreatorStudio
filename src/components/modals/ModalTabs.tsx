import React, { type ReactNode } from 'react';
import { getThemeClasses, type ThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * ModalTabs — タブバー（監査 (d) 5、M-12 対応）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <ModalTabs
 *   tabs={[
 *     { id: 'vert', label: '縦書き', shortLabel: '縦書', count: 3 },
 *     { id: 'liga', label: '合字', count: 12 },
 *   ]}
 *   activeId={tab}
 *   onChange={setTab}
 *   theme={theme}
 * />
 * ```
 * - 形は a-4 の共通形（`flex border-b px-3 sm:px-5 pt-1.5 gap-2 text-xs font-bold overflow-x-auto`）。
 * - 件数バッジとモバイル用の短いラベル（`shortLabel`）を共通で扱う。
 *   `shortLabel` がないタブはモバイルでも `label` をそのまま出す。
 * - Mojikumi の `flex-wrap` で折り返す形はここでは扱わない。横スクロール型に統一する。
 */

export interface ModalTabItem {
  id: string;
  label: string;
  /** モバイル（sm 未満）で表示する短いラベル。未指定時は label を使う。 */
  shortLabel?: string;
  /** タブに付ける件数。 */
  count?: number;
  /** 件数の代わり、または件数に加えて出す追加要素。 */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface ModalTabsProps {
  tabs: ModalTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
  ariaLabel?: string;
}

export const ModalTabs: React.FC<ModalTabsProps> = ({
  tabs,
  activeId,
  onChange,
  theme = 'light',
  themeClasses: passedThemeClasses,
  ariaLabel,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex border-b px-3 sm:px-5 pt-1.5 gap-2 text-xs font-bold overflow-x-auto shrink-0 ${themeClasses.subtoolbarBg}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              active
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  active ? 'bg-white/25 text-white' : themeClasses.accentBadge
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
};
