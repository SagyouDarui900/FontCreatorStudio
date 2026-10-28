import React from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Slash,
  Square,
  Circle,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
} from 'lucide-react';
import { PixelDrawTool, BrushStampShape } from './types';

interface PixelToolbarProps {
  tool: PixelDrawTool;
  setTool: (tool: PixelDrawTool) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushStamp: BrushStampShape;
  setBrushStamp: (stamp: BrushStampShape) => void;
  symmetryH: boolean;
  setSymmetryH: (val: boolean) => void;
  symmetryV: boolean;
  setSymmetryV: (val: boolean) => void;
  isLight: boolean;
  isMobile?: boolean;
  showTrace?: boolean;
  setShowTrace?: (val: boolean) => void;
}

export const PixelToolbar: React.FC<PixelToolbarProps> = ({
  tool,
  setTool,
  brushSize,
  setBrushSize,
  brushStamp,
  setBrushStamp,
  symmetryH,
  setSymmetryH,
  symmetryV,
  setSymmetryV,
  isLight,
  isMobile = false,
  showTrace,
  setShowTrace,
}) => {
  const tools = [
    { id: 'pencil' as PixelDrawTool, label: '鉛筆', desc: '鉛筆 (Pencil)', icon: Pencil },
    { id: 'eraser' as PixelDrawTool, label: '消ゴム', desc: '消しゴム (Eraser)', icon: Eraser },
    { id: 'bucket' as PixelDrawTool, label: 'バケツ', desc: '塗りつぶし (Bucket)', icon: PaintBucket },
    { id: 'line' as PixelDrawTool, label: '直線', desc: '直線作図 (Line)', icon: Slash },
    { id: 'rect' as PixelDrawTool, label: '矩形', desc: '矩形枠 (Rect)', icon: Square },
    { id: 'rect_filled' as PixelDrawTool, label: '塗矩形', desc: '塗り矩形 (Filled Rect)', icon: Square, fill: true },
    { id: 'circle' as PixelDrawTool, label: '円', desc: '円・楕円 (Circle)', icon: Circle },
  ];

  if (isMobile) {
    return (
      <div className="flex md:hidden flex-col w-full gap-1 pt-1 z-10">
        {/* Row 1: Primary Drawing Tools Strip */}
        <div
          className={`flex items-center justify-between px-1 py-1 border overflow-x-auto no-scrollbar gap-1 ${
            isLight ? 'bg-white/98 border-stone-300' : 'bg-[#101812]/98 border-[#294232]'
          }`}
        >
          {tools.map((t) => {
            const Icon = t.icon;
            const isSelected = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`flex-1 min-w-[42px] min-h-[40px] flex flex-col items-center justify-center p-1 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 scale-105'
                    : isLight
                    ? 'bg-stone-50 text-stone-700 border-stone-300'
                    : 'bg-[#142018] text-stone-300 border-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${t.fill ? 'fill-current' : ''}`} />
                <span className="text-[9px] mt-0.5 font-bold leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Brush Settings */}
        <div
          className={`flex items-center justify-between px-2 py-1 border text-xs overflow-x-auto no-scrollbar gap-1.5 ${
            isLight ? 'bg-stone-50 border-stone-300' : 'bg-[#101812] border-[#294232]'
          }`}
        >
          <div className="flex items-center border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018]">
            <button
              onClick={() => setBrushStamp('square')}
              className={`px-2 py-1 text-xs font-bold cursor-pointer ${
                brushStamp === 'square' ? 'bg-emerald-600 text-white' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              ■
            </button>
            <button
              onClick={() => setBrushStamp('round')}
              className={`px-2 py-1 text-xs font-bold cursor-pointer ${
                brushStamp === 'round' ? 'bg-emerald-600 text-white' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              ●
            </button>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((sz) => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`w-7 h-7 flex items-center justify-center font-mono font-bold text-xs border cursor-pointer ${
                  brushSize === sz
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-[#142018] border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setSymmetryH(!symmetryH)}
              className={`px-2 py-1 text-[11px] font-bold border flex items-center gap-0.5 cursor-pointer ${
                symmetryH
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-white dark:bg-[#142018] border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-300'
              }`}
              title="左右対称"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>左右</span>
            </button>
            {setShowTrace && (
              <button
                onClick={() => setShowTrace(!showTrace)}
                className={`px-2 py-1 text-[11px] font-bold border flex items-center gap-0.5 cursor-pointer ${
                  showTrace
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white dark:bg-[#142018] border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>下絵</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`hidden md:flex w-14 sm:w-16 border-r flex-col items-center py-2.5 gap-1.5 shrink-0 overflow-y-auto ${
        isLight ? 'bg-stone-100 border-stone-300' : 'bg-[#101812] border-[#294232]'
      }`}
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const isSelected = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 border transition-all relative cursor-pointer ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-500'
                : isLight
                ? 'bg-white text-stone-700 hover:bg-stone-200 border-stone-300'
                : 'bg-[#142018] text-stone-300 hover:bg-[#1f3126] border-stone-800'
            }`}
            title={t.desc}
          >
            <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${t.fill ? 'fill-current' : ''}`} />
          </button>
        );
      })}

      <div className="w-8 h-[1px] bg-stone-300 dark:bg-stone-700 my-0.5" />

      {/* Brush Stamp Shape */}
      <div className="flex items-center gap-0.5 border border-stone-300 dark:border-stone-800 bg-white dark:bg-[#142018] p-0.5">
        <button
          onClick={() => setBrushStamp('square')}
          className={`p-1 text-xs font-bold cursor-pointer ${
            brushStamp === 'square' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:text-stone-900'
          }`}
          title="四角スタンプ"
        >
          ■
        </button>
        <button
          onClick={() => setBrushStamp('round')}
          className={`p-1 text-xs font-bold cursor-pointer ${
            brushStamp === 'round' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:text-stone-900'
          }`}
          title="丸スタンプ"
        >
          ●
        </button>
      </div>

      {/* Brush Sizes */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {[1, 2, 3, 4, 6, 8].map((sz) => (
          <button
            key={sz}
            onClick={() => setBrushSize(sz)}
            className={`w-full py-0.5 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
              brushSize === sz
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-stone-300 text-stone-700'
                : 'bg-[#142018] border-stone-800 text-stone-300'
            }`}
            title={`ブラシサイズ ${sz}px`}
          >
            {sz}px
          </button>
        ))}
      </div>

      <div className="w-8 h-[1px] bg-stone-300 dark:bg-stone-700 my-0.5" />

      {/* Symmetry Toggles */}
      <button
        onClick={() => setSymmetryH(!symmetryH)}
        className={`p-2 border text-xs font-bold transition-all cursor-pointer ${
          symmetryH
            ? 'bg-emerald-600 text-white border-emerald-500'
            : isLight
            ? 'bg-white text-stone-500 hover:bg-stone-200 border-stone-300'
            : 'bg-[#142018] text-stone-400 hover:bg-[#1f3126] border-stone-800'
        }`}
        title="左右対称描画"
      >
        <FlipHorizontal className="w-4 h-4" />
      </button>

      <button
        onClick={() => setSymmetryV(!symmetryV)}
        className={`p-2 border text-xs font-bold transition-all cursor-pointer ${
          symmetryV
            ? 'bg-emerald-600 text-white border-emerald-500'
            : isLight
            ? 'bg-white text-stone-500 hover:bg-stone-200 border-stone-300'
            : 'bg-[#142018] text-stone-400 hover:bg-[#1f3126] border-stone-800'
        }`}
        title="上下対称描画"
      >
        <FlipVertical className="w-4 h-4" />
      </button>
    </div>
  );
};
