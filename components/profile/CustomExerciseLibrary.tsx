"use client";

import { useState } from "react";
import {
  getCustomExercises,
  addCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  type CustomExercise,
} from "@/lib/exercises/customExercises";
import type { DifficultyLevel } from "@/lib/exercises/exerciseLibrary";

const DIFFICULTY_OPTIONS: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];

interface FormState {
  name:              string;
  primaryMuscles:    string;
  secondaryMuscles:  string;
  difficulty:        DifficultyLevel;
  equipmentRequired: string;
  notes:             string;
}

const EMPTY_FORM: FormState = {
  name: "", primaryMuscles: "", secondaryMuscles: "", difficulty: "Intermediate",
  equipmentRequired: "", notes: "",
};

function splitList(value: string): string[] {
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

function toFormState(item: CustomExercise): FormState {
  return {
    name:              item.name,
    primaryMuscles:    item.primaryMuscles.join(", "),
    secondaryMuscles:  item.secondaryMuscles.join(", "),
    difficulty:        item.difficulty,
    equipmentRequired: item.equipmentRequired.join(", "),
    notes:             item.notes ?? "",
  };
}

// ─── Add/edit form ────────────────────────────────────────────────────────────

function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial:  FormState;
  onSave:   (form: FormState) => string | undefined;
  onCancel: () => void;
}) {
  const [form, setForm]   = useState<FormState>(initial);
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const err = onSave(form);
    if (err) setError(err);
  }

  return (
    <div className="p-3.5 bg-[#FAFAF7] rounded-xl border border-[#E5E2DA] space-y-2.5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Pendulum Squat"
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Primary muscles <span className="font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={form.primaryMuscles}
          onChange={e => setForm({ ...form, primaryMuscles: e.target.value })}
          placeholder="e.g. Quadriceps, Glutes"
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Secondary muscles <span className="font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.secondaryMuscles}
          onChange={e => setForm({ ...form, secondaryMuscles: e.target.value })}
          placeholder="e.g. Hamstrings, Calves"
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Difficulty
        </label>
        <select
          value={form.difficulty}
          onChange={e => setForm({ ...form, difficulty: e.target.value as DifficultyLevel })}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        >
          {DIFFICULTY_OPTIONS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Equipment required <span className="font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={form.equipmentRequired}
          onChange={e => setForm({ ...form, equipmentRequired: e.target.value })}
          placeholder="e.g. Pendulum Squat Machine"
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Notes <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="e.g. Knee-friendly squat variation"
          rows={2}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7] resize-none"
        />
      </div>

      {error && <p className="text-[12px] text-[#C0390B]">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          className="flex-1 py-2.5 rounded-full text-[13px] font-semibold bg-[#534AB7] text-white hover:bg-[#473EA0] transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-full text-[13px] font-semibold bg-white border border-[#DDD9CF] text-[#5C5850] hover:bg-[#FAFAF7] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Exercise row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  item,
  onEdit,
  onDelete,
}: {
  item:     CustomExercise;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1C1B18] truncate">{item.name}</div>
        <div className="text-[11px] text-[#9B9690] leading-snug mt-0.5 truncate">
          {item.primaryMuscles.join(", ")} · {item.difficulty}
        </div>
      </div>

      {confirming ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] font-semibold text-white bg-[#C0390B] hover:bg-[#A22F08] rounded-full px-3 py-2 transition-colors"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[11px] font-semibold text-[#9B9690] hover:text-[#5C5850] px-2 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-[#534AB7] hover:text-[#3C3489] px-2.5 py-2 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[11px] font-semibold text-[#9B9690] hover:text-[#C0390B] px-2.5 py-2 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CustomExerciseLibrary() {
  const [items, setItems]         = useState<CustomExercise[]>(() => getCustomExercises());
  const [adding, setAdding]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  function handleAdd(form: FormState): string | undefined {
    const result = addCustomExercise({
      name:              form.name,
      primaryMuscles:    splitList(form.primaryMuscles),
      secondaryMuscles:  splitList(form.secondaryMuscles),
      difficulty:        form.difficulty,
      equipmentRequired: splitList(form.equipmentRequired),
      notes:             form.notes,
    });
    if (!result.ok) return result.error;
    setItems(getCustomExercises());
    setAdding(false);
    return undefined;
  }

  function handleEdit(id: string, form: FormState): string | undefined {
    const result = updateCustomExercise(id, {
      name:              form.name,
      primaryMuscles:    splitList(form.primaryMuscles),
      secondaryMuscles:  splitList(form.secondaryMuscles),
      difficulty:        form.difficulty,
      equipmentRequired: splitList(form.equipmentRequired),
      notes:             form.notes,
    });
    if (!result.ok) return result.error;
    setItems(getCustomExercises());
    setEditingId(null);
    return undefined;
  }

  function handleDelete(id: string) {
    deleteCustomExercise(id);
    setItems(getCustomExercises());
  }

  const editingItem = editingId ? items.find(i => i.id === editingId) ?? null : null;

  return (
    <div>
      {adding ? (
        <div className="mb-3">
          <ExerciseForm initial={EMPTY_FORM} onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full mb-3 py-2.5 rounded-full text-[13px] font-semibold bg-[#F5F4FF] text-[#534AB7] hover:bg-[#EBE9FB] transition-colors"
        >
          + Add custom exercise
        </button>
      )}

      {sorted.length === 0 ? (
        <p className="text-[12px] text-[#9B9690] py-3">
          No custom exercises yet. Add movements that aren&apos;t in the built-in library.
        </p>
      ) : (
        <div className="border border-[#E5E2DA] rounded-xl px-4 py-1">
          {sorted.map(item => (
            editingItem?.id === item.id ? (
              <div key={item.id} className="py-2.5">
                <ExerciseForm
                  initial={toFormState(item)}
                  onSave={form => handleEdit(item.id, form)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <ExerciseRow
                key={item.id}
                item={item}
                onEdit={() => setEditingId(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}
