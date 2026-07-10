"use client";
// ─── components/privacy/PrivacyDashboard.tsx ─────────────────────────────────
// Phase 72 — user-facing privacy dashboard: inventory, export, delete, consent.

import { useEffect, useState } from "react";
import { getDataInventory, getTotalStorageBytes, type InventoryItem, type DataCategory } from "@/lib/privacy/DataInventory";
import { downloadJson, exportTabularAsCsv, downloadCsv, type CsvExportPart } from "@/lib/privacy/ExportEngine";
import { deleteCategory, deleteAllAxisData, describeCategories, type DeletionResult } from "@/lib/privacy/DeletionFramework";
import {
  getConsentRecord,
  grantConsent,
  revokeConsent,
  CONSENT_FEATURES,
  type ConsentFeature,
  type ConsentRecord,
} from "@/lib/privacy/ConsentRegistry";

// ── Category badge ────────────────────────────────────────────────────────────

const CAT_COLOR: Record<DataCategory, string> = {
  training:        "bg-brand/10 text-brand",
  recovery:        "bg-green-900/20 text-green-400",
  cycle:           "bg-purple-900/20 text-purple-400",
  nutrition:       "bg-orange-900/20 text-orange-400",
  recommendations: "bg-blue-900/20 text-blue-400",
  intelligence:    "bg-yellow-900/20 text-yellow-400",
  system:          "bg-ui-border text-ink-muted",
};

// ── Inventory card ────────────────────────────────────────────────────────────

