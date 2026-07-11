"use client";
// ─── components/dev/DevToolsPanel.tsx ────────────────────────────────────────
// Phase 74 — feature flags, debug console, and mock data generator.

import { useState, useEffect, useCallback } from "react";
import {
  getAllFlags,
  setFlag,
  resetAllFlags,
  type ResolvedFlag,
} from "@/lib/dev/FeatureFlags";
import {
  getEntries,
  clearLog,
  getEntryCount,
  enableDebugConsole,
  disableDebugConsole,
  isDebugEnabled,
  type DebugEntry,
  type LogCategory,
} from "@/lib/dev/DebugConsole";
import {
  injectMockData,
  clearMockData,
  isMockDataInjected,
} from "@/lib/dev/MockDataGenerator";

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOG_LEVEL_COLOR: Record<DebugEntry["level"], string> = {
  debug: "text-ink-muted",
  info:  "text-sky-400",
  warn:  "text-yellow-400",
  error: "text-red-400",
};

const CATEGORIES: LogCategory[] = [
  "recommendation", "safety", "confidence", "resilience",
  "performance", "data", "navigation", "general",
];

// ── Feature Flags sub-pane ────────────────────────────────────────────────────

function FeatureFlagsPane() {
  const [flags, setFlags] = useState<ResolvedFlag[]>(() => getAllFlags());

  function toggle(id: ResolvedFlag["id"], value: boolean) {
    setFlag(id, value);
    setFlags(getAllFlags());
  }

  function reset() {
    resetAllFlags();
    setFlags(getAllFlags());
  }

  const overrideCount = flags.filter(f => f.overridden).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">{overrideCount} flag{overrideCount !== 1 ? "s" : ""} overridden</p>
        {overrideCount > 0 && (
          <button onClick={reset} className="text-xs text-red-400 hover:text-red-300">
            Reset all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {flags.map(flag => (
          <div key={flag.id} className="flex items-start gap-3 bg-ui-surface rounded-xl p-3">
            <button
              onClick={() => toggle(flag.id, !flag.currentValue)}
              className={`mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${
                flag.currentValue ? "bg-brand" : "bg-ui-muted"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                flag.currentValue ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-base">{flag.label}</p>
                {flag.overridden && (
                  <span className="text-xs bg-yellow-900/40 text-yellow-300 rounded px-1">overridden</span>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-0.5">{flag.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Debug Console sub-pane ────────────────────────────────────────────────────

function DebugConsolePane() {
  const [enabled, setEnabled] = useState(isDebugEnabled);
  const [category, setCategory] = useState<LogCategory | "all">("all");
  const [entries, setEntries]   = useState<DebugEntry[]>([]);
  const [count, setCount]       = useState(getEntryCount);

  const refresh = useCallback(() => {
    const opts = category !== "all" ? { category: category as LogCategory, limit: 100 } : { limit: 100 };
    setEntries(getEntries(opts));
    setCount(getEntryCount());
  }, [category]);

  useEffect(() => { refresh(); }, [refresh]);

  function toggleEnabled() {
    if (enabled) disableDebugConsole(); else enableDebugConsole();
    setEnabled(!enabled);
  }

  function handleClear() {
    clearLog();
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEnabled}
            className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? "bg-brand" : "bg-ui-muted"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <p className="text-sm text-ink-muted">{enabled ? "Logging on" : "Logging off"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="text-xs text-ink-muted hover:text-ink-base">Refresh</button>
          <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">Clear</button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setCategory("all")}
          className={`px-2 py-1 rounded text-xs whitespace-nowrap ${category === "all" ? "bg-brand text-white" : "bg-ui-surface text-ink-muted"}`}
        >
          All ({count})
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${category === c ? "bg-brand text-white" : "bg-ui-surface text-ink-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-ink-muted text-center py-4">
          {enabled ? "No entries yet. Start the app to capture logs." : "Enable logging to capture debug output."}
        </p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {entries.map(entry => (
            <div key={entry.id} className="bg-ui-surface rounded-lg p-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-mono font-semibold ${LOG_LEVEL_COLOR[entry.level]}`}>
                  {entry.level.toUpperCase()}
                </span>
                <span className="text-xs text-ink-muted">[{entry.category}]</span>
                <span className="text-xs text-ink-muted">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-ink-base">{entry.message}</p>
              {entry.data !== undefined && (
                <pre className="text-xs text-ink-muted mt-1 overflow-x-auto">
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mock Data sub-pane ────────────────────────────────────────────────────────

function MockDataPane() {
  const [injected, setInjected] = useState(isMockDataInjected);
  const [workoutCount, setWorkoutCount] = useState(60);
  const [message, setMessage] = useState<string | null>(null);

  function inject() {
    try {
      injectMockData({ workouts: workoutCount });
      setInjected(true);
      setMessage(`Injected ${workoutCount} mock workouts + 30 recovery check-ins + cycle data.`);
    } catch (e) {
      setMessage(`Error: ${String(e)}`);
    }
  }

  function clear() {
    clearMockData();
    setInjected(false);
    setMessage("Mock data cleared.");
  }

  return (
    <div className="space-y-3">
      <div className="bg-ui-surface rounded-xl p-3">
        <p className="text-sm font-medium text-ink-base mb-1">Inject Mock Workout History</p>
        <p className="text-xs text-ink-muted mb-3">
          Injects synthetic workout history, recovery check-ins, and cycle data for testing.
          All mock data is tagged and can be cleared independently.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-ink-muted">Workouts:</label>
          {[20, 60, 100, 200].map(n => (
            <button
              key={n}
              onClick={() => setWorkoutCount(n)}
              className={`px-2 py-1 rounded text-xs ${workoutCount === n ? "bg-brand text-white" : "bg-ui-muted text-ink-muted"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={inject}
            className="flex-1 py-2 rounded-lg bg-brand text-white text-sm font-medium"
          >
            Inject Mock Data
          </button>
          {injected && (
            <button
              onClick={clear}
              className="flex-1 py-2 rounded-lg bg-red-900/40 text-red-400 text-sm font-medium border border-red-500/30"
            >
              Clear Mock Data
            </button>
          )}
        </div>
      </div>

      {injected && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3">
          <p className="text-xs text-yellow-300 font-semibold">Mock data is active</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Mock data is stored in separate keys and does not affect your real profile data.
          </p>
        </div>
      )}

      {message && (
        <p className="text-xs text-ink-muted">{message}</p>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type DevPane = "flags" | "console" | "mock";

export function DevToolsPanel() {
  const [pane, setPane] = useState<DevPane>("flags");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["flags", "console", "mock"] as DevPane[]).map(p => (
          <button
            key={p}
            onClick={() => setPane(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pane === p ? "bg-brand text-white" : "bg-ui-surface text-ink-muted hover:text-ink-base"
            }`}
          >
            {p === "flags" ? "Feature Flags" : p === "console" ? "Debug Console" : "Mock Data"}
          </button>
        ))}
      </div>

      {pane === "flags"   && <FeatureFlagsPane />}
      {pane === "console" && <DebugConsolePane />}
      {pane === "mock"    && <MockDataPane />}
    </div>
  );
}
