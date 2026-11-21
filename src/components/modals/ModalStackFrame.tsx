import React, { createContext, useContext, useEffect, useRef } from 'react';

interface ModalFrameContextValue {
  isTop: boolean;
}

const ModalFrameContext = createContext<ModalFrameContextValue>({ isTop: true });

/**
 * Returns whether the calling component sits inside the topmost modal stack frame.
 * Defaults to `true` when rendered standalone outside AppModalsHost so unit tests
 * and direct modal renders keep working identically.
 */
export function useIsTopModal(): boolean {
  return useContext(ModalFrameContext).isTop;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  'a[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return false;
    }
    return true;
  });
}

/**
 * Shared dialog focus trap + focus restoration + fallback Escape handler.
 * Works both for stacked modals in AppModalsHost and standalone portal dialogs.
 */
export function useDialogFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscapeFallback?: () => void
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const escapeCallbackRef = useRef(onEscapeFallback);
  escapeCallbackRef.current = onEscapeFallback;

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (previouslyFocused && !containerRef.current?.contains(previouslyFocused)) {
      previousFocusRef.current = previouslyFocused;
    }

    const focusDialog = () => {
      const root = containerRef.current;
      if (!root) return;
      if (document.activeElement && root.contains(document.activeElement)) {
        return;
      }
      const focusables = getFocusableElements(root);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
        return;
      }
      const dialogEl = root.querySelector<HTMLElement>('[role="dialog"]') ?? root;
      if (!dialogEl.hasAttribute('tabindex')) {
        dialogEl.setAttribute('tabindex', '-1');
      }
      dialogEl.focus({ preventScroll: true });
    };

    // Wait a microtask/frame so lazy children / autofocus inputs mount first
    const rafId =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(focusDialog)
        : window.setTimeout(focusDialog, 0);

    const handleTabKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;

      const focusables = getFocusableElements(root);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !root.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const handleEscapeBubble = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || e.repeat) return;
      if (!escapeCallbackRef.current) return;
      e.preventDefault();
      escapeCallbackRef.current();
    };

    window.addEventListener('keydown', handleTabKeyDown, true);
    window.addEventListener('keydown', handleEscapeBubble);

    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      } else {
        clearTimeout(rafId);
      }
      window.removeEventListener('keydown', handleTabKeyDown, true);
      window.removeEventListener('keydown', handleEscapeBubble);
    };
  }, [containerRef, isActive]);

  // Restore focus when the modal unmounts / closes completely
  useEffect(() => {
    return () => {
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && prev.isConnected && typeof prev.focus === 'function') {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          prev.focus();
        }
      }
    };
  }, []);
}

interface ModalStackFrameProps {
  stackIndex: number;
  isTop: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

export const ModalStackFrame: React.FC<ModalStackFrameProps> = ({
  stackIndex,
  isTop,
  onRequestClose,
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(frameRef, isTop, onRequestClose);

  // Apply the `inert` attribute via DOM ref when backgrounded so assistive tech,
  // pointer events, and browser tab order cannot reach occluded stacked frames.
  useEffect(() => {
    const el = frameRef.current as (HTMLDivElement & { inert?: boolean }) | null;
    if (!el) return;
    if (!isTop) {
      el.setAttribute('inert', '');
      el.inert = true;
    } else {
      el.removeAttribute('inert');
      el.inert = false;
    }
  }, [isTop]);

  return (
    <ModalFrameContext.Provider value={{ isTop }}>
      <div
        ref={frameRef}
        data-modal-stack-index={stackIndex}
        data-modal-top={isTop ? 'true' : 'false'}
        aria-hidden={!isTop || undefined}
        className={isTop ? 'fixed inset-0' : 'fixed inset-0 pointer-events-none'}
        style={{ zIndex: 60 + stackIndex * 2 }}
      >
        {children}
      </div>
    </ModalFrameContext.Provider>
  );
};
