import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FontProject, GlyphData, PathContour } from '../../../types';
import { compileFont, balanceProjectGlyphMargins, validateFontProject, stripInvalidPixelData } from '../../../utils/font';
import { DEFAULT_ASCENDER, DEFAULT_DESCENDER, DEFAULT_UPM } from '../../../utils/font/constants';
import { pixelGridToContours, normalizePixelGrid } from '../../../utils/pixelFontUtils';
import { getContoursBoundingBox } from '../../../utils/path';
import { commitChangedGlyphHistory } from '../../../utils/historyHelper';
import { isLightTheme } from '../../../utils/theme';
import { TestPreviewModalProps } from '../types';
import { transformGlyphContours } from '../previewUtils';
import { useIsTopModal } from '../../modals/ModalStackFrame';
// Persisted editing state lives in ./persistedState (no heavy imports) so
// AppModalsHost can hold it without pulling this hook's compileFont
// dependency into the startup bundle. Re-exported here for existing users.
import {
  createDefaultTestPreviewPersistedState,
  type TestPreviewPersistedState,
} from '../persistedState';
export { createDefaultTestPreviewPersistedState, type TestPreviewPersistedState };

// ---------------------------------------------------------------------------
// Preview-only compilation (review item 9).
//
// The compile effect used to depend on the whole `project`, so every edit —
// even moving one node of a glyph that never appears in the preview text —
// re-ran full validation + unionContours + winding normalization +
// opentype.js construction + FontFace loading for every glyph.
//
// The preview only ever renders `testText` (see PreviewCanvas: the only
// string rendered with the compiled font family is the test text, including
// waterfall mode). So the compiled font only needs the glyphs that can
// affect how that text is shaped:
//
// - the characters in the text itself;
// - vertical-writing derivations: compileFont derives a vertical-form glyph
//   from its horizontal source (and registers a `vert` substitution), so
//   when the text contains a derivation source or its vertical target, both
//   glyphs are needed. The pair table below mirrors the hardcoded
//   `verticalDerivations` in `src/utils/font/compilerCore.ts` — keep them
//   in sync. User-configured vertical substitutions are handled the same
//   way from `project.openTypeFeatures`;
// - ligature substitutes: when every input character of an enabled
//   ligature appears in the text, the substitute glyph must be present;
// - kerning: a kern pair only affects rendering when both glyphs are in
//   the text, so pairs touching other glyphs are dropped below. The same
//   holds for the palt-derived pairs compileFont generates internally:
//   they are built from the subset project, and a pair is only registered
//   when both glyphs exist in the compiled font.
//
// Anything else (metadata, unitsPerEm, ascender, pixel settings, palt /
// mojikumi config) is carried over unchanged into the subset project, so a
// project-wide settings change still recompiles — with the subset, not the
// whole project. A full compile is only kept when the subset would cover
// almost all glyphs (>= 80%), where subsetting saves nothing.
// ---------------------------------------------------------------------------

// Per-glyph adjust ranges, shared by the sliders, the number inputs, the
// micro-adjust buttons and auto-centering (M6, M10). The sliders already
// used these bounds; the other controls did not.
export const ADJUST_OFFSET_MIN = -200;
export const ADJUST_OFFSET_MAX = 200;
export const ADJUST_SCALE_MIN = 40;
export const ADJUST_SCALE_MAX = 200;

export function clampAdjustOffset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(ADJUST_OFFSET_MIN, Math.min(ADJUST_OFFSET_MAX, Math.round(value)));
}

export function clampAdjustScale(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(ADJUST_SCALE_MIN, Math.min(ADJUST_SCALE_MAX, Math.round(value)));
}

// Left/right margin balance threshold, shared by the footer inspector and
// the char-box warning in PreviewCanvas (M11). Both read the same
// getGlyphMetric diff; they used to disagree (20 in the footer, 25 on the
// canvas). 20 is the footer's value and the stricter one, so the canvas
// now warns whenever the footer reports an imbalance.
export const GLYPH_MARGIN_BALANCE_THRESHOLD = 20;

/** Vertical-form derivations, mirroring `verticalDerivations` in compilerCore.ts. */
export const VERTICAL_DERIVATION_PAIRS: ReadonlyArray<{
  sourceUnicode: number;
  targetUnicode: number;
}> = [
  { sourceUnicode: 0x30fc, targetUnicode: 0xfe31 }, // 長音符 ー -> ︱
  { sourceUnicode: 0x2015, targetUnicode: 0xfe33 }, // ダッシュ ― -> ︳
  { sourceUnicode: 0x300c, targetUnicode: 0xfe41 }, // 鉤括弧 「 -> ﹁
  { sourceUnicode: 0x300d, targetUnicode: 0xfe42 }, // 鉤括弧 」 -> ﹂
  { sourceUnicode: 0x300e, targetUnicode: 0xfe43 }, // 二重鉤括弧 『 -> ﹃
  { sourceUnicode: 0x300f, targetUnicode: 0xfe44 }, // 二重鉤括弧 』 -> ﹄
  { sourceUnicode: 0xff08, targetUnicode: 0xfe35 }, // 丸括弧 （ -> ︵
  { sourceUnicode: 0xff09, targetUnicode: 0xfe36 }, // 丸括弧 ） -> ︶
  { sourceUnicode: 0x3010, targetUnicode: 0xfe3b }, // 隅付き括弧 【 -> ︻
  { sourceUnicode: 0x3011, targetUnicode: 0xfe3c }, // 隅付き括弧 】 -> ︼
  { sourceUnicode: 0x3001, targetUnicode: 0xfe11 }, // 読点 、 -> ︑
  { sourceUnicode: 0x3002, targetUnicode: 0xfe12 }, // 句点 。 -> ︒
  { sourceUnicode: 0x2026, targetUnicode: 0xfe19 }, // 三点リーダー … -> ︙
  { sourceUnicode: 0x301c, targetUnicode: 0xfe4f }, // 波ダッシュ 〜 -> ︴
];

