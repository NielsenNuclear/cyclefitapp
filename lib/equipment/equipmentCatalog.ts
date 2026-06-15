// ─── lib/equipment/equipmentCatalog.ts ───────────────────────────────────────
// Equipment item catalog: 80+ items covering the full exercise library.
// Uses `EquipmentGroup` (not EquipmentCategory) to avoid conflict with
// the existing EquipmentCategory type in exerciseLibrary.ts.
// Pure logic — no React, no side effects.

export type EquipmentGroup =
  | "barbells_and_bars"
  | "plates_and_weights"
  | "dumbbells"
  | "kettlebells"
  | "racks_and_benches"
  | "cables_and_machines"
  | "bodyweight_stations"
  | "cardio_and_power"
  | "accessories";

export interface EquipmentItem {
  id:              string;
  name:            string;
  group:           EquipmentGroup;
  difficultyImpact: "increases" | "decreases" | "none";
  priority:        "essential" | "high_value" | "optional";
}

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  // ── Barbells & Bars ────────────────────────────────────────────────────────
  { id: "barbell",           name: "Olympic Barbell",             group: "barbells_and_bars",   difficultyImpact: "increases", priority: "essential"   },
  { id: "ez_bar",            name: "EZ-Bar / Curl Bar",           group: "barbells_and_bars",   difficultyImpact: "none",      priority: "high_value"  },
  { id: "trap_bar",          name: "Trap Bar / Hex Bar",          group: "barbells_and_bars",   difficultyImpact: "decreases", priority: "high_value"  },
  { id: "safety_squat_bar",  name: "Safety Squat Bar",            group: "barbells_and_bars",   difficultyImpact: "none",      priority: "optional"    },
  { id: "swiss_bar",         name: "Swiss Bar / Multi-grip Bar",  group: "barbells_and_bars",   difficultyImpact: "decreases", priority: "optional"    },
  { id: "landmine",          name: "Landmine Attachment",         group: "barbells_and_bars",   difficultyImpact: "none",      priority: "high_value"  },

  // ── Plates & Weights ───────────────────────────────────────────────────────
  { id: "weight_plates",     name: "Weight Plates (standard)",    group: "plates_and_weights",  difficultyImpact: "none",      priority: "essential"   },
  { id: "bumper_plates",     name: "Bumper Plates (rubber)",      group: "plates_and_weights",  difficultyImpact: "none",      priority: "optional"    },
  { id: "fractional_plates", name: "Fractional Plates",           group: "plates_and_weights",  difficultyImpact: "none",      priority: "optional"    },

  // ── Dumbbells ──────────────────────────────────────────────────────────────
  { id: "dumbbells",         name: "Dumbbells",                   group: "dumbbells",           difficultyImpact: "decreases", priority: "essential"   },
  { id: "adjustable_dbs",   name: "Adjustable Dumbbells",        group: "dumbbells",           difficultyImpact: "decreases", priority: "high_value"  },

  // ── Kettlebells ────────────────────────────────────────────────────────────
  { id: "kettlebell",        name: "Kettlebell",                  group: "kettlebells",         difficultyImpact: "none",      priority: "high_value"  },
  { id: "adjustable_kb",    name: "Adjustable Kettlebell",       group: "kettlebells",         difficultyImpact: "none",      priority: "optional"    },

  // ── Racks & Benches ────────────────────────────────────────────────────────
  { id: "squat_rack",        name: "Squat Rack / Power Rack",     group: "racks_and_benches",   difficultyImpact: "none",      priority: "essential"   },
  { id: "flat_bench",        name: "Flat Weight Bench",           group: "racks_and_benches",   difficultyImpact: "none",      priority: "essential"   },
  { id: "incline_bench",     name: "Adjustable / Incline Bench",  group: "racks_and_benches",   difficultyImpact: "none",      priority: "high_value"  },
  { id: "adjustable_bench",  name: "Fully Adjustable Bench",      group: "racks_and_benches",   difficultyImpact: "none",      priority: "high_value"  },
  { id: "decline_bench",     name: "Decline Bench",               group: "racks_and_benches",   difficultyImpact: "none",      priority: "optional"    },
  { id: "hip_thrust_pad",    name: "Hip Thrust Pad / Hip Pad",    group: "racks_and_benches",   difficultyImpact: "none",      priority: "high_value"  },
  { id: "back_extension_bench", name: "45° Back Extension Bench", group: "racks_and_benches",   difficultyImpact: "none",      priority: "high_value"  },
  { id: "glute_ham_machine", name: "Glute-Ham Developer (GHD)",   group: "racks_and_benches",   difficultyImpact: "increases", priority: "optional"    },
  { id: "preacher_bench",    name: "Preacher Curl Bench",         group: "racks_and_benches",   difficultyImpact: "none",      priority: "optional"    },
  { id: "folding_rack",      name: "Folding Wall-Mounted Rack",   group: "racks_and_benches",   difficultyImpact: "none",      priority: "optional"    },

  // ── Cables & Machines ──────────────────────────────────────────────────────
  { id: "cable_machine",           name: "Cable Machine (functional trainer)", group: "cables_and_machines", difficultyImpact: "none",      priority: "essential"   },
  { id: "chest_press_machine",     name: "Chest Press Machine",                group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "pec_deck",                name: "Pec Deck Machine",                   group: "cables_and_machines", difficultyImpact: "decreases", priority: "optional"    },
  { id: "shoulder_press_machine",  name: "Shoulder Press Machine",             group: "cables_and_machines", difficultyImpact: "decreases", priority: "optional"    },
  { id: "machine_row",             name: "Chest-Supported Row Machine",        group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "lat_pulldown_machine",    name: "Lat Pulldown Machine",               group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "seated_row_machine",      name: "Seated Row Machine",                 group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "assisted_pullup_machine", name: "Assisted Pull-Up Machine",           group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "leg_press_machine",       name: "Leg Press Machine",                  group: "cables_and_machines", difficultyImpact: "decreases", priority: "essential"   },
  { id: "leg_extension_machine",   name: "Leg Extension Machine",              group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "leg_curl_machine",        name: "Lying Leg Curl Machine",             group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "seated_leg_curl_machine", name: "Seated Leg Curl Machine",            group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "hack_squat_machine",      name: "Hack Squat Machine",                 group: "cables_and_machines", difficultyImpact: "decreases", priority: "high_value"  },
  { id: "t_bar_machine",           name: "T-Bar Row Machine",                  group: "cables_and_machines", difficultyImpact: "none",      priority: "optional"    },
  { id: "smith_machine",           name: "Smith Machine",                      group: "cables_and_machines", difficultyImpact: "none",      priority: "optional"    },
  { id: "cable_rope",              name: "Cable Rope Attachment",              group: "cables_and_machines", difficultyImpact: "none",      priority: "optional"    },
  { id: "ankle_strap",             name: "Cable Ankle Strap",                  group: "cables_and_machines", difficultyImpact: "none",      priority: "high_value"  },
  { id: "cable_straight_bar",      name: "Cable Straight Bar Attachment",      group: "cables_and_machines", difficultyImpact: "none",      priority: "optional"    },
  { id: "neutral_grip_handle",     name: "Neutral Grip Cable Handle",          group: "cables_and_machines", difficultyImpact: "none",      priority: "optional"    },

  // ── Bodyweight Stations ────────────────────────────────────────────────────
  { id: "pullup_bar",        name: "Pull-Up Bar",                 group: "bodyweight_stations", difficultyImpact: "none",      priority: "essential"   },
  { id: "parallel_bars",     name: "Parallel Bars / Dip Bars",   group: "bodyweight_stations", difficultyImpact: "none",      priority: "high_value"  },
  { id: "dip_station",       name: "Freestanding Dip Station",   group: "bodyweight_stations", difficultyImpact: "none",      priority: "high_value"  },
  { id: "gymnastic_rings",   name: "Gymnastic Rings",             group: "bodyweight_stations", difficultyImpact: "increases", priority: "optional"    },
  { id: "suspension_trainer",name: "Suspension Trainer (TRX)",   group: "bodyweight_stations", difficultyImpact: "none",      priority: "optional"    },
  { id: "anchor_point",      name: "Wall Anchor / Beam",          group: "bodyweight_stations", difficultyImpact: "none",      priority: "optional"    },

  // ── Cardio & Power ─────────────────────────────────────────────────────────
  { id: "plyo_box",          name: "Plyometric Box",              group: "cardio_and_power",    difficultyImpact: "none",      priority: "high_value"  },
  { id: "battle_ropes",      name: "Battle Ropes",                group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "sled",              name: "Push / Pull Sled",            group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "assault_bike",      name: "Assault Bike / Air Bike",     group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "rowing_machine",    name: "Rowing Machine",              group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "jump_rope",         name: "Jump Rope",                   group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "farmer_handles",    name: "Farmer's Walk Handles",       group: "cardio_and_power",    difficultyImpact: "none",      priority: "optional"    },
  { id: "sandbag",           name: "Sandbag",                     group: "cardio_and_power",    difficultyImpact: "increases", priority: "optional"    },

  // ── Accessories ────────────────────────────────────────────────────────────
  { id: "resistance_band",   name: "Resistance Band",             group: "accessories",         difficultyImpact: "decreases", priority: "essential"   },
  { id: "foam_roller",       name: "Foam Roller",                 group: "accessories",         difficultyImpact: "none",      priority: "high_value"  },
  { id: "ab_wheel",          name: "Ab Wheel",                    group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "medicine_ball",     name: "Medicine Ball",               group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "step_box",          name: "Step Box / Aerobic Step",     group: "accessories",         difficultyImpact: "none",      priority: "high_value"  },
  { id: "heel_wedge",        name: "Heel Wedge / Slant Board",    group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "deficit_platform",  name: "Deficit Platform",            group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "yoga_mat",          name: "Exercise Mat",                group: "accessories",         difficultyImpact: "none",      priority: "high_value"  },
  { id: "stability_ball",    name: "Stability / Swiss Ball",      group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "weight_belt",       name: "Weight / Dip Belt",           group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "lifting_straps",    name: "Lifting Straps",              group: "accessories",         difficultyImpact: "decreases", priority: "optional"    },
  { id: "lacrosse_ball",     name: "Lacrosse Ball / Massage Ball",group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "wrist_wraps",       name: "Wrist Wraps",                 group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "knee_sleeves",      name: "Knee Sleeves",                group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "lifting_belt",      name: "Powerlifting Belt",           group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
  { id: "agility_ladder",    name: "Agility Ladder",              group: "accessories",         difficultyImpact: "none",      priority: "optional"    },
];

