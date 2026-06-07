"use client";

interface DashboardShellProps {
  children: React.ReactNode;
  isRecalculating?: boolean;
}

export function DashboardShell({ children, isRecalculating = false }: DashboardShellProps) {
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
            {/* History */}
            <button className="w-9 h-9 rounded-xl hover:bg-[#F1EFE8] flex items-center justify-center text-[#9B9690] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </button>
            {/* Profile */}
            <button className="w-9 h-9 rounded-xl hover:bg-[#F1EFE8] flex items-center justify-center text-[#9B9690] transition-colors">
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
            { icon: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z", label: "Today", active: true },
            { icon: "M22 12 18 12 15 21 9 3 6 12 2 12", label: "Activity", active: false },
            { icon: "M12 2L2 7l10 5 10-5-10-5z", label: "Log", active: false },
            { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Profile", active: false },
          ].map(({ icon, label, active }) => (
            <button key={label} className="flex flex-col items-center gap-1 py-1 px-3">
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
