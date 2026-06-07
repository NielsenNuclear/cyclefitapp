export interface CheckinData {
  sleepQuality: "excellent" | "good" | "variable" | "poor";
  stressLevel: number;
  date: string; // "YYYY-MM-DD"
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayCheckin(): CheckinData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("axis_checkin_today");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckinData;
    if (parsed.date !== todayISO()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTodayCheckin(data: CheckinData): void {
  try {
    localStorage.setItem(
      "axis_checkin_today",
      JSON.stringify({ ...data, date: todayISO() })
    );
  } catch {
    // storage unavailable or quota exceeded — fail silently
  }
}

export function clearTodayCheckin(): void {
  try {
    localStorage.removeItem("axis_checkin_today");
  } catch {
    // storage unavailable — fail silently
  }
}
