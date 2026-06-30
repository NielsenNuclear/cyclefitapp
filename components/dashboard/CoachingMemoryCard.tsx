"use client";

import type { CoachingMemoryItem, MemoryCategory } from "@/lib/adaptive/coachingMemory";

const CATEGORY_ICON: Record<MemoryCategory, string> = {
  cycle:       "○",
  recovery:    "◇",
  performance: "△",
  accuracy:    "◻",
};

const CONFIDENCE_CHIP: Record<CoachingMemoryItem["confidence"], { label: string; cls: string }> = {
  established: { label: "Established", cls: "bg-[#E1F5EE] text-[#085041]"   },
  growing:     { label: "Growing",     cls: "bg-[#EEEDFE] text-[#3C3489]"   },
  early:       { label: "Early data",  cls: "bg-[#F5F3EE] text-[#9B9690]"   },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function MemoryRow({ item }: { item: CoachingMemoryItem }) {
  const chip = CONFIDENCE_CHIP[item.confidence];
  const icon = CATEGORY_ICON[item.category];

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <span className="text-[#534AB7] text-[14px] flex-shrink-0 mt-0.5 leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#1C1B18] leading-relaxed">{item.observation}</p>
      </div>
      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${chip.cls}`}>
        {chip.label}
      </span>
    </div>
  );
}

interface CoachingMemoryCardProps {
  items: CoachingMemoryItem[];
}

export function CoachingMemoryCard({ items }: CoachingMemoryCardProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>What Axis has learned</CardLabel>

      <div>
        {items.slice(0, 6).map((item, i) => (
          <MemoryRow key={i} item={item} />
        ))}
      </div>

      <p className="text-[10px] text-[#C8C5BC] mt-3 leading-relaxed">
        Observations build over time as you log workouts and check-ins.
      </p>
    </div>
  );
}
