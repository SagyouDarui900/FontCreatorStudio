import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PanelTop, PanelLeft, PanelRight } from 'lucide-react';
import {
  ToolMode,
  GridSettings,
  BrushStyle,
  UserPenPreset,
  JapaneseGuidePattern,
  VerticalGuidePattern,
  ToolbarPosition,
} from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { PEN_PRESETS } from '../utils/path';
import {
  PEN_ICONS,
  SHAPE_TOOLS,
  VERTICAL_GUIDES,
  JAPANESE_GUIDES,
} from './toolbar/toolbarConstants';
import { PrimaryToolButtons } from './toolbar/PrimaryToolButtons';
import { ViewToolButtons } from './toolbar/ViewToolButtons';
import { DesktopBrushMenuPopover } from './toolbar/DesktopBrushMenuPopover';
import { DesktopShapeMenuPopover } from './toolbar/DesktopShapeMenuPopover';
import { DesktopGridMenuPopover } from './toolbar/DesktopGridMenuPopover';
import { MobileBrushMenuSheet } from './toolbar/MobileBrushMenuSheet';
import { MobileShapeMenuSheet } from './toolbar/MobileShapeMenuSheet';
import { MobileGridMenuSheet } from './toolbar/MobileGridMenuSheet';
import { ToolbarPositionMenu } from './toolbar/ToolbarPositionMenu';

export { VERTICAL_GUIDES, JAPANESE_GUIDES };
export type { JapaneseGuidePattern, VerticalGuidePattern };

export interface ToolBarProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  brushStyle?: BrushStyle;
  setBrushStyle?: (style: BrushStyle) => void;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  onOpenTraceModal?: () => void;
  onOpenPenPresetsModal?: () => void;
  onOpenPixelStudio?: () => void;
  onQuickSaveGlyph?: () => void;
  onOpenExportModal?: () => void;
  theme: ThemeMode;
  activePenPreset?: UserPenPreset;
  userPresets?: UserPenPreset[];
  onApplyPreset?: (preset: UserPenPreset) => void;
  position?: ToolbarPosition;
  onPositionChange?: (position: ToolbarPosition) => void;
}

