// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { CanvasRulersLayer, buildRulerTickPaths } from './CanvasRulersLayer';
import { clearLiveViewport, setLiveViewport } from './viewportStore';

describe('buildRulerTickPaths', () => {
  it('builds horizontal major/minor tick lines at the same positions as the old per-tick lines', () => {
    const { major, minor } = buildRulerTickPaths(
      [
        { value: 0, minor: 100 },
        { value: 200, minor: 300 },
      ],
      40,
      0.5,
      false,
      800
    );
    // Major ticks run from RULER_SIZE-10 (18) to RULER_SIZE (28).
    expect(major).toBe('M40 18V28M140 18V28');
    // Minor ticks run from RULER_SIZE-5 (23) to RULER_SIZE (28).
    expect(minor).toBe('M90 23V28M190 23V28');
  });

  it('builds vertical major/minor tick lines', () => {
    const { major, minor } = buildRulerTickPaths(
      [
        { value: 0, minor: 100 },
        { value: 200, minor: 300 },
      ],
      40,
      0.5,
      true,
      600
    );
    expect(major).toBe('M18 40H28M18 140H28');
    expect(minor).toBe('M23 90H28M23 190H28');
  });

  it('omits minor ticks outside the visible range and returns empty paths for no ticks', () => {
    const outOfRange = buildRulerTickPaths([{ value: 0, minor: -100 }], 40, 0.5, false, 800);
    // Minor position 40 + (-100 * 0.5) = -10 is left of the ruler bar.
    expect(outOfRange.major).toBe('M40 18V28');
    expect(outOfRange.minor).toBe('');
    expect(buildRulerTickPaths([], 40, 0.5, false, 800)).toEqual({ major: '', minor: '' });
  });
});

describe('CanvasRulersLayer tick paths', () => {
  it('renders tick lines as two path strings per axis and keeps the number labels', () => {
    clearLiveViewport();
    setLiveViewport(0.5, { x: 40, y: 40 });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <svg>
          <CanvasRulersLayer showRulers={true} isLight={true} unitsPerEm={1000} width={800} height={600} />
        </svg>
      );
    });

    const topPaths = Array.from(container.querySelectorAll('g[clip-path="url(#topRulerClip)"] path'));
    expect(topPaths.length).toBe(2);
    // Value 0 -> sx 40, value 200 -> sx 140 (40 + 200 * 0.5).
    expect(topPaths[0].getAttribute('d')).toContain('M40 18V28');
    expect(topPaths[0].getAttribute('d')).toContain('M140 18V28');
    expect(topPaths[0].getAttribute('stroke')).toBe('#64748b');
    // Minor of value 0 is 100 -> 40 + 100 * 0.5 = 90.
    expect(topPaths[1].getAttribute('d')).toContain('M90 23V28');
    expect(topPaths[1].getAttribute('stroke')).toBe('#cbd5e1');

    const leftPaths = Array.from(container.querySelectorAll('g[clip-path="url(#leftRulerClip)"] path'));
    expect(leftPaths.length).toBe(2);

    // No per-tick <g> wrappers or <line> tick elements remain; the only
    // <line> in each clip group is the hover indicator.
    const topLines = container.querySelectorAll('g[clip-path="url(#topRulerClip)"] line');
    expect(topLines.length).toBe(1);
    expect(topLines[0].getAttribute('stroke')).toBe('#ef4444');

    // Number labels are still text elements with the same values.
    const topTexts = Array.from(container.querySelectorAll('g[clip-path="url(#topRulerClip)"] text')).map((t) =>
      Number(t.textContent)
    );
    expect(topTexts).toContain(0);
    expect(topTexts).toContain(200);
    expect(topTexts).not.toContain(50);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });
});
