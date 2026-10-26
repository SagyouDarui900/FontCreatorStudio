# UI & Canvas Visibility Repair Implementation Plan

Restore full canvas rendering across all viewport sizes, integrate a dedicated mobile bottom navigation bar with seamless tab switching, and resolve reported UI issues (UI-01 through UI-13) across CSS, HTML, theme tokens, and accessibility.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive interview:
> - **Mobile View Layout**: Show canvas first with a bottom navigation bar to switch between Canvas ("作図"), Glyph Grid ("文字一覧"), Metrics ("メトリクス"), and Radicals ("部首").
> - **Desktop Dialog Backdrops**: Solid semi-opaque dark background (`bg-black/75` / `bg-stone-950/80`) for maximum rendering performance and zero transparency artifacts.
> - **Range Sliders**: Dynamic accent colors matching the active theme (Sepia warm amber, Warm orange, Nord frost cyan, Monochrome zinc, Emerald green).

---

## 1. Overview & Core Concept

- **What It Does**: Resolves the viewport height collapse and drawer overlay that hid the drawing canvas, restores quick-access mobile navigation tabs, and upgrades mobile/desktop UX to meet WCAG accessibility, proper safe-area-inset spacing, and cohesive 6-theme styling.
- **Target Audience / Persona**: Font designers, calligraphers, and typographers working across smartphone (iPhone/Android touch), iPad/tablet (Pencil), and desktop screens.
- **Key Value**: Immediate access to the drawing canvas on launch, zero layout clipping or white flash on reload, and consistent theme presentation without visual regressions.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Launch & Mobile Viewport**: 
   - App loads directly with the active character canvas front-and-center.
   - A bottom navigation bar (`h-14` with `env(safe-area-inset-bottom)`) provides one-tap switching between Canvas ("作図"), Glyph List ("文字一覧"), Metrics ("メトリクス"), and Radicals ("部首").
2. **Desktop Viewport**:
   - Left sidebar displays the glyph grid cleanly without covering the drawing stage.
   - Dialog modals open over solid semi-opaque dark backdrops (`bg-black/75`) ensuring crystal-clear text legibility and rapid GPU rendering.
3. **Theme & Input Elements**:
   - Range sliders reflect the selected theme's accent color (e.g. amber for Sepia, cyan for Nord, orange for Warm).
   - Reloading in Dark or Nord mode preserves the dark background with zero white flash (FOUC).

### Visual Tokens & Theme Matrix
- **Light**: `#f7faf8` base with `#059669` emerald accent.
- **Dark**: `#0f1712` base with `#10b981` mint emerald accent.
- **Sepia**: `#f4ede2` base with `#854d0e` amber accent.
- **Warm**: `#fbf3e8` base with `#ea580c` sunset orange accent.
- **Nord**: `#2e3440` base with `#88c0d0` frost blue-cyan accent.
- **Monochrome**: `#f4f4f5` / `#09090b` high-contrast neutral slate/zinc.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Restoring Canvas via CSS Flexbox `min-h-0` & Default Drawer State**
  - *Chosen Approach*: Add `min-h-0` to all intermediate `flex-1 flex-col` wrappers in `App.tsx` and ensure `showGridDrawer` is `false` on viewports `< 1024px` by default.
  - *Why*: In CSS Flexbox, nested flex column children default to `min-height: auto`, which causes canvas containers to collapse to 0px height in responsive layouts. Setting `min-h-0` and defaulting mobile to canvas-view ensures the canvas is always visible and measured correctly.
- **Decision 2: Solid Semi-Opaque Desktop Backdrops (`bg-black/75`)**
  - *Chosen Approach*: Replace problematic global CSS `backdrop-filter: none !important` media query rules with clean solid modal backdrops (`bg-black/75`).
  - *Why*: Eliminates GPU overhead and prevents modal content transparency glitches on desktop browsers while keeping mobile touch overlays lightweight.
