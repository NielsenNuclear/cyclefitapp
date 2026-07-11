"use client";
// ─── components/ErrorBoundary/GlobalErrorBoundary.tsx ────────────────────────
// Phase B — Root-level React Error Boundary. Wraps the entire application.
// Extends the Phase 69 ErrorBoundary pattern with the full Phase B recovery
// framework: classification, logging, session snapshot, telemetry hooks.
//
// React requires Error Boundaries to be class components.

import React, { type ReactNode, type ErrorInfo } from "react";
import { ErrorFallback }        from "./ErrorFallback";
import {
  recordError,
  markRecoveryComplete,
}                                from "@/lib/errorRecovery/RecoveryManager";
import { detectInterruptedSession } from "@/lib/errorRecovery/SessionRecovery";
import type { ErrorLogEntry }    from "@/types/ErrorTypes";

// ─── Props & State ────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  label?:   string;   // identifier for logging
}

interface State {
  hasError:              boolean;
  entry:                 ErrorLogEntry | null;
  retryCount:            number;
  hasInterruptedSession: boolean;
}

// ─── GlobalErrorBoundary ──────────────────────────────────────────────────────

export class GlobalErrorBoundary extends React.Component<Props, State> {
  private recoveryStart = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError:              false,
      entry:                 null,
      retryCount:            0,
      hasInterruptedSession: false,
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.recoveryStart = performance.now();

    const { retryCount } = this.state;
    const label = this.props.label ?? "GlobalErrorBoundary";

    const entry = recordError(error, label, retryCount);
    const hasInterruptedSession = detectInterruptedSession();

    this.setState({ entry, hasInterruptedSession });
    // Auto-recovery is offered via the fallback UI; the boundary does not
    // reset itself without explicit user action so the user sees confirmation
    // that Axis caught the error before continuing.
  }

  handleRetry = (): void => {
    const durationMs = performance.now() - this.recoveryStart;
    markRecoveryComplete(
      this.props.label ?? "GlobalErrorBoundary",
      true,
      durationMs,
    );
    this.setState(s => ({
      hasError:   false,
      entry:      null,
      retryCount: s.retryCount + 1,
    }));
  };

  render() {
    const { hasError, entry, retryCount, hasInterruptedSession } = this.state;

    if (!hasError || !entry) {
      return this.props.children;
    }

    const isGraceful = entry.strategyId === "graceful_shutdown" || !entry.recoverable;

    return (
      <ErrorFallback
        entry={entry}
        onRetry={this.handleRetry}
        retryCount={retryCount}
        isGracefulShutdown={isGraceful}
        hasInterruptedSession={hasInterruptedSession}
      />
    );
  }
}
