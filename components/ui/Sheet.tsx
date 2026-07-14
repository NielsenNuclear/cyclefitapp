"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./useFocusTrap";

// ── Sheet ─────────────────────────────────────────────────────────────────
// Slide-in panel — from the right on desktop-style layouts, or from the
// bottom for mobile-style detail sheets. Same focus-trap/Escape/scroll-lock
// behavior as Dialog; use Sheet instead of Dialog when the content is a
// drill-in detail view rather than a centered confirmation/form.

export type SheetSide = "right" | "bottom";

const SIDE_CLS: Record<SheetSide, { position: string; enter: string; exit: string }> = {
  right:  { position: "inset-y-0 right-0 w-full max-w-sm",   enter: "translate-x-0", exit: "translate-x-full" },
  bottom: { position: "inset-x-0 bottom-0 max-h-[85vh]",     enter: "translate-y-0", exit: "translate-y-full" },
};

interface SheetProps {
  isOpen:           boolean;
  onClose:          () => void;
  side?:            SheetSide;
  title?:           string;
  children:         React.ReactNode;
  className?:       string;
  /** Show a drag-handle bar instead of (or alongside) a title — the standard
   *  affordance for a `side="bottom"` sheet. */
  showHandle?:      boolean;
  /** Pad the content area (default true). Set false when the child already
   *  manages its own padding — e.g. a component reused unpadded elsewhere
   *  (a static side panel) that would otherwise get inconsistent spacing
   *  between its two contexts. */
  bodyPadding?:     boolean;
  /** Wraps the entire sheet (backdrop included) in a container with this
   *  className — for responsive cases where the sheet must not exist at all
   *  above a breakpoint (e.g. "lg:hidden"), not just be visually hidden while
   *  still dimming the page behind it. */
  wrapperClassName?: string;
}

export function Sheet({
  isOpen, onClose, side = "right", title, children,
  className = "", showHandle = false, bodyPadding = true, wrapperClassName = "",
}: SheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onEscape: onClose });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  if (!mounted) return null;

  const { position, enter, exit } = SIDE_CLS[side];
  const titleId = title ? "sheet-title" : undefined;
  const roundedCls = side === "bottom" ? "rounded-t-2xl" : "";

  return createPortal(
    <div className={wrapperClassName}>
      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-normal ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-labelledby={titleId}
        className={`
          fixed z-50 ${position} ${roundedCls}
          bg-surface shadow-modal border border-border
          flex flex-col
          transform transition-transform duration-slow ease-out
          ${isOpen ? enter : exit}
          ${className}
        `}
      >
        {showHandle && (
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-ink-faint" />
          </div>
        )}
        {title && (
          <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
            <h2 id={titleId} className="type-card-title text-ink">{title}</h2>
          </div>
        )}
        <div className={`flex-1 overflow-y-auto min-h-0 ${bodyPadding ? "p-5" : ""}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
