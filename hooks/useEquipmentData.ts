"use client";

import { useState } from "react";
import type { EquipmentCapabilityProfile } from "@/lib/equipment/equipmentProfile";
import type { EquipmentUsageAnalytics } from "@/lib/equipment/equipmentUsage";

export function useEquipmentData() {
  const [equipmentProfile,       setEquipmentProfile]       = useState<EquipmentCapabilityProfile | null>(null);
  const [equipmentUsageAnalytics, setEquipmentUsageAnalytics] = useState<EquipmentUsageAnalytics | null>(null);

  return {
    equipmentProfile,        setEquipmentProfile,
    equipmentUsageAnalytics, setEquipmentUsageAnalytics,
  };
}
