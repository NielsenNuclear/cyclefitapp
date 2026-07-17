"use client";

// ─── components/workout/WorkoutModeShell.tsx ──────────────────────────────────
// Workout Engine Sprint — Phase C.9. Dedicated Workout Mode container.
//
// Full-viewport dark overlay/portal, reusing Sheet.tsx's proven portal +
// scroll-lock pattern (see components/ui/Sheet.tsx) rather than inventing a
// new mechanism or a new route. Mounted from WorkoutCard.tsx whenever
// mode is "active" or "done" — see docs/ux/WorkoutModeProposal.md Option A,
// the recommended lowest-risk path (no routing changes, no lifted state;
// WorkoutCard keeps owning actuals/exercises/timers exactly as it does today).
//
// The dashboard's persistent bottom nav is not reachable while this renders:
// it's a solid full-viewport layer above everything else in the app (z-[100],
// above Sheet's z-50), so nothing behind it is clickable. A full `inert`
// pass on the rest of the page (for screen-reader users tabbing past the
// portal's content) is deferred — see WorkoutModeProposal.md §7 batch 4,
// "Accessibility pass," which this implementation doesn't yet cover.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function WorkoutModeShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Two-step mount: paint at opacity-0 first, then flip to opacity-100 on
    // the next frame so the CSS transition below actually has something to
    // animate from. Skipped entirely for prefers-reduced-motion users via
    // the motion-safe: variant on the transition itself, not this timing.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="main"
      aria-label="Workout Mode"
      className={`
        fixed inset-0 z-[100] bg-[#1C1B18] overflow-y-auto overscroll-contain
        motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="min-h-full max-w-lg mx-auto px-4 pt-6 pb-12">
        {children}
      </div>
    </div>,
    document.body
  );
}
