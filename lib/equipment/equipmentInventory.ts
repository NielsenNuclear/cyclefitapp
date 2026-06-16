// ─── lib/equipment/equipmentInventory.ts ─────────────────────────────────────
// Merges built-in catalog equipment with user-defined custom equipment into a
// single inventory the rest of the equipment pipeline can consume.
// Pure logic — no React, no side effects.

import { getUserEquipment } from "@/lib/equipment/equipmentProfile";
import { getCustomEquipment, type CustomEquipment } from "@/lib/equipment/customEquipment";

export interface EquipmentInventory {
  builtInEquipment:  string[];
  customEquipment:   CustomEquipment[];
  allEquipmentNames: string[];
}

export function buildEquipmentInventory(): EquipmentInventory {
  const builtInEquipment = getUserEquipment();
  const customEquipment  = getCustomEquipment();
  const activeCustomNames = customEquipment.filter(e => e.active).map(e => e.name);

  return {
    builtInEquipment,
    customEquipment,
    allEquipmentNames: [...builtInEquipment, ...activeCustomNames],
  };
}
