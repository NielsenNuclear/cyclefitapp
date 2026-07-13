"use client";
import { useState } from "react";
import { Button }        from "@/components/ui/Button";
import { Card }           from "@/components/ui/Card";
import { Dialog }         from "@/components/ui/Dialog";
import { Sheet }          from "@/components/ui/Sheet";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Select }         from "@/components/ui/Select";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";

// ── DesignSystemShowcase ──────────────────────────────────────────────────
// DS-2 Batch 1 QA surface — dev-only. Exercises the six new components/ui
// primitives (Dialog, Sheet, Toast, Tabs, Select, VisuallyHidden) plus the
// useFocusTrap hook they share, with no production call sites yet. Keep this
// mounted at /dev as a living component gallery rather than deleting it once
// Batch 4 adopts these for real — it's a cheap regression check going forward.

function ToastDemo() {
  const { show } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => show("Saved.")}>Neutral toast</Button>
      <Button size="sm" variant="success" onClick={() => show("Workout logged.", { variant: "success" })}>Success toast</Button>
      <Button size="sm" variant="danger" onClick={() => show("Couldn't save — try again.", { variant: "danger" })}>Danger toast</Button>
    </div>
  );
}

export function DesignSystemShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [tab, setTab]               = useState("dialog");
  const [selectValue, setSelectValue] = useState("readiness");

  return (
    <div className="space-y-6">
      <p className="type-body text-ink-muted">
        Batch 1 primitives — new files, no existing call sites migrated yet. Use this page to confirm
        focus trap, Escape-to-close, keyboard tab order, and token-driven styling before Batch 4 adopts
        these in the real settings/body-viewer overlays.
      </p>

      <Tabs
        tabs={[
          { id: "dialog", label: "Dialog / Sheet" },
          { id: "toast",  label: "Toast" },
          { id: "select", label: "Select" },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      <TabPanel id="dialog" activeId={tab} className="space-y-3">
        <Card padding="md">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Sheet (right)</Button>
          </div>
          <p className="type-caption text-ink-muted mt-3">
            Tab/Shift+Tab should stay trapped inside the overlay; Escape or backdrop click closes it;
            focus returns to the button that opened it.
          </p>
        </Card>

        <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog">
          <p className="type-body-md text-ink-secondary mb-4">
            Centered modal — role=&quot;dialog&quot;, focus-trapped, Escape/backdrop closes it.
          </p>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </Dialog>

        <Sheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} side="right" title="Example sheet">
          <p className="type-body-md text-ink-secondary mb-4">
            Slide-in panel — same focus-trap behavior as Dialog, used for drill-in detail views.
          </p>
          <Button onClick={() => setSheetOpen(false)}>Close</Button>
        </Sheet>
      </TabPanel>

      <TabPanel id="toast" activeId={tab}>
        <Card padding="md">
          <ToastProvider>
            <ToastDemo />
          </ToastProvider>
        </Card>
      </TabPanel>

      <TabPanel id="select" activeId={tab}>
        <Card padding="md" className="max-w-xs space-y-4">
          <Select
            label="Metric"
            value={selectValue}
            onChange={e => setSelectValue(e.target.value)}
            options={[
              { value: "readiness", label: "Readiness" },
              { value: "recovery",  label: "Recovery" },
              { value: "fatigue",   label: "Fatigue" },
            ]}
            hint="Native <select> — full keyboard/screen-reader support for free."
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center focus-ring"
              onClick={() => alert("VisuallyHidden gives this icon-only button a real accessible name.")}
            >
              <span aria-hidden="true">✕</span>
              <VisuallyHidden>Dismiss</VisuallyHidden>
            </button>
            <span className="type-caption text-ink-muted">
              Icon-only button — VisuallyHidden supplies its accessible name.
            </span>
          </div>
        </Card>
      </TabPanel>
    </div>
  );
}
