import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ToolMode,
  GridSettings,
  BrushStyle,
  UserPenPreset,
  JapaneseGuidePattern,
  VerticalGuidePattern,
} from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { PEN_PRESETS } from '../utils/pathUtils';
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
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showBrushMenu, setShowBrushMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [brushAnchorTop, setBrushAnchorTop] = useState(100);
  const [shapeAnchorTop, setShapeAnchorTop] = useState(140);
  const [gridAnchorTop, setGridAnchorTop] = useState(300);
  const [isSmScreen, setIsSmScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const brushMenuRef = useRef<HTMLDivElement>(null);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const mobileBrushSheetRef = useRef<HTMLDivElement>(null);
  const mobileShapeSheetRef = useRef<HTMLDivElement>(null);
  const mobileGridSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsSmScreen(window.innerWidth >= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        shapeMenuRef.current &&
        !shapeMenuRef.current.contains(target) &&
        (!mobileShapeSheetRef.current || !mobileShapeSheetRef.current.contains(target))
      ) {
        setShowShapeMenu(false);
      }
      if (
        brushMenuRef.current &&
        !brushMenuRef.current.contains(target) &&
        (!mobileBrushSheetRef.current || !mobileBrushSheetRef.current.contains(target))
      ) {
        setShowBrushMenu(false);
      }
      if (
        gridMenuRef.current &&
        !gridMenuRef.current.contains(target) &&
        (!mobileGridSheetRef.current || !mobileGridSheetRef.current.contains(target))
      ) {
        setShowGridMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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
      className={`flex sm:flex-col items-center justify-start gap-1 px-1 sm:px-1 py-1 sm:py-1 border-t sm:border-t-0 sm:border-r shrink-0 sm:shrink z-20 select-none transition-colors w-full sm:w-11 md:w-12 h-auto sm:h-full sm:min-h-0 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto no-scrollbar ${themeClasses.toolbarBg}`}
    >
      {/* Mobile Backdrop for Popups */}
      {(showBrushMenu || showShapeMenu || showGridMenu) && !isSmScreen && (
        <div
          className="fixed inset-0 z-40 sm:hidden bg-black/50"
          onClick={() => {
            setShowBrushMenu(false);
            setShowShapeMenu(false);
            setShowGridMenu(false);
          }}
        />
      )}

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
        setBrushAnchorTop={setBrushAnchorTop}
        setShapeAnchorTop={setShapeAnchorTop}
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
        className={`hidden sm:block w-6 sm:w-7 h-[1px] my-0.5 mx-auto opacity-70 ${
          isLight ? 'bg-stone-200' : 'bg-[#222e25]'
        }`}
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
        setGridAnchorTop={setGridAnchorTop}
        onQuickSaveGlyph={onQuickSaveGlyph}
        onOpenTraceModal={onOpenTraceModal}
        themeClasses={themeClasses}
      />

      {/* Desktop Brush Popover */}
      {showBrushMenu && isSmScreen && (
        <DesktopBrushMenuPopover
          isOpen={showBrushMenu && isSmScreen}
          anchorTop={brushAnchorTop}
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
        />
      )}

      {/* Desktop Shape Popover */}
      {showShapeMenu && isSmScreen && (
        <DesktopShapeMenuPopover
          isOpen={showShapeMenu && isSmScreen}
          anchorTop={shapeAnchorTop}
          onClose={() => setShowShapeMenu(false)}
          toolMode={toolMode}
          setToolMode={setToolMode}
          setLastSelectedShape={setLastSelectedShape}
          themeClasses={themeClasses}
          isLight={isLight}
        />
      )}

      {/* Desktop Grid Settings Popover */}
      {showGridMenu && isSmScreen && (
        <DesktopGridMenuPopover
          isOpen={showGridMenu && isSmScreen}
          anchorTop={gridAnchorTop}
          onClose={() => setShowGridMenu(false)}
          gridSettings={gridSettings}
          setGridSettings={setGridSettings}
          themeClasses={themeClasses}
          isLight={isLight}
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