export const ToolBar: React.FC<ToolBarProps> = React.memo(({
  toolMode,
  setToolMode,
  brushWidth,
  setBrushWidth,
  brushStyle = 'brush',
  setBrushStyle,
  pressureSensitivity = 'normal',
  onChangePressureSensitivity,
  smoothingIntensity = 50,
  onChangeSmoothingIntensity,
  gridSettings,
  setGridSettings,
  onOpenTraceModal,
  onOpenPenPresetsModal,
  onOpenPixelStudio,
  onQuickSaveGlyph,
  onOpenExportModal,
  theme,
  activePenPreset,
  userPresets = [],
  onApplyPreset,
  position = 'top',
  onPositionChange,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showBrushMenu, setShowBrushMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const [positionMenuAnchorStyle, setPositionMenuAnchorStyle] = useState<React.CSSProperties>({});

  const [isSmScreen, setIsSmScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  const effectivePosition: ToolbarPosition = isSmScreen ? position : 'top';
  const orientation = effectivePosition === 'top' ? 'horizontal' : 'vertical';

  const [brushAnchor, setBrushAnchor] = useState<{ top: number; left?: number; right?: number }>({ top: 100 });
  const [shapeAnchor, setShapeAnchor] = useState<{ top: number; left?: number; right?: number }>({ top: 140 });
  const [gridAnchor, setGridAnchor] = useState<{ top: number; left?: number; right?: number }>({ top: 300 });

  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const brushMenuRef = useRef<HTMLDivElement>(null);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const desktopBrushPopoverRef = useRef<HTMLDivElement>(null);
  const desktopShapePopoverRef = useRef<HTMLDivElement>(null);
  const desktopGridPopoverRef = useRef<HTMLDivElement>(null);
  const mobileBrushSheetRef = useRef<HTMLDivElement>(null);
  const mobileShapeSheetRef = useRef<HTMLDivElement>(null);
  const mobileGridSheetRef = useRef<HTMLDivElement>(null);
  const positionMenuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsSmScreen(window.innerWidth >= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!showShapeMenu && !showBrushMenu && !showGridMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const target = e.target as Node;
      if (
        showShapeMenu &&
        shapeMenuRef.current &&
        !shapeMenuRef.current.contains(target) &&
        (!desktopShapePopoverRef.current || !desktopShapePopoverRef.current.contains(target)) &&
        (!mobileShapeSheetRef.current || !mobileShapeSheetRef.current.contains(target))
      ) {
        setShowShapeMenu(false);
      }
      if (
        showBrushMenu &&
        brushMenuRef.current &&
        !brushMenuRef.current.contains(target) &&
        (!desktopBrushPopoverRef.current || !desktopBrushPopoverRef.current.contains(target)) &&
        (!mobileBrushSheetRef.current || !mobileBrushSheetRef.current.contains(target))
      ) {
        setShowBrushMenu(false);
      }
      if (
        showGridMenu &&
        gridMenuRef.current &&
        !gridMenuRef.current.contains(target) &&
        (!desktopGridPopoverRef.current || !desktopGridPopoverRef.current.contains(target)) &&
        (!mobileGridSheetRef.current || !mobileGridSheetRef.current.contains(target))
      ) {
        setShowGridMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShapeMenu(false);
        setShowBrushMenu(false);
        setShowGridMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showShapeMenu, showBrushMenu, showGridMenu]);

  const calculateAnchor = useCallback(
    (rect: DOMRect): { top: number; left?: number; right?: number } => {
      if (effectivePosition === 'top') {
        return {
          top: Math.max(40, rect.bottom + 4),
          left: Math.max(8, Math.min(window.innerWidth - 330, rect.left)),
        };
      } else if (effectivePosition === 'left') {
        return {
          top: Math.max(12, Math.min(rect.top - 16, window.innerHeight - 460)),
          left: rect.right + 6,
        };
      } else {
        return {
          top: Math.max(12, Math.min(rect.top - 16, window.innerHeight - 460)),
          right: Math.max(8, window.innerWidth - rect.left + 6),
        };
      }
    },
    [effectivePosition]
  );

  const handleSetBrushAnchor = useCallback(
    (rect: DOMRect) => {
      setBrushAnchor(calculateAnchor(rect));
    },
    [calculateAnchor]
  );

  const handleSetShapeAnchor = useCallback(
    (rect: DOMRect) => {
      setShapeAnchor(calculateAnchor(rect));
    },
    [calculateAnchor]
  );

  const handleSetGridAnchor = useCallback(
    (rect: DOMRect) => {
      setGridAnchor(calculateAnchor(rect));
    },
    [calculateAnchor]
  );

  const handleOpenPositionMenu = useCallback(
    (rect: DOMRect) => {
      if (effectivePosition === 'top') {
        setPositionMenuAnchorStyle({
          top: `${Math.max(40, rect.bottom + 4)}px`,
          left: `${Math.max(8, Math.min(window.innerWidth - 270, rect.left - 100))}px`,
        });
      } else if (effectivePosition === 'left') {
        setPositionMenuAnchorStyle({
          top: `${Math.max(12, Math.min(rect.top - 40, window.innerHeight - 200))}px`,
          left: `${rect.right + 6}px`,
        });
      } else {
        setPositionMenuAnchorStyle({
          top: `${Math.max(12, Math.min(rect.top - 40, window.innerHeight - 200))}px`,
          right: `${Math.max(8, window.innerWidth - rect.left + 6)}px`,
        });
      }
      setShowPositionMenu(true);
    },
    [effectivePosition]
  );

  const handleCyclePosition = useCallback(() => {
    if (!onPositionChange) return;
    const next: Record<ToolbarPosition, ToolbarPosition> = {
      top: 'left',
      left: 'right',
      right: 'top',
    };
    onPositionChange(next[effectivePosition]);
  }, [effectivePosition, onPositionChange]);

  const isCurrentToolShape = SHAPE_TOOLS.some((s) => s.id === toolMode);
  const [lastSelectedShape, setLastSelectedShape] = useState<ToolMode>(() => {
    if (SHAPE_TOOLS.some((s) => s.id === toolMode)) return toolMode;
    return 'circle';
  });

  useEffect(() => {
    if (SHAPE_TOOLS.some((s) => s.id === toolMode)) {
      setLastSelectedShape(toolMode);
    }
  }, [toolMode]);

  const activeShapeMode = isCurrentToolShape ? toolMode : lastSelectedShape;
  const currentShapeTool = SHAPE_TOOLS.find((s) => s.id === activeShapeMode) || SHAPE_TOOLS[0];
  const CurrentShapeIcon = currentShapeTool.icon;

  const isCustomPen = Boolean(
    activePenPreset &&
      (activePenPreset.id?.startsWith('preset-custom-') ||
        activePenPreset.id?.startsWith('custom-') ||
        activePenPreset.isCustom ||
        activePenPreset.name?.includes('カスタム') ||
        !PEN_PRESETS.some((p) => p.id === brushStyle))
  );

  const currentPenPreset =
    isCustomPen && activePenPreset
      ? activePenPreset
      : PEN_PRESETS.find((p) => p.id === brushStyle) || PEN_PRESETS[0];

  const currentPresetStyle = (
    'brushStyle' in currentPenPreset && (currentPenPreset as any).brushStyle
      ? (currentPenPreset as any).brushStyle
      : brushStyle
  ) as BrushStyle;

  const CurrentPenIcon =
    (PEN_ICONS as Record<BrushStyle, React.FC<{ className?: string }>>)[currentPresetStyle] ||
    PEN_ICONS.brush;

  const customPresets = useMemo(() => {
    return (userPresets || []).filter(
      (p) => p.isCustom || p.id?.startsWith('preset-custom-') || p.id?.startsWith('custom-')
    );
  }, [userPresets]);

  return (
    <div
      className={`${
        orientation === 'vertical'
          ? `flex flex-col items-center justify-start gap-1 sm:gap-1.5 px-1 py-2 ${
              effectivePosition === 'left' ? 'border-r' : 'border-l'
            } shrink-0 z-20 select-none transition-colors h-full w-12 sm:w-11 overflow-y-auto overflow-x-hidden no-scrollbar`
          : 'flex flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 border-b shrink-0 z-20 select-none transition-colors w-full h-auto overflow-x-auto no-scrollbar'
      } ${themeClasses.toolbarBg}`}
    >
      {/* Primary Drawing and Editing Tools */}
      <PrimaryToolButtons
        toolMode={toolMode}
        setToolMode={setToolMode}
        isCurrentToolShape={isCurrentToolShape}
        showBrushMenu={showBrushMenu}
        setShowBrushMenu={setShowBrushMenu}
        showShapeMenu={showShapeMenu}
        setShowShapeMenu={setShowShapeMenu}
        showGridMenu={showGridMenu}
        setShowGridMenu={setShowGridMenu}
        brushMenuRef={brushMenuRef}
        shapeMenuRef={shapeMenuRef}
        setBrushAnchorTop={(top) => setBrushAnchor((prev) => ({ ...prev, top }))}
        setShapeAnchorTop={(top) => setShapeAnchor((prev) => ({ ...prev, top }))}
        onSetBrushAnchor={handleSetBrushAnchor}
        onSetShapeAnchor={handleSetShapeAnchor}
        orientation={orientation}
        currentPenPreset={currentPenPreset}
        isCustomPen={isCustomPen}
        CurrentPenIcon={CurrentPenIcon}
        currentShapeTool={currentShapeTool}
        CurrentShapeIcon={CurrentShapeIcon}
        lastSelectedShape={lastSelectedShape}
        gridSettings={gridSettings}
        themeClasses={themeClasses}
      />

      {/* Divider */}
      <div
        className={`hidden sm:block ${
          orientation === 'vertical' ? 'w-5 h-[1px] mx-auto my-1' : 'w-[1px] h-5 my-auto mx-1'
        } opacity-70 ${isLight ? 'bg-stone-200' : 'bg-[#222e25]'}`}
      />

      {/* Desktop View & Snapping Toggles + Quick Actions */}
      <ViewToolButtons
        gridSettings={gridSettings}
        setGridSettings={setGridSettings}
        gridMenuRef={gridMenuRef}
        showGridMenu={showGridMenu}
        setShowGridMenu={setShowGridMenu}
        setShowBrushMenu={setShowBrushMenu}
        setShowShapeMenu={setShowShapeMenu}
        setGridAnchorTop={(top) => setGridAnchor((prev) => ({ ...prev, top }))}
        onSetGridAnchor={handleSetGridAnchor}
        orientation={orientation}
        onQuickSaveGlyph={onQuickSaveGlyph}
        onOpenTraceModal={onOpenTraceModal}
        themeClasses={themeClasses}
      />

      {/* Toolbar Dock Position Switcher (Desktop only) */}
      {onPositionChange && (
        <div
          className={`hidden sm:flex ${
            orientation === 'vertical' ? 'flex-col mt-auto pt-1' : 'flex-row items-center'
          } shrink-0`}
        >
          {/* Divider before position button */}
          <div
            className={`hidden sm:block ${
              orientation === 'vertical' ? 'w-5 h-[1px] mx-auto my-1' : 'w-[1px] h-5 my-auto mx-1'
            } opacity-70 ${isLight ? 'bg-stone-200' : 'bg-[#222e25]'}`}
          />

          <button
            ref={positionMenuBtnRef}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleOpenPositionMenu(rect);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCyclePosition();
            }}
            className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
              showPositionMenu ? themeClasses.activeTool : themeClasses.activeToolHover
            }`}
            title={`ツールバー配置を変更 (現在: ${
              effectivePosition === 'top' ? '上部' : effectivePosition === 'left' ? '左側' : '右側'
            }) [右クリックで順次切替]`}
            aria-label="ツールバーの配置位置を変更"
          >
            {effectivePosition === 'top' && <PanelTop className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />}
            {effectivePosition === 'left' && <PanelLeft className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />}
            {effectivePosition === 'right' && <PanelRight className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />}
          </button>
        </div>
      )}

      {/* Toolbar Position Selector Popover */}
      {showPositionMenu && isSmScreen && onPositionChange && (
        <ToolbarPositionMenu
          isOpen={showPositionMenu}
          onClose={() => setShowPositionMenu(false)}
          position={effectivePosition}
          onPositionChange={onPositionChange}
          anchorStyle={positionMenuAnchorStyle}
          themeClasses={themeClasses}
          isLight={isLight}
        />
      )}

      {/* Desktop Brush Popover */}
      {showBrushMenu && isSmScreen && (
        <DesktopBrushMenuPopover
          isOpen={showBrushMenu && isSmScreen}
          anchorTop={brushAnchor.top}
          anchorLeft={brushAnchor.left}
          anchorRight={brushAnchor.right}
          onClose={() => setShowBrushMenu(false)}
          brushStyle={brushStyle}
          setBrushStyle={setBrushStyle}
          brushWidth={brushWidth}
          setBrushWidth={setBrushWidth}
          setToolMode={setToolMode}
          pressureSensitivity={pressureSensitivity}
          onChangePressureSensitivity={onChangePressureSensitivity}
          smoothingIntensity={smoothingIntensity}
          onChangeSmoothingIntensity={onChangeSmoothingIntensity}
          activePenPreset={activePenPreset}
          customPresets={customPresets}
          onApplyPreset={onApplyPreset}
          onOpenPenPresetsModal={onOpenPenPresetsModal}
          onOpenPixelStudio={onOpenPixelStudio}
          themeClasses={themeClasses}
          isLight={isLight}
          popoverRef={desktopBrushPopoverRef}
        />
      )}

      {/* Desktop Shape Popover */}
      {showShapeMenu && isSmScreen && (
        <DesktopShapeMenuPopover
          isOpen={showShapeMenu && isSmScreen}
          anchorTop={shapeAnchor.top}
          anchorLeft={shapeAnchor.left}
          anchorRight={shapeAnchor.right}
          onClose={() => setShowShapeMenu(false)}
          toolMode={toolMode}
          setToolMode={setToolMode}
          setLastSelectedShape={setLastSelectedShape}
          themeClasses={themeClasses}
          isLight={isLight}
          popoverRef={desktopShapePopoverRef}
        />
      )}

      {/* Desktop Grid Settings Popover */}
      {showGridMenu && isSmScreen && (
        <DesktopGridMenuPopover
          isOpen={showGridMenu && isSmScreen}
          anchorTop={gridAnchor.top}
          anchorLeft={gridAnchor.left}
          anchorRight={gridAnchor.right}
          onClose={() => setShowGridMenu(false)}
          gridSettings={gridSettings}
          setGridSettings={setGridSettings}
          themeClasses={themeClasses}
          isLight={isLight}
          popoverRef={desktopGridPopoverRef}
        />
      )}

      {/* Mobile Brush Presets Drawer (Bottom Sheet) */}
      <MobileBrushMenuSheet
        isOpen={showBrushMenu && !isSmScreen}
        onClose={() => setShowBrushMenu(false)}
        sheetRef={mobileBrushSheetRef}
        themeClasses={themeClasses}
        isLight={isLight}
        onOpenPenPresetsModal={onOpenPenPresetsModal}
        customPresets={customPresets}
        activePenPreset={activePenPreset}
        onApplyPreset={onApplyPreset}
        setToolMode={setToolMode}
        PEN_ICONS={PEN_ICONS}
        brushStyle={brushStyle}
        setBrushStyle={setBrushStyle}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        pressureSensitivity={pressureSensitivity}
        onChangePressureSensitivity={onChangePressureSensitivity}
        smoothingIntensity={smoothingIntensity}
        onChangeSmoothingIntensity={onChangeSmoothingIntensity}
      />

      {/* Mobile Shapes Selection Drawer (Bottom Sheet) */}
      <MobileShapeMenuSheet
        isOpen={showShapeMenu && !isSmScreen}
        onClose={() => setShowShapeMenu(false)}
        sheetRef={mobileShapeSheetRef}
        themeClasses={themeClasses}
        isLight={isLight}
        toolMode={toolMode}
        setToolMode={setToolMode}
        setLastSelectedShape={setLastSelectedShape}
        SHAPE_TOOLS={SHAPE_TOOLS}
      />

      {/* Mobile Grid Settings Drawer (Bottom Sheet) */}
      <MobileGridMenuSheet
        isOpen={showGridMenu && !isSmScreen}
        onClose={() => setShowGridMenu(false)}
        sheetRef={mobileGridSheetRef}
        themeClasses={themeClasses}
        isLight={isLight}
        gridSettings={gridSettings}
        setGridSettings={setGridSettings}
        onOpenTraceModal={onOpenTraceModal}
        onOpenPixelStudio={onOpenPixelStudio}
        onQuickSaveGlyph={onQuickSaveGlyph}
        onOpenExportModal={onOpenExportModal}
      />
    </div>
  );
});

ToolBar.displayName = 'ToolBar';
export default ToolBar;
