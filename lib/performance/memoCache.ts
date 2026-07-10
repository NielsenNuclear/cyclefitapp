// ─── lib/performance/memoCache.ts ────────────────────────────────────────────
// Phase 71 — lightweight, TTL-aware memoization utility. Framework-agnostic.

export interface CacheEntry<T> {
  value:     T;
  expiresAt: number;   // ms timestamp
}

export interface MemoCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
  size(): number;
  keys(): string[];
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;   // 5 minutes (aligns with prompt-cache TTL)
const MAX_SIZE       = 200;

export function createMemoCache<T>(
  maxSize: number = MAX_SIZE,
  defaultTtlMs: number = DEFAULT_TTL_MS,
): MemoCache<T> {
  const _store = new Map<string, CacheEntry<T>>();

  function evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of _store) {
      if (v.expiresAt <= now) _store.delete(k);
    }
  }

  function evictOldest(): void {
    const entries = [..._store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    while (_store.size >= maxSize && entries.length > 0) {
      const oldest = entries.shift()!;
      _store.delete(oldest[0]);
    }
  }

  return {
    get(key: string): T | undefined {
      const entry = _store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        _store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T, ttlMs: number = defaultTtlMs): void {
      evictExpired();
      if (_store.size >= maxSize) evictOldest();
      _store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    delete(key: string): void { _store.delete(key); },
    clear():             void { _store.clear(); },
    size():            number { evictExpired(); return _store.size; },
    keys():          string[] { evictExpired(); return [..._store.keys()]; },
  };
}

// ── Function memoization ──────────────────────────────────────────────────────

export function memoize<A extends unknown[], R>(
  fn:     (...args: A) => R,
  options?: {
    ttlMs?:    number;
    keyFn?:    (...args: A) => string;
    maxSize?:  number;
  },
): (...args: A) => R {
  const cache  = createMemoCache<R>(options?.maxSize, options?.ttlMs);
  const keyFn  = options?.keyFn ?? ((...args) => JSON.stringify(args));

  return (...args: A): R => {
    const key = keyFn(...args);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// ── Shared caches for cross-component use ─────────────────────────────────────

export const recommendationCache = createMemoCache<unknown>(50, 2 * 60 * 1000);   // 2 min
export const analyticsCache      = createMemoCache<unknown>(20, 10 * 60 * 1000);  // 10 min
