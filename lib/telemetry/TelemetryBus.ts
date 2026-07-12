// ─── lib/telemetry/TelemetryBus.ts ────────────────────────────────────────────
// Phase E — centralized telemetry dispatcher.
//
// Every subsystem emits events through TelemetryBus.emit() rather than calling
// TelemetryCollector.track() directly. The Bus:
//   1. Validates the event against the registry
//   2. Enriches with timing metadata
//   3. Delegates persistence to TelemetryCollector
//   4. Fires registered listener hooks (e.g. Phase B error hook)
//
// New event types register via registerEventType() — no switch statements needed.

import { track, getEvents } from "./TelemetryCollector";
import type {
  TelemetryEventName,
  TelemetryCategory,
  TelemetryEvent,
} from "./TelemetryTypes";

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface EventTypeMetadata {
  category:    TelemetryCategory;
  description: string;
  schema?:     string[];  // expected property keys (documentation only — not enforced at runtime)
}

const _registry = new Map<string, EventTypeMetadata>();

export function registerEventType(
  name:     string,
  metadata: EventTypeMetadata,
): void {
  _registry.set(name, metadata);
}

export function getRegisteredEventTypes(): Map<string, EventTypeMetadata> {
  return new Map(_registry);
}

export function isRegisteredEvent(name: string): boolean {
  return _registry.has(name);
}

// ─── Listener hooks ───────────────────────────────────────────────────────────

type BusListener = (event: TelemetryEvent) => void;
const _listeners: BusListener[] = [];

export function addBusListener(listener: BusListener): void {
  _listeners.push(listener);
}

export function removeBusListener(listener: BusListener): void {
  const idx = _listeners.indexOf(listener);
  if (idx >= 0) _listeners.splice(idx, 1);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EmitOptions {
  durationMs?: number;
}

export function emit(
  name:       TelemetryEventName,
  properties: Record<string, string | number | boolean> = {},
  opts:       EmitOptions = {},
): void {
  // Persist via TelemetryCollector (handles isClient, storage cap, session)
  track(name, { ...properties, ...(opts.durationMs !== undefined ? { durationMs: opts.durationMs } : {}) });

  // Fire listener hooks (e.g. Phase B error recovery hook reads system events)
  if (_listeners.length > 0) {
    const recent = getEvents({ name, limit: 1 });
    if (recent[0]) {
      for (const listener of _listeners) {
        try { listener(recent[0]); } catch {}
      }
    }
  }
}

// ─── Convenience: timed emit ──────────────────────────────────────────────────
// Wraps a synchronous operation, measures its duration, and emits the event.

export function timedEmit<T>(
  name:       TelemetryEventName,
  properties: Record<string, string | number | boolean>,
  fn:         () => T,
): T {
  const start  = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = fn();
  const durationMs = Math.round(
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - start
  );
  emit(name, { ...properties, durationMs }, { durationMs });
  return result;
}

// ─── Session utilities (forwarded from Collector) ─────────────────────────────

export { getEvents } from "./TelemetryCollector";
