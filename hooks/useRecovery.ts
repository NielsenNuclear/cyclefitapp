"use client";
// ─── hooks/useRecovery.ts ─────────────────────────────────────────────────────
// Phase B — React hook exposing recovery state to components inside
// a GlobalErrorBoundary. Components read this to show recovery context.

import { useState, useCallback } from "react";

export interface RecoveryState {
  isRecovering:   boolean;
  retryCount:     number;
  userMessage:    string | null;
  hasInterrupted: boolean;    // there was an in-progress session before the crash
}

export interface RecoveryControls {
  state:   RecoveryState;
  retry:   () => void;
  dismiss: () => void;
}

const DEFAULT_STATE: RecoveryState = {
  isRecovering:   false,
  retryCount:     0,
  userMessage:    null,
  hasInterrupted: false,
};

/** Lightweight recovery state manager for use inside the ErrorFallback UI. */
export function useRecovery(onRetry?: () => void): RecoveryControls {
  const [state, setState] = useState<RecoveryState>(DEFAULT_STATE);

  const retry = useCallback(() => {
    setState(s => ({ ...s, isRecovering: true, retryCount: s.retryCount + 1 }));
    onRetry?.();
    // If onRetry causes a re-render via parent state, isRecovering resets naturally.
    // Fallback: reset after a short delay.
    setTimeout(() => setState(s => ({ ...s, isRecovering: false })), 1000);
  }, [onRetry]);

  const dismiss = useCallback(() => setState(DEFAULT_STATE), []);

  return { state, retry, dismiss };
}
