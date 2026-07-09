"use client";
// ─── components/resilience/ErrorBoundary.tsx ─────────────────────────────────
// Phase 69 — React error boundary that catches render exceptions gracefully.

import React, { type ReactNode, type ErrorInfo } from "react";

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
        <div className="bg-ui-surface rounded-2xl p-5 text-center space-y-3 border border-ui-border">
          <div className="w-10 h-10 rounded-full bg-orange-900/20 flex items-center justify-center mx-auto">
            <span className="text-orange-400 text-lg">!</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-base">Something unexpected happened.</p>
            <p className="text-xs text-ink-muted mt-1">Your data is safe. Axis has recovered automatically.</p>
          </div>
          <button
            onClick={this.handleReset}
            className="text-xs px-3 py-1.5 bg-brand text-canvas rounded-lg font-medium"
          >
            Continue Training
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
