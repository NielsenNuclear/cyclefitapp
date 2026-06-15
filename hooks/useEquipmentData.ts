"use client";

import { useState } from "react";
import type { EquipmentCapabilityProfile } from "@/lib/equipment/equipmentProfile";

export function useEquipmentData() {
  const [equipmentProfile, setEquipmentProfile] = useState<EquipmentCapabilityProfile | null>(null);

  return { equipmentProfile, setEquipmentProfile };
}
