"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import { allExercises } from "@/lib/exercises/exerciseLibrary";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { AxisIcon } from "@/components/ui/Icon";
import { getDashboardDensity, setDashboardDensity, type DashboardDensity } from "@/lib/preferences/dashboardDensity";

const ENV_STORAGE_KEY  = "axis_training_env";
const REST_TIMER_STORAGE_KEY = "axis_rest_timer_enabled";
const APP_VERSION      = "0.5.0";
const ENGINE_VERSION   = "adaptive-v2";
const EXERCISE_COUNT   = allExercises.length;

const ENVIRONMENTS: { value: TrainingEnvironment; label: string; desc: string }[] = [
  { value: "gym",            label: "Full gym",       desc: "Full equipment access" },
  { value: "home_gym",       label: "Home gym",       desc: "Rack, barbell, or cable access at home" },
  { value: "dumbbells_only", label: "Dumbbells only", desc: "Dumbbells and bodyweight" },
  { value: "bodyweight_only",label: "Bodyweight",     desc: "No equipment required" },
];

// ─── Inline confirm dialog ────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, body, confirmLabel, danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#EAE7DE] shadow-2xl p-6 space-y-4">
        <div className="text-[15px] font-semibold text-[#1C1B18]">{title}</div>
        <p className="text-[13px] text-[#6B6860] leading-relaxed whitespace-pre-line">{body}</p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-[13px] font-medium border border-[#E0DDD4] text-[#6B6860] hover:bg-[#F5F3EE] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-colors
              ${danger
                ? "bg-[#C0392B] text-white hover:bg-[#A93226]"
                : "bg-[#534AB7] text-white hover:bg-[#3D35A0]"
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-3 px-1">{title}</div>
      <div className="bg-white rounded-2xl border border-[#EAE7DE] overflow-hidden divide-y divide-[#F0EDE4]">
        {children}
      </div>
    </section>
  );
}

