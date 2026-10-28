import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlyphData } from '../../../types';

interface UsePixelTraceProps {
  currentGlyph: GlyphData;
  gridWidth: number;
  gridHeight: number;
  pushHistory: (nextGrid: Uint8Array) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function usePixelTrace({
  currentGlyph,
  gridWidth,
  gridHeight,
  pushHistory,
  onShowToast,
}: UsePixelTraceProps) {
  const [showTrace, setShowTrace] = useState<boolean>(false);
  const [showTracePanel, setShowTracePanel] = useState<boolean>(false);
  const [traceSource, setTraceSource] = useState<'font' | 'image'>('font');
  const [traceChar, setTraceChar] = useState<string>('');
  const [traceFontFamily, setTraceFontFamily] = useState<string>('sans-serif');
  const [traceOpacity, setTraceOpacity] = useState<number>(35);
  const [traceScale, setTraceScale] = useState<number>(100);
  const [traceOffsetX, setTraceOffsetX] = useState<number>(0);
  const [traceOffsetY, setTraceOffsetY] = useState<number>(0);
  const [traceThreshold, setTraceThreshold] = useState<number>(128);
  const [traceImageSrc, setTraceImageSrc] = useState<string | null>(null);
  const traceImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentGlyph.char) {
      setTraceChar(currentGlyph.char);
    }
  }, [currentGlyph.char]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setTraceImageSrc(src);
      setTraceSource('image');
      setShowTrace(true);

      const img = new Image();
      img.onload = () => {
        traceImageRef.current = img;
      };
      img.src = src;

      onShowToast('下絵画像を読み込みました', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAutoBinarizeTrace = useCallback(() => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridWidth;
    offCanvas.height = gridHeight;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    offCtx.clearRect(0, 0, gridWidth, gridHeight);
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, gridWidth, gridHeight);

    if (traceSource === 'image' && traceImageRef.current) {
      const img = traceImageRef.current;
      const scale = traceScale / 100;
      const drawW = gridWidth * scale;
      const drawH = gridHeight * scale;
      const dx = (gridWidth - drawW) / 2 + traceOffsetX;
      const dy = (gridHeight - drawH) / 2 + traceOffsetY;
      offCtx.drawImage(img, dx, dy, drawW, drawH);
    } else {
      const charToDraw = traceChar || currentGlyph.char || 'A';
      const scale = traceScale / 100;
      const fontSize = Math.round(gridHeight * 0.85 * scale);
      offCtx.font = `bold ${fontSize}px ${traceFontFamily}`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#000000';
      offCtx.fillText(charToDraw, gridWidth / 2 + traceOffsetX, gridHeight / 2 + traceOffsetY);
    }

    const imgData = offCtx.getImageData(0, 0, gridWidth, gridHeight);
    const next = new Uint8Array(gridWidth * gridHeight);

    for (let i = 0; i < gridWidth * gridHeight; i++) {
      const r = imgData.data[i * 4];
      const g = imgData.data[i * 4 + 1];
      const b = imgData.data[i * 4 + 2];
      const a = imgData.data[i * 4 + 3];

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      next[i] = luminance <= traceThreshold ? 1 : 0;
    }

    pushHistory(next);
    onShowToast('下絵からドット絵を自動抽出しました', 'success');
  }, [
    gridWidth,
    gridHeight,
    traceSource,
    traceScale,
    traceOffsetX,
    traceOffsetY,
    traceChar,
    currentGlyph.char,
    traceFontFamily,
    traceThreshold,
    pushHistory,
    onShowToast,
  ]);

  return {
    showTrace,
    setShowTrace,
    showTracePanel,
    setShowTracePanel,
    traceSource,
    setTraceSource,
    traceChar,
    setTraceChar,
    traceFontFamily,
    setTraceFontFamily,
    traceOpacity,
    setTraceOpacity,
    traceScale,
    setTraceScale,
    traceOffsetX,
    setTraceOffsetX,
    traceOffsetY,
    setTraceOffsetY,
    traceThreshold,
    setTraceThreshold,
    traceImageSrc,
    setTraceImageSrc,
    traceImageRef,
    fileInputRef,
    handleImageUpload,
    handleAutoBinarizeTrace,
  };
}
