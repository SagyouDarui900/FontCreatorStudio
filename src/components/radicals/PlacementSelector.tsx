import React from 'react';
import { Combine } from 'lucide-react';
import { RadicalPlacement } from '../../types';

interface PlacementSelectorProps {
  placement: RadicalPlacement;
  setPlacement: (p: RadicalPlacement) => void;
  isLight: boolean;
}

const PLACEMENT_ITEMS: { id: RadicalPlacement; label: string; sub: string }[] = [
  { id: 'auto', label: '自動', sub: '分類別' },
  { id: 'hen', label: '偏', sub: '左35%' },
  { id: 'tsukuri', label: '旁', sub: '右55%' },
  { id: 'kanmuri', label: '冠', sub: '上40%' },
  { id: 'ashi', label: '脚', sub: '下40%' },
  { id: 'tare', label: '垂', sub: '左上' },
  { id: 'nyo', label: '繞', sub: '左下' },
  { id: 'kamae', label: '構', sub: '外枠' },
  { id: 'center_small', label: '中央', sub: '60%' },
  { id: 'original', label: '原寸', sub: '1:1' },
];

export const PlacementSelector: React.FC<PlacementSelectorProps> = ({
  placement,
  setPlacement,
  isLight,
}) => {
  return (
    <div
      className={`p-2.5 border-b space-y-1.5 shrink-0 ${
        isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#121c15] border-[#25362b]'
      }`}
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold flex items-center space-x-1">
          <Combine className="w-3.5 h-3.5 text-emerald-600" />
          <span>挿入配置 &amp; 骨格プロポーション:</span>
        </span>
        <span className="text-[10px] text-stone-500 font-mono">
          {PLACEMENT_ITEMS.find((item) => item.id === placement)?.label || ''}
          （{PLACEMENT_ITEMS.find((item) => item.id === placement)?.sub || ''}）
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1 text-[10px]">
        {PLACEMENT_ITEMS.map((item) => {
          const isSelected = placement === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlacement(item.id)}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-800 border-emerald-900 text-white font-bold shadow-xs'
                    : 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-xs'
                  : isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-emerald-50'
                  : 'bg-[#18231c] border-[#25362b] text-stone-300 hover:bg-[#202d24]'
              }`}
            >
              <span className="font-bold leading-tight">{item.label}</span>
              <span
                className={`text-[9px] scale-90 -mt-0.5 ${
                  isSelected ? 'text-emerald-100' : 'text-stone-400'
                }`}
              >
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
