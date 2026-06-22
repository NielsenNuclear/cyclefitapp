// ─── lib/lifestyle/travelMode.ts ──────────────────────────────────────────────
// Phase 39C — Travel Mode.
// Persists an active travel context and provides equipment overrides so
// workout generation automatically adapts to hotel/no-gym scenarios.

const STORAGE_KEY = "axis_travel_mode";

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export type TravelContext = "no_travel" | "hotel_gym" | "no_gym" | "jet_lag";

export const TRAVEL_LABELS: Record<TravelContext, string> = {
  no_travel: "Not travelling",
  hotel_gym: "Hotel gym",
  no_gym:    "No gym access",
  jet_lag:   "Jet lag / long-haul travel",
};

export interface TravelModeState {
  isActive:          boolean;
  context:           TravelContext;
  equipmentOverride: string[];   // equipment available during travel
  volumeScale:       number;     // adjustment to apply on top of other modifiers
  note:              string;
}

// ─── Equipment presets ────────────────────────────────────────────────────────

const TRAVEL_EQUIPMENT: Record<TravelContext, string[]> = {
  no_travel: [],   // not used — falls back to user's full inventory
  hotel_gym: ["Dumbbells", "Cable Machine", "Resistance Bands", "Bench"],
  no_gym:    ["Resistance Bands", "Bodyweight"],
  jet_lag:   ["Resistance Bands", "Bodyweight"],
};

const TRAVEL_VOLUME_SCALE: Record<TravelContext, number> = {
  no_travel: 1.0,
  hotel_gym: 0.85,
  no_gym:    0.75,
  jet_lag:   0.60,
};

const TRAVEL_NOTES: Record<TravelContext, string> = {
  no_travel: "",
  hotel_gym: "Hotel gym mode — workouts adapted to available equipment.",
  no_gym:    "No gym access — bodyweight and band training only.",
  jet_lag:   "Jet lag mode — reduced volume, focus on recovery and light movement.",
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

interface StoredTravel {
  context:   TravelContext;
  activatedAt: string;
}

function load(): StoredTravel | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTravel) : null;
  } catch { return null; }
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function getTravelModeState(): TravelModeState {
  const stored = load();
  if (!stored || stored.context === "no_travel") {
    return { isActive: false, context: "no_travel", equipmentOverride: [], volumeScale: 1.0, note: "" };
  }
  return {
    isActive:          true,
    context:           stored.context,
    equipmentOverride: TRAVEL_EQUIPMENT[stored.context],
    volumeScale:       TRAVEL_VOLUME_SCALE[stored.context],
    note:              TRAVEL_NOTES[stored.context],
  };
}

export function activateTravelMode(context: Exclude<TravelContext, "no_travel">): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ context, activatedAt: new Date().toISOString() }));
}

export function clearTravelMode(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}
