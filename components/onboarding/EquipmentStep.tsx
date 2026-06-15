"use client";

import { useState } from "react";
import type { OnboardingData } from "@/lib/onboarding-types";
import {
  EQUIPMENT_CATALOG, EQUIPMENT_PRESET_LABELS, EQUIPMENT_PRESETS,
  type EquipmentGroup, type EquipmentPreset,
} from "@/lib/equipment/equipmentCatalog";

interface StepProps {
  data:     OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const GROUP_LABELS: Record<EquipmentGroup, string> = {
  barbells_and_bars:   "Barbells & Bars",
  plates_and_weights:  "Plates & Weights",
  dumbbells:           "Dumbbells",
  kettlebells:         "Kettlebells",
  racks_and_benches:   "Racks & Benches",
  cables_and_machines: "Cable Machines",
  bodyweight_stations: "Bodyweight Stations",
  cardio_and_power:    "Cardio & Power",
  accessories:         "Accessories",
};

const GROUP_ORDER: EquipmentGroup[] = [
  "barbells_and_bars", "plates_and_weights", "dumbbells", "kettlebells",
  "racks_and_benches", "cables_and_machines", "bodyweight_stations",
  "cardio_and_power", "accessories",
];

const PRESET_DESCRIPTIONS: Record<EquipmentPreset, string> = {
  commercial_gym:  "Full gym access: all machines, cables, racks, and cardio",
  garage_gym:      "Home rack setup: barbell, plates, dumbbells, pull-up bar",
  home_basic:      "Dumbbells, bench, resistance bands, and pull-up bar",
  bodyweight_only: "No weights — bodyweight, bands, and suspension only",
};

export function Step11Equipment({ data, onChange }: StepProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<EquipmentGroup>>(new Set());
  const owned = new Set(data.equipment ?? []);

  function applyPreset(preset: EquipmentPreset) {
    onChange({ equipment: [...EQUIPMENT_PRESETS[preset]] });
  }

  function toggleItem(id: string) {
    const next = new Set(owned);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange({ equipment: [...next] });
  }

  function toggleGroup(group: EquipmentGroup) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  const groupedItems = GROUP_ORDER.map(group => ({
    group,
    items: EQUIPMENT_CATALOG.filter(e => e.group === group),
    ownedCount: EQUIPMENT_CATALOG.filter(e => e.group === group && owned.has(e.id)).length,
  }));

  return (
    <div className="space-y-5">

      {/* Presets */}
      <div>
        <p className="text-[12px] text-[#7A7870] mb-3">Start with a preset, then customise below.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.keys(EQUIPMENT_PRESET_LABELS) as EquipmentPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="text-left p-3.5 rounded-xl border border-[#DDD9CF] bg-white hover:border-[#534AB7] hover:bg-[#F5F4FF] transition-all duration-150"
            >
              <div className="text-[13px] font-semibold text-[#1C1B18] leading-tight mb-1">
                {EQUIPMENT_PRESET_LABELS[preset]}
              </div>
              <div className="text-[11px] text-[#8A8880] leading-relaxed">
                {PRESET_DESCRIPTIONS[preset]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Owned summary */}
      {owned.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#F0EEF8] rounded-xl">
          <span className="text-[12px] text-[#534AB7] font-medium">
            {owned.size} item{owned.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => onChange({ equipment: [] })}
            className="text-[11px] text-[#8A8880] hover:text-[#534AB7] transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Per-group toggles */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-[#8A8880]">Customise</p>
        {groupedItems.map(({ group, items, ownedCount }) => (
          <div key={group} className="border border-[#E5E2DA] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#FAFAF7] transition-colors"
            >
              <span className="text-[13px] font-medium text-[#1C1B18]">{GROUP_LABELS[group]}</span>
              <div className="flex items-center gap-2">
                {ownedCount > 0 && (
                  <span className="text-[11px] text-[#534AB7] font-medium">{ownedCount}</span>
                )}
                <span className="text-[11px] text-[#9B9690]">
                  {expandedGroups.has(group) ? "▲" : "▼"}
                </span>
              </div>
            </button>
            {expandedGroups.has(group) && (
              <div className="border-t border-[#E5E2DA] divide-y divide-[#F0EDE7]">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                      owned.has(item.id)
                        ? "bg-[#F5F4FF]"
                        : "bg-white hover:bg-[#FAFAF7]"
                    }`}
                  >
                    <span className={`text-[13px] ${owned.has(item.id) ? "text-[#534AB7] font-medium" : "text-[#3C3B38]"}`}>
                      {item.name}
                    </span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      owned.has(item.id)
                        ? "bg-[#534AB7] border-[#534AB7]"
                        : "border-[#C5C1B7]"
                    }`}>
                      {owned.has(item.id) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
