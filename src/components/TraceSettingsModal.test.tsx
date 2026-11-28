// @vitest-environment jsdom
import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { TraceSettingsModal } from './TraceSettingsModal';
import { TraceSettings } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const SELECTED_UNICODE = 0x3042; // あ
const CHAR_IMAGE = 'data:image/png;base64,char-image';
const GLOBAL_IMAGE = 'data:image/png;base64,global-image';

const baseSettings: TraceSettings = {
  enabled: true,
  type: 'image',
  text: '',
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: 1000,
  opacity: 0.8,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

function findButton(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

/** Stateful wrapper that exposes the latest settings for assertions. */
function renderModal(initialSettings: TraceSettings, initialOpen = true) {
  let latestSettings = initialSettings;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const controls: {
    setSettings?: (settings: TraceSettings) => void;
    setOpen?: (open: boolean) => void;
  } = {};

  const Wrapper: React.FC = () => {
    const [current, setCurrent] = useState(initialSettings);
    const [open, setOpen] = useState(initialOpen);
    controls.setSettings = (settings: TraceSettings) => setCurrent(settings);
    controls.setOpen = (nextOpen: boolean) => setOpen(nextOpen);
    latestSettings = current;
    return (
      <TraceSettingsModal
        isOpen={open}
        onClose={vi.fn()}
        traceSettings={current}
        setTraceSettings={setCurrent}
        activeChar="あ"
        selectedUnicode={SELECTED_UNICODE}
        theme="light"
      />
    );
  };

  act(() => {
    root.render(<Wrapper />);
  });

  return {
    container,
    root,
    setSettings: (settings: TraceSettings) => {
      act(() => {
        controls.setSettings?.(settings);
      });
    },
    setOpen: (open: boolean) => {
      act(() => {
        controls.setOpen?.(open);
      });
    },
    getLatestSettings: () => latestSettings,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('TraceSettingsModal image deletion and apply scope', () => {
  it('deleting the displayed per-character image removes only that image', () => {
    const { container, getLatestSettings, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
      charImages: { [SELECTED_UNICODE]: CHAR_IMAGE },
    });

    const deleteButton = findButton(container, '画像を削除');
    expect(deleteButton).toBeTruthy();
    act(() => {
      deleteButton?.click();
    });

    const settings = getLatestSettings();
    expect(settings.charImages?.[SELECTED_UNICODE]).toBeUndefined();
    // The global image is untouched and is now the displayed one.
    expect(settings.imageSrc).toBe(GLOBAL_IMAGE);
    expect(container.textContent).toContain('画像を読み込みました');

    cleanup();
  });

  it('deleting while the global image is displayed removes the global image', () => {
    const { container, getLatestSettings, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
    });

    const deleteButton = findButton(container, '画像を削除');
    expect(deleteButton).toBeTruthy();
    act(() => {
      deleteButton?.click();
    });

    expect(getLatestSettings().imageSrc).toBeUndefined();
    expect(container.textContent).not.toContain('画像を読み込みました');

    cleanup();
  });

  it('starts in char scope when the selected character has its own image', () => {
    const { container, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
      charImages: { [SELECTED_UNICODE]: CHAR_IMAGE },
    });

    const charButton = findButton(container, 'この文字「あ」だけに適用');
    const globalButton = findButton(container, '全体に適用');
    expect(charButton).toBeTruthy();
    expect(globalButton).toBeTruthy();
    // The active scope button carries the active-tool ring classes.
    expect(charButton?.className).toContain('ring-2');
    expect(globalButton?.className).not.toContain('ring-2');

    cleanup();
  });

  it('starts in global scope when the selected character has no own image', () => {
    const { container, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
    });

    const charButton = findButton(container, 'この文字「あ」だけに適用');
    const globalButton = findButton(container, '全体に適用');
    expect(charButton).toBeTruthy();
    expect(globalButton).toBeTruthy();
    expect(charButton?.className).not.toContain('ring-2');
    expect(globalButton?.className).toContain('ring-2');

    cleanup();
  });

  it('re-derives the scope from the current state when reopened', () => {
    const { container, setSettings, setOpen, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
    });

    expect(findButton(container, '全体に適用')?.className).toContain('ring-2');

    // Close the modal, add a per-character image, then reopen.
    setOpen(false);
    setSettings({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
      charImages: { [SELECTED_UNICODE]: CHAR_IMAGE },
    });
    setOpen(true);

    expect(findButton(container, 'この文字「あ」だけに適用')?.className).toContain('ring-2');
    expect(findButton(container, '全体に適用')?.className).not.toContain('ring-2');

    cleanup();
  });

  it('states near the image that it is not saved in the project', () => {
    const { container, cleanup } = renderModal({
      ...baseSettings,
      imageSrc: GLOBAL_IMAGE,
    });

    expect(container.textContent).toContain(
      '下絵画像はプロジェクトに保存されません。リロードやバックアップ復元で消えます。',
    );

    cleanup();
  });
});
