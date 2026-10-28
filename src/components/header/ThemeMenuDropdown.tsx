import React from 'react';
import { Palette, ChevronDown, X, Check } from 'lucide-react';
import { ThemeMode, THEME_PRESETS, getThemePreset } from '../../utils/theme';

interface ThemeMenuDropdownProps {
  theme: ThemeMode;
  isLight: boolean;
  cardBgClass: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onChangeTheme?: (mode: ThemeMode) => void;
  onToggleTheme: () => void;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const ThemeMenuDropdown: React.FC<ThemeMenuDropdownProps> = ({
  theme,
  isLight,
  cardBgClass,
  isOpen,
  onToggleOpen,
  onClose,
  onChangeTheme,
  onToggleTheme,
  notify,
  menuRef,
}) => {
  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={onToggleOpen}
        className={`p-1.5 sm:p-2 h-8 rounded-lg sm:rounded-xl transition-all flex items-center space-x-1 border cursor-pointer ${
          isLight
            ? 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-700 border-stone-200/90'
            : 'bg-[#18241d] hover:bg-[#203027] text-emerald-300 border-[#25362b]'
        }`}
        title="カラーテーマ・目の保護（セピア/ブルーライトカット）の切り替え"
      >
        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="hidden xl:inline text-[11px] font-bold">
          {getThemePreset(theme).name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 hidden xl:inline" />
      </button>

      {/* Global Theme Selector Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`fixed right-2 sm:right-16 top-[48px] sm:top-[52px] w-[calc(100vw-16px)] sm:w-80 max-w-sm rounded-2xl border shadow-2xl z-50 p-3 text-left ${cardBgClass}`}
          >
            <div className="px-1 py-1 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold">テーマ・目への優しさ設定</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#202d24] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto p-0.5">
              {THEME_PRESETS.map((p) => {
                const isActive = theme === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onChangeTheme) {
                        onChangeTheme(p.id);
                      } else {
                        onToggleTheme();
                      }
                      notify(`テーマを「${p.name}」に変更しました`, 'info');
                      onClose();
                    }}
                    className={`w-full text-left p-2 rounded-xl border flex items-start space-x-2.5 cursor-pointer ${
                      isActive
                        ? isLight
                          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/50'
                          : 'bg-[#1c2c22] border-emerald-500 ring-2 ring-emerald-500/50'
                        : isLight
                        ? 'bg-stone-50/70 hover:bg-stone-100 border-stone-200/80'
                        : 'bg-[#18231c]/70 hover:bg-[#202f26] border-[#25362b]'
                    }`}
                  >
                    {/* Color Preview Swatch */}
                    <div
                      className="w-7 h-7 rounded-md border shrink-0 flex items-center justify-center relative overflow-hidden mt-0.5"
                      style={{
                        backgroundColor: p.previewBg,
                        borderColor: p.previewBorder,
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-sm border"
                        style={{
                          backgroundColor: p.previewCard,
                          borderColor: p.previewAccent,
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{p.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${p.badgeClass}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5">
                        {p.description}
                      </p>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
