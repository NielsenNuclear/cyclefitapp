// ─── Onboarding Types ─────────────────────────────────────────────────────────

export interface OnboardingData {
  // Step 1: Goals
  goals: string[];

  // Step 2: Training experience
  trainingLevel: string;
  trainingYears: string;

  // Step 3: Training style
  trainingStyles: string[];
  sessionsPerWeek: number;

  // Step 4: Recovery habits
  recoveryPractices: string[];

  // Step 5: Sleep
  sleepHours: number;
  sleepQuality: string;

  // Step 6: Stress
  stressLevel: number;
  stressSources: string[];

  // Step 7: Energy patterns
  energyPattern: string;
  lowEnergyTriggers: string[];

  // Step 8: Cycle info
  cycleLength: number;
  lastPeriodDate: string;
  cycleRegularity: string;
  trackingPreference: string;

  // Step 9: Symptoms
  symptoms: string[];
  symptomSeverity: string;

  // Step 10: Performance priorities
  performancePriorities: string[];
  primaryGoalDeadline: string;
}

export const EMPTY_ONBOARDING: OnboardingData = {
  goals: [],
  trainingLevel: "",
  trainingYears: "",
  trainingStyles: [],
  sessionsPerWeek: 3,
  recoveryPractices: [],
  sleepHours: 7,
  sleepQuality: "",
  stressLevel: 5,
  stressSources: [],
  energyPattern: "",
  lowEnergyTriggers: [],
  cycleLength: 28,
  lastPeriodDate: "",
  cycleRegularity: "",
  trackingPreference: "",
  symptoms: [],
  symptomSeverity: "",
  performancePriorities: [],
  primaryGoalDeadline: "",
};

export function canAdvance(step: number, data: OnboardingData): boolean {
  switch (step) {
    case 1:  return data.goals.length > 0;
    case 2:  return !!data.trainingLevel;
    case 3:  return data.trainingStyles.length > 0;
    case 4:  return data.recoveryPractices.length > 0;
    case 5:  return !!data.sleepQuality;
    case 6:  return true;
    case 7:  return !!data.energyPattern;
    case 8: {
      if (!data.cycleRegularity || !data.trackingPreference) return false;
      if (data.trackingPreference !== "none" && !data.lastPeriodDate) return false;
      return true;
    }
    case 9:  return data.symptoms.length > 0;
    case 10: return data.performancePriorities.length > 0;
    default: return true;
  }
}

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  category: string;
}

export const STEPS: StepConfig[] = [
  { id: 1,  title: "What are you training for?",     subtitle: "Select everything that resonates. Your profile adapts to all of them.", category: "Goals" },
  { id: 2,  title: "Your training background.",      subtitle: "This calibrates your baseline so recommendations start in the right place.", category: "Experience" },
  { id: 3,  title: "How do you prefer to train?",    subtitle: "Axis adapts across modalities — not just the gym.", category: "Training style" },
  { id: 4,  title: "How do you recover?",            subtitle: "Recovery practices shape your readiness model from day one.", category: "Recovery" },
  { id: 5,  title: "Tell us about your sleep.",      subtitle: "Sleep is the most weighted signal in your readiness score.", category: "Sleep" },
  { id: 6,  title: "How would you describe your stress?", subtitle: "Stress is a physiological input, not a personal failing.", category: "Stress" },
  { id: 7,  title: "Your energy patterns.",          subtitle: "Knowing your baseline helps us identify signal deviations.", category: "Energy" },
  { id: 8,  title: "Cycle information.",             subtitle: "Cycle phase is one signal among several — not the centre of your profile.", category: "Physiology" },
  { id: 9,  title: "Symptoms that affect training.", subtitle: "Only what's relevant to performance. This is not a health form.", category: "Symptoms" },
  { id: 10, title: "What matters most to you?",      subtitle: "Your top priorities shape how the adaptive engine weights its decisions.", category: "Priorities" },
];