/** Code points in a string, as a set (surrogate pairs count as one). */
export function extractPreviewUnicodes(text: string): Set<number> {
  const unicodes = new Set<number>();
  for (const ch of Array.from(text)) {
    const code = ch.codePointAt(0);
    if (code !== undefined) unicodes.add(code);
  }
  return unicodes;
}

/**
 * Unicodes the preview font needs: the text itself plus every glyph that
 * can change how that text is shaped (vertical derivations, configured
 * vertical substitutions, ligature substitutes). Kerning adds no glyphs:
 * a pair only applies when both sides are already in the text.
 */
export function collectPreviewGlyphUnicodes(
  testText: string,
  project: FontProject
): Set<number> {
  const needed = extractPreviewUnicodes(testText);
  for (const { sourceUnicode, targetUnicode } of VERTICAL_DERIVATION_PAIRS) {
    if (needed.has(sourceUnicode) || needed.has(targetUnicode)) {
      needed.add(sourceUnicode);
      needed.add(targetUnicode);
    }
  }
  const features = project.openTypeFeatures;
  if (features) {
    for (const sub of features.verticalWriting?.substitutions || []) {
      if (!sub.enabled) continue;
      if (needed.has(sub.sourceUnicode) || needed.has(sub.vertUnicode)) {
        needed.add(sub.sourceUnicode);
        needed.add(sub.vertUnicode);
      }
    }
    for (const ligature of features.ligatures || []) {
      if (!ligature.enabled || ligature.inputChars.length < 2) continue;
      const inputsInText = ligature.inputChars.every((ch) => {
        const code = ch.codePointAt(0);
        return code !== undefined && needed.has(code);
      });
      if (inputsInText) needed.add(ligature.substituteUnicode);
    }
  }
  return needed;
}

/**
 * Parse one side of a `project.kerning` key. Mirrors `parseKerningPairKey`
 * in `src/utils/font/validation.ts`: `U+XXXX` / `0xXXXX` hex, otherwise the
 * first code point of the token. Returns null when unparseable; such keys
 * are kept as-is (compileFont skips pairs whose glyphs are absent).
 */
function parseKerningPairSide(token: string | undefined): number | null {
  if (!token) return null;
  if (token.startsWith('U+') || token.startsWith('0x')) {
    const code = parseInt(token.replace(/^U\+|^0x/, ''), 16);
    return Number.isFinite(code) ? code : null;
  }
  const code = token.codePointAt(0);
  return code === undefined ? null : code;
}

function parseKerningPairKeyForPreview(pairKey: string): {
  left: number | null;
  right: number | null;
} {
  if (pairKey.includes(',')) {
    const parts = pairKey.split(',');
    return { left: parseKerningPairSide(parts[0]), right: parseKerningPairSide(parts[1]) };
  }
  const chars = [...pairKey];
  if (chars.length === 2) {
    return { left: parseKerningPairSide(chars[0]), right: parseKerningPairSide(chars[1]) };
  }
  return { left: null, right: null };
}

