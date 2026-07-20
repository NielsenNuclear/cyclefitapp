"use client";

// ─── components/dashboard/WelcomeOverlay.tsx ───────────────────────────────────
// Daily Briefing — Launch Behavior. Built on the shared Dialog primitive
// (focus-trap, Escape-to-close, aria-modal, portal, scroll-lock already
// handled there) rather than a bespoke overlay — see the "guide"/"done"
// variants below for the two launch-behavior branches.
//
// No user name is available anywhere in the data model today (OnboardingData
// has no `name` field, and this work explicitly excludes onboarding changes),
// so the greeting omits a name rather than inventing a collection flow.

import { useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";

export type WelcomeVariant = "guide" | "done";

interface WelcomeOverlayProps {
  variant:         WelcomeVariant | null;
  onBeginCheckin:  () => void;
  onSkip:          () => void;
  onDismiss:       () => void;
}

const AUTO_DISMISS_MS = 3000;

export function WelcomeOverlay({ variant, onBeginCheckin, onSkip, onDismiss }: WelcomeOverlayProps) {
  const isOpen = variant !== null;

  // "done" variant auto-dismisses — the check-in is already complete, this is
  // a brief acknowledgement, not something requiring a decision.
  useEffect(() => {
    if (variant !== "done") return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [variant, onDismiss]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={variant === "done" ? onDismiss : onSkip}
      size="sm"
      ariaLabel={variant === "guide" ? "Welcome back — start today's check-in" : "Welcome back — today's plan is ready"}
    >
      {variant === "guide" && (
        <div className="text-center py-2">
          <h2 className="text-[1.4rem] font-light font-serif text-ink leading-snug mb-2">
            Welcome back.
          </h2>
          <p className="text-[14px] text-ink-secondary leading-relaxed mb-1">
            Ready for today&apos;s training?
          </p>
          <p className="text-[13px] text-ink-muted leading-relaxed mb-6">
            Let&apos;s complete your daily check-in to personalize today&apos;s recommendations.
          </p>
          <button
            type="button"
            onClick={onBeginCheckin}
            className="w-full py-3 rounded-xl text-[14px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors mb-2.5 min-h-[44px]"
            autoFocus
          >
            Begin Check-in
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-ink-muted hover:text-ink-secondary transition-colors min-h-[44px]"
          >
            Skip for now
          </button>
        </div>
      )}

      {variant === "done" && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full text-center py-2"
          aria-label="Dismiss welcome message"
        >
          <h2 className="text-[1.2rem] font-light font-serif text-ink leading-snug mb-1.5">
            Welcome back.
          </h2>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Today&apos;s plan is ready.
          </p>
        </button>
      )}
    </Dialog>
  );
}
