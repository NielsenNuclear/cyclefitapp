"use client";
// ─── components/ErrorBoundary/RetryButton.tsx ─────────────────────────────────
// Phase B — Accessible retry control. Auto-focuses on mount.

import { useEffect, useRef } from "react";

interface Props {
  onClick:   () => void;
  label?:    string;
  disabled?: boolean;
}

export function RetryButton({ onClick, label = "Try again", disabled = false }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        px-4 py-2 rounded-xl text-sm font-semibold transition-colors
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-brand
        ${disabled
          ? "bg-ui-muted text-ink-muted cursor-not-allowed"
          : "bg-brand text-canvas hover:bg-brand/90 active:scale-[0.98]"
        }
      `}
    >
      {label}
    </button>
  );
}