- **Decision 3: FOUC Prevention via Inline `<head>` Theme Guard**
  - *Chosen Approach*: Place a micro `<script>` in `index.html` `<head>` that reads `localStorage.getItem('font_editor_theme_mode')` and applies `data-theme` and `.dark` before first DOM render.
  - *Why*: Completely stops the jarring 100ms white screen flash when dark mode users reload.

---

## 4. Technical Architecture & System Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Header                           │
├────────────────────┬───────────────────────────────────┬───────────────┤
│                    │     ToolBar (Pens, Width, Undo)   │               │
│                    ├───────────────────────────────────┤               │
│  GlyphGrid Drawer  │                                   │ MetricsPanel  │
│  (Desktop: side;   │        GlyphCanvas (SVG Stage)    │ (Side /       │
│   Mobile: sheet)   │    • min-h-0 flex-1 height flow   │  Overlay)     │
│                    │    • Dynamic theme range sliders  │               │
│                    │    • Viewport clamp / touch loupe │               │
├────────────────────┴───────────────────────────────────┴───────────────┤
│  Bottom Navigation Bar (Mobile: Canvas | Grid | Metrics | Radicals)    │
│  Bottom Floating Toast: bottom-[calc(64px+env(safe-area-inset-bottom))]│
└────────────────────────────────────────────────────────────────────────┘
```

### Action Items & File Breakdown

1. **`src/App.tsx`**:
   - Fix flexbox height propagation: add `min-h-0` to workspace and canvas wrapper containers.
   - Set mobile default tab to `'canvas'` so the grid drawer does not mask the canvas on startup.
   - Implement the mobile bottom navigation bar (`sm:hidden fixed bottom-0 left-0 right-0 z-40`) with full ARIA accessibility (`aria-label`, `aria-pressed`).
   - Pass missing layout flags (`showGridDrawer`, `showMetricsDrawer`, `showRadicals`, `isZenMode`) to `GlyphCanvas`.

2. **`index.html` (UI-01, UI-12, UI-13)**:
   - Update viewport meta to `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`.
   - Add inline theme script in `<head>` to prevent dark-theme FOUC flash on reload.
   - Add OpenGraph `og:locale` (`ja_JP`), `og:site_name`, canonical, and Schema.org `WebApplication` structured data.

3. **`src/index.css` (UI-05, UI-06, UI-11)**:
   - Consolidate duplicate `.jp-wrap` rules into one clean definition.
   - Remove conflicting `@media (min-width: 769px)` backdrop-filter suppression; standardize modal overlay class (`bg-black/75`).
   - Define CSS variables `--slider-thumb-color` and `--slider-track-color` across all theme blocks (`[data-theme="..."]`) so range sliders track active theme accent colors.

4. **`src/components/Toast.tsx` & `src/components/OfflineIndicator.tsx` (UI-02, UI-03, UI-09)**:
   - `Toast.tsx`: Update position to `bottom-[calc(68px+env(safe-area-inset-bottom,0px))] sm:bottom-6`.
   - `Toast.tsx`: Replace `AlertCircle` with `AlertTriangle` for warnings.
   - `OfflineIndicator.tsx`: Move to `bottom-[calc(72px+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-4 z-40` avoiding collision with toast and bottom navigation.

5. **`src/components/canvas/overlays/CanvasTouchLoupe.tsx` (UI-04)**:
   - Clamp position against `window.visualViewport?.width ?? window.innerWidth` and `window.visualViewport?.height ?? window.innerHeight`.

6. **`src/components/canvas/overlays/MobileAuxMenuDrawer.tsx` (UI-07)**:
   - Replace hardcoded `isLight ? ... : ...` with `themeClasses.modalBg`, `themeClasses.border`, and `themeClasses.textPrimary`.

7. **`src/components/ErrorBoundary.tsx` (UI-08)**:
   - Add theme detection using `localStorage.getItem('font_editor_theme_mode')` or CSS theme tokens to render seamless dark/nord/sepia crash fallback views.
