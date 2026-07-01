"use client";

import { lazy, Suspense } from "react";
import { useRouter }      from "next/navigation";

const BodyIntelligenceViewer = lazy(() =>
  import("@/components/body/BodyIntelligenceViewer").then(m => ({
    default: m.BodyIntelligenceViewer,
  })),
);

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
      <div className="text-[12px] text-[#9B9690] tracking-wide">Loading Body Intelligence…</div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function BodyPage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background:  "#FAF9F5",
        fontFamily:  "'DM Sans', 'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ── Navigation bar ──────────────────────────────────────────────────── */}
      <nav
        className="flex-shrink-0 z-50 border-b"
        style={{
          background:   "rgba(253,252,249,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor:  "rgba(234,231,222,0.7)",
        }}
      >
        <div className="h-13 px-5 flex items-center justify-between max-w-none">
          <button
            onClick={() => router.back()}
            aria-label="Back to dashboard"
            className="flex items-center gap-1.5 text-[13px] text-[#6B6860] hover:text-[#1C1B18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] rounded-lg px-1 py-1"
          >
            <BackIcon />
            <span>Dashboard</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[14px] font-semibold text-[#1C1B18] tracking-tight leading-none">
              Body Intelligence
            </span>
            <span className="text-[10px] text-[#9B9690] mt-0.5 tracking-wide">
              Axis
            </span>
          </div>

          {/* Spacer to keep title centered */}
          <div className="w-[90px]" aria-hidden="true" />
        </div>
      </nav>

      {/* ── Viewer (fills remaining height) ─────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <Suspense fallback={<PageLoader />}>
          <BodyIntelligenceViewer className="h-full" />
        </Suspense>
      </div>
    </div>
  );
}
