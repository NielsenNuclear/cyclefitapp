// ─── lib/launch/dailyLaunch.ts ─────────────────────────────────────────────────
// Daily Briefing — tracks whether this is the first app launch of the calendar
// day, independent of check-in status. Distinct from lib/checkin.ts's "today"
// tracking: this only ever records a date stamp, never check-in content.

const STORAGE_KEY = "axis_last_launch_date";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLastLaunchDate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isFirstLaunchToday(): boolean {
  return getLastLaunchDate() !== todayISO();
}

export function markLaunchedToday(): void {
  try {
    localStorage.setItem(STORAGE_KEY, todayISO());
  } catch {
    // storage unavailable — the welcome overlay just won't remember across launches
  }
}
