import React from 'react';
import {
  GripVertical,
  Maximize2,
  PanelRightClose,
  X,
  MousePointerClick,
  AlertCircle,
  Pencil,
  Eye,
  Move,
  Scaling,
  Lock,
  Unlock,
  ExternalLink,
  Save,
} from 'lucide-react';
import { FontProject } from '../../types';
import { groupContoursForRendering } from '../../utils/pathUtils';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface CharAdjustPanelProps {
  project: FontProject;
  state: TestPreviewState;
  onSelectGlyphForEdit?: (unicode: number) => void;
}

export const CharAdjustPanel: React.FC<CharAdjustPanelProps> = ({
  project,
  state,
  onSelectGlyphForEdit,
}) => {
  const {
    selectedCharInfo,
    setSelectedCharInfo,
    activeGlyph,
    livePreviewContours,
    glyphEntries,
    adjustDx,
    setAdjustDx,
    adjustDy,
    setAdjustDy,
    adjustScaleX,
    setAdjustScaleX,
    adjustScaleY,
    setAdjustScaleY,
    isAspectLocked,
    setIsAspectLocked,
    isLight,
    isDocked,
    setIsDocked,
    floatingPos,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    rightAdjusterWidth,
    isMobileScreen,
    mobileTab,
    setMobileTab,
    showLivePreviewBox,
    setShowLivePreviewBox,
    handleAutoCenterGlyph,
    handleJumpToMainEditor,
    handleApplyTransformToGlyph,
  } = state;

  const panelContent = (
    <>
      {/* Header with Glyph Selector Dropdown, Title & Dock Toggle */}
      <div
        onPointerDown={!isDocked ? handleDragStart : undefined}
        onPointerMove={!isDocked ? handleDragMove : undefined}
        onPointerUp={!isDocked ? handleDragEnd : undefined}
        className={`flex items-center justify-between pb-2 mb-2 border-b border-inherit select-none ${
          !isDocked
            ? 'cursor-grab active:cursor-grabbing p-1 -mx-1 rounded-t-xl bg-emerald-500/5 dark:bg-emerald-500/10'
            : ''
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1 pr-1">
          {!isDocked && (
            <div
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0"
              title="ドラッグして小窓を移動"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {selectedCharInfo ? (
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-base shrink-0 ${
                  activeGlyph && activeGlyph.contours && activeGlyph.contours.length > 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
                title={
                  activeGlyph && activeGlyph.contours && activeGlyph.contours.length > 0
                    ? '自作グリフ'
                    : '未作成グリフ（システム代替フォント表示中）'
                }
              >
                {selectedCharInfo.char}
              </span>
            ) : (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs shrink-0">
                ?
              </span>
            )}

            {/* Character Quick Selector Dropdown */}
            <select
              value={selectedCharInfo ? selectedCharInfo.unicode : ''}
              onChange={(e) => {
                const u = Number(e.target.value);
                if (u && project.glyphs[u]) {
                  const ch = project.glyphs[u].char || String.fromCodePoint(u);
                  setSelectedCharInfo({ char: ch, unicode: u, lineIndex: -1, charIndex: -1 });
                  setAdjustDx(0);
                  setAdjustDy(0);
                  setAdjustScaleX(100);
                  setAdjustScaleY(100);
                }
              }}
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg border font-bold truncate ${
                isLight
                  ? 'bg-white border-[#c8ded3] text-stone-800'
                  : 'bg-[#18231c] border-[#2d4034] text-emerald-200'
              }`}
            >
              <option value="">-- 調整する文字を選択 --</option>
              {glyphEntries.map((item) => (
                <option key={item.unicode} value={item.unicode}>
                  「{item.char}」 (U+{item.unicode.toString(16).toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsDocked(!isDocked)}
            className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            title={isDocked ? 'フローティング小窓にする (ドラッグ移動可能)' : '右サイドバーに固定ドックする'}
          >
            {isDocked ? <Maximize2 className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
          {selectedCharInfo && (
            <button
              type="button"
              onClick={() => setSelectedCharInfo(null)}
              className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors"
              title="調整パネルを閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!selectedCharInfo ? (
        <div className="p-5 text-center space-y-3 text-stone-500 dark:text-stone-400 my-auto">
          <MousePointerClick className="w-10 h-10 mx-auto text-emerald-600" />
          <p className="text-xs font-bold leading-relaxed">
            文章内の文字をクリック、または上のドロップダウンから調整したい文字を選択してください
          </p>
          <p className="text-[11px] opacity-80 leading-relaxed">
            位置（X/Y）や拡大縮小・縦横比をリアルタイムに微調整し、グリフデータへ永続保存できます
          </p>
        </div>
      ) : !activeGlyph || !activeGlyph.contours || activeGlyph.contours.length === 0 ? (
        <div className="p-4 my-auto space-y-4">
          <div
            className={`p-4 rounded-xl border text-center space-y-3 ${
              isLight ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs">未作成グリフ（システム代替表示中）</h4>
              <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                「{selectedCharInfo.char}」は現在のフォントにまだ輪郭データがありません。<br />
                この文字を作字すると、プレビューに自作フォントが反映されます。
              </p>
            </div>
            {onSelectGlyphForEdit && (
              <button
                type="button"
                onClick={handleJumpToMainEditor}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>「{selectedCharInfo.char}」をエディタで作字する</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Adjuster Controls Container (Unified Scrollable) */}
          <div className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar my-1">
            {/* Live Vector SVG Preview Canvas Box (Toggleable & Compact) */}
            <div
              className={`p-2 rounded-xl border flex flex-col items-center justify-center shrink-0 relative overflow-hidden transition-all ${
                isLight ? 'bg-white border-emerald-200' : 'bg-[#101812] border-emerald-900/60'
              }`}
            >
              {(() => {
                const upm = project.metadata.unitsPerEm || 1000;
                const baselineY = project.metadata.ascender || Math.round(upm * 0.8);
                const half = upm / 2;
                const pad = Math.round(upm * 0.1);
                const total = upm + pad * 2;
                return (
                  <>
                    <div className="w-full flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-0.5">
                      <button
                        type="button"
                        onClick={() => setShowLivePreviewBox(!showLivePreviewBox)}
                        className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ベクター輪郭プレビュー</span>
                        <span className="text-[10px] font-normal opacity-75">
                          ({showLivePreviewBox ? 'たたむ' : '展開'})
                        </span>
                      </button>
                      <span className="font-mono text-[10px]">{upm} EM</span>
                    </div>

                    {showLivePreviewBox && (
                      <div className="mt-2 w-28 h-28 border border-dashed border-emerald-500/40 relative bg-emerald-50/20 dark:bg-emerald-950/20 rounded-lg flex items-center justify-center">
                        <svg
                          viewBox={`-${pad} -${pad} ${total} ${total}`}
                          className="w-full h-full overflow-visible text-emerald-900 dark:text-emerald-300"
                        >
                          {/* EM Box Frame */}
                          <rect
                            x="0"
                            y="0"
                            width={upm}
                            height={upm}
                            fill="none"
                            stroke="rgba(16,185,129,0.25)"
                            strokeWidth={Math.max(2, Math.round(upm * 0.01))}
                            strokeDasharray={`${Math.round(upm * 0.02)} ${Math.round(upm * 0.02)}`}
                          />
                          {/* Baseline in canvas/SVG space */}
                          <line
                            x1={-pad}
                            y1={baselineY}
                            x2={upm + pad}
                            y2={baselineY}
                            stroke="rgba(99,102,241,0.5)"
                            strokeWidth={Math.max(2, Math.round(upm * 0.012))}
                          />
                          {/* Center Cross */}
                          <line
                            x1={half}
                            y1={-pad}
                            x2={half}
                            y2={upm + pad}
                            stroke="rgba(16,185,129,0.3)"
                            strokeWidth={Math.max(1.5, Math.round(upm * 0.008))}
                            strokeDasharray={`${Math.round(upm * 0.015)} ${Math.round(upm * 0.015)}`}
                          />
                          <line
                            x1={-pad}
                            y1={half}
                            x2={upm + pad}
                            y2={half}
                            stroke="rgba(16,185,129,0.3)"
                            strokeWidth={Math.max(1.5, Math.round(upm * 0.008))}
                            strokeDasharray={`${Math.round(upm * 0.015)} ${Math.round(upm * 0.015)}`}
                          />

                          {/* Rendered Contours */}
                          <g>
                            {groupContoursForRendering(livePreviewContours).map((group) => (
                              <path
                                key={group.id}
                                d={group.d}
                                fill="currentColor"
                                fillRule={group.fillRule}
                                opacity="0.88"
                              />
                            ))}
                          </g>
                        </svg>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-1 flex items-center justify-center gap-2 text-[10.5px] font-mono text-stone-600 dark:text-stone-300">
                <span>オフセット: ({adjustDx}, {adjustDy})</span>
                <span>・</span>
                <span>倍率: {adjustScaleX}%×{adjustScaleY}%</span>
              </div>
            </div>

            {/* 1. Coordinate Position Offset (座標位置 X / Y) */}
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-900/60'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center space-x-1 text-emerald-900 dark:text-emerald-200">
                  <Move className="w-3.5 h-3.5 text-emerald-600" />
                  <span>位置オフセット (X/Y)</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleAutoCenterGlyph}
                    className="h-6 px-2 inline-flex items-center justify-center rounded border border-emerald-400 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-200 transition-colors"
                    title="文字をEM枠中央に自動整列"
                  >
                    中央整列
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustDx(0); setAdjustDy(0); }}
                    className="h-6 px-2 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-mono transition-colors"
                    title="位置を0リセット"
                  >
                    0
                  </button>
                </div>
              </div>

              {/* Direct Number Input Fields & Sliders */}
              <div className="flex flex-col space-y-2.5">
                <div className="space-y-2.5 text-xs">
                  {/* Direct Input & Slider X */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 font-mono font-bold text-xs shrink-0">X:</span>
                    <button
                      type="button"
                      onClick={() => setAdjustDx((prev) => Math.max(-200, prev - 5))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                      title="-5px"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={-200}
                      max={200}
                      value={adjustDx}
                      onChange={(e) => setAdjustDx(Number(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="flex-1 accent-emerald-600 cursor-pointer h-3 touch-action-none relative z-10"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustDx((prev) => Math.min(200, prev + 5))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                      title="+5px"
                    >
                      +
                    </button>
                    <input
                      type="number"
                      value={adjustDx}
                      onChange={(e) => setAdjustDx(Number(e.target.value) || 0)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className={`w-14 px-1 py-0.5 rounded border text-right font-mono font-bold text-xs shrink-0 ${
                        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#18231c] border-stone-700 text-emerald-100'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 font-mono shrink-0">px</span>
                  </div>

                  {/* Direct Input & Slider Y */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 font-mono font-bold text-xs shrink-0">Y:</span>
                    <button
                      type="button"
                      onClick={() => setAdjustDy((prev) => Math.max(-200, prev - 5))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                      title="-5px"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={-200}
                      max={200}
                      value={adjustDy}
                      onChange={(e) => setAdjustDy(Number(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="flex-1 accent-emerald-600 cursor-pointer h-3 touch-action-none relative z-10"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustDy((prev) => Math.min(200, prev + 5))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                      title="+5px"
                    >
                      +
                    </button>
                    <input
                      type="number"
                      value={adjustDy}
                      onChange={(e) => setAdjustDy(Number(e.target.value) || 0)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className={`w-14 px-1 py-0.5 rounded border text-right font-mono font-bold text-xs shrink-0 ${
                        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#18231c] border-stone-700 text-emerald-100'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 font-mono shrink-0">px</span>
                  </div>

                  {/* Micro adjustment button rows for X and Y */}
                  <div className="space-y-1.5 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/40 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 font-semibold shrink-0 text-[11px]">X微調整:</span>
                      <div className="flex items-center space-x-1 font-mono overflow-x-auto no-scrollbar py-0.5">
                        {[-20, -10, -1, 1, 10, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAdjustDx((prev) => prev + val)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="h-6 px-2 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-[10.5px] whitespace-nowrap font-mono"
                            title={`X座標 ${val > 0 ? '+' : ''}${val}`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 font-semibold shrink-0 text-[11px]">Y微調整:</span>
                      <div className="flex items-center space-x-1 font-mono overflow-x-auto no-scrollbar py-0.5">
                        {[-20, -10, -1, 1, 10, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAdjustDy((prev) => prev + val)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="h-6 px-2 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-[10.5px] whitespace-nowrap font-mono"
                            title={`Y座標 ${val > 0 ? '+' : ''}${val}`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Scale & Aspect Ratio (拡縮・縦横比) */}
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-900/60'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center space-x-1 text-emerald-900 dark:text-emerald-200">
                  <Scaling className="w-3.5 h-3.5 text-emerald-600" />
                  <span>拡大縮小 & 縦横比</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAspectLocked(!isAspectLocked)}
                  className={`h-6 px-2 rounded border inline-flex items-center space-x-1 text-[10.5px] transition-colors cursor-pointer ${
                    isAspectLocked
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                  title="縦横比固定切替"
                >
                  {isAspectLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{isAspectLocked ? '縦横固定' : '自由変形'}</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Width % Slider + Number Input + Stepper */}
                <div className="flex items-center gap-1.5">
                  <span className="w-5 font-mono font-bold text-xs shrink-0">幅:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(40, adjustScaleX - 5);
                      setAdjustScaleX(val);
                      if (isAspectLocked) setAdjustScaleY(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                    title="-5%"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    value={adjustScaleX}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdjustScaleX(val);
                      if (isAspectLocked) setAdjustScaleY(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex-1 accent-emerald-600 cursor-pointer h-3 touch-action-none relative z-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.min(200, adjustScaleX + 5);
                      setAdjustScaleX(val);
                      if (isAspectLocked) setAdjustScaleY(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                    title="+5%"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    value={adjustScaleX}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 100;
                      setAdjustScaleX(val);
                      if (isAspectLocked) setAdjustScaleY(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`w-14 px-1 py-0.5 rounded border text-right font-mono font-bold text-xs shrink-0 ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#18231c] border-stone-700 text-emerald-100'
                    }`}
                  />
                  <span className="text-[10px] text-stone-500 font-mono shrink-0">%</span>
                </div>

                {/* Height % Slider + Number Input + Stepper */}
                <div className="flex items-center gap-1.5">
                  <span className="w-5 font-mono font-bold text-xs shrink-0">高:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(40, adjustScaleY - 5);
                      setAdjustScaleY(val);
                      if (isAspectLocked) setAdjustScaleX(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                    title="-5%"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    value={adjustScaleY}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdjustScaleY(val);
                      if (isAspectLocked) setAdjustScaleX(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex-1 accent-emerald-600 cursor-pointer h-3 touch-action-none relative z-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.min(200, adjustScaleY + 5);
                      setAdjustScaleY(val);
                      if (isAspectLocked) setAdjustScaleX(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 inline-flex items-center justify-center rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors shrink-0 select-none cursor-pointer"
                    title="+5%"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    value={adjustScaleY}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 100;
                      setAdjustScaleY(val);
                      if (isAspectLocked) setAdjustScaleX(val);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`w-14 px-1 py-0.5 rounded border text-right font-mono font-bold text-xs shrink-0 ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#18231c] border-stone-700 text-emerald-100'
                    }`}
                  />
                  <span className="text-[10px] text-stone-500 font-mono shrink-0">%</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                  <div className="flex items-center space-x-1 font-mono overflow-x-auto no-scrollbar py-0.5">
                    {[85, 90, 95, 100, 105, 110, 115].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setAdjustScaleX(s); setAdjustScaleY(s); }}
                        className={`h-6 px-2 inline-flex items-center justify-center rounded text-[10.5px] font-mono border whitespace-nowrap ${
                          adjustScaleX === s && adjustScaleY === s
                            ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                            : 'border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAdjustScaleX(100); setAdjustScaleY(100); }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 ml-2 font-semibold"
                  >
                    等倍
                  </button>
                </div>
              </div>
            </div>

            {/* Main Canvas Jump Button */}
            {onSelectGlyphForEdit && (
              <button
                type="button"
                onClick={handleJumpToMainEditor}
                className="w-full py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center space-x-1.5 transition-colors border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="この文字をメインキャンバスで開いて本格パス編集を行います"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>メイン編集でパス直接調整</span>
              </button>
            )}
          </div>

          {/* Bottom Actions: Save & Reset */}
          <div className="pt-2.5 mt-2 border-t border-inherit space-y-2 shrink-0">
            <button
              type="button"
              onClick={handleApplyTransformToGlyph}
              disabled={adjustDx === 0 && adjustDy === 0 && adjustScaleX === 100 && adjustScaleY === 100}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                adjustDx === 0 && adjustDy === 0 && adjustScaleX === 100 && adjustScaleY === 100
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98 shadow-sm'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>「{selectedCharInfo.char}」の輪郭に永続保存</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustDx(0);
                  setAdjustDy(0);
                  setAdjustScaleX(100);
                  setAdjustScaleY(100);
                }}
                className="flex-1 py-2 px-2 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors text-center"
              >
                微調整をリセット
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="md:hidden flex-1 py-2 px-2 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 transition-colors text-center"
              >
                プレビュー確認
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (isMobileScreen) {
    return (
      <div
        className={`w-full h-full flex flex-col overflow-y-auto p-3.5 pb-20 transition-colors custom-scrollbar ${
          isLight
            ? 'bg-[#f7faf8] text-stone-800'
            : 'bg-[#121c15] text-emerald-100'
        } ${mobileTab !== 'adjust' ? 'hidden md:flex' : 'flex'}`}
      >
        {panelContent}
      </div>
    );
  }

  if (isDocked) {
    return (
      <aside
        style={{ width: `${rightAdjusterWidth}px` }}
        className={`border-l shrink-0 flex flex-col h-full overflow-y-auto p-3 sm:p-3.5 transition-colors z-20 shadow-xl custom-scrollbar max-w-full ${
          isLight
            ? 'bg-white/95 border-stone-200 text-stone-800'
            : 'bg-[#121c15]/95 border-[#233527] text-emerald-100'
        }`}
      >
        {panelContent}
      </aside>
    );
  }

  return (
    <div
      style={{ left: `${floatingPos.x}px`, top: `${floatingPos.y}px`, width: `${rightAdjusterWidth}px` }}
      className={`absolute z-40 max-h-[calc(100%-2rem)] rounded-2xl border shadow-2xl backdrop-blur-md flex flex-col p-3 sm:p-3.5 transition-shadow ${
        isDragging ? ' ring-2 ring-emerald-500 cursor-grabbing' : ''
      } ${
        isLight
          ? 'bg-white/95 border-stone-200 text-stone-800 '
          : 'bg-[#121c15]/95 border-[#233527] text-emerald-100 '
      }`}
    >
      {panelContent}
    </div>
  );
};
