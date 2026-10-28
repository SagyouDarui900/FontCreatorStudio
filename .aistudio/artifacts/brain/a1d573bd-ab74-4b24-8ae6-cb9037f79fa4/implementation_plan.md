# Implementation Plan: Bug Fixes, Pointer & State Stabilization, and Phased Decomposition

## 1. Overview & User Goals
Address high-priority bug risks and stabilization requirements identified in the latest codebase review, adhering to the strict rule of **no new features** and preserving 100% backward compatibility for all existing public APIs and re-exports.
Based on the clarifying answers:
- **Pacing**: Execute **Sprint 1 (Bug fixes and stabilization)** first, verify thoroughly, then proceed to subsequent sprints.
- **Testing**: Implement **Vitest in-memory font generation assertions** in `src/utils/font/*.test.ts`.
- **Storage Keys**: Employ **dual-read fallback** (read new `fcs_` key, fallback to legacy, write only to `fcs_`).

---

## 2. Sprint 1 Detailed Technical Plan

### A1. State Management & Single Source of Truth (`GlyphCanvas.tsx`)
- **Documented Authority**: Clarify in top-level header comments that props (`contours`, `outlineOnly`) are authoritative (controlled).
- **Controlled Outline Mode**:
  - When `propOutlineOnly` is provided, canvas treats it as source of truth and writes changes through `onChangeOutlineOnly` while keeping localStorage as an internal sync cache.
  - When `propOutlineOnly` is undefined, fall back to internal state initialized from `storageKeys.ts`.
- **Ref Updates Lifecycle**:
  - Ensure `contoursRef.current = contours` is synced reliably within `useEffect` and commit callbacks rather than arbitrary render-phase mutations.
  - Bind `onChangeContours` and `onCommitHistory` to stable mutable refs (`onChangeContoursRef`, `onCommitHistoryRef`) to eradicate stale closures across long pointer sessions.

### A2. Consolidated Tool Switch Cleanup (`useToolModeCleanup.ts` / `GlyphCanvas.tsx`)
- Consolidate all transient state resets into a single centralized cleanup routine invoked upon `toolMode` changes:
  - Active Pen: abort uncommitted nodes (`resetPen()`)
  - Marquee Selection: clear rectangular marquee box (`setMarqueeSelection(null)`)
  - Transform Session: clear active bounding box drag session (`setTransformSession(null)`)
  - Shape Creation: clear in-progress shape start/current points (`resetShapeCreation()`)
  - Smart Snap Guides: clear active guide overlays (`setActiveSnapGuides([])`)
  - Eraser: reset sweep points, SVG path string, and reticle visuals
  - Touch Loupe / Mobile Sheet: dismiss loupe and auxiliary drawer
- Provide explicit `.reset()` hooks on `usePenTool`, `useShapeCreation`, `useTransformSession`, `useCanvasEraser`.

### A3. Pointer Dispatcher Unification (`useCanvasPointerDispatcher.ts`)
- **Single Active Pointer**:
  - Track `activeDrawingPointerIdRef` during single-pointer operations (brush, eraser, pen, node drag, transform).
  - Filter out secondary pointer down/move/up events from interfering with an ongoing drawing session.
- **Strict Pointer Capture Symmetry**:
  - Guarantee that whenever `setPointerCapture(pointerId)` is acquired on `pointerDown`, it is unconditionally released on `pointerUp`, `pointerCancel`, or gesture interruption.
- **Middle-Click / Spacebar Panning**:
  - Prevent tool down handlers from activating when panning is in progress via spacebar or middle mouse button (`e.button === 1`).
- **Touch & Stylus Coexistence**:
  - Ensure stylus strokes immediately claim the active pointer slot and suppress simultaneous palm/touch events while respecting multi-touch zoom cooldowns.

### A4. Undo / Redo Granularity & History Sanitization
- **Single Commit per Interaction**:
  - Brush drawing: Exactly 1 commit history entry when stroke finishes and is vectorized on `pointerUp`.
  - Node drag / Part transform: No history commits during `pointerMove`; commit exactly once on `pointerUp` when delta has non-zero movement.
  - Eraser sweep: Commit once on `pointerUp` after all subtractions/cuts are merged into contours.
