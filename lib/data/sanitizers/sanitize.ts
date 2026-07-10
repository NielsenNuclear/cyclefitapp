// ─── lib/data/sanitizers/sanitize.ts ─────────────────────────────────────────
// Phase 70 — input sanitization. Corrects common issues before storage.

// ── Numeric ───────────────────────────────────────────────────────────────────

export function clampNumber(value: number, min: number, max: number): number {
  if (!isFinite(value) || isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeScore(value: unknown): number | null {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return null;
  return clampNumber(n, 0, 100);
}

export function sanitizeVolumeScale(value: unknown): number | null {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return null;
  return clampNumber(n, 0, 2.0);
}

export function sanitizeConfidence(value: unknown): number | null {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return null;
  return clampNumber(n, 0, 1);
}

export function sanitizeStressLevel(value: unknown): number | null {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return null;
  return clampNumber(n, 0, 10);
}

export function sanitizeSleep(hours: unknown): number | null {
  const n = Number(hours);
  if (!isFinite(n) || isNaN(n)) return null;
  if (n < 0) return null;     // reject negative
  return clampNumber(n, 0, 24);
}

export function sanitizeDuration(minutes: unknown): number | null {
  const n = Number(minutes);
  if (!isFinite(n) || isNaN(n)) return null;
  if (n < 0) return null;     // reject negative
  return clampNumber(n, 0, 720);
}

export function sanitizeWeight(kg: unknown): number | null {
  const n = Number(kg);
  if (!isFinite(n) || isNaN(n)) return null;
  if (n < 0) return null;     // reject negative
  return clampNumber(n, 0, 500);
}

// ── String ────────────────────────────────────────────────────────────────────

export function sanitizeString(
  value:     unknown,
  maxLength = 2000,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

export function sanitizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ── IDs ───────────────────────────────────────────────────────────────────────

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function deduplicateByKey<T>(items: T[], key: keyof T): T[] {
  const seen = new Set<unknown>();
  return items.filter(item => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Array ─────────────────────────────────────────────────────────────────────

export function sanitizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

// ── Object deep-clean ─────────────────────────────────────────────────────────

export function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
