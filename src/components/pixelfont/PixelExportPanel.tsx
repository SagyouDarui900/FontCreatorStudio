import React, { useEffect, useRef } from 'react';
import {
  Type,
  Gamepad2,
  Download,
  LayoutGrid,
  Cpu,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { FontProject, GlyphData, PixelDotShape } from '../../types';
import { rasterizeGlyphToPixelGrid, resamplePixelGrid } from '../../utils/pixelFontUtils';

interface PixelTextPreviewCanvasProps {
  text: string;
  project: FontProject;
  currentGrid: Uint8Array;
  currentUnicode: number;
  gridWidth: number;
  gridHeight: number;
  dotShape: PixelDotShape;
  tall?: boolean;
}

const PixelTextPreviewCanvas: React.FC<PixelTextPreviewCanvasProps> = ({
  text,
  project,
  currentGrid,
  currentUnicode,
  gridWidth,
  gridHeight,
  dotShape,
  tall = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const str = text || 'ABC 123';
    const chars = Array.from(str);
    const maxDim = Math.max(1, gridWidth, gridHeight);
    const cellPx = Math.max(2, Math.min(4, Math.floor((tall ? 44 : 36) / maxDim)));
    const gapPx = Math.max(cellPx, 2);
    const pad = 8;

    const glyphW = gridWidth * cellPx;
    const glyphH = gridHeight * cellPx;
    const totalW = Math.max(200, pad * 2 + chars.length * glyphW + Math.max(0, chars.length - 1) * gapPx);
    const totalH = pad * 2 + glyphH;

    if (canvas.width !== totalW || canvas.height !== totalH) {
      canvas.width = totalW;
      canvas.height = totalH;
    }

    ctx.clearRect(0, 0, totalW, totalH);

    const upm = project.metadata.unitsPerEm || 1000;
    const asc = project.metadata.ascender ?? 800;
    const desc = project.metadata.descender ?? -200;

    chars.forEach((ch, idx) => {
      const cp = ch.codePointAt(0) || 0;
      const offsetX = pad + idx * (glyphW + gapPx);
      const offsetY = pad;

      if (ch === ' ' || ch === '\u3000') {
        return;
      }

      let charGrid: Uint8Array | null = null;
      if (cp === currentUnicode) {
        charGrid = currentGrid;
      } else {
        const g: GlyphData | undefined = project.glyphs[cp];
        if (g?.pixelData?.data && g.pixelData.data.length > 0) {
          const pw = g.pixelData.width || gridWidth;
          const ph = g.pixelData.height || gridHeight;
          charGrid =
            pw === gridWidth && ph === gridHeight && g.pixelData.data.length === gridWidth * gridHeight
              ? new Uint8Array(g.pixelData.data)
              : resamplePixelGrid(g.pixelData.data, pw, ph, gridWidth, gridHeight);
        } else if (g?.contours && g.contours.length > 0) {
          charGrid = rasterizeGlyphToPixelGrid(g, gridWidth, gridHeight, upm, asc, desc);
        }
      }

      let hasPixels = false;
      if (charGrid) {
        for (let i = 0; i < charGrid.length; i++) {
          if (charGrid[i] === 1) {
            hasPixels = true;
            break;
          }
        }
      }

      if (!charGrid || !hasPixels) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(glyphH * 0.8)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ch, offsetX + glyphW / 2, offsetY + glyphH / 2);
        ctx.restore();
        return;
      }

      ctx.fillStyle = '#34d399';
      for (let gy = 0; gy < gridHeight; gy++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          if (charGrid[gy * gridWidth + gx] !== 1) continue;
          const px = offsetX + gx * cellPx;
          const py = offsetY + gy * cellPx;
          if (dotShape === 'round') {
            ctx.beginPath();
            ctx.arc(px + cellPx / 2, py + cellPx / 2, cellPx * 0.45, 0, Math.PI * 2);
            ctx.fill();
          } else if (dotShape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(px + cellPx / 2, py);
            ctx.lineTo(px + cellPx, py + cellPx / 2);
            ctx.lineTo(px + cellPx / 2, py + cellPx);
            ctx.lineTo(px, py + cellPx / 2);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(px, py, cellPx, cellPx);
          }
        }
      }
    });
  }, [text, project, currentGrid, currentUnicode, gridWidth, gridHeight, dotShape, tall]);

  return (
    <canvas
      ref={canvasRef}
      className="block mx-auto"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

interface PixelExportPanelProps {
  previewText: string;
  setPreviewText: (text: string) => void;
  handleExportFontFile: (format: 'otf') => void;
  handleExportSpritesheet: () => void;
  handleExportCHeader: () => void;
  handleExportSinglePng: () => void;
  currentGlyph: GlyphData;
  project: FontProject;
  grid: Uint8Array;
  currentUnicode: number;
  dotShape: PixelDotShape;
  gridWidth: number;
  gridHeight: number;
  totalDrawnPixelGlyphs: number;
  activePixelCount: number;
  isLight: boolean;
  isMobile?: boolean;
}

export const PixelExportPanel: React.FC<PixelExportPanelProps> = ({
  previewText,
  setPreviewText,
  handleExportFontFile,
  handleExportSpritesheet,
  handleExportCHeader,
  handleExportSinglePng,
  currentGlyph,
  project,
  grid,
  currentUnicode,
  dotShape,
  gridWidth,
  gridHeight,
  totalDrawnPixelGlyphs,
  activePixelCount,
  isLight,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <div
        className={`flex md:hidden flex-1 flex-col overflow-y-auto overflow-x-auto p-3 pb-24 touch-pan-x touch-pan-y ${
          isLight ? 'bg-stone-50 text-stone-900' : 'bg-[#0c130f] text-emerald-100'
        }`}
      >
        <div className="w-full min-w-[320px] sm:min-w-[360px] max-w-2xl mx-auto space-y-4">
          {/* Real-time Typing Sandbox */}
          <div
            className={`p-3 border space-y-2.5 ${
              isLight ? 'bg-white border-stone-300' : 'bg-[#101812] border-[#294232]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Type className="w-4 h-4" />
                <span>リアルタイム文字列テスト</span>
              </span>
            </div>

            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="テスト文字列を入力"
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 focus:outline-hidden"
            />

            <div className="p-2.5 bg-stone-950 min-h-[64px] flex items-center overflow-x-auto border border-stone-800">
              <PixelTextPreviewCanvas
                text={previewText}
                project={project}
                currentGrid={grid}
                currentUnicode={currentUnicode}
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                dotShape={dotShape}
                tall={true}
              />
            </div>
          </div>

          {/* Game Engine & Embed Export Hub */}
          <div
            className={`p-3 border space-y-3 ${
              isLight ? 'bg-white border-stone-300' : 'bg-[#101812] border-[#294232]'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
              <Gamepad2 className="w-4 h-4 text-emerald-600" />
              <span>ゲーム & 開発向け一括出力 Hub</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              Unity, Godot, Unreal, Phaser や Arduino/ESP32 マイコン用の各種形式で出力します。
            </p>

            {/* 1. Direct OTF Font Export */}
            <button
              onClick={() => handleExportFontFile('otf')}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-between border border-emerald-400 min-h-[44px] cursor-pointer"
              title="作成したピクセルフォントを直接OTF形式でダウンロード (.otf)"
            >
              <span className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>OTFフォント書き出し (.otf)</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-emerald-700/80 px-1.5 py-0.5">OTF</span>
            </button>

            {/* 2. Spritesheet */}
            <button
              onClick={handleExportSpritesheet}
              className={`w-full py-2.5 px-3 border text-xs font-bold flex items-center justify-between min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800'
                  : 'bg-[#142018] hover:bg-[#1c2e22] border-stone-700 text-emerald-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <LayoutGrid className="w-4 h-4" />
                <span>スプライトシート (PNG + JSON)</span>
              </span>
              <Download className="w-4 h-4" />
            </button>

            {/* 3. C/C++ Header */}
            <button
              onClick={handleExportCHeader}
              className={`w-full py-2.5 px-3 border text-xs font-bold flex items-center justify-between min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800'
                  : 'bg-[#142018] hover:bg-[#1c2e22] border-stone-700 text-emerald-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>組込み用 Cヘッダー (.h)</span>
              </span>
              <FileCode className="w-4 h-4" />
            </button>

            {/* 4. Single PNG */}
            <button
              onClick={handleExportSinglePng}
              className={`w-full py-2.5 px-3 border text-xs font-bold flex items-center justify-between min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800'
                  : 'bg-[#142018] hover:bg-[#1c2e22] border-stone-700 text-emerald-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>現在の文字「{currentGlyph.char}」をPNG出力</span>
              </span>
              <span className="text-[10px] opacity-75 font-mono">{gridWidth}×{gridHeight}</span>
            </button>
          </div>

          {/* Real-time Project Stats */}
          <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-400 space-y-1.5">
            <div className="flex items-center space-x-1 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>リアルタイム自動同期中</span>
            </div>
            <div className="text-[11px] leading-snug opacity-85">
              全作図文字数: <strong className="font-bold">{totalDrawnPixelGlyphs} 文字</strong> / 現在の点灯ピクセル: <strong className="font-bold">{activePixelCount} px</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Right Panel
  return (
    <div
      className={`hidden md:flex w-64 sm:w-72 border-l-2 p-3 flex-col justify-between shrink-0 overflow-y-auto ${
        isLight ? 'bg-stone-100 border-stone-300' : 'bg-[#101812] border-[#294232]'
      }`}
    >
      <div className="space-y-3">
        {/* Real-Time Typing Sandbox */}
        <div
          className={`p-2.5 border space-y-2 ${
            isLight ? 'bg-white border-stone-300' : 'bg-[#0a0f0c] border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-emerald-400">
            <span className="flex items-center space-x-1">
              <Type className="w-3.5 h-3.5" />
              <span>リアルタイム文字列テスト</span>
            </span>
          </div>

          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="テスト文字列を入力"
            className="w-full px-2 py-1 text-xs border border-stone-300 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 focus:outline-hidden"
          />

          <div className="p-2 bg-stone-950 min-h-[56px] flex items-center overflow-x-auto border border-stone-800">
            <PixelTextPreviewCanvas
              text={previewText}
              project={project}
              currentGrid={grid}
              currentUnicode={currentUnicode}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              dotShape={dotShape}
            />
          </div>
        </div>

        {/* Game Engine & Font Export Hub */}
        <div
          className={`p-2.5 border space-y-2.5 ${
            isLight ? 'bg-white border-stone-300' : 'bg-[#0a0f0c] border-stone-800'
          }`}
        >
          <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
            <Gamepad2 className="w-4 h-4 text-emerald-600" />
            <span>ゲーム & フォント書き出し</span>
          </div>
          <p className="text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
            Unity, Godot, Unreal, Phaser, Pygame やマイコン(Arduino/ESP32)用の各種フォーマットへ一括出力します。
          </p>

          {/* 1. Direct OTF Font Export */}
          <button
            onClick={() => handleExportFontFile('otf')}
            className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-between border border-emerald-400 cursor-pointer"
            title="作成したピクセルフォントを直接OTF形式でダウンロード (.otf)"
          >
            <span className="flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>OTFフォント書き出し</span>
            </span>
            <span className="text-[10px] font-mono uppercase bg-emerald-700/80 px-1 py-0.5">.otf</span>
          </button>

          {/* 2. Spritesheet */}
          <button
            onClick={handleExportSpritesheet}
            className={`w-full py-1.5 px-2.5 border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
              isLight
                ? 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-700'
                : 'bg-[#142018] hover:bg-[#1c2e22] border-stone-700 text-emerald-300'
            }`}
            title="全文字のスプライトシート(PNG)と座標定義(JSON)を出力"
          >
            <span className="flex items-center space-x-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>スプライトシート (PNG+JSON)</span>
            </span>
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* 3. C / C++ Array Header */}
          <button
            onClick={handleExportCHeader}
            className={`w-full py-1.5 px-2.5 border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
              isLight
                ? 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-700'
                : 'bg-[#142018] hover:bg-[#1c2e22] border-stone-700 text-emerald-300'
            }`}
            title="Arduino / Raspberry Pi / 組込み用 C言語ヘッダーファイル (.h) を出力"
          >
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>組込み用 Cヘッダー (.h)</span>
            </span>
            <FileCode className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Note */}
        <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 text-[10.5px] text-emerald-700 dark:text-emerald-400 space-y-1">
          <div className="flex items-center space-x-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>リアルタイム自動保存中</span>
          </div>
          <div className="text-[10px] leading-tight opacity-80">
            ドットを打つたびにプロジェクトへ即座に記録されます。文字を切り替えても作業内容は保持されます。
          </div>
        </div>
      </div>
    </div>
  );
};