- **Glyph Switching Hygiene**:
  - Discard any uncommitted in-flight brush or shape points when the selected glyph changes so orphan contours never cross-contaminate history.

### A5. Font Export Validation & Vitest Test Suite
- **Export Pre-validation**:
  - In `src/utils/font/compilerCore.ts`, run `validateFontProject` before compilation and log actionable diagnostics.
  - Add fallback guard: Ensure `advanceWidth` defaults to `Math.max(100, project.metrics?.advanceWidth || 1000)` and is never `0` or `NaN`.
  - Validate opentype.js Path commands to ensure all closed contours properly emit `Z` (close path) without duplicate zero-length terminal segments.
  - Fix any Y-coordinate inversions (Font Y = `baselineY - Screen Y`).
- **Vitest Unit Test Suite (`src/utils/font/compilerCore.test.ts`)**:
  - Test 1: Empty project compilation yields a valid OpenType font with `.notdef` and does not throw.
  - Test 2: Single rectangle contour compiles to valid TTF ArrayBuffer (`buffer.byteLength > 512`) with correct bounding box orientation.
  - Test 3: Multiple overlapping contours compile with TrueType non-zero winding normalization.
  - Test 4: Extreme / NaN coordinates and zero advanceWidth are safely sanitized without crashing.

### A7. Centralized Storage Keys (`src/utils/storageKeys.ts`)
- Create `src/utils/storageKeys.ts` with typed keys prefixed with `fcs_`:
  - `fcs_outline_mode` (legacy: `glyph_canvas_outline_mode`)
  - `fcs_guide_assist_open` (legacy: `mojisaku_guide_assist_open`)
  - `fcs_show_subtoolbar` (legacy: `mojisaku_show_subtoolbar`)
  - `fcs_auto_union_brush` (legacy: `fontforge_auto_union_brush`)
  - `fcs_glyph_overlay` (legacy: `font_editor_glyph_overlay_v1`)
- Provide helper `getStorageItem(key, fallback)` and `setStorageItem(key, value)` implementing dual-read fallback:
  - Read `key.primary`; if null, read `key.legacy`.
  - Always write strictly to `key.primary`.

---

## 3. Roadmaps for Subsequent Sprints (2 to 4)

- **Sprint 2: `GlyphCanvas.tsx` Decomposition**:
  - Extract UI chrome hooks (`useCanvasUiChrome.ts`, `useCanvasLocalPrefs.ts`, `useToolModeCleanup.ts`).
  - Extract JSX layers and overlays into `src/components/canvas/GlyphCanvasView.tsx`.
  - Target `GlyphCanvas.tsx` to become a lean orchestrator (~800–1,200 lines).
- **Sprint 3: Grid & Heavy Modals Decomposition**:
  - Split `GlyphGrid.tsx` into `GlyphGridToolbar`, `GlyphGridCell`, `useGlyphGridFilter`.
  - Thin down `FontInfoModal`, `ExportModal`, `BatchNormalizeModal`, and `GlyphDensityHeatmapModal`.
- **Sprint 4: App Wiring & Final Hygiene**:
  - Split shortcuts and layout listeners into `useAppShortcuts.ts` and `useAppLayout.ts`.
  - Circular dependency auditing and project cleanup.

---

## 4. Verification Plan

### Automated Verification
1. `npm run typecheck` (`tsc --noEmit`): Must complete with 0 errors.
2. `npm test` (`vitest run`): All existing 32 tests plus new font compilation tests must pass 100%.
3. `npm run build`: Production Vite bundle must build cleanly.

### Manual Sanity Checks
1. Draw a single stroke with the brush -> verify stroke appears cleanly.
2. Undo -> stroke disappears; Redo -> stroke reappears.
3. Switch tool modes (Brush -> Pen -> Node -> Eraser -> Hand) -> verify no dangling temporary lines, reticles, or open sheets.
4. Export font to TTF and WOFF2 -> verify file downloads and bytes are valid.
5. Select a different glyph in the grid -> verify canvas switches cleanly without state leakage.
