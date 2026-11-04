import React from 'react';
import { Wand2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';

export interface SimplifySectionProps {
  contours: PathContour[];
  totalNodes: number;
  simplifyLevel: 'mild' | 'normal' | 'strong';
  setSimplifyLevel: (level: 'mild' | 'normal' | 'strong') => void;
  onExecuteSimplify: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  themeClasses: ThemeClasses;
}

export const SimplifySection: React.FC<SimplifySectionProps> = ({
  contours,
  totalNodes,
  simplifyLevel,
  setSimplifyLevel,
  onExecuteSimplify,
  isExpanded,
  onToggle,
  themeClasses,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
    >
      <div
        onClick={onToggle}
        className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors hover:${themeClasses.activeToolHover}`}
      >
        <span className={`text-xs font-bold flex items-center space-x-1.5 ${themeClasses.accentText}`}>
          <Wand2 className="w-4 h-4" />
          <span>輪郭の単純化 (Simplify)</span>
        </span>
        <div className="flex items-center space-x-1.5">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${themeClasses.accentBadge}`}>
            {totalNodes} 頂点
          </span>
          <div className="p-0.5 text-stone-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={`p-3 pt-0 space-y-2.5 border-t ${themeClasses.border}`}>
          <p className="text-[11px] leading-relaxed text-stone-600 dark:text-emerald-300/80 pt-1">
            不要なアンカーポイント（重複・共線点）を自動削除し、字形を保ちながらファイル容量を削減します。
          </p>

          {/* Strength Selector */}
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSimplifyLevel('mild')}
              className={`min-h-[38px] py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                simplifyLevel === 'mild'
                  ? `${themeClasses.activeTool} border`
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
              }`}
              title="形状保持 100%: 直線上の不要ノードと重複ノードのみ除去"
            >
              軽め (Mild)
            </button>
            <button
              type="button"
              onClick={() => setSimplifyLevel('normal')}
              className={`min-h-[38px] py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                simplifyLevel === 'normal'
                  ? `${themeClasses.activeTool} border`
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
              }`}
              title="推奨: 形状保持 99.8%、手描き線の微細ブレを整流してスリム化"
            >
              標準 (Normal)
            </button>
            <button
              type="button"
              onClick={() => setSimplifyLevel('strong')}
              className={`min-h-[38px] py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                simplifyLevel === 'strong'
                  ? `${themeClasses.activeTool} border`
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
              }`}
              title="強力: 大幅な頂点削減。データ容量を最優先で削減"
            >
              強め (Strong)
            </button>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onExecuteSimplify}
            disabled={contours.length === 0 || totalNodes === 0}
            className={`w-full min-h-[42px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.accentBtn}`}
            title="現在のグリフの全輪郭を単純化 (ショートカット: Alt+S)"
          >
            <Zap className="w-4 h-4 fill-current shrink-0" />
            <span>輪郭を単純化 (Simplify)</span>
          </button>
        </div>
      )}
    </div>
  );
};
