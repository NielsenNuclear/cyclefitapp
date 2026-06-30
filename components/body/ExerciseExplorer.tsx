"use client";

import { useMemo } from "react";
import type { MuscleGroupState } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { getMuscleGroupById } from "@/lib/bodyIntelligence/muscleGroups";
import { allExercises }       from "@/lib/exercises/exerciseLibrary";
import type { Exercise }      from "@/lib/exercises/exerciseLibrary";

interface ExerciseExplorerProps {
  muscle: MuscleGroupState;
}

type Category = "Primary" | "Secondary" | "Mobility";

interface CategorisedExercise {
  exercise: Exercise;
  category: Category;
}

function ExerciseRow({ ex, category }: { ex: Exercise; category: Category }) {
  const CATEGORY_STYLE: Record<Category, string> = {
    Primary:   "bg-[#EEEDFE] text-[#3C3489]",
    Secondary: "bg-[#E3EFFE] text-[#1B4FA0]",
    Mobility:  "bg-[#E1F5EE] text-[#085041]",
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAE7DE] px-3.5 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1C1B18] leading-snug">{ex.name}</div>
        <div className="text-[11px] text-[#9B9690] mt-0.5 truncate">
          {ex.equipment} · {ex.movementPattern}
        </div>
        <div className="text-[10px] text-[#C8C5BC] mt-0.5">{ex.difficulty}</div>
      </div>
      <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${CATEGORY_STYLE[category]}`}>
        {category}
      </span>
    </div>
  );
}

export function ExerciseExplorer({ muscle }: ExerciseExplorerProps) {
  const muscleBaseId = muscle.id.replace(/_(?:left|right)$/, "");
  const def = getMuscleGroupById(muscleBaseId);

  const categorised: CategorisedExercise[] = useMemo(() => {
    if (!def) return [];
    const libNames = new Set(def.libraryNames.map(n => n.toLowerCase()));

    const results: CategorisedExercise[] = [];

    for (const ex of allExercises) {
      const isPrimary   = ex.primaryMuscles.some(m => libNames.has(m.toLowerCase()));
      const isSecondary = !isPrimary && ex.secondaryMuscles.some(m => libNames.has(m.toLowerCase()));
      const isMobility  = ex.movementPattern === "Mobility";

      if (isPrimary) {
        results.push({ exercise: ex, category: isMobility ? "Mobility" : "Primary" });
      } else if (isSecondary) {
        results.push({ exercise: ex, category: isMobility ? "Mobility" : "Secondary" });
      }
    }

    // Sort: Primary first, then Secondary, then Mobility
    const order: Record<Category, number> = { Primary: 0, Secondary: 1, Mobility: 2 };
    return results.sort((a, b) => order[a.category] - order[b.category]);
  }, [def]);

  const byCategory = useMemo(() => {
    const map: Partial<Record<Category, CategorisedExercise[]>> = {};
    for (const item of categorised) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category]!.push(item);
    }
    return map;
  }, [categorised]);

  if (categorised.length === 0) {
    return (
      <div className="p-5 text-center text-[13px] text-[#9B9690]">
        No exercises found for this muscle group.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[#9B9690]">
        Exercises — {muscle.displayName.replace(/ \((left|right)\)$/, "")}
      </div>

      {(["Primary", "Secondary", "Mobility"] as Category[]).map(cat => {
        const items = byCategory[cat];
        if (!items?.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#C8C5BC]">
              {cat} · {items.length}
            </div>
            {items.map(({ exercise, category }) => (
              <ExerciseRow key={exercise.name} ex={exercise} category={category} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
