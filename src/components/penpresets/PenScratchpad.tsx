import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, RotateCcw } from 'lucide-react';
import { UserPenPreset, StrokePoint } from '../../types';
import { strokePointsToOutline, contoursToSvgPath } from '../../utils/pathUtils';

interface PenScratchpadProps {
  workingPreset: UserPenPreset;
  isLight: boolean;
  mobileView: 'params' | 'scratchpad';
  showToast: (msg: string) => void;
}

export const PenScratchpad: React.FC<PenScratchpadProps> = ({
  workingPreset,
  isLight,
  mobileView,
  showToast,
}) => {
  const scratchpadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingScratchpadRef = useRef<boolean>(false);
  const scratchpadPointsRef = useRef<StrokePoint[]>([]);
  const scratchpadContoursRef = useRef<string[]>([]);
  const [livePressure, setLivePressure] = useState<number>(0);

  const redrawScratchpad = useCallback(() => {
    const canvas = scratchpadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw committed stroke paths
    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    for (const pathStr of scratchpadContoursRef.current) {
      try {
        const p2d = new Path2D(pathStr);
        ctx.fill(p2d, 'nonzero');
      } catch (_) {}
    }

    // Draw current in-progress stroke
    if (scratchpadPointsRef.current.length >= 2) {
      const liveContour = strokePointsToOutline(
        scratchpadPointsRef.current,
        workingPreset.brushWidth,
        workingPreset.brushStyle,
        true,
        workingPreset.pressureSensitivity,
        workingPreset.pressureCurve,
        workingPreset.smoothingIntensity ?? 50,
        { customPreset: workingPreset }
      );
      const livePath = contoursToSvgPath([liveContour]);
      if (livePath) {
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        try {
          const p2d = new Path2D(livePath);
          ctx.fill(p2d, 'nonzero');
        } catch (_) {}
      }
    }
  }, [isLight, workingPreset]);

  useEffect(() => {
    redrawScratchpad();
  }, [redrawScratchpad]);

  const handleScratchpadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = scratchpadCanvasRef.current;
    if (!canvas) return;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const rawPressure = typeof e.pressure === 'number' && e.pressure > 0 ? e.pressure : 0.5;

    isDrawingScratchpadRef.current = true;
    setLivePressure(rawPressure);
    scratchpadPointsRef.current = [{ x, y, pressure: rawPressure, time: Date.now() }];
    redrawScratchpad();
  };

  const handleScratchpadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingScratchpadRef.current) return;
    e.preventDefault();
    const canvas = scratchpadCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const rawPressure = typeof e.pressure === 'number' && e.pressure > 0 ? e.pressure : 0.5;

    setLivePressure(rawPressure);
    scratchpadPointsRef.current.push({ x, y, pressure: rawPressure, time: Date.now() });
    redrawScratchpad();
  };

  const handleScratchpadPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingScratchpadRef.current) return;
    e.preventDefault();
    isDrawingScratchpadRef.current = false;

    if (scratchpadPointsRef.current.length > 0) {
      const contour = strokePointsToOutline(
        scratchpadPointsRef.current,
        workingPreset.brushWidth,
        workingPreset.brushStyle,
        true,
        workingPreset.pressureSensitivity,
        workingPreset.pressureCurve,
        workingPreset.smoothingIntensity ?? 50,
        { customPreset: workingPreset }
      );
      const pathStr = contoursToSvgPath([contour]);
      if (pathStr) {
        scratchpadContoursRef.current.push(pathStr);
      }
    }
    scratchpadPointsRef.current = [];
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (_) {}
    redrawScratchpad();
  };

  const handleClearScratchpad = () => {
    scratchpadContoursRef.current = [];
    scratchpadPointsRef.current = [];
    redrawScratchpad();
    showToast('試し書きキャンバスを消去しました');
  };

  return (
    <div
      className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#121c16]/60 p-3 flex flex-col shrink-0 ${
        mobileView === 'params' ? 'hidden md:flex' : 'flex'
      }`}
    >
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center space-x-1">
          <PenTool className="w-3.5 h-3.5 text-emerald-500" />
          <span>試し書きキャンバス</span>
        </span>
        <button
          type="button"
          onClick={handleClearScratchpad}
          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          title="試し書きを消去"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas Scratchpad Container */}
      <div className="relative flex-1 rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-950 shadow-inner min-h-[220px]">
        <canvas
          ref={scratchpadCanvasRef}
          width={320}
          height={400}
          onPointerDown={handleScratchpadPointerDown}
          onPointerMove={handleScratchpadPointerMove}
          onPointerUp={handleScratchpadPointerUp}
          onPointerCancel={handleScratchpadPointerUp}
          className="w-full h-full cursor-crosshair touch-none"
        />
        <div className="absolute bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600 pointer-events-none">
          マウス・ペンタブ対応
        </div>
      </div>

      {/* Live Pressure Meter */}
      <div className="pt-2 flex items-center space-x-2 text-[10px] text-stone-500">
        <span>リアルタイム筆圧:</span>
        <div className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-75"
            style={{ width: `${Math.round(livePressure * 100)}%` }}
          />
        </div>
        <span className="font-mono w-8 text-right font-bold text-emerald-600 dark:text-emerald-400">
          {Math.round(livePressure * 100)}%
        </span>
      </div>
    </div>
  );
};
