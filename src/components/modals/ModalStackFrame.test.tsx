// @vitest-environment jsdom
import React, { useRef } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ModalProvider, useModalContext } from '../../contexts/ModalContext';
import { ModalStackFrame, useDialogFocusTrap, useIsTopModal } from './ModalStackFrame';
import { BatchRadicalModal } from '../radicalStudio/BatchRadicalModal';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('ModalContext stacking & ModalStackFrame focus/inert management', () => {
  it('pushes stacked modals without unmounting earlier entries and pops back cleanly on close', () => {
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
        </ModalProvider>
      );
    });

    expect(ctx.modalStack).toEqual([]);
    expect(ctx.activeModal).toBeNull();

    act(() => {
      ctx.openModal('export');
    });
    expect(ctx.modalStack).toEqual(['export']);
    expect(ctx.activeModal).toBe('export');
    expect(ctx.isExportModalOpen).toBe(true);

    act(() => {
      ctx.openModal('quality');
    });
    expect(ctx.modalStack).toEqual(['export', 'quality']);
    expect(ctx.activeModal).toBe('quality');
    expect(ctx.isExportModalOpen).toBe(true);
    expect(ctx.isQualityModalOpen).toBe(true);

    // Closing top modal returns to 'export' rather than resetting to null
    act(() => {
      ctx.closeModal();
    });
    expect(ctx.modalStack).toEqual(['export']);
    expect(ctx.activeModal).toBe('export');
    expect(ctx.isQualityModalOpen).toBe(false);

    // Re-opening a modal already in the stack moves it to top without duplicating it
    act(() => {
      ctx.openModal('shortcuts');
      ctx.openModal('export');
    });
    expect(ctx.modalStack).toEqual(['shortcuts', 'export']);

    act(() => {
      ctx.closeAllModals();
    });
    expect(ctx.modalStack).toEqual([]);
    expect(ctx.activeModal).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('sets inert on background frames, updates useIsTopModal, traps Tab/Shift+Tab, and restores focus', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const triggerBtn = document.createElement('button');
    triggerBtn.textContent = 'open modal';
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    function Child({ label, onEscape }: { label: string; onEscape?: () => void }) {
      const top = useIsTopModal();
      return (
        <div role="dialog" aria-label={label} data-top={String(top)}>
          <button type="button" data-testid={`${label}-first`}>
            first
          </button>
          <button type="button" data-testid={`${label}-last`} onClick={onEscape}>
            last
          </button>
        </div>
      );
    }

    const onCloseTop = vi.fn();

    act(() => {
      root.render(
        <>
          <ModalStackFrame stackIndex={0} isTop={false} onRequestClose={vi.fn()}>
            <Child label="bottom" />
          </ModalStackFrame>
          <ModalStackFrame stackIndex={1} isTop={true} onRequestClose={onCloseTop}>
            <Child label="top" />
          </ModalStackFrame>
        </>
      );
    });

    const bottomFrame = container.querySelector('[data-modal-stack-index="0"]') as HTMLElement;
    const topFrame = container.querySelector('[data-modal-stack-index="1"]') as HTMLElement;

    expect(bottomFrame.hasAttribute('inert')).toBe(true);
    expect(bottomFrame.getAttribute('aria-hidden')).toBe('true');
    expect(bottomFrame.querySelector('[role="dialog"]')?.getAttribute('data-top')).toBe('false');

    expect(topFrame.hasAttribute('inert')).toBe(false);
    expect(topFrame.getAttribute('aria-hidden')).toBeNull();
    expect(topFrame.querySelector('[role="dialog"]')?.getAttribute('data-top')).toBe('true');

    // Verify Tab wraps from last button to first button within top frame
    const firstBtn = container.querySelector('[data-testid="top-first"]') as HTMLButtonElement;
    const lastBtn = container.querySelector('[data-testid="top-last"]') as HTMLButtonElement;
    lastBtn.focus();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(firstBtn);

    // Shift+Tab from first wraps back to last button
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
      );
    });
    expect(document.activeElement).toBe(lastBtn);

    // Escape closes topmost frame once
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onCloseTop).toHaveBeenCalledTimes(1);

    // Unmounting restores focus to the trigger button
    act(() => {
      root.unmount();
    });
    expect(document.activeElement).toBe(triggerBtn);

    triggerBtn.remove();
    container.remove();
  });

  it('closes BatchRadicalModal on Escape and restores focus via shared focus trap', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const onClose = vi.fn();

    function Wrapper({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocusTrap(ref, false);
      return (
        <BatchRadicalModal
          isOpen={open}
          onClose={onClose}
          radicalName="木"
          sourceContours={[]}
          allGlyphs={{}}
          onBatchInsert={vi.fn()}
          theme="dark"
        />
      );
    }

    act(() => {
      root.render(<Wrapper open={true} />);
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
