"use client";
import { useRef } from "react";

// ── Tabs ──────────────────────────────────────────────────────────────────
// Accessible tab list: roving tabindex, arrow-key navigation (Left/Right,
// Home/End), role="tablist"/"tab", aria-selected. Controlled — the consumer
// owns `activeId` and renders the matching panel (wrap it in <TabPanel> for
// correct aria wiring). This mirrors how AccordionSection already manages
// its own open/closed state, rather than introducing a new context pattern.

export interface TabItem {
  id:    string;
  label: string;
}

interface TabsProps {
  tabs:       TabItem[];
  activeId:   string;
  onChange:   (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const next = tabs[nextIndex];
      onChange(next.id);
      tabRefs.current[next.id]?.focus();
    }
  }

  return (
    <div role="tablist" className={`flex items-center gap-1 border-b border-border ${className}`}>
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[tab.id] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={e => handleKeyDown(e, index)}
            className={`
              px-3 py-2 type-body-md font-medium
              border-b-2 -mb-px
              transition-colors duration-normal
              focus-ring
              ${selected
                ? "border-brand text-brand"
                : "border-transparent text-ink-muted hover:text-ink"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  id:        string;
  activeId:  string;
  children:  React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeId, children, className = "" }: TabPanelProps) {
  if (id !== activeId) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
