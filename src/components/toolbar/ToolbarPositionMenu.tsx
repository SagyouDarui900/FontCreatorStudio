import React, { useEffect, useRef } from 'react';
import { PanelTop, PanelLeft, PanelRight, Check, X } from 'lucide-react';
import { ToolbarPosition } from '../../types';
import { ThemeClasses } from '../../utils/theme';

export interface ToolbarPositionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: ToolbarPosition;
  onPositionChange: (pos: ToolbarPosition) => void;
  anchorStyle?: React.CSSProperties;
  themeClasses: ThemeClasses;
  isLight: boolean;
}

const POSITIONS: Array<{
  id: ToolbarPosition;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    id: 'top',
    label: '上部に配置 (横型)',
    description: '標準の水平ツールバー',
    icon: PanelTop,
  },
  {
    id: 'left',
    label: '左側に配置 (縦型)',
    description: '左手操作・大型画面CAD向き',
    icon: PanelLeft,
  },
  {
    id: 'right',
    label: '右側に配置 (縦型)',
    description: 'メトリクス隣接・右手操作向き',
    icon: PanelRight,
  },
];

export const ToolbarPositionMenu: React.FC<ToolbarPositionMenuProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  anchorStyle,
  themeClasses,
  isLight,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={anchorStyle}
      className={`fixed z-50 w-64 p-2 rounded-xl border shadow-xl animate-in fade-in zoom-in-95 duration-100 ${themeClasses.cardBg}`}
      role="dialog"
      aria-label="ツールバー配置設定"
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200 dark:border-[#223025]">
        <span className="text-[11px] font-bold tracking-tight text-stone-700 dark:text-stone-300">
          ツールバーの配置
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer transition-colors"
          title="閉じる"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {POSITIONS.map((item) => {
          const Icon = item.icon;
          const isActive = position === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPositionChange(item.id);
                onClose();
              }}
              className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer group ${
                isActive
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-emerald-950/60 text-emerald-200 border border-emerald-700'
                  : isLight
                  ? 'hover:bg-stone-100 text-stone-800 border border-transparent'
                  : 'hover:bg-stone-800/60 text-stone-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-1.5 rounded-md ${
                    isActive
                      ? isLight
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 text-stone-950'
                      : isLight
                      ? 'bg-stone-200 text-stone-700 group-hover:bg-stone-300'
                      : 'bg-stone-800 text-stone-300 group-hover:bg-stone-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] opacity-60 leading-tight mt-0.5">{item.description}</div>
                </div>
              </div>

              {isActive && (
                <Check
                  className={`w-4 h-4 shrink-0 ml-1.5 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
