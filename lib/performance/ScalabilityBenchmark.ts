// ─── lib/performance/ScalabilityBenchmark.ts ─────────────────────────────────
// Phase 71 — scalability benchmarks with synthetic datasets of varying sizes.
// Tests that core operations remain responsive even with years of history.

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// ── Synthetic data generators ─────────────────────────────────────────────────

function makeVerificationRecord(i: number) {
  return {
    id: `vr-${i}`,
    recommendationId: `rec-${i}`,
    timestamp: new Date(Date.now() - i * 86_400_000).toISOString(),
    evaluationDueDate: new Date(Date.now() - (i - 7) * 86_400_000).toISOString().slice(0, 10),
    recommendationClass: ["volume_increase","volume_decrease","deload","recovery_focus"][i % 4],
    recommendationSummary: `Benchmark record ${i}`,
    algorithmVersion: "axis-v1.0",
    confidenceAtGeneration: Math.random(),
    evaluated: i % 3 !== 0,
  };
}

function makeDecisionTrace(i: number) {
  return {
    id: `trace-${i}`,
    timestamp: new Date(Date.now() - i * 3_600_000).toISOString(),
    signals:   Array.from({ length: 8 }, (_, j) => ({ name: `sig${j}`, value: Math.random() * 100, source: "test" })),
    modifiers: Array.from({ length: 4 }, (_, j) => ({ name: `mod${j}`, inputValue: Math.random(), outputFactor: 0.8 + Math.random() * 0.4 })),
    safetyGates: [],
    uncertaintyScore: Math.random(),
    calibrationFactor: 0.85 + Math.random() * 0.3,
    finalVolumeScale: 0.80 + Math.random() * 0.40,
    finalIntensity: "Moderate",
    recommendationClass: "volume_maintain",
    recommendationSummary: `Trace ${i}`,
    finalConfidence: 0.5 + Math.random() * 0.5,
    algorithmVersion: "axis-v1.0",
    configVersion: "axis-config-v1",
  };
}

// ── Individual benchmarks ─────────────────────────────────────────────────────

export interface BenchmarkResult {
  name:        string;
  datasetSize: number;
  durationMs:  number;
  opsPerSecond: number;
  passed:      boolean;   // within 500ms budget for background ops
}

function bench(
  name:        string,
  datasetSize: number,
  fn:          (n: number) => void,
  budgetMs   = 500,
): BenchmarkResult {
  const t0 = now();
  fn(datasetSize);
  const durationMs = now() - t0;
  return {
    name,
    datasetSize,
    durationMs,
    opsPerSecond: Math.round(datasetSize / (durationMs / 1000)),
    passed: durationMs <= budgetMs,
  };
}

// ── Benchmark suite ───────────────────────────────────────────────────────────

export interface ScalabilityReport {
  ranAt:        string;
  results:      BenchmarkResult[];
  overallPass:  boolean;
  summary:      string;
}

export function runScalabilityBenchmarks(): ScalabilityReport {
  const results: BenchmarkResult[] = [];
  const sizes = [5, 100, 500, 2000];

  // 1. JSON serialization (simulates localStorage writes)
  for (const n of sizes) {
    results.push(bench(`JSON.stringify (${n} records)`, n, (n) => {
      const data = Array.from({ length: n }, (_, i) => makeVerificationRecord(i));
      JSON.stringify(data);
    }, 200));
  }

  // 2. JSON parse (simulates localStorage reads)
  for (const n of sizes) {
    const payload = JSON.stringify(Array.from({ length: n }, (_, i) => makeVerificationRecord(i)));
    results.push(bench(`JSON.parse (${n} records)`, n, () => {
      JSON.parse(payload);
    }, 100));
  }

  // 3. Array filter (simulates pending evaluations query)
  for (const n of sizes) {
    const data = Array.from({ length: n }, (_, i) => makeVerificationRecord(i));
    results.push(bench(`Array.filter (${n} records)`, n, () => {
      data.filter(r => !r.evaluated);
    }, 10));
  }

  // 4. Array sort (simulates most-recent-first ordering)
  for (const n of sizes) {
    const data = Array.from({ length: n }, (_, i) => makeVerificationRecord(i));
    results.push(bench(`Array.sort (${n} records)`, n, () => {
      [...data].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, 20));
  }

  // 5. Aggregation (simulates success rate computation)
  for (const n of sizes) {
    const data = Array.from({ length: n }, (_, i) => makeVerificationRecord(i));
    results.push(bench(`Aggregation (${n} records)`, n, () => {
      const evaluated = data.filter(r => r.evaluated);
      const _ = evaluated.length > 0 ? evaluated.length / data.length : 0;
    }, 10));
  }

  // 6. Decision trace iteration (simulates trace explorer load)
  for (const n of [5, 100, 200]) {
    const traces = Array.from({ length: n }, (_, i) => makeDecisionTrace(i));
    results.push(bench(`Trace iteration (${n} traces)`, n, () => {
      traces.forEach(t => {
        const _ = t.signals.reduce((s, sig) => s + (typeof sig.value === "number" ? sig.value : 0), 0);
      });
    }, 50));
  }

  const overallPass  = results.every(r => r.passed);
  const violations   = results.filter(r => !r.passed);
  const summary      = overallPass
    ? `All ${results.length} benchmarks within budget.`
    : `${violations.length} benchmark${violations.length > 1 ? "s" : ""} exceeded budget: ${violations.map(v => v.name).join(", ")}.`;

  return {
    ranAt: new Date().toISOString(),
    results,
    overallPass,
    summary,
  };
}
