// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, requestConfirm } from './ConfirmDialog';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === label
  ) as HTMLButtonElement | undefined;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ConfirmDialog (window.confirm replacement)', () => {
  it('renders the message and resolves true when OK is clicked', async () => {
    let result: Promise<boolean>;
    act(() => {
      result = requestConfirm('「ぁ」には既に字形があります。上書きしますか？');
    });
    await flush();

    expect(document.body.textContent).toContain(
      '「ぁ」には既に字形があります。上書きしますか？'
    );
    const ok = findButton('OK');
    expect(ok).toBeDefined();
    act(() => {
      ok!.click();
    });
    await expect(result!).resolves.toBe(true);
    await flush();
    expect(document.body.textContent).not.toContain(
      '「ぁ」には既に字形があります。上書きしますか？'
    );
  });

  it('resolves false when Cancel is clicked and removes the dialog', async () => {
    let result: Promise<boolean>;
    act(() => {
      result = requestConfirm('保存されていない変更があります。閉じますか？');
    });
    await flush();

    const cancel = findButton('キャンセル');
    expect(cancel).toBeDefined();
    act(() => {
      cancel!.click();
    });
    await expect(result!).resolves.toBe(false);
    await flush();
    expect(document.body.textContent).not.toContain(
      '保存されていない変更があります。閉じますか？'
    );
  });

  it('resolves false on Escape and stops the key so background handlers do not run', async () => {
    const background = vi.fn();
    window.addEventListener('keydown', background);
    let result: Promise<boolean>;
    try {
      act(() => {
        result = requestConfirm('閉じますか？');
      });
      await flush();

      act(() => {
        window.dispatchEvent(
          new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        );
      });
      await expect(result!).resolves.toBe(false);
      // The dialog claims Escape in the capture phase, so a background
      // Escape handler never sees this key press.
      expect(background).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', background);
    }
  });

  it('shows queued confirms one at a time', async () => {
    let first: Promise<boolean>;
    let second: Promise<boolean>;
    act(() => {
      first = requestConfirm('1件目ですか？');
      second = requestConfirm('2件目ですか？');
    });
    await flush();

    // Only the first confirm is visible while it is unresolved.
    expect(document.body.textContent).toContain('1件目ですか？');
    expect(document.body.textContent).not.toContain('2件目ですか？');

    act(() => {
      findButton('OK')!.click();
    });
    await expect(first!).resolves.toBe(true);
    await flush();

    expect(document.body.textContent).toContain('2件目ですか？');
    act(() => {
      findButton('キャンセル')!.click();
    });
    await expect(second!).resolves.toBe(false);
    await flush();
  });

  it('renders inline with custom labels and calls onConfirm / onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <ConfirmDialog
          message="削除しますか？"
          confirmLabel="削除する"
          cancelLabel="やめる"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    });
    expect(findButton('削除する')).toBeDefined();
    expect(findButton('やめる')).toBeDefined();
    act(() => {
      findButton('削除する')!.click();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