function isSameKerning(
  a: FontProject['kerning'],
  b: FontProject['kerning']
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function isSameStringArrayByRef(
  a: readonly unknown[] | undefined,
  b: readonly unknown[] | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

/** Structural equality for the OpenType-features slice compileFont reads. */
export function isSameOpenTypeFeatures(
  a: FontProject['openTypeFeatures'],
  b: FontProject['openTypeFeatures']
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.enabled !== b.enabled) return false;
  if (a.palt !== b.palt || a.mojikumi !== b.mojikumi) return false;
  if (!isSameStringArrayByRef(a.customKerningPairs, b.customKerningPairs)) return false;
  if (!isSameStringArrayByRef(a.ligatures, b.ligatures)) return false;
  const av = a.verticalWriting;
  const bv = b.verticalWriting;
  if (av === bv) return true;
  if (!av || !bv) return false;
  return (
    av.enabled === bv.enabled &&
    av.defaultVertAdvance === bv.defaultVertAdvance &&
    av.vertOriginY === bv.vertOriginY &&
    isSameStringArrayByRef(av.substitutions, bv.substitutions)
  );
}

/**
 * Whether two preview projects would compile to the same preview font.
 * Compares everything compileFont / validateFontProject read from a
 * project (metadata, pixel settings, kerning, OpenType features, and the
 * glyph objects themselves by reference) and ignores the rest (id, name,
 * timestamps, trace settings, and glyphs outside the preview set).
 */
export function isEquivalentPreviewProject(prev: FontProject, next: FontProject): boolean {
  if (prev.metadata !== next.metadata) return false;
  if (prev.pixelFontSettings !== next.pixelFontSettings) return false;
  if (!isSameKerning(prev.kerning, next.kerning)) return false;
  if (!isSameOpenTypeFeatures(prev.openTypeFeatures, next.openTypeFeatures)) return false;
  const prevGlyphs = prev.glyphs || {};
  const nextGlyphs = next.glyphs || {};
  const prevKeys = Object.keys(prevGlyphs);
  const nextKeys = Object.keys(nextGlyphs);
  if (prevKeys.length !== nextKeys.length) return false;
  return prevKeys.every((key) => prevGlyphs[Number(key)] === nextGlyphs[Number(key)]);
}

/**
 * Build the project to compile for the preview: only the glyphs (and
 * kerning / feature entries) that can affect the preview text. Returns the
 * original project unchanged when the preview would need almost all glyphs
 * (>= 80% of the project), where subsetting saves nothing.
 */
export function buildPreviewProject(project: FontProject, testText: string): FontProject {
  const needed = collectPreviewGlyphUnicodes(testText, project);
  const glyphs: Record<number, GlyphData> = {};
  for (const unicode of needed) {
    const glyph = project.glyphs?.[unicode];
    if (glyph) glyphs[unicode] = glyph;
  }
  const totalCount = Object.keys(project.glyphs || {}).length;
  if (totalCount > 0 && Object.keys(glyphs).length * 5 >= totalCount * 4) {
    return project;
  }

  let kerning = project.kerning;
  if (project.kerning) {
    const filtered: Record<string, number> = {};
    let changed = false;
    for (const [key, value] of Object.entries(project.kerning)) {
      const { left, right } = parseKerningPairKeyForPreview(key);
      if (left !== null && right !== null && (!needed.has(left) || !needed.has(right))) {
        changed = true;
        continue;
      }
      filtered[key] = value;
    }
    kerning = changed ? filtered : project.kerning;
  }

  let openTypeFeatures = project.openTypeFeatures;
  if (project.openTypeFeatures) {
    const features = project.openTypeFeatures;
    const customKerningPairs = (features.customKerningPairs || []).filter(
      (pair) =>
        !pair.enabled ||
        (needed.has(pair.firstUnicode) && needed.has(pair.secondUnicode))
    );
    const ligatures = (features.ligatures || []).filter(
      (ligature) =>
        !ligature.enabled ||
        needed.has(ligature.substituteUnicode) ||
        ligature.inputChars.every((ch) => {
          const code = ch.codePointAt(0);
          return code !== undefined && needed.has(code);
        })
    );
    const substitutions = (features.verticalWriting?.substitutions || []).filter(
      (sub) =>
        !sub.enabled || needed.has(sub.sourceUnicode) || needed.has(sub.vertUnicode)
    );
    if (
      customKerningPairs.length !== (features.customKerningPairs || []).length ||
      ligatures.length !== (features.ligatures || []).length ||
      substitutions.length !== (features.verticalWriting?.substitutions || []).length
    ) {
      openTypeFeatures = {
        ...features,
        customKerningPairs,
        ligatures,
        verticalWriting: features.verticalWriting
          ? { ...features.verticalWriting, substitutions }
          : features.verticalWriting,
      };
    }
  }

  return { ...project, glyphs, kerning, openTypeFeatures };
}

// A single field of the lifted state. When no lifted state is supplied the
// field falls back to local useState, so the hook also works standalone.
function usePersistedField<S extends object, K extends keyof S>(
  persistedValue: S | undefined,
  persistedOnChange: React.Dispatch<React.SetStateAction<S>> | undefined,
  key: K,
  initial: S[K]
): [S[K], React.Dispatch<React.SetStateAction<S[K]>>] {
  const [internal, setInternal] = useState<S[K]>(initial);
  const setPersisted = useCallback(
    (action: React.SetStateAction<S[K]>) => {
      persistedOnChange?.((prev) => {
        const currentVal = prev[key] ?? initial;
        return {
          ...prev,
          [key]:
            typeof action === 'function'
              ? (action as (prevValue: S[K]) => S[K])(currentVal)
              : action,
        };
      });
    },
    [persistedOnChange, key, initial]
  );
  if (persistedValue === undefined || persistedOnChange === undefined) {
    return [internal, setInternal];
  }
  return [persistedValue[key] ?? initial, setPersisted];
}

export function useTestPreviewState(
  props: TestPreviewModalProps & {
    persistedState?: TestPreviewPersistedState;
    onPersistedStateChange?: React.Dispatch<React.SetStateAction<TestPreviewPersistedState>>;
  }
) {
  const {
    isOpen,
    onClose,
    project,
    setProject,
    onSelectGlyphForEdit,
    commitHistory,
    theme,
    onShowToast,
    onOpenMojikumiStudio,
    persistedState,
    onPersistedStateChange,
  } = props;

  const persistedDefaults = useMemo(() => createDefaultTestPreviewPersistedState(), []);

const [testText, setTestText] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'testText',
    persistedDefaults.testText
  );
  const [writingMode, setWritingMode] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'writingMode',
    persistedDefaults.writingMode
  );
  const [fontSize, setFontSize] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontSize',
    persistedDefaults.fontSize
  );
  const [lineHeight, setLineHeight] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'lineHeight',
    persistedDefaults.lineHeight
  );
  const [letterSpacing, setLetterSpacing] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'letterSpacing',
    persistedDefaults.letterSpacing
  ); // in em
  const [textAlign, setTextAlign] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'textAlign',
    persistedDefaults.textAlign
  );
  const [useTsume, setUseTsume] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'useTsume',
    persistedDefaults.useTsume
  ); // OpenType palt / proportional
  const [showSpaceMarkers, setShowSpaceMarkers] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showSpaceMarkers',
    persistedDefaults.showSpaceMarkers
  ); // Highlight 全角/半角空白
  const [showGenkoGrid, setShowGenkoGrid] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showGenkoGrid',
    persistedDefaults.showGenkoGrid
  ); // 原稿用紙マス目
  const [showCharBoxes, setShowCharBoxes] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showCharBoxes',
    persistedDefaults.showCharBoxes
  ); // 仮想ボディ枠 (1em)
  const [showNotebookGuides, setShowNotebookGuides] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'showNotebookGuides',
    persistedDefaults.showNotebookGuides
  ); // ノート風ガイド罫線 (ベースライン・中心軸・高さ上限下限)
  const [autoBalanceMargins, setAutoBalanceMargins] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'autoBalanceMargins',
    persistedDefaults.autoBalanceMargins
  ); // デフォルト: ガイド枠の手書き位置優先 (1:1描画位置)
  const [fontScaleMultiplier, setFontScaleMultiplier] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'fontScaleMultiplier',
    persistedDefaults.fontScaleMultiplier
  ); // 1.0x (原寸キャンバス通り) or 1.35x (拡大)
  const [isWaterfall, setIsWaterfall] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isWaterfall',
    persistedDefaults.isWaterfall
  );
  // Shaped-text display mode (M30): one text node per line so kerning and
  // ligatures shape across characters. Default off: per-character spans
  // are needed for click selection and hover inspection. Kept in local
  // state (not persisted) because TestPreviewPersistedState lives in
  // persistedState.ts, which is outside this change.
  const [isShapedText, setIsShapedText] = useState<boolean>(false);
  // Pixel projects compile with scaleFactor fixed to 1.0 and
  // balanceSideBearings fixed to false (see the compile effect below),
  // so the two toggles must show that they are fixed instead of looking
  // active (M1).
  const isPixelProject = Boolean(project.pixelFontSettings?.isPixelFontProject);
  const [fontFamilyName, setFontFamilyName] = useState<string>('CustomTestFont');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected character for quick coordinate/scale/aspect adjustment and main editor jump
  const [selectedCharInfo, setSelectedCharInfo] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'selectedCharInfo',
    persistedDefaults.selectedCharInfo
  );
  const [adjustDx, setAdjustDx] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustDx',
    persistedDefaults.adjustDx
  );
  const [adjustDy, setAdjustDy] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustDy',
    persistedDefaults.adjustDy
  );
  const [adjustScaleX, setAdjustScaleX] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustScaleX',
    persistedDefaults.adjustScaleX
  );
  const [adjustScaleY, setAdjustScaleY] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'adjustScaleY',
    persistedDefaults.adjustScaleY
  );
  const [isAspectLocked, setIsAspectLocked] = usePersistedField(
    persistedState,
    onPersistedStateChange,
    'isAspectLocked',
    persistedDefaults.isAspectLocked
  );

  // Unsaved per-character adjust drafts (M3). Switching characters used
  // to reset the offsets to zero with no warning, discarding unsaved
  // work. The draft for each character is kept in this ref, so switching
  // away and back restores it. The draft is dropped when the adjustment
  // is saved to the glyph (handleApplyTransformToGlyph).
  const adjustDraftsRef = useRef(
    new Map<number, { dx: number; dy: number; scaleX: number; scaleY: number }>()
  );

  // Select a character for adjustment, preserving the current character's
  // unsaved draft and restoring the new character's draft (or defaults
  // when it has none). Passing null deselects and still keeps the draft.
  const selectCharForAdjust = (
    info: { char: string; unicode: number; lineIndex: number; charIndex: number } | null
  ) => {
    if (selectedCharInfo) {
      adjustDraftsRef.current.set(selectedCharInfo.unicode, {
        dx: adjustDx,
        dy: adjustDy,
        scaleX: adjustScaleX,
        scaleY: adjustScaleY,
      });
    }
    setSelectedCharInfo(info);
    if (info) {
      const draft = adjustDraftsRef.current.get(info.unicode);
      if (draft) {
        setAdjustDx(draft.dx);
        setAdjustDy(draft.dy);
        setAdjustScaleX(draft.scaleX);
        setAdjustScaleY(draft.scaleY);
      } else {
        setAdjustDx(0);
        setAdjustDy(0);
        setAdjustScaleX(100);
        setAdjustScaleY(100);
      }
    }
  };

  // Handle mouse wheel scrolling horizontally in vertical writing mode
  const handleVerticalWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (writingMode === 'vertical' && !isWaterfall) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.1 && e.deltaY !== 0) {
          const target = e.currentTarget;
          // Scroll leftward on wheel-down without inverting direction at scroll bounds
          target.scrollLeft -= e.deltaY;
        }
      }
    },
    [writingMode, isWaterfall]
  );

  // Variable Width & Collapsible Panel States (可変式UI)
  const [isSideAdjusterOpen, setIsSideAdjusterOpen] = useState<boolean>(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(280);
  const [rightAdjusterWidth, setRightAdjusterWidth] = useState<number>(300);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  const handleLeftResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleLeftResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingLeft || !mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = Math.max(180, Math.min(480, e.clientX - rect.left));
    setLeftSidebarWidth(newWidth);
  };

  const handleLeftResizePointerUp = (e: React.PointerEvent) => {
    if (isResizingLeft) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizingLeft(false);
    }
  };

  const handleRightResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleRightResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingRight || !mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = Math.max(200, Math.min(520, rect.right - e.clientX));
    setRightAdjusterWidth(newWidth);
  };

  const handleRightResizePointerUp = (e: React.PointerEvent) => {
    if (isResizingRight) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizingRight(false);
    }
  };

  // Floating / Docked adjustment panel state (default: docked as right sidebar)
  const [isDocked, setIsDocked] = useState<boolean>(true);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>({ x: 720, y: 60 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPosX: number; initialPosY: number } | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);
  const fontVersionRef = useRef<number>(0);
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = (e: React.PointerEvent) => {
    if (isDocked) return;
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: floatingPos.x,
      initialPosY: floatingPos.y,
    };
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || isDocked) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const nextX = Math.max(8, Math.min(window.innerWidth - 330, dragStartRef.current.initialPosX + dx));
    const nextY = Math.max(8, Math.min(window.innerHeight - 200, dragStartRef.current.initialPosY + dy));

    setFloatingPos({ x: nextX, y: nextY });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  // Hovered glyph info for inspection
  const [hoveredGlyphInfo, setHoveredGlyphInfo] = useState<{
    char: string;
    unicode: number;
    adv: number;
    lsb: number;
    rsb: number;
    diff: number;
  } | null>(null);
  // Layout mode: 'split' (side-by-side with full-height paper, recommended) or 'top' (classic stacked)
  const [layoutMode, setLayoutMode] = useState<'split' | 'top'>('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isTopControlsCollapsed, setIsTopControlsCollapsed] = useState<boolean>(false);
  const [showHintBanner, setShowHintBanner] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'settings' | 'adjust' | 'preview'>('settings');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLight = isLightTheme(theme);
  const isTopModal = useIsTopModal();

  // Handle keyboard shortcuts (Escape to exit fullscreen / close, F for fullscreen, Z for Zen/collapse)
  useEffect(() => {
    if (!isOpen || !isTopModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, don't trigger shortcut
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        } else {
          e.preventDefault();
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if ((e.key === 'z' || e.key === 'Z') && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (layoutMode === 'split') {
          setIsSidebarOpen((prev) => !prev);
        } else {
          setIsTopControlsCollapsed((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, layoutMode, onClose]);

  const cleanupActivePreviewFont = useCallback(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
      compileTimerRef.current = null;
    }
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {}
      activeBlobUrlRef.current = null;
    }
    if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
      try {
        document.fonts.delete(activeFontFaceRef.current);
      } catch {}
      activeFontFaceRef.current = null;
    }
    if (typeof document !== 'undefined') {
      const styleTag = document.getElementById('dynamic-preview-font-face');
      if (styleTag) {
        styleTag.remove();
      }
    }
  }, []);

  // Cleanup font resources when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanupActivePreviewFont();
    }
  }, [isOpen, cleanupActivePreviewFont]);

  // Cleanup font resources on unmount
  useEffect(() => {
    return () => {
      cleanupActivePreviewFont();
    };
  }, [cleanupActivePreviewFont]);

  // Compile only the glyphs the preview text can show. The candidate is
  // rebuilt on every render (cheap: a text scan plus glyph lookups), but
  // the state below only adopts it when it is not equivalent to the
  // previous one, so the compile effect does not re-run for edits to
  // glyphs outside the preview text. (Adjusting state during render is
  // the documented React pattern for deriving state from props.)
  const [previewProjectState, setPreviewProjectState] = useState(() => ({
    testText,
    preview: buildPreviewProject(project, testText),
  }));
  const previewProjectCandidate = buildPreviewProject(project, testText);
  if (
    previewProjectState.testText !== testText ||
    !isEquivalentPreviewProject(previewProjectState.preview, previewProjectCandidate)
  ) {
    setPreviewProjectState({ testText, preview: previewProjectCandidate });
  }
  const previewProject = previewProjectState.preview;

  // Compile font dynamically and create @font-face style rule with FontFace API
  useEffect(() => {
    if (!isOpen) {
      cleanupActivePreviewFont();
      return;
    }

    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
    }

    const compileVersion = ++fontVersionRef.current;
    // Set when the effect is cleaned up (modal closed or deps changed) so a
    // FontFace load that resolves afterwards is discarded instead of being
    // added to document.fonts and leaking its blob URL and style tag.
    let cancelled = false;
    const removeStyleTagForUrl = (url: string) => {
      if (typeof document === 'undefined') return;
      const styleTag = document.getElementById('dynamic-preview-font-face');
      if (styleTag && styleTag.textContent?.includes(url)) {
        styleTag.remove();
      }
    };
    compileTimerRef.current = setTimeout(() => {
      compileTimerRef.current = null;
      try {
        // Pixel projects preview at 1.0 with no centering or overlap
        // merging, matching the pixel studio export. Broken pixelData is
        // stripped first so one broken glyph does not stop the preview.
        // Only the glyphs in `previewProject` (the preview text plus its
        // shaping dependencies) are compiled; see buildPreviewProject.
        const isPixelProject = Boolean(previewProject.pixelFontSettings?.isPixelFontProject);
        const previewProjectCleaned = stripInvalidPixelData(previewProject).project;
        const validation = validateFontProject(previewProjectCleaned);
        if (!validation.valid) {
          throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
        }
        const { blobUrl } = compileFont(previewProjectCleaned, {
          scaleFactor: isPixelProject ? 1.0 : fontScaleMultiplier,
          balanceSideBearings: isPixelProject ? false : autoBalanceMargins,
          mergeOverlaps: isPixelProject ? false : true,
          normalizeWinding: true,
        });
        const newFontName = `CustomTestFont_v${compileVersion}_${Date.now()}`;

        if (typeof FontFace !== 'undefined') {
          const ff = new FontFace(newFontName, `url('${blobUrl}')`);
          ff.load()
            .then((loadedFace) => {
              if (cancelled || compileVersion !== fontVersionRef.current) {
                URL.revokeObjectURL(blobUrl);
                removeStyleTagForUrl(blobUrl);
                return;
              }
              // Delete old FontFace from document.fonts before adding the new face
              if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
                try {
                  document.fonts.delete(activeFontFaceRef.current);
                } catch {}
              }
              document.fonts.add(loadedFace);
              activeFontFaceRef.current = loadedFace;
              setFontFamilyName(newFontName);

              // Revoke previous blob URL
              if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
                URL.revokeObjectURL(activeBlobUrlRef.current);
              }
              activeBlobUrlRef.current = blobUrl;
              removeStyleTagForUrl(blobUrl);
            })
            .catch(() => {
              URL.revokeObjectURL(blobUrl);
              if (!cancelled && compileVersion === fontVersionRef.current) {
                setErrorMsg('プレビュー用フォントの読み込みに失敗しました。');
              }
            });
        } else {
          setFontFamilyName(newFontName);
          if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          }
          activeBlobUrlRef.current = blobUrl;
          const styleId = 'dynamic-preview-font-face';
          let styleTag = document.getElementById(styleId) as HTMLStyleElement;
          if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
          }
          styleTag.textContent = `
            @font-face {
              font-family: '${newFontName}';
              src: url('${blobUrl}') format('truetype');
              font-weight: normal;
              font-style: normal;
            }
          `;
        }
        setErrorMsg(null);
      } catch (err) {
        console.error('Error compiling test font:', err);
        // Remove the previous preview font so a failed compile never leaves
        // stale glyphs on screen.
        cleanupActivePreviewFont();
        setErrorMsg(
          err instanceof Error && err.message
            ? err.message
            : 'フォントの生成中にエラーが発生しました。パスの構造を確認してください。'
        );
      }
    }, 250);

    return () => {
      cancelled = true;
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
        compileTimerRef.current = null;
      }
    };
  }, [isOpen, previewProject, autoBalanceMargins, fontScaleMultiplier, cleanupActivePreviewFont]);

  // Per-glyph cache for the pixel-grid -> contour conversion (M13).
  // resolveGlyphPreviewContours used to rebuild the contours on every
  // call, so a repeated character in the preview text paid the conversion
  // once per occurrence per render. The entry is valid only while the
  // glyph object and every conversion input (UPM, ascender, descender,
  // advance width, dot shape, merge setting) are unchanged; a glyph edit
  // replaces the glyph object, so the entry is dropped.
  const previewContoursCacheRef = useRef(
    new Map<number, { glyph: GlyphData; sig: string; contours: PathContour[] }>()
  );

  // Derive effective contours including pixel-only glyphs for metrics & preview
  const resolveGlyphPreviewContours = useCallback(
    (g: GlyphData | undefined | null): PathContour[] => {
      if (!g) return [];
      if (g.contours && g.contours.length > 0) return g.contours;
      if (g.pixelData?.data && g.pixelData.width && g.pixelData.height) {
        const pGrid = normalizePixelGrid(g.pixelData.data);
        if (pGrid.some((v) => v === 1)) {
          const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
          const advWidth =
            g.advanceWidth || (g.unicode > 255 ? upm : Math.round(upm / 2));
          const dotShape = g.pixelData.shape || project.pixelFontSettings?.dotShape || 'square';
          const mergeContours = project.pixelFontSettings?.mergeContours !== false;
          const sig = [
            upm,
            project.metadata.ascender || DEFAULT_ASCENDER,
            project.metadata.descender || DEFAULT_DESCENDER,
            advWidth,
            dotShape,
            mergeContours,
          ].join('|');
          const cached = previewContoursCacheRef.current.get(g.unicode);
          if (cached && cached.glyph === g && cached.sig === sig) {
            return cached.contours;
          }
          const contours = pixelGridToContours(
            pGrid,
            g.pixelData.width,
            g.pixelData.height,
            upm,
            project.metadata.ascender || DEFAULT_ASCENDER,
            project.metadata.descender || DEFAULT_DESCENDER,
            advWidth,
            dotShape,
            mergeContours
          );
          previewContoursCacheRef.current.set(g.unicode, { glyph: g, sig, contours });
          return contours;
        }
      }
      return [];
    },
    [project.metadata.unitsPerEm, project.metadata.ascender, project.metadata.descender, project.pixelFontSettings?.dotShape, project.pixelFontSettings?.mergeContours]
  );

  // Handle batch centering all glyphs in project
  const handleBatchCenterAll = () => {
    if (!setProject) return;
    const { project: updatedProj, modifiedCount } = balanceProjectGlyphMargins(project);
    if (modifiedCount === 0) {
      onShowToast?.('整列が必要な文字はありませんでした', 'info');
      return;
    }
    // Register history for every glyph the batch changed before
    // applying, so each one can be undone individually.
    commitChangedGlyphHistory(project, updatedProj, (unicode) => commitHistory?.(unicode));
    setProject(updatedProj);
    if (onShowToast) {
      onShowToast(`${modifiedCount} 文字の左右余白を中央に整列しました`, 'success');
    }
  };

  // Per-character cache for glyph metrics (M13). getGlyphMetric is called
  // once per displayed character per render (PreviewCanvas renderedText),
  // and each call recomputed the bounding box. The entry is valid only
  // while the glyph object and the UPM are unchanged; null results (no
  // glyph or no contours) are cached too.
  const glyphMetricCacheRef = useRef(
    new Map<
      string,
      {
        glyph: GlyphData | undefined;
        upm: number;
        metric: { char: string; unicode: number; adv: number; lsb: number; rsb: number; diff: number } | null;
      }
    >()
  );

  // Helper to get glyph metric info
  const getGlyphMetric = useCallback(
    (char: string) => {
      const code = char.codePointAt(0) ?? 0;
      const g = project.glyphs[code];
      const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
      const cached = glyphMetricCacheRef.current.get(char);
      if (cached && cached.glyph === g && cached.upm === upm) {
        return cached.metric;
      }
      const contours = resolveGlyphPreviewContours(g);
      if (!g || contours.length === 0) {
        glyphMetricCacheRef.current.set(char, { glyph: g, upm, metric: null });
        return null;
      }
      const bbox = getContoursBoundingBox(contours);
      if (bbox.width <= 0) {
        glyphMetricCacheRef.current.set(char, { glyph: g, upm, metric: null });
        return null;
      }
      const adv = g.advanceWidth || (code > 255 ? upm : Math.round(upm / 2));
      const lsb = Math.round(bbox.minX);
      const rsb = Math.round(adv - bbox.maxX);
      const diff = lsb - rsb;
      const metric = { char, unicode: code, adv, lsb, rsb, diff };
      glyphMetricCacheRef.current.set(char, { glyph: g, upm, metric });
      return metric;
    },
    [project.glyphs, project.metadata.unitsPerEm, resolveGlyphPreviewContours]
  );

  // Apply vector transform directly to glyph contour in project
  const handleApplyTransformToGlyph = () => {
    if (!selectedCharInfo || !setProject) return;
    const unicode = selectedCharInfo.unicode;
    const g = project.glyphs[unicode];
    if (!g) {
      onShowToast?.(`「${selectedCharInfo.char}」のグリフデータが見つかりません`, 'info');
      return;
    }
    if (g.locked) {
      onShowToast?.(`「${selectedCharInfo.char}」はロックされているため変更できません`, 'error');
      return;
    }
    if (!g.contours || g.contours.length === 0) {
      const isPixelOnly = Boolean(g.pixelData?.data && g.pixelData.data.some((p) => p === 1));
      onShowToast?.(
        isPixelOnly
          ? `「${selectedCharInfo.char}」はドット絵グリフのためドットスタジオまたはメイン編集で調整してください`
          : `「${selectedCharInfo.char}」の輪郭データが見つかりません`,
        'info'
      );
      return;
    }

    const scaleXMult = adjustScaleX / 100;
    const scaleYMult = adjustScaleY / 100;

    const transformedContours = transformGlyphContours(
      g.contours,
      adjustDx,
      adjustDy,
      scaleXMult,
      scaleYMult
    );

    const newBbox = getContoursBoundingBox(transformedContours);
    const newLsb = Math.max(0, Math.round(newBbox.minX));

    commitHistory?.(unicode);
    setProject((prev) => {
      const prevG = prev.glyphs[unicode];
      if (!prevG) return prev;
      return {
        ...prev,
        updatedAt: Date.now(),
        glyphs: {
          ...prev.glyphs,
          [unicode]: {
            ...prevG,
            contours: transformedContours,
            lsb: newLsb,
            modified: true,
            updatedAt: Date.now(),
          },
        },
      };
    });

    if (onShowToast) {
      onShowToast(
        `「${selectedCharInfo.char}」のグリフ輪郭（位置 X:${adjustDx}, Y:${adjustDy}, 拡縮 ${adjustScaleX}%×${adjustScaleY}%）を永続保存しました`,
        'success'
      );
    }

    // The saved adjustment is now the glyph data; drop the draft so
    // re-selecting the character starts from the saved state (M3).
    adjustDraftsRef.current.delete(unicode);
    setAdjustDx(0);
    setAdjustDy(0);
    setAdjustScaleX(100);
    setAdjustScaleY(100);
  };

  const handleJumpToMainEditor = () => {
    if (!selectedCharInfo) return;
    if (onSelectGlyphForEdit) {
      onSelectGlyphForEdit(selectedCharInfo.unicode);
    } else if (onClose) {
      onClose();
    }
  };

  // Center selected character in EM Box (M5, M10). The offset is a
  // preview-only draft until saved with handleApplyTransformToGlyph; the
  // toast says so. The bounding box comes from the effective contours,
  // so dot-only glyphs (whose contours are derived from the pixel grid)
  // can be centered too (M5). The offset accounts for the current scale:
  // the canvas scales the token about the span centre, so the offset
  // needed to centre the glyph grows with the scale (M10). The vertical
  // offset centres the glyph on the EM box centre as well; both offsets
  // are clamped to the slider range (M6).
  const handleAutoCenterGlyph = () => {
    if (!selectedCharInfo || !setProject) return;
    const unicode = selectedCharInfo.unicode;
    const g = project.glyphs[unicode];
    if (!g) return;
    if (g.locked) {
      onShowToast?.(`「${selectedCharInfo.char}」はロックされているため変更できません`, 'error');
      return;
    }
    const contours = resolveGlyphPreviewContours(g);
    if (contours.length === 0) {
      onShowToast?.(`「${selectedCharInfo.char}」の輪郭データが見つかりません`, 'info');
      return;
    }
    const bbox = getContoursBoundingBox(contours);
    if (bbox.width <= 0 || bbox.height <= 0) return;

    const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
    const adv = g.advanceWidth || (unicode > 255 ? upm : Math.round(upm / 2));
    const targetLsb = (adv - bbox.width) / 2;
    const deltaX = clampAdjustOffset(
      Math.round((targetLsb - bbox.minX) * (adjustScaleX / 100))
    );
    const deltaY = clampAdjustOffset(
      Math.round((bbox.centerY - upm / 2) * (adjustScaleY / 100))
    );

    setAdjustDx(deltaX);
    setAdjustDy(deltaY);
    const isPixelOnly = !g.contours || g.contours.length === 0;
    if (onShowToast) {
      onShowToast(
        isPixelOnly
          ? `「${selectedCharInfo.char}」をEM枠中央に自動配置しました。プレビューに反映しましたが、ドット絵グリフのためここから保存できません。`
          : `「${selectedCharInfo.char}」をEM枠中央に自動配置しました。プレビューに反映しました。保存すると確定します。`,
        'info'
      );
    }
  };

