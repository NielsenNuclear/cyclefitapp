// ─── lib/storage/safe.ts ─────────────────────────────────────────────────────
// 51B — Safe Storage Wrappers
// All localStorage reads/writes should go through these helpers to prevent
// SSR crashes, JSON parse errors, and schema mismatches from crashing the app.

function isClient(): boolean { return typeof window !== "undefined"; }

export function safeRead<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function safeWrite<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function safeRemove(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// Returns all axis_* keys that are older than cutoffDate.
// Useful for targeted pruning without touching keys managed by other systems.
export function getExpiredKeys(cutoffDate: Date): string[] {
  if (!isClient()) return [];
  const expired: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("axis_")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const dateStr = (parsed.savedAt ?? parsed.date ?? parsed.updatedAt ?? "") as string;
        if (dateStr && new Date(dateStr + "T12:00:00") < cutoffDate) {
          expired.push(key);
        }
      } catch {}
    }
  } catch {}
  return expired;
}
