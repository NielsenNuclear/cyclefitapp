"use client";

import { useRouter, usePathname } from "next/navigation";
import { AxisIcon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";

interface DashboardShellProps {
  children:         React.ReactNode;
  isRecalculating?: boolean;
  /** Full-height, full-width content (no max-w-2xl, no scroll) — for pages
   *  like Body Intelligence that own their own internal layout/scrolling. */
  fullBleed?:       boolean;
  /** Skip the mobile bottom tab bar — for pages that already have their own
   *  bottom-anchored mobile controls (e.g. Body Intelligence's layer picker),
   *  where stacking both would collide. */
  hideMobileNav?:   boolean;
}

// ── Nav items — icons now come from the shared Axis icon registry ──────────
// (components/ui/Icon.tsx), which was generalized from this exact pattern.

const NAV_ITEMS: Array<{ id: string; label: string; href: string; icon: IconName }> = [
  { id: "dashboard", label: "Today",    href: "/dashboard", icon: "nav-today" },
  { id: "exercises", label: "Library",  href: "/exercises", icon: "nav-library" },
  { id: "body",      label: "Body",     href: "/body",      icon: "nav-body" },
  { id: "settings",  label: "Settings", href: "/settings",  icon: "nav-settings" },
  { id: "profile",   label: "Profile",  href: "/profile",   icon: "nav-profile" },
];

export function DashboardShell({
  children,
  isRecalculating = false,
  fullBleed       = false,
  hideMobileNav   = false,
}: DashboardShellProps) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div className={fullBleed ? "h-screen overflow-hidden flex flex-col bg-canvas" : "min-h-screen bg-canvas"}>

      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <nav
        className={`${fullBleed ? "flex-shrink-0" : "sticky top-0"} z-40 border-b border-border`}
        style={{
          background:           "rgba(250,249,245,0.92)",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        aria-label="Main navigation"
      >
        <div className={`${fullBleed ? "" : "max-w-2xl mx-auto"} px-5 h-14 flex items-center justify-between`}>

          {/* Brand */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 focus-ring rounded-lg"
            aria-label="Go to dashboard"
          >
            <div
              className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-subtle"
              aria-hidden="true"
            >
              <AxisIcon name="brand-mark" size={12} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold text-ink tracking-tight">Axis</span>
          </button>

          {/* Desktop nav icons */}
          <nav className="hidden sm:flex items-center gap-0.5" aria-label="Desktop navigation">
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center
                    transition-colors duration-normal
                    focus-ring
                    ${isActive
                      ? "bg-brand-bg-mid text-brand"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink-secondary"
                    }
                  `}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <AxisIcon name={item.icon} size={18} />
                </button>
              );
            })}
          </nav>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main
        className={fullBleed ? "flex-1 min-h-0" : "max-w-2xl mx-auto pb-20"}
        style={isRecalculating ? { opacity: 0.4, pointerEvents: "none" } : undefined}
      >
        {children}
      </main>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────────── */}
      {!hideMobileNav && (
      <div
        className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-border"
        style={{
          background:           "rgba(255,255,255,0.94)",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`
                  flex flex-col items-center justify-center gap-1
                  py-2 px-3 min-w-[3rem] min-h-[3.5rem]
                  transition-colors duration-normal
                  focus-ring
                  ${isActive ? "text-brand" : "text-ink-muted"}
                `}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <AxisIcon name={item.icon} size={18} />
                <span className={`text-[9px] font-semibold ${isActive ? "text-brand" : "text-ink-muted"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