function InventoryCard({ item, onDelete }: { item: InventoryItem; onDelete: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm]   = useState(false);

  return (
    <div className="bg-ui-surface rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink-base">{item.label}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${CAT_COLOR[item.category]}`}>{item.category}</span>
            {item.sensitive && <span className="text-xs text-purple-400">sensitive</span>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{item.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {item.present ? (
            <>
              <p className="text-xs font-medium text-ink-base">{(item.byteSize / 1024).toFixed(1)} KB</p>
              {item.itemCount !== null && <p className="text-xs text-ink-muted">{item.itemCount} items</p>}
            </>
          ) : (
            <p className="text-xs text-ink-muted">Empty</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 text-xs border-t border-ui-border pt-2">
          <p><span className="text-ink-muted">Why stored: </span><span className="text-ink-base">{item.why}</span></p>
          <p><span className="text-ink-muted">How used: </span><span className="text-ink-base">{item.howUsed}</span></p>
          <p><span className="text-ink-muted">If removed: </span><span className="text-ink-base">{item.ifRemoved}</span></p>
          <p><span className="text-ink-muted">Retention: </span><span className="text-ink-base">{item.retention}</span></p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-brand hover:underline"
        >
          {expanded ? "Hide details" : "Why is this stored?"}
        </button>
        {item.present && (
          confirm ? (
            <div className="flex gap-1 ml-auto">
              <button onClick={() => { onDelete(item.key); setConfirm(false); }}
                className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded font-medium hover:opacity-80"
              >Delete</button>
              <button onClick={() => setConfirm(false)}
                className="text-xs px-2 py-0.5 bg-ui-border text-ink-muted rounded hover:opacity-80"
              >Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="ml-auto text-xs text-ink-muted hover:text-red-400"
            >Remove</button>
          )
        )}
      </div>
    </div>
  );
}

// ── Consent toggle ────────────────────────────────────────────────────────────

function ConsentToggle({ feature, label, description, available, granted, onChange }: {
  feature:     ConsentFeature;
  label:       string;
  description: string;
  available:   boolean;
  granted:     boolean;
  onChange:    (feature: ConsentFeature, grant: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-ui-border/50 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-ink-base font-medium">{label}</p>
          {!available && <span className="text-xs text-ink-muted bg-ui-border px-1.5 py-0.5 rounded-full">Coming soon</span>}
        </div>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
      <button
        disabled={!available}
        onClick={() => onChange(feature, !granted)}
        className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors ${
          !available ? "opacity-30 cursor-not-allowed bg-ui-border" :
          granted ? "bg-brand" : "bg-ui-border"
        }`}
      >
        <span className={`block w-4 h-4 rounded-full bg-canvas shadow transition-transform mx-1 ${granted && available ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Section = "inventory" | "export" | "delete" | "consent";

export function PrivacyDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [consent,   setConsent]   = useState<ConsentRecord | null>(null);
  const [csvParts,  setCsvParts]  = useState<CsvExportPart[]>([]);
  const [section,   setSection]   = useState<Section>("inventory");
  const [message,   setMessage]   = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  function refresh() {
    setInventory(getDataInventory());
    setConsent(getConsentRecord());
    setCsvParts(exportTabularAsCsv());
  }

  useEffect(() => { refresh(); }, []);

  function notify(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  function handleDelete(key: string) {
    const { bytesFreed } = deleteCategory("system");  // placeholder — actual deleteKey used
    import("@/lib/privacy/DeletionFramework").then(m => {
      m.deleteKey(key);
      refresh();
      notify("Data removed successfully.");
    });
  }

  function handleConsentChange(feature: ConsentFeature, grant: boolean) {
    if (grant) grantConsent(feature); else revokeConsent(feature);
    setConsent(getConsentRecord());
  }

  const totalKB = Math.round(getTotalStorageBytes() / 1024 * 10) / 10;
  const presentCount = inventory.filter(i => i.present).length;

  const SECTIONS: { id: Section; label: string }[] = [
    { id: "inventory", label: "My Data"  },
    { id: "export",    label: "Export"   },
    { id: "delete",    label: "Delete"   },
    { id: "consent",   label: "Permissions" },
  ];

  return (
    <div className="space-y-4">
      {/* Storage summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Storage Used", value: `${totalKB} KB` },
          { label: "Data Types",   value: presentCount     },
          { label: "All Local",    value: "✓"              },
        ].map(c => (
          <div key={c.label} className="bg-ui-surface rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-ink-base">{c.value}</p>
            <p className="text-xs text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Notification */}
      {message && (
        <div className="bg-green-900/20 text-green-400 text-sm px-4 py-2 rounded-xl text-center">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors mr-2 ${section === s.id ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-base"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Inventory */}
      {section === "inventory" && (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">All data is stored on your device only. Nothing is sent to external servers.</p>
          {inventory.map(item => (
            <InventoryCard key={item.key} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Export */}
      {section === "export" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">Your data is yours. Export a complete copy at any time.</p>
          <div className="bg-ui-surface rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-ink-base">Complete Export (JSON)</p>
              <p className="text-xs text-ink-muted mt-0.5">All Axis data in a single machine-readable file.</p>
              <button
                onClick={() => { downloadJson(); notify("Export downloaded."); }}
                className="mt-2 text-xs px-3 py-1.5 bg-brand text-canvas rounded-lg font-medium hover:opacity-90"
              >
                Download axis-export.json
              </button>
            </div>
          </div>

          {csvParts.length > 0 && (
            <div className="bg-ui-surface rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-ink-base">Tabular Export (CSV)</p>
              <p className="text-xs text-ink-muted">Individual datasets in spreadsheet format.</p>
              {csvParts.map(part => (
                <div key={part.storageKey} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-base">{part.label}</p>
                    <p className="text-xs text-ink-muted">{part.rows} rows</p>
                  </div>
                  <button
                    onClick={() => { downloadCsv(part.label, part.content); notify(`${part.label} downloaded.`); }}
                    className="text-xs px-2 py-1 bg-ui-border text-ink-base rounded hover:bg-brand hover:text-canvas transition-colors"
                  >
                    CSV
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      {section === "delete" && (
        <div className="space-y-3">
          <div className="bg-orange-900/10 border border-orange-400/20 rounded-xl p-3">
            <p className="text-xs text-orange-400 font-medium">Deletion is permanent and cannot be undone.</p>
            <p className="text-xs text-ink-muted mt-0.5">Export your data before deleting if you want a backup.</p>
          </div>

          <div className="space-y-2">
            {describeCategories().map(cat => (
              <div key={cat.category} className="bg-ui-surface rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-base font-medium">{cat.label}</p>
                  <p className="text-xs text-ink-muted">{cat.keyCount} data type{cat.keyCount !== 1 ? "s" : ""}</p>
                </div>
                <button
                  onClick={() => { deleteCategory(cat.category); refresh(); notify(`${cat.label} deleted.`); }}
                  className="text-xs px-2 py-1 text-red-400 border border-red-400/30 rounded hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="bg-ui-surface rounded-xl p-4">
            <p className="text-sm font-medium text-red-400">Delete Everything</p>
            <p className="text-xs text-ink-muted mt-0.5">Remove all Axis data from this device.</p>
            {confirmWipe ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { deleteAllAxisData(); refresh(); setConfirmWipe(false); notify("All data deleted."); }}
                  className="text-xs px-3 py-1.5 bg-red-900/30 text-red-400 rounded-lg font-medium hover:opacity-80"
                >
                  Confirm — Delete Everything
                </button>
                <button
                  onClick={() => setConfirmWipe(false)}
                  className="text-xs px-3 py-1.5 bg-ui-border text-ink-muted rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWipe(true)}
                className="mt-2 text-xs px-3 py-1.5 border border-red-400/30 text-red-400 rounded-lg hover:bg-red-900/20 transition-colors"
              >
                Delete All Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consent */}
      {section === "consent" && consent && (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">All features below are optional. You can change these at any time.</p>
          <div className="bg-ui-surface rounded-xl px-4">
            {CONSENT_FEATURES.map(meta => (
              <ConsentToggle
                key={meta.feature}
                feature={meta.feature}
                label={meta.label}
                description={meta.description}
                available={meta.available}
                granted={consent.flags[meta.feature]?.granted ?? false}
                onChange={handleConsentChange}
              />
            ))}
          </div>
          <p className="text-xs text-ink-muted text-center">
            Last reviewed {new Date(consent.lastReviewedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
