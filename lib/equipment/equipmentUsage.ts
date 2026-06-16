// ─── lib/equipment/equipmentUsage.ts ─────────────────────────────────────────
// Records which equipment the user actually exercises with on each completed
// workout so we can surface "unused for 6 weeks" and "most used" insights.
// Pure logic — no React, no side effects.

import type { Exercise } from "@/lib/exercises/exerciseLibrary";
import { EQUIPMENT_CATALOG } from "@/lib/equipment/equipmentCatalog";
import { deriveCompatibilityGroups } from "@/lib/equipment/equipmentCompatibility";

const STORAGE_KEY = "axis_equipment_usage";
const MAX_ENTRIES  = 200;
const UNUSED_WEEKS = 6;

export interface EquipmentUsageEntry {
  date:          string;   // YYYY-MM-DD
  usedEquipment: string[]; // catalog IDs (built-in) or equipment names (custom)
}

export interface EquipmentUsageItem {
  equipmentName:     string;
  usageCount:        number;
  lastUsed:          string | null;
  weeksSinceLastUse: number | null;
}

export interface EquipmentUsageAnalytics {
  mostUsed:        EquipmentUsageItem[];
  underused:       EquipmentUsageItem[];
  unused:          EquipmentUsageItem[];
  recommendations: string[];
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getEquipmentUsageHistory(): EquipmentUsageEntry[] {
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

// ─── Logging ──────────────────────────────────────────────────────────────────

export function logEquipmentUsage(exercises: Exercise[], ownedIds: string[]): void {
  if (typeof window === "undefined") return;
  const ownedSet = new Set(ownedIds.map(id => id.toLowerCase()));
  const used = new Set<string>();

  for (const exercise of exercises) {
    if (exercise.customEquipmentRequired) {
      for (const req of exercise.customEquipmentRequired) {
        if (ownedSet.has(req.toLowerCase())) used.add(req);
      }
    } else {
      const groups = deriveCompatibilityGroups(exercise.equipment);
      for (const group of groups) {
        const match = group.find(id => ownedSet.has(id.toLowerCase()));
        if (match) used.add(match);
      }
    }
  }

  const today   = new Date().toISOString().slice(0, 10);
  const history = getEquipmentUsageHistory();

  // Merge into existing entry for today rather than appending a duplicate.
  const existingIdx = history.findIndex(e => e.date === today);
  let updated: EquipmentUsageEntry[];
  if (existingIdx !== -1) {
    const merged = new Set([...history[existingIdx].usedEquipment, ...used]);
    updated = history.map((e, i) =>
      i === existingIdx ? { ...e, usedEquipment: [...merged] } : e
    );
  } else {
    updated = [{ date: today, usedEquipment: [...used] }, ...history].slice(0, MAX_ENTRIES);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function weeksBetween(dateA: string, dateB: string): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((new Date(dateA).getTime() - new Date(dateB).getTime()) / msPerWeek);
}

function displayName(id: string): string {
  const catalogItem = EQUIPMENT_CATALOG.find(e => e.id === id);
  return catalogItem ? catalogItem.name : id;
}

export function analyzeEquipmentUsage(ownedIds: string[]): EquipmentUsageAnalytics {
  const history  = getEquipmentUsageHistory();
  if (history.length < 3) return { mostUsed: [], underused: [], unused: [], recommendations: [] };
  const today    = new Date().toISOString().slice(0, 10);
  const sixWeeksAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - UNUSED_WEEKS * 7);
    return d.toISOString().slice(0, 10);
  })();

  // Build per-equipment-item usage stats across all history
  const stats: Record<string, { count: number; lastUsed: string | null }> = {};
  for (const owned of ownedIds) {
    stats[owned] = { count: 0, lastUsed: null };
  }
  for (const entry of history) {
    for (const id of entry.usedEquipment) {
      if (!stats[id]) continue; // skip equipment no longer owned
      stats[id].count++;
      if (!stats[id].lastUsed || entry.date > stats[id].lastUsed!) {
        stats[id].lastUsed = entry.date;
      }
    }
  }

  const items: EquipmentUsageItem[] = ownedIds.map(id => ({
    equipmentName:     displayName(id),
    usageCount:        stats[id]?.count ?? 0,
    lastUsed:          stats[id]?.lastUsed ?? null,
    weeksSinceLastUse: stats[id]?.lastUsed
      ? weeksBetween(today, stats[id].lastUsed!)
      : null,
  }));

  const withUsage    = items.filter(i => i.usageCount > 0);
  const withoutUsage = items.filter(i => i.usageCount === 0);

  const sorted = [...withUsage].sort((a, b) => b.usageCount - a.usageCount);
  const avgUsage = withUsage.length > 0
    ? withUsage.reduce((sum, i) => sum + i.usageCount, 0) / withUsage.length
    : 0;
  const underusedThreshold = Math.max(1, Math.floor(avgUsage * 0.4));

  const mostUsed  = sorted.slice(0, 5);
  const underused = sorted.filter(i => i.usageCount <= underusedThreshold && i.usageCount > 0);
  const unusedRecent = items.filter(i =>
    i.lastUsed === null ||
    (i.lastUsed !== null && i.lastUsed < sixWeeksAgo)
  );
  const unused = unusedRecent;

  const recommendations: string[] = [];
  for (const item of unusedRecent.slice(0, 3)) {
    if (item.lastUsed === null) {
      recommendations.push(`You own ${item.equipmentName} but haven't used it yet — consider adding it to your rotation.`);
    } else if (item.weeksSinceLastUse !== null && item.weeksSinceLastUse >= UNUSED_WEEKS) {
      recommendations.push(`You own ${item.equipmentName} but haven't used it in ${item.weeksSinceLastUse} weeks.`);
    }
  }
  if (mostUsed.length > 0) {
    recommendations.push(`You frequently train with ${mostUsed[0].equipmentName}.`);
  }

  return { mostUsed, underused, unused, recommendations };
}
