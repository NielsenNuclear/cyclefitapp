"use client";

/**
 * /body — Body Intelligence page
 *
 * Phase 58: thin shell. All intelligence, interaction and rendering live
 * inside <BodyIntelligenceViewer>.
 */

import { lazy, Suspense } from "react";
import { useRouter }      from "next/navigation";

// Lazy — keeps the entire 3D stack out of the initial bundle
const BodyIntelligenceViewer = lazy(() =>
  import("@/components/body/BodyIntelligenceViewer").then(m => ({
    default: m.BodyIntelligenceViewer,
  })),
);

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
      <div className="text-[13px] text-[#9B9690]">Loading Body Intelligence…</div>
    </div>
  );
}

export default function BodyPage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col h-screen bg-[#FAF9F5] overflow-hidden"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* ── Navigation bar ────────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 sticky top-0 z-50 bg-[rgba(250,249,245,0.94)] backdrop-blur-md border-b border-[#EAE7DE]">
        <div className="h-14 px-4 flex items-center justify-between max-w-screen-2xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            aria-label="Back to dashboard"
            className="flex items-center gap-1.5 text-[13px] text-[#6B6860] hover:text-[#1C1B18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] rounded-lg px-1"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Dashboard
          </button>

          <span className="text-[14px] font-semibold text-[#1C1B18] tracking-tight">
            Body Intelligence
          </span>

          {/* Placeholder for future actions (share, settings) */}
          <div className="w-16" aria-hidden="true" />
        </div>
      </nav>

      {/* ── Viewer (fills remaining height) ──────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <BodyIntelligenceViewer className="h-full" />
        </Suspense>
      </div>
    </div>
  );
}
