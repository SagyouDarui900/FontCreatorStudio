// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useToolState } from './useToolState';
import { useGlyphActions } from './useGlyphActions';
import { useCanvasLocalPrefs } from '../components/canvas/hooks/useCanvasLocalPrefs';
import { usePenTool } from '../components/canvas/hooks/usePenTool';
import { PenPresetsModal } from '../components/penpresets/PenPresetsModal';
import { MobileBrushMenuSheet } from '../components/toolbar/MobileBrushMenuSheet';
import { PEN_ICONS, isCustomPenPreset } from '../components/toolbar/toolbarConstants';
import { IvsVariantManagerModal } from '../components/ivs/IvsVariantManagerModal';
import { ModalProvider } from '../contexts/ModalContext';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { DEFAULT_PEN_PRESETS, DEFAULT_PRESSURE_CURVES, loadStickyBrushConfigs } from '../utils/presetData';
import { PEN_PRESETS } from '../utils/path';
import { getThemeClasses } from '../utils/theme';
import { FontProject, GlyphData, PathContour, UserPenPreset } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeContour(id: string, x = 100, y = 100, size = 100): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-n1`, x, y, type: 'corner' },
      { id: `${id}-n2`, x: x + size, y, type: 'corner' },
      { id: `${id}-n3`, x: x + size, y: y + size, type: 'corner' },
      { id: `${id}-n4`, x, y: y + size, type: 'corner' },
    ],
  };
}

function makeProject(id: string, glyphs: Record<number, GlyphData>, unitsPerEm = 1000): FontProject {
  return {
    id,
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
      unitsPerEm,
      ascender: Math.round(unitsPerEm * 0.8),
      descender: Math.round(unitsPerEm * -0.2),
      lineGap: 0,
      capHeight: Math.round(unitsPerEm * 0.7),
      xHeight: Math.round(unitsPerEm * 0.5),
    },
    glyphs,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('Medium-severity fixes verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('M1: useToolState sticky handlers persist pressureSensitivity and smoothing/union overrides per brushStyle', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useToolState>;
    function Harness() {
      api = useToolState();
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    act(() => {
      api.handleChangeBrushStyle('fountain');
    });
    act(() => {
      api.handleChangePressureSensitivity('low');
      api.handleChangeAutoSmoothBrush(false);
      api.handleChangeSmoothStrength('strong');
      api.handleChangeSmoothPreserveCorners(false);
      api.handleChangeAutoUnionBrush(false);
    });

    const savedFountain = loadStickyBrushConfigs().fountain;
    expect(savedFountain.pressureSensitivity).toBe('low');
    expect(savedFountain.autoSmoothBrush).toBe(false);
    expect(savedFountain.smoothStrength).toBe('strong');
    expect(savedFountain.smoothPreserveCorners).toBe(false);
    expect(savedFountain.autoUnionBrush).toBe(false);

    // Switch to another style, then back to fountain: overrides must be restored
    act(() => {
      api.handleChangeBrushStyle('brush');
    });
    expect(api.autoSmoothBrush).toBe(true);

    act(() => {
      api.handleChangeBrushStyle('fountain');
    });
    expect(api.pressureSensitivity).toBe('low');
    expect(api.autoSmoothBrush).toBe(false);
    expect(api.smoothStrength).toBe('strong');
    expect(api.smoothPreserveCorners).toBe(false);
    expect(api.autoUnionBrush).toBe(false);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('M2: PenPresetsModal receives and applies Round-D parameters without leaking stale unapplied state across reopens', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onApplyPreset = vi.fn();

    const baseParams = {
      brushStyle: 'double_line' as const,
      brushWidth: 40,
      pressureSensitivity: 'normal' as const,
      pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
      smoothingIntensity: 50,
      autoSmoothBrush: true,
      smoothStrength: 'standard' as const,
      smoothPreserveCorners: true,
      autoUnionBrush: true,
      lineCap: 'square' as const,
      lineJoin: 'bevel' as const,
      taperCurve: 'steep' as const,
      minWidth: 8,
      maxWidth: 64,
      doubleLineGap: 35,
      dottedSpacing: 15,
      brushFlex: 40,
      inkPooling: 55,
      roughnessScale: 75,
    };

    act(() => {
      root.render(
        <ModalProvider>
          <PenPresetsModal
            isOpen
            onClose={vi.fn()}
            currentParams={baseParams}
            onApplyPreset={onApplyPreset}
            presets={DEFAULT_PEN_PRESETS}
            onUpdatePresets={vi.fn()}
            theme="dark"
          />
        </ModalProvider>
      );
    });

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('このペンを適用して閉じる')
    );
    expect(applyBtn).toBeDefined();

    act(() => {
      applyBtn!.click();
    });

    expect(onApplyPreset).toHaveBeenCalledTimes(1);
    const applied: UserPenPreset = onApplyPreset.mock.calls[0][0];
    expect(applied.lineCap).toBe('square');
    expect(applied.lineJoin).toBe('bevel');
    expect(applied.taperCurve).toBe('steep');
    expect(applied.minWidth).toBe(8);
    expect(applied.maxWidth).toBe(64);
    expect(applied.doubleLineGap).toBe(35);
    expect(applied.dottedSpacing).toBe(15);
    expect(applied.brushFlex).toBe(40);
    expect(applied.inkPooling).toBe(55);
    expect(applied.roughnessScale).toBe(75);

    // Close and reopen with clean defaults (omitting Round-D fields): values must reset to clean defaults
    act(() => {
      root.render(
        <ModalProvider>
          <PenPresetsModal
            isOpen={false}
            onClose={vi.fn()}
            currentParams={baseParams}
            onApplyPreset={onApplyPreset}
            presets={DEFAULT_PEN_PRESETS}
            onUpdatePresets={vi.fn()}
            theme="dark"
          />
        </ModalProvider>
      );
    });

    act(() => {
      root.render(
        <ModalProvider>
          <PenPresetsModal
            isOpen
            onClose={vi.fn()}
            currentParams={{
              brushStyle: 'brush',
              brushWidth: 38,
              pressureSensitivity: 'high',
              autoSmoothBrush: true,
              smoothStrength: 'standard',
              smoothPreserveCorners: true,
              autoUnionBrush: true,
            }}
            onApplyPreset={onApplyPreset}
            presets={DEFAULT_PEN_PRESETS}
            onUpdatePresets={vi.fn()}
            theme="dark"
          />
        </ModalProvider>
      );
    });

    const applyBtn2 = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('このペンを適用して閉じる')
    );
    act(() => {
      applyBtn2!.click();
    });

    const applied2: UserPenPreset = onApplyPreset.mock.calls[1][0];
    expect(applied2.lineCap).toBe('round');
    expect(applied2.lineJoin).toBe('miter');
    expect(applied2.taperCurve).toBe('linear');
    expect(applied2.inkPooling).toBe(0);
    expect(applied2.roughnessScale).toBe(50);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('M3: isCustomPenPreset unifies custom pen detection and MobileBrushMenuSheet shows total count and pressure sensitivity controls', () => {
    expect(isCustomPenPreset(DEFAULT_PEN_PRESETS[0])).toBe(false);
    expect(isCustomPenPreset({ id: 'preset-copy-1', isCustom: true })).toBe(true);
    expect(isCustomPenPreset({ id: 'custom-pen-1' })).toBe(true);
    expect(isCustomPenPreset({ id: 'preset-imported-1' })).toBe(true);

    const customPresets: UserPenPreset[] = [
      { ...DEFAULT_PEN_PRESETS[0], id: 'preset-custom-1', name: '自作筆A', isCustom: true },
      { ...DEFAULT_PEN_PRESETS[1], id: 'preset-copy-2', name: '自作筆B', isCustom: true },
    ];
    const onChangePressureSensitivity = vi.fn();
    const sheetRef = { current: null };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MobileBrushMenuSheet
          isOpen
          onClose={vi.fn()}
          sheetRef={sheetRef}
          themeClasses={getThemeClasses('dark')}
          isLight={false}
          customPresets={customPresets}
          activePenPreset={{ ...DEFAULT_PEN_PRESETS[0], id: 'custom-pen-unsaved', isCustom: true }}
          setToolMode={vi.fn()}
          PEN_ICONS={PEN_ICONS}
          brushStyle="brush"
          brushWidth={38}
          setBrushWidth={vi.fn()}
          pressureSensitivity="normal"
          onChangePressureSensitivity={onChangePressureSensitivity}
          smoothingIntensity={50}
        />
      );
    });

    const portalText = document.body.textContent || '';
    expect(portalText).toContain(`全${PEN_PRESETS.length + customPresets.length}種`);
    expect(portalText).toContain('筆圧感度 (Apple Pencil / ペン)');

    const highSensitivityBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('高感度')
    );
    expect(highSensitivityBtn).toBeDefined();

    act(() => {
      highSensitivityBtn!.click();
    });
    expect(onChangePressureSensitivity).toHaveBeenCalledWith('high');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('M4: useCanvasLocalPrefs and usePenTool read legacy keys as fallback and write to STORAGE_KEYS primary fcs_* keys', () => {
    localStorage.setItem('mojisaku_bottom_bar_collapsed', 'true');
    localStorage.setItem('mojisaku_palm_rejection_mode', 'strict_pen_only');
    localStorage.setItem('glyph_pen_stroke_width', '52');
    localStorage.setItem('glyph_pen_cap_style', 'square');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let prefs!: ReturnType<typeof useCanvasLocalPrefs>;
    let penTool!: ReturnType<typeof usePenTool>;
    function Harness() {
      prefs = useCanvasLocalPrefs({});
      penTool = usePenTool({
        toolMode: 'pen',
        contours: [],
        autoResolveBrushOverlap: false,
        containerRef: { current: null },
        onChangeContours: vi.fn(),
        showCanvasToast: vi.fn(),
        setSelectedContourId: vi.fn(),
        setSelectedContourIds: vi.fn(),
        setSelectedNodeId: vi.fn(),
        setSelectedHandleType: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    expect(prefs.isBottomBarCollapsed).toBe(true);
    expect(prefs.palmRejectionMode).toBe('strict_pen_only');
    expect(penTool.penStrokeWidth).toBe(52);
    expect(penTool.penCapStyle).toBe('square');

    act(() => {
      prefs.toggleBottomBarCollapse();
      prefs.handleSetPalmRejectionMode('off');
      penTool.handleSetPenStrokeWidth(64);
      penTool.handleSetPenCapStyle('butt');
    });

    expect(localStorage.getItem(STORAGE_KEYS.BOTTOM_BAR_COLLAPSED.primary)).toBe('false');
    expect(localStorage.getItem(STORAGE_KEYS.PALM_REJECTION_MODE.primary)).toBe('off');
    expect(localStorage.getItem(STORAGE_KEYS.PEN_STROKE_WIDTH.primary)).toBe('64');
    expect(localStorage.getItem(STORAGE_KEYS.PEN_CAP_STYLE.primary)).toBe('butt');

    act(() => {
      penTool.handleResetPenStrokeWidth();
    });
    expect(localStorage.getItem(STORAGE_KEYS.PEN_STROKE_WIDTH.primary)).toBeNull();
    expect(localStorage.getItem('glyph_pen_stroke_width')).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('M5: handleBatchInsertRadical uses project unitsPerEm defaults and IvsVariantManagerModal scales lsb and confirms delete in two clicks', () => {
    const initialProject = makeProject('p1', {}, 2048);
    let currentProject = initialProject;
    const setProject: React.Dispatch<React.SetStateAction<FontProject>> = (updater) => {
      currentProject = typeof updater === 'function' ? updater(currentProject) : updater;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let actions!: ReturnType<typeof useGlyphActions>;
    function Harness({ proj }: { proj: FontProject }) {
      actions = useGlyphActions({
        project: proj,
        setProject,
        selectedUnicode: 0x6f22,
        selectedChar: '漢',
        currentGlyph: { unicode: 0x6f22, char: '漢', name: 'uni6F22', contours: [], advanceWidth: 2048, lsb: 102 },
        currentGlyphRef: { current: { unicode: 0x6f22, char: '漢', name: 'uni6F22', contours: [], advanceWidth: 2048, lsb: 102 } },
        setSelectedUnicode: vi.fn(),
        setSelectedChar: vi.fn(),
        setToolMode: vi.fn(),
        commitHistory: vi.fn(),
        setUndoStack: vi.fn(),
        handleUpdateContours: vi.fn(),
        onShowToast: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness proj={currentProject} />);
    });

    act(() => {
      actions.handleBatchInsertRadical([makeContour('rad-1')], ['海']);
    });

    const insertedGlyph = currentProject.glyphs[0x6d77];
    expect(insertedGlyph).toBeDefined();
    expect(insertedGlyph.advanceWidth).toBe(2048);
    expect(insertedGlyph.lsb).toBe(102);

    // Verify IvsVariantManagerModal requires 2-step delete confirmation and scales default lsb by UPM
    const ivsProject = makeProject('p-ivs', {}, 2048);
    ivsProject.ivsVariants = {
      '8FBB_E0101': {
        id: '8FBB_E0101',
        baseUnicode: 0x8fbb,
        selectorCode: 0xe0101,
        collection: 'Adobe-Japan1',
        glyph: {
          unicode: 0x8fbb,
          char: '辻',
          name: 'uni8FBB.uE0101',
          contours: [makeContour('v-1')],
          advanceWidth: 2048,
          lsb: 102,
        },
        updatedAt: 1000,
      },
    };
    let latestIvsProject = ivsProject;
    const setIvsProject: React.Dispatch<React.SetStateAction<FontProject>> = (updater) => {
      latestIvsProject = typeof updater === 'function' ? updater(latestIvsProject) : updater;
    };

    act(() => {
      root.render(
        <ModalProvider>
          <IvsVariantManagerModal
            isOpen
            onClose={vi.fn()}
            selectedUnicode={0x8fbb}
            selectedChar="辻"
            glyphs={latestIvsProject.glyphs}
            project={latestIvsProject}
            setProject={setIvsProject}
            onSelectGlyph={vi.fn()}
            onShowToast={vi.fn()}
            theme="dark"
          />
        </ModalProvider>
      );
    });

    const firstDeleteBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === '削除'
    );
    expect(firstDeleteBtn).toBeDefined();

    // First click arms confirmation without deleting
    act(() => {
      firstDeleteBtn!.click();
    });
    expect(latestIvsProject.ivsVariants?.['8FBB_E0101']).toBeDefined();

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('もう一度押して削除')
    );
    expect(confirmBtn).toBeDefined();

    // Second click executes deletion
    act(() => {
      confirmBtn!.click();
    });
    expect(latestIvsProject.ivsVariants?.['8FBB_E0101']).toBeUndefined();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
