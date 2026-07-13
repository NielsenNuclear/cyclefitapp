"use client";
import { useEffect, useRef } from "react";

// ── useFocusTrap ──────────────────────────────────────────────────────────
// Keeps keyboard focus inside a container while `active` is true: Tab/Shift+Tab
// wrap at the container's first/last focusable element, Escape invokes
// `onEscape`, and focus is restored to whatever was focused before activation
// once the trap deactivates. Used by Dialog/Sheet — any overlay that must not
// leak focus into the page behind it.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  active:        boolean;
  onEscape?:     () => void;
  initialFocus?: React.RefObject<HTMLElement | null>;
}

export function useFocusTrap<T extends HTMLElement>({
  active,
  onEscape,
  initialFocus,
}: UseFocusTrapOptions) {
  const containerRef      = useRef<T>(null);
  const previousFocusRef  = useRef<HTMLElement | null>(null);

  // Latest callback/ref via a mutable ref, read inside the handler — kept out
  // of the effect's dependency array on purpose. onEscape is very often an
  // inline arrow function from the caller; if it were a dependency, every
  // parent re-render while the trap is active (not just open/close) would
  // re-run the effect below and re-steal focus to the first element,
  // clobbering whatever the user was doing inside the trap.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const toFocus = initialFocus?.current
      ?? container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ?? container;
    toFocus?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEscape read via ref; initialFocus is a stable ref object
  }, [active]);

  return containerRef;
}
