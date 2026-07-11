"use client";
// ─── components/ErrorBoundary/ErrorFallback.tsx ───────────────────────────────
// Phase B — Accessible, calm fallback UI shown when GlobalErrorBoundary catches
// an error. Never exposes stack traces or internal identifiers to users.

import { useRouter }     from "next/navigation";
import { RetryButton }   from "./RetryButton";
import { ErrorDetails }  from "./ErrorDetails";
import type { ErrorLogEntry } from "@/types/ErrorTypes";

interface Props {
  entry:           ErrorLogEntry;
  onRetry:         () => void;
  retryCount:      number;
  isGracefulShutdown: boolean;
  hasInterruptedSession: boolean;
}

export function ErrorFallback({
  entry,
  onRetry,
  retryCount,
  isGracefulShutdown,
  hasInterruptedSession,
}: Props) {
  const router = useRouter();
  const maxRetriesReached = retryCount >= 3;

  return (
    <div
      className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 py-12"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-orange-900/20 flex items-center justify-center mb-5">
        <span className="text-orange-400 text-2xl" aria-hidden="true">!</span>
      </div>

      {/* Headline */}
      <h1 className="text-lg font-semibold text-ink-base text-center mb-2">
        {isGracefulShutdown || maxRetriesReached
          ? "Axis needs to reload."
          : "Something unexpected happened."}
      </h1>

      {/* User message */}
      <p className="text-sm text-ink-subtle text-center max-w-xs leading-relaxed mb-1">
        {entry.userMessage}
      </p>
      <p className="text-xs text-ink-muted text-center mb-6">
        Your data is safe.
      </p>

      {/* Interrupted session notice */}
      {hasInterruptedSession && !isGracefulShutdown && (
        <div className="bg-ui-surface border border-ui-border rounded-xl px-4 py-3 mb-5 max-w-xs w-full">
          <p className="text-xs text-ink-subtle text-center">
            You were in the middle of a workout — your progress has been preserved.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {isGracefulShutdown || maxRetriesReached ? (
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand text-canvas hover:bg-brand/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            autoFocus
          >
            Reload Axis
          </button>
        ) : (
          <>
            <RetryButton
              onClick={onRetry}
              label={`Try again${retryCount > 0 ? ` (${retryCount}/3)` : ""}`}
            />
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-ink-muted hover:text-ink-base transition-colors underline underline-offset-2"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>

      {/* Developer diagnostics */}
      <div className="mt-8 w-full max-w-xs">
        <ErrorDetails entry={entry} />
      </div>
    </div>
  );
}
