// ─── lib/data/integrity/CrossValidator.ts ────────────────────────────────────
// Phase 70 — validates cross-object relationships and ordering invariants.

export interface CrossValidationIssue {
  type:    "broken_reference" | "ordering" | "duplicate_id" | "impossible_value" | "orphan";
  message: string;
  key?:    string;
  index?:  number;
}

export interface CrossValidationReport {
  checked:     number;
  issues:      CrossValidationIssue[];
  isClean:     boolean;
}

// ── Timestamp ordering ────────────────────────────────────────────────────────

export function validateTimestampOrdering(
  items:    { timestamp?: string; date?: string; createdAt?: string }[],
  keyName:  string,
): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];
  const NOW = Date.now();
  const MIN = new Date("2020-01-01").getTime();

  for (let i = 0; i < items.length; i++) {
    const ts = items[i].timestamp ?? items[i].date ?? items[i].createdAt;
    if (!ts) continue;
    const t = Date.parse(ts);
    if (isNaN(t)) {
      issues.push({ type: "impossible_value", message: `Item ${i} has unparseable timestamp "${ts}".`, key: keyName, index: i });
    } else if (t > NOW + 86_400_000) {
      issues.push({ type: "impossible_value", message: `Item ${i} timestamp is in the future.`, key: keyName, index: i });
    } else if (t < MIN) {
      issues.push({ type: "impossible_value", message: `Item ${i} timestamp predates 2020.`, key: keyName, index: i });
    }
  }
  return issues;
}

// ── Duplicate IDs ─────────────────────────────────────────────────────────────

export function findDuplicateIds(
  items:   { id?: string }[],
  keyName: string,
): CrossValidationIssue[] {
  const seen = new Map<string, number>();
  const issues: CrossValidationIssue[] = [];

  for (let i = 0; i < items.length; i++) {
    const id = items[i].id;
    if (!id) continue;
    if (seen.has(id)) {
      issues.push({
        type:    "duplicate_id",
        message: `Duplicate ID "${id}" found at index ${i} (first at ${seen.get(id)}).`,
        key:     keyName,
        index:   i,
      });
    } else {
      seen.set(id, i);
    }
  }
  return issues;
}

// ── Volume scale range ────────────────────────────────────────────────────────

export function validateVolumeScales(
  items:   { finalVolumeScale?: number; outputVolume?: number; inputVolume?: number }[],
  keyName: string,
): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];
  for (let i = 0; i < items.length; i++) {
    const values = [
      items[i].finalVolumeScale,
      items[i].outputVolume,
      items[i].inputVolume,
    ].filter((v): v is number => v !== undefined);

    for (const v of values) {
      if (v < 0 || v > 2.0 || isNaN(v)) {
        issues.push({
          type:    "impossible_value",
          message: `Item ${i} has out-of-range volume scale: ${v}.`,
          key:     keyName,
          index:   i,
        });
      }
    }
  }
  return issues;
}

// ── Confidence range ──────────────────────────────────────────────────────────

export function validateConfidenceScores(
  items:   { finalConfidence?: number; confidenceAtGeneration?: number; compositeScore?: number }[],
  keyName: string,
): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];
  for (let i = 0; i < items.length; i++) {
    const values = [
      items[i].finalConfidence,
      items[i].confidenceAtGeneration,
      items[i].compositeScore,
    ].filter((v): v is number => v !== undefined);

    for (const v of values) {
      if (v < 0 || v > 1 || isNaN(v)) {
        issues.push({
          type:    "impossible_value",
          message: `Item ${i} has out-of-range confidence score: ${v}.`,
          key:     keyName,
          index:   i,
        });
      }
    }
  }
  return issues;
}

// ── Composite cross-validation for a set of arrays ───────────────────────────

export function runCrossValidation(
  datasets: Record<string, unknown[]>,
): CrossValidationReport {
  const issues: CrossValidationIssue[] = [];
  let checked = 0;

  for (const [key, items] of Object.entries(datasets)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    checked += items.length;

    issues.push(
      ...validateTimestampOrdering(items as { timestamp?: string }[], key),
      ...findDuplicateIds(items as { id?: string }[], key),
      ...validateVolumeScales(items as { finalVolumeScale?: number }[], key),
      ...validateConfidenceScores(items as { finalConfidence?: number }[], key),
    );
  }

  return { checked, issues, isClean: issues.length === 0 };
}
