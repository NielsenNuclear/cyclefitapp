"use client";

import { useRouter, usePathname } from "next/navigation";

interface DashboardShellProps {
  children:        React.ReactNode;
  isRecalculating?: boolean;
}

// ── Nav icon SVG paths ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    id:    "dashboard",
    label: "Today",
    href:  "/dashboard",
    path:  "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  },
  {
    id:    "exercises",
    label: "Library",
    href:  "/exercises",
    path:  "M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3",
  },
  {
    id:    "body",
    label: "Body",
    href:  "/body",
    path:  "M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 22v-4a5 5 0 0 1 10 0v4",
  },
  {
    id:    "settings",
    label: "Settings",
    href:  "/settings",
    path:  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4 0a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  },
  {
    id:    "profile",
    label: "Profile",
    href:  "/profile",
    path:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
] as const;

function NavIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function DashboardShell({ children, isRecalculating = false }: DashboardShellProps) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 border-b border-border"
        style={{
          background:           "rgba(250,249,245,0.92)",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">

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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
                  <NavIcon path={item.path} />
                </button>
              );
            })}
          </nav>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main
        className="max-w-2xl mx-auto pb-20"
        style={isRecalculating ? { opacity: 0.4, pointerEvents: "none" } : undefined}
      >
        {children}
      </main>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────────── */}
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
                <NavIcon path={item.path} />
                <span className={`text-[9px] font-semibold ${isActive ? "text-brand" : "text-ink-muted"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
