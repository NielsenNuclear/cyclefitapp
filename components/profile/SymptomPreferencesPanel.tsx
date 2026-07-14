"use client";

import { useState } from "react";
import { AxisIcon } from "@/components/ui/Icon";
import { SYMPTOM_CATALOG, type Symptom } from "@/lib/symptoms/symptomCatalog";
import {
  getSymptomPreferences,
  saveSymptomPreferences,
  QUICK_COUNT,
} from "@/lib/symptoms/symptomPreferences";

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuickSymptomRow({
  symptom,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  symptom:    Symptom;
  index:      number;
  total:      number;
  onMoveUp:   () => void;
  onMoveDown: () => void;
  onRemove:   () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-6 h-5 flex items-center justify-center rounded text-[#9B9690] hover:text-[#534AB7] disabled:opacity-25 transition-colors"
          aria-label="Move up"
        >
          <AxisIcon name="chevron-up" size={10} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-6 h-5 flex items-center justify-center rounded text-[#9B9690] hover:text-[#534AB7] disabled:opacity-25 transition-colors"
          aria-label="Move down"
        >
          <AxisIcon name="chevron-down" size={10} strokeWidth={2.5} />
        </button>
      </div>
      <span className="flex-1 text-[12px] font-medium text-[#1C1B18]">{symptom.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[11px] font-semibold text-[#9B9690] hover:text-[#C0390B] transition-colors px-2 py-1"
      >
        Remove
      </button>
    </div>
  );
}

function OtherSymptomRow({
  symptom,
  canAdd,
  onAdd,
}: {
  symptom: Symptom;
  canAdd:  boolean;
  onAdd:   () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <span className="flex-1 text-[12px] text-[#5C5850]">{symptom.name}</span>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={`text-[11px] font-semibold px-2 py-1 transition-colors ${
          canAdd
            ? "text-[#534AB7] hover:text-[#3C3489]"
            : "text-[#C8C5BC] cursor-not-allowed"
        }`}
      >
        Add
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SymptomPreferencesPanel() {
  const [quickIds, setQuickIds] = useState<string[]>(
    () => getSymptomPreferences().quickSymptomIds
  );

  const quickSet   = new Set(quickIds);
  const quickList  = quickIds
    .map(id => SYMPTOM_CATALOG.find(s => s.id === id))
    .filter((s): s is Symptom => s !== undefined);
  const otherList  = SYMPTOM_CATALOG.filter(s => !quickSet.has(s.id));
  const atCapacity = quickIds.length >= QUICK_COUNT;

  function persist(ids: string[]) {
    setQuickIds(ids);
    saveSymptomPreferences({ quickSymptomIds: ids });
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...quickIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    persist(next);
  }

  function moveDown(index: number) {
    if (index === quickIds.length - 1) return;
    const next = [...quickIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    persist(next);
  }

  function remove(id: string) {
    persist(quickIds.filter(q => q !== id));
  }

  function add(id: string) {
    if (atCapacity) return;
    persist([...quickIds, id]);
  }

  return (
    <div>
      {/* Quick symptoms list */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9690]">
            Quick symptoms
          </div>
          <div className="text-[11px] text-[#9B9690]">
            {quickIds.length}/{QUICK_COUNT}
          </div>
        </div>
        {quickList.length === 0 ? (
          <p className="text-[12px] text-[#9B9690] py-3">
            No quick symptoms selected. Add some from the list below.
          </p>
        ) : (
          <div>
            {quickList.map((symptom, i) => (
              <QuickSymptomRow
                key={symptom.id}
                symptom={symptom}
                index={i}
                total={quickList.length}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)}
                onRemove={() => remove(symptom.id)}
              />
            ))}
          </div>
        )}
      </div>

      {atCapacity && (
        <p className="text-[11px] text-[#9B9690] mb-3 mt-1">
          Maximum {QUICK_COUNT} quick symptoms reached. Remove one to add another.
        </p>
      )}

      {/* Other symptoms list */}
      {otherList.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-2">
            Available to add
          </div>
          <div>
            {otherList.map(symptom => (
              <OtherSymptomRow
                key={symptom.id}
                symptom={symptom}
                canAdd={!atCapacity}
                onAdd={() => add(symptom.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
