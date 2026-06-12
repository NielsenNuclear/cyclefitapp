// ─── lib/symptoms/symptomCatalog.ts ──────────────────────────────────────────
// Canonical symptom definitions. Pure constants — no logic, no side effects.

export interface Symptom {
  id:                 string;
  name:               string;
  category:           "physical" | "mental" | "performance" | "recovery";
  description:        string;
  defaultQuickAccess: boolean;
}

export const SYMPTOM_CATALOG: Symptom[] = [
  // ── Default Quick Symptoms (10) ───────────────────────────────────────────
  {
    id:                 "energy",
    name:               "Energy",
    category:           "performance",
    description:        "Overall energy level available for training and daily activities.",
    defaultQuickAccess: true,
  },
  {
    id:                 "fatigue",
    name:               "Fatigue",
    category:           "recovery",
    description:        "Physical tiredness or exhaustion beyond typical post-training soreness.",
    defaultQuickAccess: true,
  },
  {
    id:                 "cramps",
    name:               "Cramps",
    category:           "physical",
    description:        "Uterine or abdominal cramping, typically associated with menstruation.",
    defaultQuickAccess: true,
  },
  {
    id:                 "mood-changes",
    name:               "Mood Changes",
    category:           "mental",
    description:        "Noticeable shifts in emotional state or mood stability.",
    defaultQuickAccess: true,
  },
  {
    id:                 "bloating",
    name:               "Bloating",
    category:           "physical",
    description:        "Abdominal fullness, distension, or discomfort.",
    defaultQuickAccess: true,
  },
  {
    id:                 "sleep-quality",
    name:               "Sleep Quality",
    category:           "recovery",
    description:        "Perceived quality of sleep — restfulness, interruptions, depth.",
    defaultQuickAccess: true,
  },
  {
    id:                 "motivation",
    name:               "Motivation",
    category:           "performance",
    description:        "Drive and willingness to train or engage in physical activity.",
    defaultQuickAccess: true,
  },
  {
    id:                 "stress",
    name:               "Stress",
    category:           "mental",
    description:        "Perceived psychological or physiological stress burden.",
    defaultQuickAccess: true,
  },
  {
    id:                 "breast-tenderness",
    name:               "Breast Tenderness",
    category:           "physical",
    description:        "Sensitivity or discomfort in breast tissue.",
    defaultQuickAccess: true,
  },
  {
    id:                 "headache",
    name:               "Headache",
    category:           "physical",
    description:        "Head pain ranging from mild tension to severe migraine.",
    defaultQuickAccess: true,
  },

  // ── Other Symptoms (15) ───────────────────────────────────────────────────
  {
    id:                 "acne",
    name:               "Acne",
    category:           "physical",
    description:        "Skin breakouts or increased sebum production.",
    defaultQuickAccess: false,
  },
  {
    id:                 "food-cravings",
    name:               "Food Cravings",
    category:           "physical",
    description:        "Strong urges for specific foods, often carbohydrate or sugar-driven.",
    defaultQuickAccess: false,
  },
  {
    id:                 "appetite-increase",
    name:               "Appetite Increase",
    category:           "physical",
    description:        "Noticeably higher hunger or caloric drive than baseline.",
    defaultQuickAccess: false,
  },
  {
    id:                 "appetite-loss",
    name:               "Appetite Loss",
    category:           "physical",
    description:        "Reduced hunger or interest in food.",
    defaultQuickAccess: false,
  },
  {
    id:                 "digestive-issues",
    name:               "Digestive Issues",
    category:           "physical",
    description:        "GI discomfort including constipation, diarrhoea, or irregular motility.",
    defaultQuickAccess: false,
  },
  {
    id:                 "nausea",
    name:               "Nausea",
    category:           "physical",
    description:        "Sensation of stomach unease or urge to vomit.",
    defaultQuickAccess: false,
  },
  {
    id:                 "dizziness",
    name:               "Dizziness",
    category:           "physical",
    description:        "Lightheadedness, vertigo, or balance disturbance.",
    defaultQuickAccess: false,
  },
  {
    id:                 "hot-flashes",
    name:               "Hot Flashes",
    category:           "physical",
    description:        "Sudden waves of body heat, often with sweating and flushing.",
    defaultQuickAccess: false,
  },
  {
    id:                 "night-sweats",
    name:               "Night Sweats",
    category:           "recovery",
    description:        "Excessive sweating during sleep, disrupting sleep quality.",
    defaultQuickAccess: false,
  },
  {
    id:                 "irritability",
    name:               "Irritability",
    category:           "mental",
    description:        "Increased frustration or reduced emotional tolerance.",
    defaultQuickAccess: false,
  },
  {
    id:                 "anxiety",
    name:               "Anxiety",
    category:           "mental",
    description:        "Heightened worry, nervousness, or sense of unease.",
    defaultQuickAccess: false,
  },
  {
    id:                 "depression-symptoms",
    name:               "Depression Symptoms",
    category:           "mental",
    description:        "Low mood, reduced interest, or persistent sadness.",
    defaultQuickAccess: false,
  },
  {
    id:                 "joint-pain",
    name:               "Joint Pain",
    category:           "physical",
    description:        "Discomfort or stiffness in joints, potentially linked to hormone-driven inflammation.",
    defaultQuickAccess: false,
  },
  {
    id:                 "muscle-soreness",
    name:               "Muscle Soreness",
    category:           "recovery",
    description:        "DOMS or generalised muscular tenderness beyond normal post-training response.",
    defaultQuickAccess: false,
  },
  {
    id:                 "water-retention",
    name:               "Water Retention",
    category:           "physical",
    description:        "Puffiness or swelling, often in hands, face, or lower limbs.",
    defaultQuickAccess: false,
  },
];

export const SYMPTOM_BY_ID: Record<string, Symptom> = Object.fromEntries(
  SYMPTOM_CATALOG.map(s => [s.id, s])
);
