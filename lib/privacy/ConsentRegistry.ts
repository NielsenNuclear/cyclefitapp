// ─── lib/privacy/ConsentRegistry.ts ──────────────────────────────────────────
// Phase 72 — modular, revocable consent flags for future features.

const STORAGE_KEY = "axis_consent_registry_v1";

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConsentFeature =
  | "cloud_sync"
  | "wearable_integration"
  | "research_participation"
  | "usage_analytics"
  | "crash_reporting";

export interface ConsentFlag {
  feature:     ConsentFeature;
  granted:     boolean;
  updatedAt:   string;
  version:     string;   // consent version string — update when terms change
}

export interface ConsentRecord {
  flags:          Record<ConsentFeature, ConsentFlag>;
  lastReviewedAt: string;
}

// ── Default state — all features opted out by default ─────────────────────────

const CURRENT_CONSENT_VERSION = "1.0";

function defaultFlag(feature: ConsentFeature): ConsentFlag {
  return {
    feature,
    granted:   false,
    updatedAt: new Date().toISOString(),
    version:   CURRENT_CONSENT_VERSION,
  };
}

function defaultRecord(): ConsentRecord {
  const flags = {} as Record<ConsentFeature, ConsentFlag>;
  const features: ConsentFeature[] = [
    "cloud_sync","wearable_integration","research_participation",
    "usage_analytics","crash_reporting",
  ];
  for (const f of features) flags[f] = defaultFlag(f);
  return { flags, lastReviewedAt: new Date().toISOString() };
}

// ── Storage ───────────────────────────────────────────────────────────────────

function load(): ConsentRecord {
  if (!isClient()) return defaultRecord();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultRecord();
  } catch { return defaultRecord(); }
}

function save(record: ConsentRecord): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch {}
}

// ── API ───────────────────────────────────────────────────────────────────────

export function getConsentRecord(): ConsentRecord {
  return load();
}

export function hasConsent(feature: ConsentFeature): boolean {
  return load().flags[feature]?.granted ?? false;
}

export function grantConsent(feature: ConsentFeature): void {
  const record = load();
  record.flags[feature] = { feature, granted: true, updatedAt: new Date().toISOString(), version: CURRENT_CONSENT_VERSION };
  record.lastReviewedAt = new Date().toISOString();
  save(record);
}

export function revokeConsent(feature: ConsentFeature): void {
  const record = load();
  record.flags[feature] = { feature, granted: false, updatedAt: new Date().toISOString(), version: CURRENT_CONSENT_VERSION };
  record.lastReviewedAt = new Date().toISOString();
  save(record);
}

export function revokeAllConsent(): void {
  save(defaultRecord());
}

// ── Metadata: feature labels and descriptions ─────────────────────────────────

export interface ConsentFeatureMeta {
  feature:     ConsentFeature;
  label:       string;
  description: string;
  available:   boolean;   // false = not yet implemented
}

export const CONSENT_FEATURES: ConsentFeatureMeta[] = [
  {
    feature:     "cloud_sync",
    label:       "Cloud Sync",
    description: "Sync your training data across devices via encrypted cloud storage.",
    available:   false,
  },
  {
    feature:     "wearable_integration",
    label:       "Wearable Integration",
    description: "Connect Axis to HRV and sleep data from your wearable device.",
    available:   false,
  },
  {
    feature:     "research_participation",
    label:       "Research Participation",
    description: "Contribute anonymised, aggregated data to research on female athletic performance.",
    available:   false,
  },
  {
    feature:     "usage_analytics",
    label:       "Usage Analytics",
    description: "Share anonymous usage patterns to help improve the Axis experience.",
    available:   false,
  },
  {
    feature:     "crash_reporting",
    label:       "Crash Reporting",
    description: "Automatically send error reports when the app encounters unexpected issues.",
    available:   false,
  },
];
