// ─── lib/data/integrity/DataIntegrityService.ts ──────────────────────────────
// Phase 70 — orchestrates schema validation, cross-validation, and migration
// status across all known Axis localStorage keys.

import { STORAGE_SCHEMA_MAP } from "../schema/coreSchemas";
import { validateObject, validateArray } from "../validation/validate";
import { runCrossValidation } from "./CrossValidator";
import { getMigrationStatus } from "../migrations/MigrationEngine";
import type { ValidationIssue } from "../schema/SchemaTypes";
import type { CrossValidationIssue } from "./CrossValidator";
import type { MigrationStatus } from "../migrations/MigrationEngine";

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Per-key health ─────────────────────────────────────────────────────────────

export interface KeyDataHealth {
  key:             string;
  schemaName:      string;
  present:         boolean;
  shape:           "array" | "object" | "record";
  totalItems:      number;
  validItems:      number;
  issues:          ValidationIssue[];
  migrationStatus: MigrationStatus | null;
  byteSize:        number;
}

// ── Aggregate report ──────────────────────────────────────────────────────────

export interface DataHealthReport {
  generatedAt:     string;
  keys:            KeyDataHealth[];
  totalObjects:    number;
  validObjects:    number;
  invalidObjects:  number;
  crossIssues:     CrossValidationIssue[];
  healthPercent:   number;    // 0–100
  legacyObjects:   number;
}

// ── Core runner ───────────────────────────────────────────────────────────────

function readKey(key: string): { raw: string | null; err: boolean } {
  if (!isClient()) return { raw: null, err: false };
  try { return { raw: localStorage.getItem(key), err: false }; }
  catch { return { raw: null, err: true }; }
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

export function runDataHealthCheck(): DataHealthReport {
  const keys: KeyDataHealth[] = [];
  let totalObjects   = 0;
  let validObjects   = 0;
  let legacyObjects  = 0;
  const crossDatasets: Record<string, unknown[]> = {};

  for (const [storageKey, meta] of Object.entries(STORAGE_SCHEMA_MAP)) {
    const { raw, err } = readKey(storageKey);
    const byteSize = raw ? new TextEncoder().encode(raw).length : 0;
    const parsed   = raw ? parseJson(raw) : null;
    const schema   = meta.schema;

    if (meta.shape === "array") {
      const arr = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [];
      const { totalItems, validItems, issues } = validateArray(arr, schema.fields);
      const migStatus = getMigrationStatus(arr, schema);
      crossDatasets[storageKey] = arr;

      keys.push({
        key: storageKey, schemaName: schema.name,
        present: raw !== null, shape: "array",
        totalItems, validItems, issues,
        migrationStatus: migStatus,
        byteSize,
      });

      totalObjects  += totalItems;
      validObjects  += validItems;
      legacyObjects += migStatus.legacyItems;

    } else if (meta.shape === "object" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const result = validateObject(obj, schema.fields);
      const migStatus = getMigrationStatus([obj], schema);

      keys.push({
        key: storageKey, schemaName: schema.name,
        present: raw !== null, shape: "object",
        totalItems: 1, validItems: result.valid ? 1 : 0,
        issues: result.issues, migrationStatus: migStatus,
        byteSize,
      });

      totalObjects++;
      if (result.valid) validObjects++;
      legacyObjects += migStatus.legacyItems;

    } else if (meta.shape === "record" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const values = Object.values(parsed as Record<string, unknown>);
      const records = values.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
      const { totalItems, validItems, issues } = validateArray(records, schema.fields);
      const migStatus = getMigrationStatus(records, schema);
      crossDatasets[storageKey] = records;

      keys.push({
        key: storageKey, schemaName: schema.name,
        present: raw !== null, shape: "record",
        totalItems, validItems, issues,
        migrationStatus: migStatus,
        byteSize,
      });

      totalObjects  += totalItems;
      validObjects  += validItems;
      legacyObjects += migStatus.legacyItems;

    } else {
      keys.push({
        key: storageKey, schemaName: schema.name,
        present: raw !== null, shape: meta.shape,
        totalItems: 0, validItems: 0, issues: [],
        migrationStatus: null, byteSize,
      });
    }
  }

  const crossReport = runCrossValidation(crossDatasets);

  return {
    generatedAt:    new Date().toISOString(),
    keys,
    totalObjects,
    validObjects,
    invalidObjects: totalObjects - validObjects,
    crossIssues:    crossReport.issues,
    healthPercent:  totalObjects > 0 ? Math.round((validObjects / totalObjects) * 100) : 100,
    legacyObjects,
  };
}

// ── Auto-repair: safe operations only ────────────────────────────────────────

export function autoRepairData(report: DataHealthReport): { repairedKeys: string[] } {
  if (!isClient()) return { repairedKeys: [] };
  const repairedKeys: string[] = [];

  for (const keyHealth of report.keys) {
    if (keyHealth.issues.length === 0) continue;
    // Only auto-repair if ALL issues are warnings (no hard errors)
    const hasErrors = keyHealth.issues.some(i => i.severity === "error");
    if (hasErrors) continue;

    // No hard-error auto-repair here — flag for manual review
    // (removing data silently would lose user information)
    repairedKeys.push(keyHealth.key + " [warning-only, no action needed]");
  }

  return { repairedKeys };
}
