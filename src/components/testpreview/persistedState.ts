// Persisted editing state for the Test Preview modal (3-A1).
// Kept in a file with no heavy imports so AppModalsHost can hold this state
// without pulling compileFont / opentype.js into the startup bundle.
// The modal itself stays lazy-loaded; only this small state shape is shared.
export interface TestPreviewPersistedState {
  testText: string;
  writingMode: 'horizontal' | 'vertical';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  useTsume: boolean;
  showSpaceMarkers: boolean;
  showGenkoGrid: boolean;
  showCharBoxes: boolean;
  showNotebookGuides: boolean;
  autoBalanceMargins: boolean;
  fontScaleMultiplier: number;
  isWaterfall: boolean;
  selectedCharInfo: {
    char: string;
    unicode: number;
    lineIndex: number;
    charIndex: number;
  } | null;
  adjustDx: number;
  adjustDy: number;
  adjustScaleX: number;
  adjustScaleY: number;
  isAspectLocked: boolean;
  // Vector-outline live preview box (L8): open by default.
  showLivePreviewBox: boolean;
  // Unicodes that have existed in the project while the preview was open
  // (L10). Lets the panel tell a deleted glyph apart from one that was
  // never created. Only grows with unicodes actually seen in the
  // project; reset when a different project is opened.
  knownGlyphUnicodes: number[];
}

export function createDefaultTestPreviewPersistedState(): TestPreviewPersistedState {
  return {
    testText:
      'いろはにほへと　ちりぬるを\nわかよたれそ　つねならむ\nうゐのおくやま　けふこえて\nあさきゆめみし　ゑひもせす',
    writingMode: 'horizontal',
    fontSize: 36,
    lineHeight: 2.0,
    letterSpacing: 0.05,
    textAlign: 'left',
    useTsume: false,
    showSpaceMarkers: false,
    showGenkoGrid: false,
    showCharBoxes: false,
    showNotebookGuides: true,
    autoBalanceMargins: false,
    fontScaleMultiplier: 1.0,
    isWaterfall: false,
    selectedCharInfo: null,
    adjustDx: 0,
    adjustDy: 0,
    adjustScaleX: 100,
    adjustScaleY: 100,
    isAspectLocked: true,
    showLivePreviewBox: true,
    knownGlyphUnicodes: [],
  };
}
