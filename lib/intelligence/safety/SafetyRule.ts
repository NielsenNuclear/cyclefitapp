// ─── lib/intelligence/safety/SafetyRule.ts ───────────────────────────────────
// Phase 68 — Safety rule types and the canonical built-in rule set.

export type RulePriority = "critical" | "high" | "moderate" | "informational";
export type RuleOutcome  = "pass" | "blocked" | "clamped" | "overridden";

export interface SafetyContext {
  proposedVolumeScale:  number;
  currentVolumeScale:   number;
  readinessScore:       number;
  recoveryScore:        number;
  fatigueEstimate:      number;
  streakDays:           number;
  weeklyVolumeSets:     number;
  prevWeekVolumeSets:   number;   // 0 if unknown
  hasSymptoms:          boolean;
  confidenceScore:      number;
  isDeload:             boolean;
  lowRecoveryDays:      number;   // consecutive days with recovery < 40
  proposedIntensity:    string;
  currentIntensity:     string;
}

export interface SafetyRuleResult {
  ruleId:          string;
  ruleName:        string;
  priority:        RulePriority;
  outcome:         RuleOutcome;
  inputValue?:     number;
  limit?:          number;
  constrainedTo?:  number;        // clamped value, if outcome = "clamped"
  reason:          string;
  userMessage?:    string;        // shown to user when outcome != pass
}

export interface SafetyRule {
  id:       string;
  name:     string;
  priority: RulePriority;
  evaluate: (ctx: SafetyContext) => SafetyRuleResult;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function pass(id: string, name: string, priority: RulePriority): SafetyRuleResult {
  return { ruleId: id, ruleName: name, priority, outcome: "pass", reason: "Within safe limits" };
}

// ── Built-in rules ────────────────────────────────────────────────────────────

export const BUILT_IN_RULES: SafetyRule[] = [
  // ── Critical ───────────────────────────────────────────────────────────────

  {
    id: "max-weekly-volume-increase",
    name: "Maximum Weekly Volume Increase",
    priority: "critical",
    evaluate(ctx) {
      if (ctx.prevWeekVolumeSets === 0) return pass(this.id, this.name, this.priority);
      const increase = (ctx.weeklyVolumeSets - ctx.prevWeekVolumeSets) / ctx.prevWeekVolumeSets;
      const limit = 0.10;
      if (increase > limit) {
        const safe = Math.min(ctx.proposedVolumeScale, ctx.currentVolumeScale * 1.08);
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", inputValue: increase, limit,
          constrainedTo: safe,
          reason: `Weekly volume increase of ${(increase * 100).toFixed(0)}% exceeds 10% progressive overload limit.`,
          userMessage: "Volume increase has been moderated to stay within your progressive overload threshold.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  {
    id: "critical-fatigue-override",
    name: "Critical Fatigue Override",
    priority: "critical",
    evaluate(ctx) {
      if (ctx.fatigueEstimate >= 85) {
        const cap = 0.65;
        if (ctx.proposedVolumeScale > cap) {
          return {
            ruleId: this.id, ruleName: this.name, priority: this.priority,
            outcome: "clamped", inputValue: ctx.fatigueEstimate, limit: 85,
            constrainedTo: cap,
            reason: `Fatigue estimate ${ctx.fatigueEstimate} indicates overreach risk.`,
            userMessage: "Today's volume has been reduced — your fatigue indicators are high.",
          };
        }
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  {
    id: "recovery-debt",
    name: "Consecutive Low Recovery",
    priority: "critical",
    evaluate(ctx) {
      if (ctx.lowRecoveryDays >= 3) {
        const cap = 0.70;
        if (ctx.proposedVolumeScale > cap) {
          return {
            ruleId: this.id, ruleName: this.name, priority: this.priority,
            outcome: "clamped", inputValue: ctx.lowRecoveryDays, limit: 3,
            constrainedTo: cap,
            reason: `Recovery has been below baseline for ${ctx.lowRecoveryDays} consecutive days.`,
            userMessage: `Recovery has been below your baseline for ${ctx.lowRecoveryDays} days. Volume capped until recovery improves.`,
          };
        }
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  // ── High ──────────────────────────────────────────────────────────────────

  {
    id: "readiness-minimum",
    name: "Readiness Floor",
    priority: "high",
    evaluate(ctx) {
      if (ctx.readinessScore < 30 && ctx.proposedVolumeScale > 0.75) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", inputValue: ctx.readinessScore, limit: 30,
          constrainedTo: 0.75,
          reason: `Readiness of ${ctx.readinessScore} is below the minimum threshold.`,
          userMessage: "Workout intensity has been held conservative — your readiness score is low today.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  {
    id: "hard-session-streak",
    name: "Consecutive Hard Session Limit",
    priority: "high",
    evaluate(ctx) {
      if (ctx.streakDays >= 6 && ctx.proposedVolumeScale > 0.85) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", inputValue: ctx.streakDays, limit: 6,
          constrainedTo: 0.85,
          reason: `${ctx.streakDays} consecutive training days suggests accumulated fatigue risk.`,
          userMessage: "Volume moderated — you've been training consistently and a lighter session will support recovery.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  {
    id: "symptom-override",
    name: "Symptom Modifier",
    priority: "high",
    evaluate(ctx) {
      if (ctx.hasSymptoms && ctx.proposedVolumeScale > 0.80) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", constrainedTo: 0.80,
          reason: "Active symptoms present — recommendation reduced to gentle movement.",
          userMessage: "You've logged symptoms today. Volume has been reduced to support recovery.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  // ── Moderate ──────────────────────────────────────────────────────────────

  {
    id: "low-confidence-conservative",
    name: "Low Confidence Conservative Bias",
    priority: "moderate",
    evaluate(ctx) {
      if (ctx.confidenceScore < 0.25 && ctx.proposedVolumeScale > 1.05) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", inputValue: ctx.confidenceScore, limit: 0.25,
          constrainedTo: 1.05,
          reason: "Low confidence — applying conservative cap to prevent overshoot.",
          userMessage: "Axis is still learning your patterns. Volume is capped conservatively until more data is available.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  {
    id: "deload-volume-guard",
    name: "Deload Volume Guard",
    priority: "moderate",
    evaluate(ctx) {
      if (ctx.isDeload && ctx.proposedVolumeScale > 0.75) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "clamped", constrainedTo: 0.75,
          reason: "Deload period — volume must not exceed 75%.",
          userMessage: "This is a deload week. Volume is intentionally reduced to allow full recovery.",
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },

  // ── Informational ─────────────────────────────────────────────────────────

  {
    id: "intensity-step-check",
    name: "Intensity Step Sanity",
    priority: "informational",
    evaluate(ctx) {
      const levels = ["Low","Light to Moderate","Moderate","Moderate to High","High"];
      const cur  = levels.indexOf(ctx.currentIntensity);
      const prop = levels.indexOf(ctx.proposedIntensity);
      if (cur >= 0 && prop >= 0 && prop - cur > 1) {
        return {
          ruleId: this.id, ruleName: this.name, priority: this.priority,
          outcome: "pass",   // informational — doesn't block
          reason: `Intensity jump of ${prop - cur} steps from "${ctx.currentIntensity}" to "${ctx.proposedIntensity}".`,
          userMessage: undefined,
        };
      }
      return pass(this.id, this.name, this.priority);
    },
  },
];
