// ─── lib/dev/DebugConsole.ts ──────────────────────────────────────────────────
// Phase 74 — structured debug logging with categories and localStorage ring buffer.

const STORAGE_KEY = "axis_debug_log_v1";
const MAX_ENTRIES = 200;

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Types ─────────────────────────────────────────────────────────────────────

export type LogCategory =
  | "recommendation"
  | "safety"
  | "confidence"
  | "resilience"
  | "performance"
  | "data"
  | "navigation"
  | "general";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface DebugEntry {
  id:         string;
  timestamp:  string;
  level:      LogLevel;
  category:   LogCategory;
  message:    string;
  data?:      unknown;
}

// ── In-memory flag ─────────────────────────────────────────────────────────────

let _enabled = false;

export function enableDebugConsole(): void  { _enabled = true; }
export function disableDebugConsole(): void { _enabled = false; }
export function isDebugEnabled(): boolean   { return _enabled; }

// ── Ring buffer ────────────────────────────────────────────────────────────────

function load(): DebugEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DebugEntry[]) : [];
  } catch { return []; }
}

function save(entries: DebugEntry[]): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function append(entry: DebugEntry): void {
  const entries = load();
  entries.push(entry);
  // trim to MAX_ENTRIES — keep the tail (most recent)
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  save(entries);
}

// ── Public API ─────────────────────────────────────────────────────────────────

function log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
  if (!_enabled) return;
  const entry: DebugEntry = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
  };
  append(entry);
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[Axis:${category}] ${message}`, data ?? "");
  }
}

export const debug = {
  log:  (cat: LogCategory, msg: string, data?: unknown) => log("debug", cat, msg, data),
  info: (cat: LogCategory, msg: string, data?: unknown) => log("info",  cat, msg, data),
  warn: (cat: LogCategory, msg: string, data?: unknown) => log("warn",  cat, msg, data),
  err:  (cat: LogCategory, msg: string, data?: unknown) => log("error", cat, msg, data),
};

// ── Query helpers ──────────────────────────────────────────────────────────────

export function getEntries(opts?: { category?: LogCategory; level?: LogLevel; limit?: number }): DebugEntry[] {
  let entries = load();
  if (opts?.category) entries = entries.filter(e => e.category === opts.category);
  if (opts?.level)    entries = entries.filter(e => e.level    === opts.level);
  entries.reverse(); // most-recent first
  if (opts?.limit)    entries = entries.slice(0, opts.limit);
  return entries;
}

export function clearLog(): void {
  if (isClient()) localStorage.removeItem(STORAGE_KEY);
}

export function getEntryCount(): number { return load().length; }
