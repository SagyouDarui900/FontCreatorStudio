// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { FontInfoModal } from './FontInfoModal';
import { FontProject } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const DISCARD_MESSAGE =
  '保存されていない変更があります。閉じると変更は破棄されます。閉じますか？';

function makeProject(): FontProject {
  return {
    id: 'proj-1',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function mount(onClose: () => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const project = makeProject();
  act(() => {
    root.render(
      <FontInfoModal
        isOpen={true}
        onClose={onClose}
        project={project}
        setProject={() => {}}
        theme="light"
      />
    );
  });
  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === label
  ) as HTMLButtonElement | undefined;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )!.set!;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('FontInfoModal unsaved-changes confirmation', () => {
  it('closes directly without a dialog when nothing was edited', () => {
    const onClose = vi.fn();
    const h = mount(onClose);
    try {
      const closeButton = document.querySelector(
        'button[aria-label="閉じる"]'
      ) as HTMLButtonElement;
      expect(closeButton).toBeDefined();
      act(() => {
        closeButton.click();
      });
      expect(document.body.textContent).not.toContain(DISCARD_MESSAGE);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      h.unmount();
    }
  });

  it('asks with the custom dialog when dirty, cancels on Cancel, closes on OK', async () => {
    const onClose = vi.fn();
    const h = mount(onClose);
    try {
      // Edit the family name so the form becomes dirty.
      const nameInput = document.querySelector(
        'input[placeholder="例: MyCustomFont"]'
      ) as HTMLInputElement;
      expect(nameInput).toBeDefined();
      act(() => {
        setInputValue(nameInput, 'ChangedFont');
      });
      expect(nameInput.value).toBe('ChangedFont');

      const closeButton = document.querySelector(
        'button[aria-label="閉じる"]'
      ) as HTMLButtonElement;
      act(() => {
        closeButton.click();
      });
      await flush();

      expect(document.body.textContent).toContain(DISCARD_MESSAGE);
      expect(onClose).not.toHaveBeenCalled();

      // Cancel keeps the modal open.
      act(() => {
        findButton('キャンセル')!.click();
      });
      await flush();
      expect(document.body.textContent).not.toContain(DISCARD_MESSAGE);
      expect(onClose).not.toHaveBeenCalled();

      // Asking again and confirming closes the modal.
      act(() => {
        closeButton.click();
      });
      await flush();
      expect(document.body.textContent).toContain(DISCARD_MESSAGE);
      act(() => {
        findButton('OK')!.click();
      });
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      h.unmount();
    }
  });
});
