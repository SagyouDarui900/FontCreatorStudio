// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { DesktopGridMenuPopover } from './DesktopGridMenuPopover';
import { GridSettings } from '../../types';
import { getThemeClasses } from '../../utils/theme';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const BASE_SETTINGS: GridSettings = {
  showGrid: true,
  gridSize: 50,
  snapToGrid: true,
  snapToPoints: true,
  showMetrics: true,
  showPoints: true,
  showHandles: true,
};

function findGuideSnapButton(): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('ガイド線に吸着')
  ) as HTMLButtonElement | undefined;
}

function renderPopover(
  settings: GridSettings,
  onSet: React.Dispatch<React.SetStateAction<GridSettings>>
) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <DesktopGridMenuPopover
        isOpen={true}
        anchorTop={100}
        onClose={vi.fn()}
        gridSettings={settings}
        setGridSettings={onSet}
        themeClasses={getThemeClasses('dark')}
        isLight={false}
      />
    );
  });
  return { host, root };
}

describe('DesktopGridMenuPopover guide snap toggle', () => {
  it('shows ON when snapToGuides is unset (default on) and clicking turns it off', () => {
    const onSet = vi.fn<(updater: React.SetStateAction<GridSettings>) => void>();
    const { host, root } = renderPopover(BASE_SETTINGS, onSet);

    const button = findGuideSnapButton();
    expect(button).toBeDefined();
    expect(button?.textContent).toContain('ON');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onSet).toHaveBeenCalledTimes(1);
    const updater = onSet.mock.calls[0][0] as (prev: GridSettings) => GridSettings;
    expect(updater(BASE_SETTINGS).snapToGuides).toBe(false);

    act(() => {
      root.unmount();
    });
    host.remove();
  });

  it('shows OFF when snapToGuides is false and clicking turns it back on', () => {
    const onSet = vi.fn<(updater: React.SetStateAction<GridSettings>) => void>();
    const settings: GridSettings = { ...BASE_SETTINGS, snapToGuides: false };
    const { host, root } = renderPopover(settings, onSet);

    const button = findGuideSnapButton();
    expect(button).toBeDefined();
    expect(button?.textContent).toContain('OFF');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const updater = onSet.mock.calls[0][0] as (prev: GridSettings) => GridSettings;
    expect(updater(settings).snapToGuides).toBe(true);

    act(() => {
      root.unmount();
    });
    host.remove();
  });
});
