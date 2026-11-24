import React from 'react';
import { PenTool, Grid, SlidersHorizontal, Shapes } from 'lucide-react';
import { MobileTab } from '../../hooks/useAppLayout';
import { ThemeClasses } from '../../types';

export interface AppMobileNavProps {
  mobileActiveTab: MobileTab;
  handleSwitchMobileTab: (tab: MobileTab) => void;
  themeClasses: ThemeClasses;
}

export const AppMobileNav: React.FC<AppMobileNavProps> = React.memo(({
  mobileActiveTab,
  handleSwitchMobileTab,
  themeClasses,
}) => {
  return (
    <nav
      role="tablist"
      aria-label="モバイル主要ナビゲーション"
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] ${themeClasses.toolbarBg} ${themeClasses.border}`}
    >
      <button
        role="tab"
        aria-selected={mobileActiveTab === 'canvas'}
        aria-label="作図キャンバス画面に切り替え"
        onClick={() => handleSwitchMobileTab('canvas')}
        className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          mobileActiveTab === 'canvas'
            ? `${themeClasses.accentText} font-bold`
            : `${themeClasses.textMuted}`
        }`}
      >
        <PenTool className="w-5 h-5" />
        <span>作図</span>
      </button>

      <button
        role="tab"
        aria-selected={mobileActiveTab === 'grid'}
        aria-label="文字一覧（グリッド）画面を開く"
        onClick={() => handleSwitchMobileTab('grid')}
        className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          mobileActiveTab === 'grid'
            ? `${themeClasses.accentText} font-bold`
            : `${themeClasses.textMuted}`
        }`}
      >
        <Grid className="w-5 h-5" />
        <span>文字一覧</span>
      </button>

      <button
        role="tab"
        aria-selected={mobileActiveTab === 'metrics'}
        aria-label="メトリクス・文字ガイド設定を開く"
        onClick={() => handleSwitchMobileTab('metrics')}
        className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          mobileActiveTab === 'metrics'
            ? `${themeClasses.accentText} font-bold`
            : `${themeClasses.textMuted}`
        }`}
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>メトリクス</span>
      </button>

      <button
        role="tab"
        aria-selected={mobileActiveTab === 'radicals'}
        aria-label="部首・パーツライブラリを開く"
        onClick={() => handleSwitchMobileTab('radicals')}
        className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          mobileActiveTab === 'radicals'
            ? `${themeClasses.accentText} font-bold`
            : `${themeClasses.textMuted}`
        }`}
      >
        <Shapes className="w-5 h-5" />
        <span>部首</span>
      </button>
    </nav>
  );
});

AppMobileNav.displayName = 'AppMobileNav';
