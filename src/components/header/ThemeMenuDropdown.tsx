import React from 'react';
import { createPortal } from 'react-dom';
import { Palette, ChevronDown, X, Check } from 'lucide-react';
import { ThemeMode, THEME_PRESETS, getThemePreset, getThemeClasses } from '../../utils/theme';

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
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const ThemeMenuDropdown: React.FC<ThemeMenuDropdownProps> = ({
  theme,
  isLight: _isLight,
  cardBgClass,
  isOpen,
  onToggleOpen,
  onClose,
  onChangeTheme,
  onToggleTheme,
  notify,
  menuRef,
  panelRef,
}) => {
  const themeClasses = getThemeClasses(theme);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={onToggleOpen}
        className={`px-1.5 h-7 rounded-md flex items-center justify-center gap-1 border cursor-pointer ${cardBgClass} ${themeClasses.activeToolHover}`}
        title="カラーテーマ・目の保護（セピア/ブルーライトカット）の切り替え"
      >
        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="hidden xl:inline text-[11px] font-bold">
          {getThemePreset(theme).name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 hidden xl:inline" />
      </button>

      {/* Global Theme Selector Popover Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <div
            ref={panelRef}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`fixed right-2 sm:right-14 top-[calc(2.65rem+env(safe-area-inset-top,0px))] w-[calc(100vw-16px)] sm:w-80 max-w-sm rounded-xl border shadow-2xl z-[51] p-3 text-left ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          >
            <div className={`px-1 py-1 border-b flex items-center justify-between mb-2 ${themeClasses.border}`}>
              <div className="flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold">テーマ・目への優しさ設定</span>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-lg cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
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
                    className={`w-full text-left p-2 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? `${themeClasses.activeTool} border-transparent`
                        : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
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
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">{p.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${p.badgeClass}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className={`text-[10.5px] leading-snug mt-0.5 ${isActive ? 'opacity-85' : themeClasses.textMuted}`}>
                        {p.description}
                      </p>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
