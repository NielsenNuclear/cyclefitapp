"use client";
// ─── components/resilience/ErrorBoundary.tsx ─────────────────────────────────
// Phase 69 — React error boundary that catches render exceptions gracefully.

import React, { type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
  label?:    string;   // for identification in logs
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Persist error event for ResilienceDashboard
    if (typeof window !== "undefined") {
      try {
        const key = "axis_error_boundary_log_v1";
        const log: { ts: string; label?: string; message: string }[] = JSON.parse(
          localStorage.getItem(key) ?? "[]"
        );
        log.push({ ts: new Date().toISOString(), label: this.props.label, message: error.message });
        localStorage.setItem(key, JSON.stringify(log.slice(-50)));
      } catch {}
    }
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          aria-live="polite"
          className="bg-surface rounded-2xl p-5 text-center space-y-3 border border-border"
        >
          <div className="w-10 h-10 rounded-full bg-caution-bg flex items-center justify-center mx-auto">
            <span className="text-caution text-lg" aria-hidden="true">!</span>
          </div>
          <div>
            <p className="type-body-md font-medium text-ink">Something unexpected happened.</p>
            <p className="type-caption text-ink-muted mt-1">Your data is safe. Axis has recovered automatically.</p>
          </div>
          <Button variant="primary" size="sm" onClick={this.handleReset}>
            Continue Training
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
