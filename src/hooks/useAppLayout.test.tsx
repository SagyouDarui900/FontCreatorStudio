// @vitest-environment jsdom
import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useAppLayout } from './useAppLayout';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function LayoutHarness({
  initial,
  onApi,
}: {
  initial: { grid: boolean; metrics: boolean; radicals: boolean };
  onApi: (api: ReturnType<typeof useAppLayout>) => void;
}) {
  const [showGridDrawer, setShowGridDrawer] = useState(initial.grid);
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(initial.metrics);
  const [showRadicals, setShowRadicals] = useState(initial.radicals);
  const api = useAppLayout({
    showGridDrawer,
    setShowGridDrawer,
    showMetricsDrawer,
    setShowMetricsDrawer,
    showRadicals,
    setShowRadicals,
    showToast: vi.fn(),
  });
  onApi(api);
  return (
    <div
      data-grid={showGridDrawer}
      data-metrics={showMetricsDrawer}
      data-radicals={showRadicals}
    />
  );
}

describe('useAppLayout Zen mode (H11)', () => {
  it('restores the exact drawer layout from before Zen mode instead of only the grid drawer', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useAppLayout>;
    act(() => {
      root.render(
        <LayoutHarness
          initial={{ grid: false, metrics: true, radicals: true }}
          onApi={(next) => {
            api = next;
          }}
        />
      );
    });

    expect(api.isZenMode).toBe(false);

    // Enter Zen mode: everything closes.
    act(() => {
      api.toggleZenMode();
    });
    expect(api.isZenMode).toBe(true);

    // Leave Zen mode: metrics and radicals come back, grid stays closed.
    act(() => {
      api.toggleZenMode();
    });
    expect(api.isZenMode).toBe(false);
    const stateDiv = container.querySelector('div')!;
    expect(stateDiv.getAttribute('data-grid')).toBe('false');
    expect(stateDiv.getAttribute('data-metrics')).toBe('true');
    expect(stateDiv.getAttribute('data-radicals')).toBe('true');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('falls back to opening the grid drawer when there is no pre-Zen layout to restore', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useAppLayout>;
    act(() => {
      root.render(
        <LayoutHarness
          initial={{ grid: false, metrics: false, radicals: false }}
          onApi={(next) => {
            api = next;
          }}
        />
      );
    });

    expect(api.isZenMode).toBe(true);
    act(() => {
      api.toggleZenMode();
    });
    expect(api.isZenMode).toBe(false);
    expect(container.querySelector('div')!.getAttribute('data-grid')).toBe('true');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
