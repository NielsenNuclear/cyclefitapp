"use client";

import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/resilience/ErrorBoundary";
import { AxisIcon } from "@/components/ui/Icon";

const PREFS_KEY = "axis_dashboard_sections";

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch { return {}; }
}

function savePrefs(id: string, open: boolean): void {
  try {
    const prefs = loadPrefs();
    prefs[id] = open;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

interface AccordionSectionProps {
  id:           string;
  title:        string;
  summary?:     string;
  defaultOpen?: boolean;
  children:     React.ReactNode;
}

export function AccordionSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  const [isOpen,    setIsOpen]    = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    if (id in prefs) {
      const saved = prefs[id];
      setIsOpen(saved);
      if (saved) setHasOpened(true);
    } else if (defaultOpen) {
      setHasOpened(true);
    }
    setMounted(true);
  }, [id, defaultOpen]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) setHasOpened(true);
    if (mounted) savePrefs(id, next);
  }

  const headerId  = `section-header-${id}`;
  const contentId = `section-content-${id}`;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] overflow-hidden shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header / trigger */}
      <button
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-4 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#534AB7]/30"
      >
        <div className="min-w-0 flex-1 mr-3">
          <div className="text-[14px] font-semibold text-[#1C1B18]">{title}</div>
          {!isOpen && summary && (
            <div className="text-[12px] text-[#9B9690] mt-0.5 truncate">{summary}</div>
          )}
        </div>
        <div
          aria-hidden="true"
          className="flex-shrink-0 text-ink-faint"
          style={{
            transform:  isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        >
          <AxisIcon name="chevron-down" size={16} strokeWidth={2.5} />
        </div>
      </button>

      {/* Collapsible content — grid-template-rows trick for smooth height */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        style={{
          display:         "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition:      "grid-template-rows 280ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          {/* Lazy render: only mount content after first open */}
          {hasOpened && (
            <div className="border-t border-[#F0EDE4] px-3 pt-3 pb-4 space-y-3">
              <ErrorBoundary label={`dashboard-section:${id}`}>
                {children}
              </ErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
