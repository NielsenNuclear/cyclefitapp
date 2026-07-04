"use client";

// ── Layout primitives ──────────────────────────────────────────────────────
// Structural layout shells used to compose pages and dashboard grids.

import type { ReactNode } from "react";

// PageContainer — centers content, applies side padding, limits max width.
interface PageContainerProps {
  children:   ReactNode;
  narrow?:    boolean;  // max-w-2xl (dashboard) vs max-w-4xl (wider)
  className?: string;
}
export function PageContainer({ children, narrow = true, className = "" }: PageContainerProps) {
  return (
    <main className={`${narrow ? "max-w-2xl" : "max-w-4xl"} mx-auto pb-20 ${className}`}>
      {children}
    </main>
  );
}

// ContentSection — labeled section within a page.
interface ContentSectionProps {
  children:   ReactNode;
  className?: string;
}
export function ContentSection({ children, className = "" }: ContentSectionProps) {
  return <section className={`px-4 py-3 ${className}`}>{children}</section>;
}

// Panel — elevated side panel (used in three-column layouts).
interface PanelProps {
  children:   ReactNode;
  side?:      "left" | "right";
  width?:     number;
  className?: string;
}
export function Panel({ children, side = "right", width = 320, className = "" }: PanelProps) {
  const border = side === "left" ? "border-r" : "border-l";
  return (
    <aside
      className={`flex flex-col flex-shrink-0 bg-surface-raised ${border} border-border/60 ${className}`}
      style={{ width }}
    >
      {children}
    </aside>
  );
}

// DashboardGrid — responsive card grid.
interface DashboardGridProps {
  children:   ReactNode;
  cols?:      1 | 2;
  className?: string;
}
export function DashboardGrid({ children, cols = 1, className = "" }: DashboardGridProps) {
  const colCls = cols === 2 ? "grid md:grid-cols-2 gap-3" : "flex flex-col gap-3";
  return <div className={`${colCls} ${className}`}>{children}</div>;
}

// ScrollableSection — horizontal scroll container (for pill bars, etc.)
export function ScrollableSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto scrollbar-none ${className}`}>
      <div className="flex gap-2 w-max">{children}</div>
    </div>
  );
}
