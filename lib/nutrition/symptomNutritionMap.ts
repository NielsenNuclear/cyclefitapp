// ─── lib/nutrition/symptomNutritionMap.ts ────────────────────────────────────
// Maps active symptoms to concrete, actionable nutrition adjustments.
// Pure function — no localStorage, no React.

import type { SymptomEntry }  from "@/lib/symptoms/symptomHistory";
import { SYMPTOM_BY_ID }      from "@/lib/symptoms/symptomCatalog";

export interface NutritionAdjustment {
  symptomId:   string;
  symptomName: string;
  focus:       string;    // short label, e.g. "Iron-rich foods"
  suggestion:  string;    // actionable 1-liner
}

const RULES: Record<string, { focus: string; suggestion: string }> = {
  "fatigue": {
    focus:      "Iron-rich foods",
    suggestion: "Include red meat, lentils, or spinach today — pair with vitamin C to boost iron absorption.",
  },
  "energy": {
    focus:      "Iron and B vitamins",
    suggestion: "Consistent meal timing with iron-rich proteins and B12 sources (eggs, meat, or fortified foods).",
  },
  "headache": {
    focus:      "Fluids and electrolytes",
    suggestion: "Increase water intake and include sodium, potassium, and magnesium sources before any training.",
  },
  "cramps": {
    focus:      "Magnesium and anti-inflammatories",
    suggestion: "Dark chocolate, nuts, seeds, and oily fish can ease cramp severity for many women.",
  },
  "bloating": {
    focus:      "Sodium reduction and hydration",
    suggestion: "Reduce sodium-heavy processed foods; prioritise water intake spread across the day.",
  },
  "digestive-issues": {
    focus:      "Easily digestible foods",
    suggestion: "Cooked vegetables over raw, avoid high-fibre pre-workout meals, and eat slowly today.",
  },
  "nausea": {
    focus:      "Bland, easy-to-digest foods",
    suggestion: "Small, frequent meals — ginger, plain rice, or toast often help manage nausea.",
  },
  "food-cravings": {
    focus:      "Protein and fibre distribution",
    suggestion: "Spreading protein evenly across 4–5 meals helps stabilise blood sugar and reduce cravings.",
  },
  "appetite-increase": {
    focus:      "Satiety foods",
    suggestion: "High-protein and high-fibre meals before peak hunger windows help manage intake without restriction.",
  },
  "appetite-loss": {
    focus:      "Smaller frequent meals",
    suggestion: "Aim for 5–6 small nutrient-dense meals rather than 3 large ones when appetite is low.",
  },
  "mood-changes": {
    focus:      "Complex carbs and tryptophan",
    suggestion: "Wholegrains, oats, or sweet potato support serotonin synthesis — steady carb intake matters today.",
  },
  "sleep-quality": {
    focus:      "Magnesium and tryptophan",
    suggestion: "An evening snack of nuts, seeds, or a banana with milk supports sleep-related neurotransmitters.",
  },
};

/**
 * Returns nutrition adjustments for symptoms logged today.
 * Only includes symptoms with severity > 0 and a known rule.
 * Results are deduplicated and capped at 4 adjustments.
 */
export function getSymptomNutritionAdjustments(
  todaySymptoms: SymptomEntry[],
): NutritionAdjustment[] {
  const adjustments: NutritionAdjustment[] = [];
  const seen = new Set<string>();

  for (const s of todaySymptoms) {
    if (s.severity === 0)         continue;
    if (seen.has(s.symptomId))    continue;
    const rule = RULES[s.symptomId];
    if (!rule)                    continue;

    const symptomName = SYMPTOM_BY_ID[s.symptomId]?.name ?? s.symptomId;
    adjustments.push({ symptomId: s.symptomId, symptomName, ...rule });
    seen.add(s.symptomId);

    if (adjustments.length >= 4) break;
  }

  return adjustments;
}
