import React, { useRef, useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Type,
  Upload,
  Camera,
  RotateCw,
  RefreshCw,
  Eye,
  Sparkles,
} from 'lucide-react';
import { TraceSettings } from '../types';
import { ThemeMode, getThemeClasses } from '../utils/theme';
import { BundledFontsModal } from './BundledFontsModal';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalAlert } from './modals/ModalAlert';
import { ModalFooter } from './modals/ModalFooter';
import { ModalShell } from './modals/ModalShell';
import { SliderRow } from './modals/SliderRow';
import {
  TRACE_DEFAULT_OPACITY,
  TRACE_FONT_OPTIONS,
  TRACE_SCALE_MAX,
  TRACE_SCALE_MIN,
} from './canvas/traceOptions';

interface TraceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceSettings: TraceSettings;
  setTraceSettings: React.Dispatch<React.SetStateAction<TraceSettings>>;
  activeChar: string;
  selectedUnicode: number;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const TraceSettingsModal: React.FC<TraceSettingsModalProps> = ({
  isOpen,
  onClose,
  traceSettings,
  setTraceSettings,
  activeChar,
  selectedUnicode,
  theme,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [applyMode, setApplyMode] = useState<'char' | 'global'>('global');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);

  const themeClasses = getThemeClasses(theme);

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLicenseModalOpen || e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        if (e.repeat) return;
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, isLicenseModalOpen, onClose]);

  // Current active image source (either per-char or global)
  const currentImageSrc =
    traceSettings.charImages?.[selectedUnicode] || traceSettings.imageSrc;

  if (!isOpen) return null;

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (applyMode === 'char') {
        setTraceSettings((prev) => ({
          ...prev,
          enabled: true,
          type: 'image',
          charImages: {
            ...(prev.charImages || {}),
            [selectedUnicode]: dataUrl,
          },
        }));
      } else {
        setTraceSettings((prev) => ({
          ...prev,
          enabled: true,
          type: 'image',
          imageSrc: dataUrl,
        }));
      }
    };
    reader.onerror = () => {
      if (onShowToast) {
        onShowToast('下絵画像の読み込みに失敗しました。ファイルを確認して再度お試しください。', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  const handlePasteClipboardImage = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            handleImageUpload(blob as File);
            return;
          }
        }
      }
      if (onShowToast) {
        onShowToast('クリップボードに画像が見つかりませんでした。スクリーンショット等をコピーしてから再度お試しください。', 'warning');
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      if (onShowToast) {
        onShowToast('クリップボードの読み取り権限がないか、ブラウザでサポートされていません。「画像を読み込む」ボタンから画像ファイルを選択してください。', 'warning');
      }
    }
  };

  const handleResetPosition = () => {
    setTraceSettings((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    }));
    if (onShowToast) {
      onShowToast('下絵の位置を中央(0, 0)にリセットしました', 'info');
    }
  };

  return (
    <>
      <ModalShell
        title="下絵・レタリングトレース設定"
        theme={theme}
        themeClasses={themeClasses}
        maxWidth="4xl"
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onClose={onClose}
        ariaLabel="下絵・レタリングトレース設定"
        footer={
          <ModalFooter
            primaryLabel="完了"
            onPrimary={onClose}
            leftInfo={
              <span className={`text-[11px] ${themeClasses.textMuted}`}>
                ※キャンバス上で「下絵移動」モードでも直接ドラッグ移動できます
              </span>
            }
            theme={theme}
            themeClasses={themeClasses}
          />
        }
      >
        {/* Content */}
        <div className="space-y-3">
          {/* Top Bar: Enable Toggle + Source Type Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
            <label
              className={`lg:col-span-5 flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border}`}
            >
              <div className="flex items-center space-x-2">
                <Eye className={`w-4 h-4 ${themeClasses.accentText}`} />
                <span className={`font-semibold ${themeClasses.textPrimary}`}>
                  下絵ガイドを表示する
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(traceSettings?.enabled)}
                onChange={(e) => setTraceSettings((s) => ({ ...s, enabled: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded-sm"
              />
            </label>

            {/* Source Type Selector */}
            <div className="lg:col-span-7 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTraceSettings((s) => ({ ...s, type: 'image' }))}
                className={`p-2 sm:py-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 transition-colors cursor-pointer ${
                  traceSettings.type === 'image'
                    ? themeClasses.activeTool
                    : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                }`}
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold truncate text-center">写真・下絵画像</span>
              </button>

              <button
                type="button"
                onClick={() => setTraceSettings((s) => ({ ...s, type: 'char' }))}
                className={`p-2 sm:py-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 transition-colors cursor-pointer ${
                  traceSettings.type === 'char'
                    ? themeClasses.activeTool
                    : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                }`}
              >
                <Type className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold truncate text-center">標準フォント下絵</span>
              </button>
            </div>
          </div>

          {/* IMAGE TRACE CONFIGURATION */}
          {traceSettings.type === 'image' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Left Col: Upload, Scope & Specs */}
              <div
                className={`lg:col-span-5 p-3 rounded-xl border space-y-2.5 ${themeClasses.cardBg} ${themeClasses.border}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {/* Image scope: this character only, or all characters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyMode('char')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                      applyMode === 'char'
                        ? themeClasses.activeTool
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                    title="読み込んだ画像を現在選択中の文字だけに適用します"
                  >
                    この文字「{activeChar}」だけに適用
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyMode('global')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                      applyMode === 'global'
                        ? themeClasses.activeTool
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                    title="読み込んだ画像をすべての文字に適用します"
                  >
                    全体に適用
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`py-2 px-2.5 rounded-lg border flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <Upload className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span className="font-semibold text-[11px]">画像ファイル読込</span>
                  </button>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className={`py-2 px-2.5 rounded-lg border flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <Camera className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span className="font-semibold text-[11px]">カメラで看板撮影</span>
                  </button>

                  <button
                    onClick={handlePasteClipboardImage}
                    className={`py-2 px-2.5 rounded-lg border flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                    <span className="font-semibold text-[11px]">クリップボード貼付</span>
                  </button>
                </div>

                {currentImageSrc && (
                  <div className={`flex items-center justify-between pt-1.5 border-t text-[11px] font-medium ${themeClasses.border} ${themeClasses.accentText}`}>
                    <span className="flex items-center space-x-1">
                      <span>画像を読み込みました</span>
                    </span>
                    <button
                      onClick={() => {
                        if (applyMode === 'char') {
                          setTraceSettings((s) => {
                            const copy = { ...(s.charImages || {}) };
                            delete copy[selectedUnicode];
                            return { ...s, charImages: copy };
                          });
                        } else {
                          setTraceSettings((s) => ({ ...s, imageSrc: undefined }));
                        }
                      }}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      画像を削除
                    </button>
                  </div>
                )}

                {/* Recommended Image Specification Guide */}
                <ModalAlert tone="info" title="推奨画像仕様（フォント下絵・トレース用）" theme={theme}>
                  <ul className="space-y-0.5">
                    <li>・<strong>推奨サイズ:</strong> 1000 × 1000 px 〜 2048 × 2048 px （1:1 正方形 / FontForge規格適合）</li>
                    <li>・<strong>背景・輪郭:</strong> 白背景に濃い黒文字（高コントラストなモノクロ）</li>
                    <li>・<strong>余白:</strong> 周囲に10〜15%の適度な余白</li>
                  </ul>
                </ModalAlert>
              </div>

              {/* Right Col: Photo Positioning & Adjustments */}
              <div
                className={`lg:col-span-7 p-3 rounded-xl border space-y-2.5 ${themeClasses.cardBg} ${themeClasses.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <span className={themeClasses.textPrimary}>
                      写真の位置・サイズ・補正調整
                    </span>
                  </div>
                  <button
                    onClick={handleResetPosition}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border flex items-center space-x-1 text-[11px] transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>位置リセット</span>
                  </button>
                </div>

                {/* Sliders: Scale & Position */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SliderRow
                      label="拡大・縮小倍率"
                      value={Math.round((traceSettings.scale ?? 1) * 100)}
                      min={Math.round(TRACE_SCALE_MIN * 100)}
                      max={Math.round(TRACE_SCALE_MAX * 100)}
                      step={5}
                      unit="%"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, scale: v / 100 }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                    {/* Quick Fit Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className={`text-[10px] shrink-0 ${themeClasses.textMuted}`}>推奨サイズ:</span>
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 0.78 }))}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 0.78) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        仮名 78%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 0.85 }))}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 0.85) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        漢字 85%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 1.0 }))}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 1.0) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        100%
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <SliderRow
                      label="回転角度"
                      value={traceSettings.rotation ?? 0}
                      min={-180}
                      max={180}
                      step={1}
                      unit="°"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, rotation: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SliderRow
                      label="X位置 (左右移動)"
                      value={Math.round(traceSettings.offsetX ?? 0)}
                      min={-800}
                      max={800}
                      step={5}
                      unit="px"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, offsetX: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>

                  <div className="space-y-1">
                    <SliderRow
                      label="Y位置 (上下移動)"
                      value={Math.round(traceSettings.offsetY ?? 0)}
                      min={-800}
                      max={800}
                      step={5}
                      unit="px"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, offsetY: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>
                </div>

                {/* Photo Enhancements: Contrast, Grayscale, Invert */}
                <div className={`pt-2 border-t grid grid-cols-1 lg:grid-cols-4 gap-2 ${themeClasses.border}`}>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(traceSettings.grayscale)}
                      onChange={(e) => setTraceSettings((s) => ({ ...s, grayscale: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded-sm"
                    />
                    <span className="text-[11px]">白黒化 (Monochrome)</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(traceSettings.invert)}
                      onChange={(e) => setTraceSettings((s) => ({ ...s, invert: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded-sm"
                    />
                    <span className="text-[11px]">ネガ反転 (白黒逆転)</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(traceSettings.flipH)}
                      onChange={(e) => setTraceSettings((s) => ({ ...s, flipH: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded-sm"
                    />
                    <span className="text-[11px]">左右反転</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(traceSettings.flipV)}
                      onChange={(e) => setTraceSettings((s) => ({ ...s, flipV: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded-sm"
                    />
                    <span className="text-[11px]">上下反転</span>
                  </label>

                  <button
                    onClick={() =>
                      setTraceSettings((s) => ({
                        ...s,
                        rotation: ((s.rotation || 0) + 90) % 360,
                      }))
                    }
                    className={`min-h-[44px] py-1 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>90°回転</span>
                  </button>
                </div>

                {/* Contrast Slider */}
                <div className="space-y-1">
                  <SliderRow
                    label="コントラスト強調 (看板の文字輪郭をくっきり化)"
                    value={Math.round((traceSettings.contrast || 1) * 100)}
                    min={50}
                    max={300}
                    step={10}
                    unit="%"
                    showNumberInput
                    onChange={(v) => setTraceSettings((s) => ({ ...s, contrast: v / 100 }))}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                </div>

                {/* Brightness Slider */}
                <div className="space-y-1">
                  <SliderRow
                    label="明るさ"
                    value={Math.round((traceSettings.brightness ?? 1) * 100)}
                    min={50}
                    max={200}
                    step={10}
                    unit="%"
                    showNumberInput
                    onChange={(v) => setTraceSettings((s) => ({ ...s, brightness: v / 100 }))}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* SYSTEM FONT TRACE CONFIGURATION */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              <div
                className={`lg:col-span-5 space-y-3 p-3 rounded-xl border ${themeClasses.cardBg} ${themeClasses.border}`}
              >
                <div className="flex flex-col space-y-1">
                  <label className={themeClasses.textMuted}>
                    表示文字 (初期値: 現在選択中の文字)
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={traceSettings.text || activeChar || ''}
                    onChange={(e) => setTraceSettings((s) => ({ ...s, text: e.target.value }))}
                    className={`border rounded-lg p-2 focus:outline-none ${themeClasses.appBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className={`font-semibold ${themeClasses.textMuted}`}>
                      下絵フォント書体
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsLicenseModalOpen(true)}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer ${themeClasses.accentText}`}
                    >
                      <span>フォントとライセンス一覧</span>
                    </button>
                  </div>
                  <select
                    value={traceSettings.fontFamily ?? "'Noto Sans JP', sans-serif"}
                    onChange={(e) => setTraceSettings((s) => ({ ...s, fontFamily: e.target.value }))}
                    className={`border rounded-lg p-2 focus:outline-none ${themeClasses.appBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  >
                    {TRACE_FONT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position & Scale Controls for Font Trace */}
              <div className={`lg:col-span-7 p-3 rounded-xl border space-y-2.5 ${themeClasses.cardBg} ${themeClasses.border}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center space-x-1">
                    <span>お手本文字の位置・サイズ調整</span>
                  </span>
                  <button
                    onClick={handleResetPosition}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border flex items-center space-x-1 text-[11px] transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>位置リセット</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <SliderRow
                      label="倍率"
                      value={Math.round((traceSettings.scale ?? 1) * 100)}
                      min={Math.round(TRACE_SCALE_MIN * 100)}
                      max={Math.round(TRACE_SCALE_MAX * 100)}
                      step={5}
                      unit="%"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, scale: v / 100 }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                    {/* Quick Fit Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 0.9 }))}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 0.9) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                        title="余白を広めに取る控えめサイズ (90%)"
                      >
                        90%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 1.0 }))}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 1.0) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                        title="字面枠（かな78%・漢字85%）にそのまま適合する標準倍率"
                      >
                        標準100%
                      </button>
                      <button
                        type="button"
                        onClick={() => setTraceSettings((s) => ({ ...s, scale: 1.1 }))}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold transition-colors cursor-pointer ${
                          Math.abs((traceSettings.scale ?? 1) - 1.1) < 0.02
                            ? themeClasses.accentBtn
                            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                        title="存在感のある大きめサイズ (110%)"
                      >
                        110%
                      </button>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <SliderRow
                      label="X移動"
                      value={Math.round(traceSettings.offsetX ?? 0)}
                      min={-400}
                      max={400}
                      step={5}
                      unit="px"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, offsetX: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <SliderRow
                      label="Y移動"
                      value={Math.round(traceSettings.offsetY ?? 0)}
                      min={-400}
                      max={400}
                      step={5}
                      unit="px"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, offsetY: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <SliderRow
                      label="回転角度"
                      value={traceSettings.rotation ?? 0}
                      min={-180}
                      max={180}
                      step={1}
                      unit="°"
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, rotation: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <SliderRow
                      label="フォントサイズ"
                      value={traceSettings.fontSize ?? 1000}
                      min={200}
                      max={2000}
                      step={10}
                      showNumberInput
                      onChange={(v) => setTraceSettings((s) => ({ ...s, fontSize: v }))}
                      theme={theme}
                      themeClasses={themeClasses}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opacity Slider */}
          <div
            className={`p-3 rounded-xl border space-y-1 ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            <SliderRow
              label="下絵の透明度 (不透明度)"
              value={Math.round((traceSettings.opacity ?? TRACE_DEFAULT_OPACITY) * 100)}
              min={5}
              max={100}
              step={5}
              unit="%"
              showNumberInput
              onChange={(v) => setTraceSettings((s) => ({ ...s, opacity: v / 100 }))}
              theme={theme}
              themeClasses={themeClasses}
            />
          </div>
        </div>

      </ModalShell>

      <BundledFontsModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        theme={theme}
      />
    </>
  );
};
