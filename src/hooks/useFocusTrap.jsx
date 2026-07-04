import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Traps keyboard focus within a container element while active.
 * - Moves focus to the first focusable element on activation
 * - Traps Tab / Shift+Tab to cycle within the container
 * - Restores focus to the previously focused element on deactivation
 */
export default function useFocusTrap(containerRef, active) {
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    previouslyFocusedRef.current = document.activeElement;

    const focusables = container.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const els = container.querySelectorAll(FOCUSABLE_SELECTORS);
      if (els.length === 0) return;

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedRef.current?.isConnected && typeof previouslyFocusedRef.current.focus === 'function') {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active, containerRef]);
}