// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ModalProvider, useModalContext } from '../contexts/ModalContext';
import { RadicalsDrawer } from './RadicalsDrawer';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function dispatchEscape(): void {
  window.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

function mountDrawer(onClose: () => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let ctx!: ReturnType<typeof useModalContext>;
  function Probe() {
    ctx = useModalContext();
    return null;
  }
  act(() => {
    root.render(
      <ModalProvider>
        <Probe />
        <RadicalsDrawer
          isOpen={true}
          onClose={onClose}
          onInsertRadical={() => {}}
          currentContours={[]}
          selectedChar=""
          allGlyphs={{}}
          theme="light"
          ascender={800}
          unitsPerEm={1000}
        />
      </ModalProvider>
    );
  });
  return {
    get ctx() {
      return ctx;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('RadicalsDrawer Escape handling', () => {
  it('closes the drawer on Escape when it is open alone', async () => {
    const onClose = vi.fn();
    const h = mountDrawer(onClose);
    try {
      act(() => {
        dispatchEscape();
      });
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      h.unmount();
    }
  });

  it('does not close when another handler already claimed the Escape key', async () => {
    const onClose = vi.fn();
    const h = mountDrawer(onClose);
    // A handler registered after the drawer's (e.g. a modal opened above
    // it) claims the key via preventDefault.
    const claimKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', claimKey);
    try {
      act(() => {
        dispatchEscape();
      });
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', claimKey);
      h.unmount();
    }
  });

  it('does not close while a ModalContext modal is open, and closes again after it closes', async () => {
    const onClose = vi.fn();
    const h = mountDrawer(onClose);
    try {
      act(() => {
        h.ctx.openModal('fontInfo');
      });
      expect(h.ctx.modalStack).toEqual(['fontInfo']);

      act(() => {
        dispatchEscape();
      });
      await flush();
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        h.ctx.closeModal();
      });
      act(() => {
        dispatchEscape();
      });
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      h.unmount();
    }
  });

  it('does not close while its own license modal is open', async () => {
    const onClose = vi.fn();
    const h = mountDrawer(onClose);
    try {
      // Open the bundled-fonts license modal from the drawer header.
      const licenseButton = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('OFL 1.1 ライセンス一覧')
      );
      expect(licenseButton).toBeDefined();
      act(() => {
        licenseButton!.click();
      });
      act(() => {
        dispatchEscape();
      });
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      h.unmount();
    }
  });
});
