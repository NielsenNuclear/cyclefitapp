"use client";
// ─── app/privacy/page.tsx ─────────────────────────────────────────────────────
// Phase 72 — Privacy & Data Governance
// Route: /privacy

import { PrivacyDashboard } from "@/components/privacy/PrivacyDashboard";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">
          Privacy & Data
        </p>
        <h1 className="text-xl font-bold text-ink-base">Your Data</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          All data is stored locally on your device. Nothing leaves without your explicit consent.
        </p>
      </div>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <PrivacyDashboard />
      </div>
    </div>
  );
}
