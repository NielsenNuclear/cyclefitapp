"use client";

import { lazy, Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const BodyIntelligenceViewer = lazy(() =>
  import("@/components/body/BodyIntelligenceViewer").then(m => ({
    default: m.BodyIntelligenceViewer,
  })),
);

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <div className="text-[12px] text-ink-muted tracking-wide">Loading Body Intelligence…</div>
    </div>
  );
}

export default function BodyPage() {
  return (
    <DashboardShell fullBleed hideMobileNav>
      <Suspense fallback={<PageLoader />}>
        <BodyIntelligenceViewer className="h-full" />
      </Suspense>
    </DashboardShell>
  );
}
