// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserPenPreset } from '../../../types';
import { TaperTab } from './TaperTab';
import { ShapeTab } from './ShapeTab';
import { RandomTab } from './RandomTab';
import { SettingsTab } from './SettingsTab';
import { DynamicTab } from './DynamicTab';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!();
});

function render(node: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(node);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  cleanups.push(cleanup);
  return { container, cleanup };
}

function defaultPreset(): UserPenPreset {
  return {
    id: 'default-brush',
    name: '標準毛筆ペン',
    isCustom: false,
    brushStyle: 'brush',
    brushWidth: 38,
    pressureSensitivity: 'high',
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 55,
    taperStartLength: 0,
    taperEndLength: 0,
    taperStartWidth: 100,
    taperEndWidth: 100,
    taperStartOpacity: 100,
    taperEndOpacity: 100,
    taperStartTime: 100,
    taperEndTime: 100,
    forceTaper: false,
    forceTaperEnd: false,
    taperTipShape: 'round',
    nibAngle: 0,
    nibAspectRatio: 0,
    nibFollowDirection: false,
    nibSpacing: 1,
    constantWidth: false,
    antiAlias: true,
    jitterPosition: 0,
    jitterConstrainPerp: true,
    jitterSize: 0,
    jitterOpacity: 0,
    jitterAngle: 0,
    jitterSpacing: 0,
    speedWidthFactor: 0,
    speedOpacityFactor: 0,
    speedFeatherFactor: 0,
    pressureWidthFactor: 0,
    pressureOpacityFactor: 0,
    pressureFeatherFactor: 0,
    stabilizationMethod: 'pre',
    speedStabilization: 0,
    legacyStabilization: false,
    inkBleed: 0,
    axisSlant: 0,
    edgeRoughness: 0,
    tipSharpness: 0,
    pressureGamma: 1.0,
  };
}

function tabProps() {
  return {
    workingPreset: defaultPreset(),
    setWorkingPreset: vi.fn() as React.Dispatch<React.SetStateAction<UserPenPreset>>,
  };
}

describe('pen preset tabs show the round-C editors', () => {
  it('TaperTab shows the entry and exit time editors', () => {
    const { container } = render(<TaperTab {...tabProps()} />);
    expect(container.textContent).toContain('入りの時間');
    expect(container.textContent).toContain('抜きの時間');
    expect(container.textContent).not.toContain('時間による入り抜きは描画に反映されません');
  });

  it('ShapeTab shows the nib spacing editor', () => {
    const { container } = render(<ShapeTab {...tabProps()} />);
    expect(container.textContent).toContain('筆先間隔');
    expect(container.textContent).not.toContain('筆先間隔はベクター輪郭に反映されません');
  });

  it('RandomTab shows the spacing jitter editor', () => {
    const { container } = render(<RandomTab {...tabProps()} />);
    expect(container.textContent).toContain('間隔ランダム');
    expect(container.textContent).not.toContain('間隔ランダムはベクター輪郭に反映されません');
  });

  it('SettingsTab shows the stabilization method, fast-stroke strength, and legacy toggle', () => {
    const { container } = render(<SettingsTab {...tabProps()} />);
    expect(container.textContent).toContain('事前補正');
    expect(container.textContent).toContain('事後補正');
    expect(container.textContent).toContain('高速時補正強度');
    expect(container.textContent).toContain('旧方式の事前補正');
    expect(container.textContent).not.toContain('補正方法・高速時補正強度・旧方式の事前補正は描画に反映されません');
  });

  it('DynamicTab still notes that speed and pressure opacity are not reflected', () => {
    const { container } = render(<DynamicTab {...tabProps()} />);
    expect(container.textContent).not.toContain('速度:不透明度');
    expect(container.textContent).not.toContain('筆圧:不透明度');
    expect(container.textContent).toContain('速度・筆圧による不透明度変化はベクター輪郭に反映されません');
  });
});
