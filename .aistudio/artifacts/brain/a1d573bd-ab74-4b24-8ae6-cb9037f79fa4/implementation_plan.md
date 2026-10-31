# ToolBar Component Modularization & Architecture Refactoring

Refactor the oversized `src/components/ToolBar.tsx` (~1,420 lines, ~50KB) into clean, focused subcomponents under `src/components/toolbar/`, reducing each file to under 350 lines while preserving 100% backward compatibility and zero regression in functionality.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following two key decisions:
> 1. **Target**: Refactor `ToolBar.tsx` and its popover/menu subcomponents first.
> 2. **Organization**: Co-located subfolders (`src/components/toolbar/`) with a backward-compatible index/re-export structure.

- **Confirmed Decision 1**: Extract shared toolbar constants (`SHAPE_TOOLS`, `PEN_ICONS`, `VERTICAL_GUIDES`, `JAPANESE_GUIDES`, `PRESSURE_MODES`, `PillIcon`) into `src/components/toolbar/toolbarConstants.ts`.
- **Confirmed Decision 2**: Extract large desktop popover menus into dedicated components:
  - `DesktopBrushMenuPopover.tsx` (~300 lines)
  - `DesktopShapeMenuPopover.tsx` (~140 lines)
  - `DesktopGridMenuPopover.tsx` (~320 lines)
- **Confirmed Decision 3**: Extract primary tool buttons and view action groups into `PrimaryToolButtons.tsx` and `ViewToolButtons.tsx`.
- **Confirmed Decision 4**: Keep `src/components/ToolBar.tsx` as a slim orchestrator (~120–160 lines) and re-export from `src/components/toolbar/index.ts` for full backwards compatibility.

---

## 1. Overview & Core Concept

- **What It Does**: Modularizes the application's central tool management UI, separating the orchestrator, tool buttons, and desktop popover configuration menus (Brush/Pen styles, 20 Geometric shapes, Grid/Guides/Snapping settings).
- **Key Value**: 
  - Prevents accidental regressions when editing pen settings or shape definitions.
  - Improves maintainability and code readability within AI Studio.
  - Eliminates the monolithic 1,420-line file while maintaining 100% parity of all shortcuts, responsiveness, and state.

---

## 2. Component Hierarchy & Module Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        src/components/ToolBar.tsx                      │
│                  (Slim Orchestrator ~140 lines)                        │
└───────┬───────────────────┬───────────────────┬────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐┌──────────────────┐┌────────────────────────────────┐
│ toolbarConstants ││PrimaryToolButtons││ ViewToolButtons & QuickActions │
│ • SHAPE_TOOLS    ││ • Select (V)     ││ • Grid Toggle (Anchor)         │
│ • PEN_ICONS      ││ • Node (A)       ││ • Snap to Grid (Magnet)        │
│ • Guides arrays  ││ • Pen (P)        ││ • Metrics Lines (Eye)          │
│ • Pressure modes ││ • Brush (Anchor) ││ • Ruler Bars (Ruler)           │
└──────────────────┘│ • Shape (Anchor) ││ • Cursor Crosshair             │
                    │ • Eraser (E)     ││ • Quick Save / Trace Trigger   │
                    │ • Ruler (R)      │└────────────────────────────────┘
                    │ • Hand (H)       │
                    └──────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐┌──────────────────┐┌────────────────────────────────┐
│ Desktop Popovers ││ Desktop Popovers ││ Desktop Popovers               │
│ DesktopBrushMenu ││ DesktopShapeMenu ││ DesktopGridMenuPopover         │
│ Popover (~300 L) ││ Popover (~140 L) ││ (~320 L)                       │
│ • Preset list    ││ • 20 Shapes grid ││ • Size & opacity sliders       │
│ • Pressure grid  ││ • Shape preview  ││ • Vertical & Japanese guides   │
│ • Smoothing bar  ││ • Close handle   ││ • Body/Kana frame toggles      │
└──────────────────┘└──────────────────┘└────────────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Existing Mobile Sheets (Already modularized):                          │
│ • MobileBrushMenuSheet   • MobileShapeMenuSheet  • MobileGridMenuSheet │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subcomponent Breakdown

### 1. `src/components/toolbar/toolbarConstants.ts`
- **Exports**:
  - `PEN_ICONS`: Record mapping `BrushStyle` to Lucide icon components.
  - `PillIcon`: Custom capsule SVG icon.
  - `SHAPE_TOOLS`: Complete 20 geometric shapes with id, label, and icon.
  - `PRESSURE_MODES`: High / Normal / Low / Off sensitivity descriptors.
  - `VERTICAL_GUIDES`: None / Center / Thirds / Quarters / Eighths patterns.
  - `JAPANESE_GUIDES`: None / Cross / Tian / Jiugong / Sixteen / Mi grid guides.

