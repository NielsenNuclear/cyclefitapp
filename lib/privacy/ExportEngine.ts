// ─── lib/privacy/ExportEngine.ts ─────────────────────────────────────────────
// Phase 72 — exports all Axis data as JSON or CSV.

import { DATA_CATALOG } from "./DataInventory";

function isClient(): boolean { return typeof window !== "undefined"; }

function readKey(key: string): unknown {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── JSON export ───────────────────────────────────────────────────────────────

export interface JsonExport {
  exportedAt:   string;
  axisVersion:  string;
  totalKeys:    number;
  data:         Record<string, unknown>;
}

export function exportAllAsJson(): JsonExport {
  const data: Record<string, unknown> = {};
  for (const entry of DATA_CATALOG) {
    const value = readKey(entry.key);
    if (value !== null) {
      data[entry.key] = value;
    }
  }
  return {
    exportedAt:  new Date().toISOString(),
    axisVersion: "axis-v1.0",
    totalKeys:   Object.keys(data).length,
    data,
  };
}

export function downloadJson(filename = "axis-export.json"): void {
  const payload = exportAllAsJson();
  const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename);
}

// ── CSV export (tabular keys only) ───────────────────────────────────────────

function flattenRecord(
  obj:    Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      Object.assign(result, flattenRecord(v as Record<string, unknown>, key));
    } else {
      result[key] = String(v ?? "");
    }
  }
  return result;
}

function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap(r => Object.keys(flattenRecord(r as Record<string, unknown>))))];
  const csvRows = [
    headers.join(","),
    ...rows.map(row => {
      const flat = flattenRecord(row as Record<string, unknown>);
      return headers.map(h => {
        const val = flat[h] ?? "";
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(",");
    }),
  ];
  return csvRows.join("\n");
}

export interface CsvExportPart {
  label:    string;
  storageKey: string;
  content:  string;
  rows:     number;
}

export function exportTabularAsCsv(): CsvExportPart[] {
  const parts: CsvExportPart[] = [];

  for (const entry of DATA_CATALOG) {
    const value = readKey(entry.key);
    if (!Array.isArray(value) || value.length === 0) continue;
    const csv = arrayToCsv(value as Record<string, unknown>[]);
    parts.push({
      label:      entry.label,
      storageKey: entry.key,
      content:    csv,
      rows:       value.length,
    });
  }

  return parts;
}

export function downloadCsv(label: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `axis-${label.toLowerCase().replace(/\s+/g, "-")}.csv`);
}

// ── Trigger download ──────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  if (!isClient()) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
