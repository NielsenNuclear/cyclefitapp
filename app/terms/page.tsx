"use client";
// ─── app/terms/page.tsx ───────────────────────────────────────────────────────
// Phase 76 — Terms of Service stub.
// Route: /terms

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">Legal</p>
        <h1 className="text-xl font-bold text-ink-base">Terms of Service</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">

        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-sm text-yellow-300 font-semibold mb-1">Draft — not yet legally reviewed</p>
          <p className="text-xs text-ink-muted">
            These terms are a placeholder pending legal counsel review before commercial launch.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Acceptance</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            By using Axis, you agree to these terms. If you do not agree, do not use the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Not Medical Advice</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            Axis provides training guidance based on published exercise science research and your
            personal data. It is not a substitute for professional medical advice, diagnosis, or treatment.
            Always consult a qualified health professional before starting a new exercise program,
            particularly if you have a medical condition or injury.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Your Data</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            All data you enter into Axis is stored locally on your device. We do not transmit,
            sell, or share your personal data. See our{" "}
            <a href="/privacy" className="text-brand underline">Privacy Policy</a> for details.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Limitation of Liability</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            Axis is provided as-is. To the maximum extent permitted by law, we are not liable for
            any injury, loss, or damage arising from use of the app. Use training recommendations
            at your own discretion.
          </p>
        </section>

        <p className="text-xs text-ink-muted">Last updated: TODO — pending legal review</p>
      </div>
    </div>
  );
}
