// ─── lib/exercises/postponeExercise.ts ────────────────────────────────────────
// Workout Engine Sprint — Phase B.7. Pure reorder logic for exercise
// postponement, extracted out of WorkoutCard.tsx so the actuals/warmupActuals
// re-keying invariant — flagged in docs/ux/UXStabilizationAudit.md §15 as the
// real risk here — has a direct unit test, not just a live QA pass.
//
// Postpone moves the exercise at `idx` to the position right after the next
// one (A B C D → A C B D postponing B) — NOT to the end of the workout. Both
// `exercises` and the actuals/warmupActuals maps are keyed by array index,
// not exercise identity, so postponing must swap all three in lockstep or a
// partially logged set silently reattaches to whatever slides into its old
// index.
//
// Pure logic — no React, no side effects.

export function canPostpone(idx: number, length: number): boolean {
  return idx >= 0 && idx < length - 1;
}

export function postponeArray<T>(items: T[], idx: number): T[] {
  if (!canPostpone(idx, items.length)) return items;
  const next = [...items];
  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
  return next;
}

export function postponeRecord<T>(
  record: Record<number, T>,
  idx:    number,
  length: number,
): Record<number, T> {
  if (!canPostpone(idx, length)) return record;
  const next = { ...record };
  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
  return next;
}
