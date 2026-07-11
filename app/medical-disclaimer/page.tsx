"use client";
// ─── app/medical-disclaimer/page.tsx ─────────────────────────────────────────
// Phase 76 — Medical Disclaimer page.
// Route: /medical-disclaimer

export default function MedicalDisclaimerPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">Legal</p>
        <h1 className="text-xl font-bold text-ink-base">Medical Disclaimer</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">

        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-300 mb-1">
            Axis is not a medical device and is not intended to diagnose, treat, cure, or prevent any medical condition.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What Axis is</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            Axis is a training intelligence app that uses published exercise science research
            to personalise workout recommendations around the menstrual cycle. It is a wellness tool,
            not a clinical intervention.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Consult a professional</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            Always seek the advice of your physician, physiotherapist, or other qualified health
            provider before beginning a new exercise program — especially if you:
          </p>
          <ul className="text-sm text-ink-subtle space-y-1 list-disc list-inside ml-2">
            <li>Have a known medical condition</li>
            <li>Are pregnant or postpartum</li>
            <li>Have experienced injury, surgery, or chronic pain</li>
            <li>Have an eating disorder or a history of one</li>
            <li>Are experiencing irregular cycles or hormonal disorders</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Evidence limitations</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            The research on cycle-phase training is growing but remains limited by small sample sizes,
            heterogeneous study designs, and reliance on calendar-based phase verification. Axis
            presents the current best available evidence with explicit uncertainty, not established
            clinical protocol.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Stop if you feel unwell</h2>
          <p className="text-sm text-ink-subtle leading-relaxed">
            Discontinue exercise and consult a healthcare provider immediately if you experience
            chest pain, difficulty breathing, dizziness, unusual pain, or any other concerning symptom.
          </p>
        </section>

        <p className="text-xs text-ink-muted">
          For questions about your individual health, contact a qualified healthcare provider —
          not the Axis app.
        </p>
      </div>
    </div>
  );
}
