import React from 'react';
import { Sliders, Edit3 } from 'lucide-react';
import { TestPreviewModalProps } from './types';
import { useTestPreviewState } from './hooks/useTestPreviewState';
import { PreviewToolbar } from './PreviewToolbar';
import { TextControlsPanel } from './TextControlsPanel';
import { TopControlsBar } from './TopControlsBar';
import { PreviewCanvas } from './PreviewCanvas';
import { CharAdjustPanel } from './CharAdjustPanel';
import { PreviewFooter } from './PreviewFooter';

export const TestPreviewModal: React.FC<TestPreviewModalProps> = (props) => {
  const { isOpen, onClose, project, setProject, onSelectGlyphForEdit, onOpenMojikumiStudio } = props;
  const state = useTestPreviewState(props);

  if (!isOpen) return null;

  const {
    isFullscreen,
    isLight,
    layoutMode,
    isSidebarOpen,
    isMobileScreen,
    leftSidebarWidth,
    setLeftSidebarWidth,
    handleLeftResizePointerDown,
    handleLeftResizePointerMove,
    handleLeftResizePointerUp,
    isSideAdjusterOpen,
    isDocked,
    rightAdjusterWidth,
    setRightAdjusterWidth,
    handleRightResizePointerDown,
    handleRightResizePointerMove,
    handleRightResizePointerUp,
    mainContainerRef,
    mobileTab,
    setMobileTab,
    setIsSideAdjusterOpen,
    selectedCharInfo,
  } = state;

  const waterfallSizes = [16, 20, 24, 32, 44, 60, 80];

  return (
    <div
      className={`fixed inset-0 z-50 select-none transition-all ${
        isFullscreen
          ? 'flex flex-col w-screen h-screen p-0 bg-black/90 overflow-hidden'
          : 'flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs'
      }`}
    >
      <div
        className={`w-full flex flex-col transition-all overflow-hidden ${
          isFullscreen
            ? isLight
              ? 'w-screen h-screen rounded-none border-none bg-[#f7faf8] text-stone-800'
              : 'w-screen h-screen rounded-none border-none bg-[#141c16] text-emerald-100'
            : isLight
            ? 'w-full sm:max-w-7xl border border-[#c8ded3] rounded-none sm:rounded-xl shadow-2xl h-[100vh] sm:h-[95vh] max-h-none sm:max-h-[960px] bg-[#f7faf8] text-stone-800'
            : 'w-full sm:max-w-7xl border border-[#25362b] rounded-none sm:rounded-xl shadow-2xl h-[100vh] sm:h-[95vh] max-h-none sm:max-h-[960px] bg-[#141c16] text-emerald-100'
        }`}
      >
        {/* Header Bar and Guidance Banner */}
        <PreviewToolbar
          project={project}
          state={state}
          onClose={onClose}
          setProject={setProject}
          onOpenMojikumiStudio={onOpenMojikumiStudio}
        />

        {/* MAIN BODY AREA: Switch between Split (Side-by-Side) and Top (Stacked) */}
        {layoutMode === 'split' ? (
          /* ==================== SPLIT MODE (SIDEBAR + FULL-HEIGHT PREVIEW) ==================== */
          <div ref={mainContainerRef} className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
            {/* Left Control Sidebar / Bottom Controls on mobile */}
            {(isSidebarOpen || isMobileScreen) && (
              <div
                style={{ width: isMobileScreen ? '100%' : `${leftSidebarWidth}px` }}
                className={`order-2 md:order-1 w-full md:w-auto flex-1 md:flex-initial md:h-full min-h-0 flex flex-col shrink-0 overflow-hidden border-t md:border-t-0 md:border-r max-w-full ${
                  isLight ? 'bg-[#f7faf8] border-[#d8e6df]' : 'bg-[#131b15] border-[#25362b]'
                }`}
              >
                {/* Mobile Tab Switcher */}
                <div className="flex md:hidden border-b border-emerald-200/60 dark:border-[#223326] bg-[#edf5f0] dark:bg-[#121c15] shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileTab('settings')}
                    className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
                      mobileTab === 'settings'
                        ? isLight
                          ? 'border-emerald-700 text-emerald-950 bg-white/80 shadow-xs'
                          : 'border-emerald-400 text-emerald-100 bg-emerald-950/70 shadow-xs'
                        : isLight
                        ? 'border-transparent text-stone-600 hover:text-stone-900'
                        : 'border-transparent text-emerald-400/80 hover:text-emerald-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>文章・組版設定</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSideAdjusterOpen(true);
                      setMobileTab('adjust');
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
                      mobileTab === 'adjust'
                        ? isLight
                          ? 'border-emerald-700 text-emerald-950 bg-white/80 shadow-xs'
                          : 'border-emerald-400 text-emerald-100 bg-emerald-950/70 shadow-xs'
                        : isLight
                        ? 'border-transparent text-stone-600 hover:text-stone-900'
                        : 'border-transparent text-emerald-400/80 hover:text-emerald-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">
                      {selectedCharInfo ? `「${selectedCharInfo.char}」個別調整` : '文字個別調整'}
                    </span>
                    {selectedCharInfo && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Adjuster content when active on mobile */}
                {isMobileScreen && mobileTab === 'adjust' ? (
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                    <CharAdjustPanel project={project} state={state} onSelectGlyphForEdit={onSelectGlyphForEdit} />
                  </div>
                ) : (
                  <TextControlsPanel state={state} />
                )}
              </div>
            )}

            {/* Drag Resizer Left */}
            {isSidebarOpen && !isMobileScreen && (
              <div
                onPointerDown={handleLeftResizePointerDown}
                onPointerMove={handleLeftResizePointerMove}
                onPointerUp={handleLeftResizePointerUp}
                onDoubleClick={() => setLeftSidebarWidth(280)}
                className="hidden md:flex w-1.5 hover:w-2 bg-transparent hover:bg-emerald-500/40 active:bg-emerald-500 cursor-col-resize shrink-0 transition-all z-30 group items-center justify-center select-none"
                title="ドラッグで左設定パネルの幅を調整 (ダブルクリックで初期幅280pxにリセット)"
              >
                <div className="w-0.5 h-8 bg-stone-300 dark:bg-stone-700 group-hover:bg-emerald-400 rounded-full" />
              </div>
            )}

            {/* Proofing Canvas Area */}
            <PreviewCanvas
              project={project}
              state={state}
              waterfallSizes={waterfallSizes}
              patternIdPrefix="split"
              isTopMode={false}
            />

            {/* Drag Resizer Right */}
            {isSideAdjusterOpen && isDocked && (
              <div
                onPointerDown={handleRightResizePointerDown}
                onPointerMove={handleRightResizePointerMove}
                onPointerUp={handleRightResizePointerUp}
                onDoubleClick={() => setRightAdjusterWidth(300)}
                className="hidden md:flex w-1.5 hover:w-2 bg-transparent hover:bg-emerald-500/40 active:bg-emerald-500 cursor-col-resize shrink-0 transition-all z-30 group items-center justify-center select-none"
                title="ドラッグで右微調整パネルの幅を調整 (ダブルクリックで初期幅300pxにリセット)"
              >
                <div className="w-0.5 h-8 bg-stone-300 dark:bg-stone-700 group-hover:bg-emerald-400 rounded-full" />
              </div>
            )}

            {/* Right Side Docked Glyph Adjuster Panel */}
            {isSideAdjusterOpen && (
              <CharAdjustPanel project={project} state={state} onSelectGlyphForEdit={onSelectGlyphForEdit} />
            )}
          </div>
        ) : (
          /* ==================== TOP STACKED MODE (WITH COLLAPSIBLE CONTROLS) ==================== */
          <>
            <TopControlsBar state={state} />

            {/* Main Proofing Stage and Docked Side Panel Container */}
            <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
              <PreviewCanvas
                project={project}
                state={state}
                waterfallSizes={waterfallSizes}
                patternIdPrefix="top"
                isTopMode={true}
              />

              {/* Drag Resizer Right */}
              {isSideAdjusterOpen && isDocked && (
                <div
                  onPointerDown={handleRightResizePointerDown}
                  onPointerMove={handleRightResizePointerMove}
                  onPointerUp={handleRightResizePointerUp}
                  onDoubleClick={() => setRightAdjusterWidth(300)}
                  className="hidden md:flex w-1.5 hover:w-2 bg-transparent hover:bg-emerald-500/40 active:bg-emerald-500 cursor-col-resize shrink-0 transition-all z-30 group items-center justify-center select-none"
                  title="ドラッグで右微調整パネルの幅を調整 (ダブルクリックで初期幅300pxにリセット)"
                >
                  <div className="w-0.5 h-8 bg-stone-300 dark:bg-stone-700 group-hover:bg-emerald-400 rounded-full" />
                </div>
              )}

              {/* Right Side Docked Glyph Adjuster Panel (Desktop only) */}
              {isSideAdjusterOpen && !isMobileScreen && (
                <CharAdjustPanel project={project} state={state} onSelectGlyphForEdit={onSelectGlyphForEdit} />
              )}
            </div>
          </>
        )}

        {/* Footer info bar & Hover Glyph Inspector */}
        <PreviewFooter project={project} state={state} onClose={onClose} />
      </div>
    </div>
  );
};

export default TestPreviewModal;