export const EQUIPMENT_BY_ID: Record<string, EquipmentItem> =
  Object.fromEntries(EQUIPMENT_CATALOG.map(e => [e.id, e]));

// ─── Equipment presets ────────────────────────────────────────────────────────

export type EquipmentPreset = "commercial_gym" | "garage_gym" | "home_basic" | "bodyweight_only";

export const EQUIPMENT_PRESET_LABELS: Record<EquipmentPreset, string> = {
  commercial_gym: "Commercial Gym",
  garage_gym:     "Garage Gym",
  home_basic:     "Dumbbells + Bench",
  bodyweight_only:"Bodyweight Only",
};

export const EQUIPMENT_PRESETS: Record<EquipmentPreset, string[]> = {
  commercial_gym: EQUIPMENT_CATALOG.map(e => e.id), // everything

  garage_gym: [
    "barbell", "weight_plates", "bumper_plates", "ez_bar",
    "squat_rack", "flat_bench", "incline_bench", "adjustable_bench",
    "hip_thrust_pad", "dumbbells", "kettlebell",
    "pullup_bar", "parallel_bars", "dip_station",
    "resistance_band", "foam_roller", "ab_wheel", "step_box", "yoga_mat",
    "lifting_straps", "weight_belt", "landmine",
  ],

  home_basic: [
    "dumbbells", "adjustable_dbs",
    "flat_bench", "incline_bench", "adjustable_bench",
    "pullup_bar", "dip_station",
    "resistance_band", "foam_roller", "yoga_mat",
    "step_box", "kettlebell",
  ],

  bodyweight_only: [
    "pullup_bar", "parallel_bars", "dip_station",
    "resistance_band", "foam_roller", "yoga_mat",
    "anchor_point", "suspension_trainer",
  ],
};

export function detectActivePreset(ownedIds: string[]): EquipmentPreset | null {
  const owned = new Set(ownedIds);
  // Only "bodyweight_only" preset is stable enough to detect exactly
  const bw = new Set(EQUIPMENT_PRESETS.bodyweight_only);
  if (ownedIds.every(id => bw.has(id)) && EQUIPMENT_PRESETS.bodyweight_only.every(id => owned.has(id))) {
    return "bodyweight_only";
  }
  const garage = new Set(EQUIPMENT_PRESETS.garage_gym);
  const garageCovered = EQUIPMENT_PRESETS.garage_gym.every(id => owned.has(id));
  if (garageCovered && ownedIds.every(id => garage.has(id))) return "garage_gym";
  const homeCovered = EQUIPMENT_PRESETS.home_basic.every(id => owned.has(id));
  const homeSet = new Set(EQUIPMENT_PRESETS.home_basic);
  if (homeCovered && ownedIds.every(id => homeSet.has(id))) return "home_basic";
  return null;
}
