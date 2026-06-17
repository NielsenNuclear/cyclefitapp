"use client";

import { useRouter } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  isRecalculating?: boolean;
}

export function DashboardShell({ children, isRecalculating = false }: DashboardShellProps) {
  const router = useRouter();
  return (
    <div
      className="min-h-screen bg-[#FAF9F5]"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-[rgba(250,249,245,0.88)] backdrop-blur-md border-b border-[#EAE7DE]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#534AB7] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1C1B18] tracking-tight">Axis</span>
          </div>

          {/* Nav icons */}
          <div className="flex items-center gap-1">
            {/* Dashboard (active) */}
            <button className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center text-[#534AB7]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            {/* Exercise library */}
            <button onClick={() => router.push("/exercises")} className="w-9 h-9 rounded-xl hover:bg-[#F1EFE8] flex items-center justify-center text-[#9B9690] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </button>
            {/* Settings */}
            <button onClick={() => router.push("/settings")} className="w-9 h-9 rounded-xl hover:bg-[#F1EFE8] flex items-center justify-center text-[#9B9690] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {/* Profile */}
            <button onClick={() => router.push("/profile")} className="w-9 h-9 rounded-xl hover:bg-[#F1EFE8] flex items-center justify-center text-[#9B9690] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-2xl mx-auto pb-16">
        <div style={isRecalculating ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
          {children}
        </div>
      </main>

      {/* Bottom tab bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/90 backdrop-blur-md border-t border-[#EAE7DE]">
        <div className="flex items-center justify-around px-4 py-2">
          {[
            { icon: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z", label: "Today", active: true, href: undefined },
            { icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4 0a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z", label: "Settings", active: false, href: "/settings" },
            { icon: "M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3", label: "Library", active: false, href: "/exercises" },
            { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Profile", active: false, href: "/profile" },
          ].map(({ icon, label, active, href }) => (
            <button key={label} onClick={href ? () => router.push(href) : undefined} className="flex flex-col items-center gap-1 py-1 px-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#534AB7" : "#9B9690"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d={icon}/>
              </svg>
              <span className={`text-[9px] font-semibold ${active ? "text-[#534AB7]" : "text-[#9B9690]"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
