"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./useFocusTrap";

// ── Dialog ────────────────────────────────────────────────────────────────
// Centered modal overlay: focus-trapped, closes on Escape or backdrop click,
// restores focus to the trigger on close, locks body scroll while open.
// Portaled to document.body so it isn't clipped by an ancestor's overflow.

export type DialogSize = "sm" | "md" | "lg";

const SIZE_CLS: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

interface DialogProps {
  isOpen:     boolean;
  onClose:    () => void;
  title?:     string;
  size?:      DialogSize;
  children:   React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, size = "md", children, className = "" }: DialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onEscape: onClose });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const titleId = title ? "dialog-title" : undefined;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 transition-opacity duration-normal"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          relative w-full ${SIZE_CLS[size]}
          bg-surface rounded-2xl shadow-modal border border-border
          max-h-[85vh] overflow-y-auto
          ${className}
        `}
      >
        {title && (
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h2 id={titleId} className="type-card-title text-ink">{title}</h2>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
