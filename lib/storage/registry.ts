// ─── lib/storage/registry.ts ─────────────────────────────────────────────────
// 51A — Central Storage Key Registry
// All axis_* localStorage keys are declared here to prevent collision and
// enable systematic pruning. Import the key constant, not the raw string.

export const STORAGE_KEYS = {
  // ── Core ─────────────────────────────────────────────────────────────────
  ONBOARDING:                "axis_onboarding",
  ENVIRONMENT:               "axis_env",

  // ── Workout & History ────────────────────────────────────────────────────
  WORKOUT_HISTORY:           "axis_workout_history",
  WORKOUT_LOG:               "axis_workout_log",
  WORKOUT_FEEDBACK:          "axis_workout_feedback",
  EXERCISE_PERFORMANCE:      "axis_exercise_performance",

  // ── Readiness ────────────────────────────────────────────────────────────
  READINESS_HISTORY:         "axis_readiness_history",
  READINESS_TREND:           "axis_readiness_trend",
  TODAY_CHECKIN:             "axis_today_checkin",

  // ── Cycle & Physiology ───────────────────────────────────────────────────
  PERIOD_HISTORY:            "axis_period_history",
  SYMPTOM_HISTORY:           "axis_symptom_history",
  PHYSIOLOGY_HISTORY:        "axis_physiology_history",
  CYCLE_PATTERNS:            "axis_cycle_patterns",
  ACCURACY_REPORT:           "axis_accuracy_report",

  // ── Recovery ─────────────────────────────────────────────────────────────
  RECOVERY_SCORES:           "axis_recovery_scores",
  RECOVERY_LOGS:             "axis_recovery_logs",
  RECOVERY_BANK:             "axis_recovery_bank",
  RECOVERY_STRATEGY_HISTORY: "axis_recovery_strategy_history",
  RECOVERY_RESPONSES:        "axis_recovery_responses",
  FATIGUE_HISTORY:           "axis_fatigue_history",

  // ── Adherence ────────────────────────────────────────────────────────────
  ADHERENCE_HISTORY:         "axis_adherence_history",
  ADHERENCE_PROFILE:         "axis_adherence_profile",
  CONSISTENCY_HISTORY:       "axis_consistency_history",
  RESCUE_MODE:               "axis_rescue_mode",
  LIFE_EVENTS:               "axis_life_events",
  SCHEDULED_EVENTS:          "axis_scheduled_events",

  // ── Planning & Progression ───────────────────────────────────────────────
  TRAINING_BLOCK:            "axis_training_block",
  PERIODIZATION_STATE:       "axis_periodization_state",
  GOAL_ROADMAP:              "axis_goal_roadmap",
  MILESTONES:                "axis_milestones",         // lib/planning/milestoneEngine.ts

  // ── Nutrition ────────────────────────────────────────────────────────────
  NUTRITION_LOG:             "axis_nutrition_log",
  NUTRITION_PROFILE:         "axis_nutrition_profile",

  // ── Performance ──────────────────────────────────────────────────────────
  PERFORMANCE_HISTORY:       "axis_perf_history",
  PREDICTION_LOG:            "axis_prediction_log",
  OUTCOME_PREDICTIONS:       "axis_outcome_predictions",
  RECOMMENDATION_EVIDENCE:   "axis_rec_evidence",

  // ── Adaptive Learning ────────────────────────────────────────────────────
  PHASE_RESPONSE_PROFILE:    "axis_phase_response",
  COACHING_MEMORY:           "axis_coaching_memory",
  ADAPTIVE_PROFILE:          "axis_adaptive_profile",
  PERSONAL_WEIGHTS:          "axis_personal_weights",
  EQUIPMENT_USAGE:           "axis_equipment_usage",
  EQUIPMENT_SKIPS:           "axis_equipment_skips",
  SCHEDULE_LEARNING:         "axis_schedule_learning",
  SUCCESS_SNAPSHOTS:         "axis_success_snapshots",
  INTERVENTION_LOG:          "axis_intervention_log",
  SITUATION_MEMORY:          "axis_situation_memory",

  // ── Phase 40–41 Intelligence ─────────────────────────────────────────────
  PREDICTOR_RANKING:         "axis_predictor_ranking_v1",   // Phase 49 persistent ranking
  UNCERTAINTY_SIGNAL:        "axis_uncertainty_v1",         // Phase 52 cross-session gate

  // ── Athlete Development ──────────────────────────────────────────────────
  ATHLETE_MILESTONES:        "axis_athlete_milestones",     // lib/athlete/milestoneDetection.ts
  // NOTE: "axis_milestones" (above) is used by lib/planning/milestoneEngine.ts — different schema
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
