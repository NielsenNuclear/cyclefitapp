// ─── lib/dev/MockDataGenerator.ts ────────────────────────────────────────────
// Phase 74 — generates synthetic data for testing scenarios.
// All generated data is tagged with _isMock: true so it can be identified and
// cleared independently of real user data.

function isClient(): boolean { return typeof window !== "undefined"; }

const MOCK_FLAG_KEY = "axis_mock_data_injected_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateStringDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Workout history ───────────────────────────────────────────────────────────

export interface MockWorkout {
  id:             string;
  completedAt:    string;
  phase:          string;
  volumeScale:    number;
  perceived:      number;
  exercises:      number;
  sets:           number;
  durationMin:    number;
  _isMock:        true;
}

const PHASES = ["follicular", "ovulatory", "luteal", "menstrual"];

export function generateWorkoutHistory(count = 60): MockWorkout[] {
  return Array.from({ length: count }, (_, i) => ({
    id:          `mock-wo-${i}`,
    completedAt: daysAgo(count - i),
    phase:       PHASES[Math.floor(Math.random() * PHASES.length)],
    volumeScale: randomBetween(0.7, 1.3),
    perceived:   randomBetween(5, 9),
    exercises:   Math.floor(randomBetween(4, 8)),
    sets:        Math.floor(randomBetween(12, 24)),
    durationMin: Math.floor(randomBetween(30, 75)),
    _isMock:     true,
  }));
}

// ── Recovery check-ins ────────────────────────────────────────────────────────

export interface MockRecoveryCheckin {
  date:        string;
  score:       number;
  sleepHours:  number;
  sleepQuality: "good" | "fair" | "poor";
  hrv?:        number;
  _isMock:     true;
}

export function generateRecoveryCheckins(count = 30): MockRecoveryCheckin[] {
  const qualities: Array<"good" | "fair" | "poor"> = ["good", "fair", "poor"];
  return Array.from({ length: count }, (_, i) => ({
    date:         dateStringDaysAgo(count - i),
    score:        randomBetween(40, 95),
    sleepHours:   randomBetween(5.5, 9),
    sleepQuality: qualities[Math.floor(Math.random() * qualities.length)],
    hrv:          Math.random() > 0.3 ? randomBetween(25, 80) : undefined,
    _isMock:      true,
  }));
}

// ── Cycle data ────────────────────────────────────────────────────────────────

export interface MockCycleData {
  lastPeriodDate: string;
  cycleLength:    number;
  periodLength:   number;
  _isMock:        true;
}

export function generateCycleData(daysAgoLastPeriod = 14): MockCycleData {
  return {
    lastPeriodDate: dateStringDaysAgo(daysAgoLastPeriod),
    cycleLength:    Math.floor(randomBetween(26, 32)),
    periodLength:   Math.floor(randomBetween(3, 7)),
    _isMock:        true,
  };
}

// ── Inject / clear ────────────────────────────────────────────────────────────

export interface InjectedMockData {
  workoutHistory:    MockWorkout[];
  recoveryCheckins:  MockRecoveryCheckin[];
  cycleData:         MockCycleData;
  injectedAt:        string;
}

export function injectMockData(opts?: { workouts?: number; cycleOffset?: number }): InjectedMockData {
  if (!isClient()) throw new Error("Cannot inject mock data in SSR context");

  const data: InjectedMockData = {
    workoutHistory:   generateWorkoutHistory(opts?.workouts ?? 60),
    recoveryCheckins: generateRecoveryCheckins(30),
    cycleData:        generateCycleData(opts?.cycleOffset ?? 14),
    injectedAt:       new Date().toISOString(),
  };

  localStorage.setItem("axis_mock_workout_history_v1",   JSON.stringify(data.workoutHistory));
  localStorage.setItem("axis_mock_recovery_checkins_v1", JSON.stringify(data.recoveryCheckins));
  localStorage.setItem("axis_mock_cycle_data_v1",        JSON.stringify(data.cycleData));
  localStorage.setItem(MOCK_FLAG_KEY,                    JSON.stringify({ injectedAt: data.injectedAt }));

  return data;
}

export function clearMockData(): void {
  if (!isClient()) return;
  localStorage.removeItem("axis_mock_workout_history_v1");
  localStorage.removeItem("axis_mock_recovery_checkins_v1");
  localStorage.removeItem("axis_mock_cycle_data_v1");
  localStorage.removeItem(MOCK_FLAG_KEY);
}

export function isMockDataInjected(): boolean {
  if (!isClient()) return false;
  return localStorage.getItem(MOCK_FLAG_KEY) !== null;
}
