// ─── lib/equipment/customEquipment.ts ────────────────────────────────────────
// User-defined equipment that doesn't exist in the built-in catalog.
// Lets every user model their real-world gym, not just the presets Axis ships with.
// Pure logic — no React, no side effects.

const STORAGE_KEY = "axis_custom_equipment";
const MAX_ENTRIES  = 100;

export type CustomEquipmentCategory =
  | "free_weight"
  | "machine"
  | "cable"
  | "bodyweight_tool"
  | "conditioning"
  | "recovery"
  | "specialty_bar"
  | "other";

export interface CustomEquipment {
  id:        string;
  name:      string;
  category:  CustomEquipmentCategory;
  notes?:    string;
  active:    boolean;
  createdAt: string;
}

export interface CustomEquipmentResult {
  ok:     boolean;
  error?: string;
  item?:  CustomEquipment;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getCustomEquipment(): CustomEquipment[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomEquipment(items: CustomEquipment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function addCustomEquipment(input: {
  name:     string;
  category: CustomEquipmentCategory;
  notes?:   string;
}): CustomEquipmentResult {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { ok: false, error: "Equipment name cannot be empty." };

  const existing = getCustomEquipment();
  if (existing.length >= MAX_ENTRIES) {
    return { ok: false, error: `You can track up to ${MAX_ENTRIES} custom equipment items.` };
  }
  if (existing.some(e => normalizeName(e.name) === normalizeName(trimmedName))) {
    return { ok: false, error: "Equipment with this name already exists." };
  }

  const item: CustomEquipment = {
    id:        `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name:      trimmedName,
    category:  input.category,
    notes:     input.notes?.trim() || undefined,
    active:    true,
    createdAt: new Date().toISOString(),
  };
  saveCustomEquipment([...existing, item]);
  return { ok: true, item };
}

export function updateCustomEquipment(
  id:     string,
  update: Partial<Pick<CustomEquipment, "name" | "category" | "notes" | "active">>,
): CustomEquipmentResult {
  const existing = getCustomEquipment();
  const target    = existing.find(e => e.id === id);
  if (!target) return { ok: false, error: "Equipment not found." };

  let nextUpdate = update;
  if (update.name !== undefined) {
    const trimmedName = update.name.trim();
    if (!trimmedName) return { ok: false, error: "Equipment name cannot be empty." };
    if (existing.some(e => e.id !== id && normalizeName(e.name) === normalizeName(trimmedName))) {
      return { ok: false, error: "Equipment with this name already exists." };
    }
    nextUpdate = { ...update, name: trimmedName };
  }

  const updated = existing.map(e => (e.id === id ? { ...e, ...nextUpdate } : e));
  saveCustomEquipment(updated);
  return { ok: true, item: updated.find(e => e.id === id) };
}

export function deleteCustomEquipment(id: string): void {
  const existing = getCustomEquipment();
  saveCustomEquipment(existing.filter(e => e.id !== id));
}
