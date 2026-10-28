import React from 'react';
import { Combine } from 'lucide-react';
import { RadicalPlacement } from '../../types';

interface PlacementSelectorProps {
  placement: RadicalPlacement;
  setPlacement: (p: RadicalPlacement) => void;
  isLight: boolean;
}

export const PlacementSelector: React.FC<PlacementSelectorProps> = ({
  placement,
  setPlacement,
  isLight,
}) => {
  return (
    <div
      className={`p-2.5 border-b space-y-1 shrink-0 ${
        isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#121c15] border-[#25362b]'
      }`}
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold flex items-center space-x-1">
          <Combine className="w-3.5 h-3.5 text-emerald-600" />
          <span>挿入配置 &amp; スケーリング:</span>
        </span>
        <span className="text-[10px] text-stone-500">標準EM枠へ自動調整</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-[10px]">
        {[
          { id: 'auto', label: '自動位置' },
          { id: 'hen', label: '偏 (左)' },
          { id: 'tsukuri', label: '旁 (右)' },
          { id: 'kanmuri', label: '冠 (上)' },
          { id: 'ashi', label: '脚 (下)' },
          { id: 'center_small', label: '縮小中央' },
          { id: 'original', label: '原寸' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlacement(item.id as RadicalPlacement)}
            className={`py-1.5 px-1 rounded border text-center whitespace-nowrap transition-colors cursor-pointer ${
              placement === item.id
                ? isLight
                  ? 'bg-emerald-800 border-emerald-900 text-white font-bold'
                  : 'bg-emerald-600 border-emerald-500 text-white font-bold'
                : isLight
                ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-stone-300 hover:bg-[#202d24]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