function Row({ label, desc, right, onClick, destructive = false }: {
  label: string;
  desc?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const isButton = !!onClick;
  return (
    <div
      role={isButton ? "button" : undefined}
      onClick={onClick}
      className={`flex items-center justify-between gap-3 px-4 py-3.5
        ${isButton ? "cursor-pointer hover:bg-[#FAFAF8] active:bg-[#F5F3EE] transition-colors" : ""}
      `}
    >
      <div>
        <div className={`text-[13px] font-medium ${destructive ? "text-[#C0392B]" : "text-[#1C1B18]"}`}>{label}</div>
        {desc && <div className="text-[11px] text-[#9B9690] mt-0.5 leading-snug">{desc}</div>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Dialog = "reset-history" | "reset-all" | null;

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsPageInner />
    </ToastProvider>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [environment, setEnvironment] = useState<TrainingEnvironment>("gym");
  const [restTimerEnabled, setRestTimerEnabled] = useState(true);
  const [dashboardDensity, setDashboardDensityState] = useState<DashboardDensity>("standard");
  const [dialog, setDialog]           = useState<Dialog>(null);

  useEffect(() => {
    const saved = localStorage.getItem(ENV_STORAGE_KEY) as TrainingEnvironment | null;
    if (saved) setEnvironment(saved);
    const savedRestTimer = localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (savedRestTimer !== null) setRestTimerEnabled(savedRestTimer === "true");
    setDashboardDensityState(getDashboardDensity());
  }, []);

  function handleEnvChange(env: TrainingEnvironment) {
    setEnvironment(env);
    localStorage.setItem(ENV_STORAGE_KEY, env);
    showToast("Environment updated");
  }

  function handleRestTimerChange(enabled: boolean) {
    setRestTimerEnabled(enabled);
    localStorage.setItem(REST_TIMER_STORAGE_KEY, String(enabled));
    showToast(enabled ? "Rest timer enabled" : "Rest timer disabled");
  }

  function handleDensityChange(density: DashboardDensity) {
    setDashboardDensityState(density);
    setDashboardDensity(density);
    showToast(`Dashboard density set to ${density}`);
  }

  function handleExportOnboarding() {
    const raw = localStorage.getItem("axis_onboarding");
    if (!raw) { showToast("No profile data found"); return; }
    downloadJson(`axis-profile-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(raw));
    showToast("Profile exported");
  }

  function handleExportHistory() {
    const raw = localStorage.getItem("axis_workout_history");
    if (!raw) { showToast("No workout history found"); return; }
    downloadJson(`axis-history-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(raw));
    showToast("History exported");
  }

  function confirmResetHistory() {
    localStorage.removeItem("axis_workout_history");
    setDialog(null);
    showToast("Workout history cleared");
  }

  function confirmResetAll() {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("axis_")) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    setDialog(null);
    router.push("/onboarding");
  }

  return (
    <DashboardShell>
      <div className="px-5 pt-6 pb-16 space-y-6">
        <span className="type-page-title text-ink">Settings</span>

        {/* Environment */}
        <Section title="Training environment">
          {ENVIRONMENTS.map(env => (
            <Row
              key={env.value}
              label={env.label}
              desc={env.desc}
              onClick={() => handleEnvChange(env.value)}
              right={
                environment === env.value
                  ? (
                    <div className="w-5 h-5 rounded-full bg-[#534AB7] flex items-center justify-center">
                      <AxisIcon name="check" size={10} strokeWidth={3} className="text-white" />
                    </div>
                  )
                  : <div className="w-5 h-5 rounded-full border-2 border-[#E0DDD4]" />
              }
            />
          ))}
        </Section>

        {/* Workout preferences */}
        <Section title="Workout preferences">
          <Row
            label="Rest timer"
            desc="Show a rest screen with countdown between sets"
            right={<Toggle on={restTimerEnabled} onChange={handleRestTimerChange} />}
          />
        </Section>

        {/* Dashboard — Dashboard 3.0, Batch 20 Phase 6. Controls only which
            sections default open on Today, never which sections exist or
            what's inside them; orthogonal to data-maturity gating. */}
        <Section title="Dashboard">
          <Row
            label="Density"
            desc="How much opens by default on Today — Focused starts everything collapsed, Full opens Body Today and This Week"
            right={<DensityToggle value={dashboardDensity} onChange={handleDensityChange} />}
          />
        </Section>

        {/* Data management */}
        <Section title="Data management">
          <Row
            label="Export profile"
            desc="Download your onboarding data as JSON"
            onClick={handleExportOnboarding}
            right={<ChevronRight />}
          />
          <Row
            label="Export workout history"
            desc="Download your full workout log as JSON"
            onClick={handleExportHistory}
            right={<ChevronRight />}
          />
          <Row
            label="Reset workout history"
            desc="Clears all logged sessions. Cannot be undone."
            onClick={() => setDialog("reset-history")}
            destructive
            right={<ChevronRight destructive />}
          />
          <Row
            label="Full application reset"
            desc="Deletes all Axis data and returns to onboarding."
            onClick={() => setDialog("reset-all")}
            destructive
            right={<ChevronRight destructive />}
          />
        </Section>

        {/* App info */}
        <Section title="About">
          <Row label="Version"          right={<InfoValue>{APP_VERSION}</InfoValue>} />
          <Row label="Exercise library" right={<InfoValue>{EXERCISE_COUNT} exercises</InfoValue>} />
        </Section>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      {dialog === "reset-history" && (
        <ConfirmDialog
          title="Reset workout history?"
          body="This will permanently delete all logged workout sessions. Your profile and recommendations will not be affected."
          confirmLabel="Reset history"
          danger
          onConfirm={confirmResetHistory}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog === "reset-all" && (
        <ConfirmDialog
          title="Reset entire application?"
          body={"This will permanently delete:\n\n• Your onboarding profile\n• Your adaptive profile\n• Your workout history\n• Your daily check-ins\n• Your training environment\n\nYou will be returned to onboarding. This cannot be undone."}
          confirmLabel="Delete everything"
          danger
          onConfirm={confirmResetAll}
          onCancel={() => setDialog(null)}
        />
      )}
    </DashboardShell>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ChevronRight({ destructive = false }: { destructive?: boolean }) {
  return (
    <AxisIcon
      name="chevron-right"
      size={14}
      className={destructive ? "text-danger" : "text-ink-muted"}
    />
  );
}

function InfoValue({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] text-[#9B9690] font-medium">{children}</span>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-0.5 bg-[#F5F3EE] rounded-full p-0.5 border border-[#E0DDD4]">
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={on}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
          on ? "bg-[#534AB7] text-white" : "text-[#9B9690]"
        }`}
      >
        ON
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!on}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
          !on ? "bg-[#534AB7] text-white" : "text-[#9B9690]"
        }`}
      >
        OFF
      </button>
    </div>
  );
}

const DENSITY_OPTIONS: { value: DashboardDensity; label: string }[] = [
  { value: "focused",  label: "Focused" },
  { value: "standard", label: "Standard" },
  { value: "full",     label: "Full" },
];

function DensityToggle({ value, onChange }: { value: DashboardDensity; onChange: (v: DashboardDensity) => void }) {
  return (
    <div className="flex gap-0.5 bg-[#F5F3EE] rounded-full p-0.5 border border-[#E0DDD4]">
      {DENSITY_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            value === opt.value ? "bg-[#534AB7] text-white" : "text-[#9B9690]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
