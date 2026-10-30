# Implementation Plan: AI Studio Modularization & Review Refactoring (Phase 2)

Refactor high-priority architectural hotspots identified in the code review to optimize developer velocity, reduce file sizes, prevent state desync in long pointer sessions, and ensure robust maintainability within AI Studio.

## Completed Sprints

### Sprint 1: Critical Bug Fixes & Stored State Migration (Completed)
- Dual-read fallback migration for `fcs_` localStorage keys.
- Font compilation validation against non-finite metrics and open contours.
- Baseline 37 unit tests for path utilities and vector boolean ops.

### Sprint 2: Font Compilation & Vector Boolean Extraction (Completed)
- Modularized `fontCompiler.ts` into `src/utils/font/` submodules.
- Extracted paper.js vector boolean algorithms into `src/utils/boolean/`.
- Strengthened export validation with in-memory assertions.

### Sprint 3: Modal Decomposition (Completed)
- Split `ExportModal.tsx`, `FontInfoModal.tsx`, `MojikumiSettingsModal.tsx`, and `BatchTransformModal.tsx`.
- Extracted shared modal tabs into focused subcomponents.

### Sprint 4: Layout & Shortcuts Extraction (Completed)
- Extracted `useAppLayout.ts`, `useAppShortcuts.ts`.
- Created `AppBottomBar.tsx` and `AppMobileNav.tsx`.
- Reduced `App.tsx` from 934 to ~640 lines.

## Phase 2: Canvas & Brush Core Decomposition (Completed)

### 1. `src/types.ts` Domain Splitting
- [x] Created `src/types/geometry.ts` (`Point`, `StrokePoint`, `NodeType`, `BezierNode`, `PathContour`).
- [x] Created `src/types/brush.ts` (`BrushStyle`, `PenPresetInfo`, `PressureCurvePoint`, `PressureCurveConfig`, `UserPenPreset`).
- [x] Created `src/types/glyph.ts` (`PixelDotShape`, `PixelGlyphData`, `GlyphData`, `CustomGuideline`, `SnapMetrics`, `RulerMeasurement`, `SnapGuideLine`).
- [x] Created `src/types/canvas.ts` (`ToolMode`, `ShapeType`, `ShapePreset`, `GlyphOverlaySettings`, `TraceSettings`, `JapaneseGuidePattern`, `VerticalGuidePattern`, `GridSettings`).
- [x] Created `src/types/mojikumi.ts` (`OpenTypeFeatureLigature`, `VerticalWritingGlyphSub`, `MojikumiPresetId`, `KinsokuSetId`, `BurasagariMode`, `KinsokuAdjustMode`, `ParagraphIndentPresetId`, `MojikumiRuleItem`, `MojikumiTable`, `MojikumiConfig`, `PaltGlyphMetric`, `VpalGlyphMetric`, `ProportionalMetricsConfig`, `OpenTypeFeaturesConfig`).
- [x] Created `src/types/font.ts` (`FontMetadata`, `KanjiRadical`, `RadicalPlacement`, `PartCategory`, `CustomPart`, `CharCategory`, `PixelFontProjectSettings`, `FontProject`).
- [x] Created `src/types/index.ts` re-exporting all domain modules.
- [x] Preserved 100% backward compatibility with `src/types.ts` re-exporting `src/types/index.ts`.

### 2. `useBrushDrawing.ts` Logic Separation
- [x] Created `src/utils/brush/brushPressure.ts` with hardware stylus calibration (`calibrateStylusPressure`), mouse velocity EMA dynamics (`computeMouseSpeedPressure`), and asymmetric pointer responsiveness blending (`blendStrokePressure`).
- [x] Created `src/utils/brush/brushTapDetection.ts` with stroke terminal lift-off jitter trimming (`trimTerminalJitter`) and accidental stray touch rejection with deliberate stylus pressure bypass (`isAccidentalStrayTap`).
- [x] Created `src/utils/brush/brushOutlinePreview.ts` with dynamic smoothing calculation (`calculateEffectiveSmoothing`) and 60fps live preview decimation (`getDecimatedPointsForLivePreview`).
- [x] Created `src/utils/brush/index.ts` barrel export.
- [x] Refactored `src/hooks/useBrushDrawing.ts` from 563 lines to modular ~365 lines.

### 3. `GlyphCanvas.tsx` Thinning & Cleanup Consolidation
- [x] Created `src/components/canvas/hooks/useToolModeCleanup.ts` consolidating tool switch teardown, cross-glyph hygiene, and lost pointer capture recovery.
- [x] Created `src/components/canvas/hooks/useCanvasContourActions.ts` extracting straight ruler stroke generation and full canvas clearing.
- [x] Created `src/components/canvas/hooks/index.ts` barrel export.
- [x] Refactored `GlyphCanvas.tsx` removing duplicate cleanup tables and simplifying hook dependencies.

### 4. Drawing Core Robustness & Feedback Fixes
- [x] **Tool switch cleanup**: Added explicit `resetBrushDrawing()` when `toolMode !== 'brush'` in `useToolModeCleanup`.
- [x] **Dispatcher reset on tool change**: Added `useEffect` in `useCanvasPointerDispatcher` resetting `activeDrawingPointerIdRef`, touch caches, and pointer maps upon `toolMode` change.
- [x] **Stroke config snapshotting**: Added `strokeBrushConfigRef` in `useBrushDrawing` snapshotting size, style, sensitivity, and smoothing on `handleBrushPointerDown`.
- [x] **Decimated live preview**: Integrated `getDecimatedPointsForLivePreview` when stroke length exceeds 24 points to guarantee 60/120fps live preview on dense strokes.
- [x] **Pointer capture fallback**: Cleared `activeDrawingPointerIdRef` whenever active touch count reaches 0 or capture is lost.

### 5. Verification & Testing
- [x] Added `src/utils/brush/brushTapDetection.test.ts` with 10 comprehensive tests.
- [x] Vitest suite: 4 test suites, 47/47 passing tests.
- [x] TypeScript verification: `tsc --noEmit` passed with 0 errors.
- [x] Production compilation: `compile_applet` passed successfully.