### 2. `src/components/toolbar/DesktopBrushMenuPopover.tsx`
- **Responsibilities**:
  - User custom pen presets list (`customPresets`).
  - Standard pen presets list (`PEN_PRESETS`).
  - Pixel font studio launcher button.
  - Stylus / Apple Pencil pressure sensitivity selector grid.
  - Real-time hand-jitter smoothing intensity slider and preset chips.
- **Props**: `isOpen`, `anchorTop`, `onClose`, `brushStyle`, `setBrushStyle`, `brushWidth`, `setBrushWidth`, `pressureSensitivity`, `onChangePressureSensitivity`, `smoothingIntensity`, `onChangeSmoothingIntensity`, `activePenPreset`, `customPresets`, `onApplyPreset`, `onOpenPenPresetsModal`, `onOpenPixelStudio`, `themeClasses`, `isLight`.

### 3. `src/components/toolbar/DesktopShapeMenuPopover.tsx`
- **Responsibilities**:
  - Displays the 3 categorised sections of geometric shapes (Basic/Curved, Polygons/Lines, Ornaments/Stars).
  - Handles shape selection and updates `lastSelectedShape` and `toolMode`.
- **Props**: `isOpen`, `anchorTop`, `onClose`, `toolMode`, `setToolMode`, `setLastSelectedShape`, `themeClasses`, `isLight`.

### 4. `src/components/toolbar/DesktopGridMenuPopover.tsx`
- **Responsibilities**:
  - Grid on/off and snap-to-grid toggle buttons.
  - Grid size numeric input, steppers (- / +), range slider (5-200), and quick presets (10, 25, 50, 100, 128).
  - Grid opacity slider and presets (極薄, 淡め, 標準, くっきり).
  - Vertical guides selector (5 options).
  - Japanese guide patterns selector (6 options).
  - Kanji body frame (85%), Kana frame (78%), and vertical center axis toggles.
  - Shortcut helper footer.
- **Props**: `isOpen`, `anchorTop`, `onClose`, `gridSettings`, `setGridSettings`, `themeClasses`, `isLight`.

### 5. `src/components/toolbar/PrimaryToolButtons.tsx`
- **Responsibilities**:
  - Renders the primary tool stack: Select, Node, Pen, Brush button (with popover anchor), Shape button (with popover anchor), Eraser, Ruler, Hand (desktop), and Mobile Grid button.
- **Props**: Tool modes, active icons, anchor setter handlers, click/context menu handlers, `themeClasses`.

### 6. `src/components/toolbar/ViewToolButtons.tsx`
- **Responsibilities**:
  - Desktop-only view & snapping toggles (Grid toggle with anchor, Snap magnet, Metrics eye, Outer ruler bars, Cursor crosshair).
  - Desktop quick action buttons (Save glyph, Trace overlay modal).
- **Props**: `gridSettings`, `setGridSettings`, `gridMenuRef`, `setGridAnchorTop`, `setShowGridMenu`, `onQuickSaveGlyph`, `onOpenTraceModal`, `themeClasses`.

### 7. Refactored `src/components/ToolBar.tsx` (Slim Host)
- **Responsibilities**:
  - Owns UI state: `showShapeMenu`, `showBrushMenu`, `showGridMenu`, `brushAnchorTop`, `shapeAnchorTop`, `gridAnchorTop`, `isSmScreen`, `lastSelectedShape`.
  - Outside click listeners (`mousedown`, `touchstart`) and window resize listener.
  - Assembles `PrimaryToolButtons`, `ViewToolButtons`, the 3 desktop popovers, and the 3 mobile sheets.
  - Total length: ~140 lines (down from 1,422 lines).

### 8. `src/components/toolbar/index.ts`
- Re-exports `ToolBar`, `ToolBarProps`, and constants for seamless imports across the app.

---

## 4. Verification Plan

### Automated Tests
- Run existing test suite:
  ```bash
  npm test
  ```
- Ensure all 47 tests pass without error.

### Type & Lint Verification
- Run TypeScript build check:
  ```bash
  compile_applet
  lint_applet
  ```
- Ensure 0 errors, no missing imports, and strict type adherence.

### Manual Verification
- Test all tool modes (Select, Node, Pen, Brush, Shape, Eraser, Ruler, Hand).
- Open Brush popover: change preset, adjust pressure sensitivity, adjust smoothing slider.
- Open Shape popover: pick various shapes and draw them on canvas.
- Open Grid popover: toggle grid, change size, toggle vertical and Japanese guides, toggle frames.
- Verify mobile sheet behaviors on narrow screen sizes.