// Live SVG Preview calculation for active selected character
  const activeGlyph = selectedCharInfo ? project.glyphs[selectedCharInfo.unicode] : null;
  const activeGlyphContours = useMemo(
    () => resolveGlyphPreviewContours(activeGlyph),
    [activeGlyph, resolveGlyphPreviewContours]
  );
  const isPixelOnlyActiveGlyph = Boolean(
    activeGlyph &&
      (!activeGlyph.contours || activeGlyph.contours.length === 0) &&
      activeGlyphContours.length > 0
  );
  const livePreviewContours = useMemo(() => {
    if (activeGlyphContours.length === 0) return [];
    if (adjustDx === 0 && adjustDy === 0 && adjustScaleX === 100 && adjustScaleY === 100) {
      return activeGlyphContours;
    }
    return transformGlyphContours(
      activeGlyphContours,
      adjustDx,
      adjustDy,
      adjustScaleX / 100,
      adjustScaleY / 100
    );
  }, [activeGlyphContours, adjustDx, adjustDy, adjustScaleX, adjustScaleY]);

  // All available glyph entries in project for dropdown selection.
  // Blank glyphs are included (M12): a space has no visible shape, but
  // its advance width still needs adjusting, so it must be selectable.
  const glyphEntries = useMemo(() => {
    return Object.keys(project.glyphs)
      .map((codeStr) => {
        const u = Number(codeStr);
        const g = project.glyphs[u];
        const ch = g?.char || String.fromCodePoint(u);
        return { unicode: u, char: ch, name: g?.name || ch };
      })
      .filter((item) => item.char && item.char.length > 0);
  }, [project.glyphs]);

  const [showLivePreviewBox, setShowLivePreviewBox] = useState<boolean>(false);

  return {
    testText,
    setTestText,
    writingMode,
    setWritingMode,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    textAlign,
    setTextAlign,
    useTsume,
    setUseTsume,
    showSpaceMarkers,
    setShowSpaceMarkers,
    showGenkoGrid,
    setShowGenkoGrid,
    showCharBoxes,
    setShowCharBoxes,
    showNotebookGuides,
    setShowNotebookGuides,
    autoBalanceMargins,
    setAutoBalanceMargins,
    fontScaleMultiplier,
    setFontScaleMultiplier,
    isWaterfall,
    setIsWaterfall,
    isShapedText,
    setIsShapedText,
    isPixelProject,
    fontFamilyName,
    errorMsg,
    selectedCharInfo,
    setSelectedCharInfo,
    selectCharForAdjust,
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
    handleVerticalWheel,
    isSideAdjusterOpen,
    setIsSideAdjusterOpen,
    leftSidebarWidth,
    setLeftSidebarWidth,
    rightAdjusterWidth,
    setRightAdjusterWidth,
    mainContainerRef,
    isResizingLeft,
    isResizingRight,
    handleLeftResizePointerDown,
    handleLeftResizePointerMove,
    handleLeftResizePointerUp,
    handleRightResizePointerDown,
    handleRightResizePointerMove,
    handleRightResizePointerUp,
    isDocked,
    setIsDocked,
    floatingPos,
    setFloatingPos,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    hoveredGlyphInfo,
    setHoveredGlyphInfo,
    layoutMode,
    setLayoutMode,
    isSidebarOpen,
    setIsSidebarOpen,
    isTopControlsCollapsed,
    setIsTopControlsCollapsed,
    showHintBanner,
    setShowHintBanner,
    isFullscreen,
    setIsFullscreen,
    mobileTab,
    setMobileTab,
    isMobileScreen,
    isLight,
    handleBatchCenterAll,
    getGlyphMetric,
    handleApplyTransformToGlyph,
    handleJumpToMainEditor,
    handleAutoCenterGlyph,
    activeGlyph,
    activeGlyphContours,
    isPixelOnlyActiveGlyph,
    livePreviewContours,
    glyphEntries,
    showLivePreviewBox,
    setShowLivePreviewBox,
  };
}

export type TestPreviewState = ReturnType<typeof useTestPreviewState>;
