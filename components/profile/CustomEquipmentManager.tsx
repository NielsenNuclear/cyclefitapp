"use client";

import { useState } from "react";
import {
  getCustomEquipment,
  addCustomEquipment,
  updateCustomEquipment,
  deleteCustomEquipment,
  type CustomEquipment,
  type CustomEquipmentCategory,
} from "@/lib/equipment/customEquipment";

const CATEGORY_LABELS: Record<CustomEquipmentCategory, string> = {
  free_weight:     "Free Weights",
  machine:         "Machines",
  cable:           "Cable",
  bodyweight_tool: "Bodyweight Tools",
  conditioning:    "Conditioning",
  recovery:        "Recovery",
  specialty_bar:   "Specialty Bars",
  other:           "Other",
};

const CATEGORY_ORDER: CustomEquipmentCategory[] = [
  "free_weight", "machine", "cable", "bodyweight_tool",
  "conditioning", "recovery", "specialty_bar", "other",
];

interface FormState {
  name:     string;
  category: CustomEquipmentCategory;
  notes:    string;
  active?:  boolean; // only present in edit mode; new items always start active
}

const EMPTY_FORM: FormState = { name: "", category: "free_weight", notes: "" };

// ─── Add/edit form ────────────────────────────────────────────────────────────

function EquipmentForm({
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
          placeholder="e.g. Pendulum Squat Machine"
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Category
        </label>
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value as CustomEquipmentCategory })}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7]"
        >
          {CATEGORY_ORDER.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
          Notes <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="e.g. Feels like a hack squat, more knee-friendly"
          rows={2}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7] resize-none"
        />
      </div>

      {/* Active toggle — only shown when editing existing equipment */}
      {form.active !== undefined && (
        <div className="flex items-center justify-between py-1">
          <span className="text-[12px] text-[#5C5850]">Available for workout generation</span>
          <button
            type="button"
            onClick={() => setForm({ ...form, active: !form.active })}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              form.active ? "bg-[#534AB7]" : "bg-[#C5C1B7]"
            }`}
            aria-checked={form.active}
            role="switch"
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              form.active ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      )}

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

// ─── Equipment row ────────────────────────────────────────────────────────────

function EquipmentRow({
  item,
  onEdit,
  onDelete,
}: {
  item:     CustomEquipment;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1C1B18] truncate">{item.name}</div>
        {item.notes && (
          <div className="text-[11px] text-[#9B9690] leading-snug mt-0.5 truncate">{item.notes}</div>
        )}
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

export function CustomEquipmentManager() {
  const [items, setItems]       = useState<CustomEquipment[]>(() => getCustomEquipment());
  const [search, setSearch]     = useState("");
  const [adding, setAdding]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<CustomEquipmentCategory>>(new Set());

  const query    = search.trim().toLowerCase();
  const filtered = query
    ? items.filter(i => i.name.toLowerCase().includes(query))
    : items;

  const grouped = CATEGORY_ORDER.map(category => ({
    category,
    list: filtered
      .filter(i => i.category === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(g => g.list.length > 0);

  function toggleCategory(category: CustomEquipmentCategory) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  function handleAdd(form: FormState): string | undefined {
    const result = addCustomEquipment({
      name:     form.name,
      category: form.category,
      notes:    form.notes,
    });
    if (!result.ok) return result.error;
    setItems(getCustomEquipment());
    setAdding(false);
    return undefined;
  }

  function handleEdit(id: string, form: FormState): string | undefined {
    const result = updateCustomEquipment(id, {
      name:     form.name,
      category: form.category,
      notes:    form.notes,
      active:   form.active ?? true,
    });
    if (!result.ok) return result.error;
    setItems(getCustomEquipment());
    setEditingId(null);
    return undefined;
  }

  function handleDelete(id: string) {
    deleteCustomEquipment(id);
    setItems(getCustomEquipment());
  }

  const editingItem = editingId ? items.find(i => i.id === editingId) ?? null : null;

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search equipment..."
        className="w-full px-3.5 py-2.5 text-[13px] rounded-lg border border-[#DDD9CF] bg-white text-[#1C1B18] focus:outline-none focus:border-[#534AB7] mb-3"
      />

      {/* Add button / form */}
      {adding ? (
        <div className="mb-3">
          <EquipmentForm initial={EMPTY_FORM} onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full mb-3 py-2.5 rounded-full text-[13px] font-semibold bg-[#F5F4FF] text-[#534AB7] hover:bg-[#EBE9FB] transition-colors"
        >
          + Add custom equipment
        </button>
      )}

      {items.length === 0 ? (
        <p className="text-[12px] text-[#9B9690] py-3">
          No custom equipment yet. Add gear that isn&apos;t in the built-in list above.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-[#9B9690] py-3">No matches for &quot;{search}&quot;.</p>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ category, list }) => (
            <div key={category} className="border border-[#E5E2DA] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#FAFAF7] transition-colors"
              >
                <span className="text-[13px] font-medium text-[#1C1B18]">{CATEGORY_LABELS[category]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#534AB7] font-medium">{list.length}</span>
                  <span className="text-[11px] text-[#9B9690]">
                    {expanded.has(category) ? "▲" : "▼"}
                  </span>
                </div>
              </button>
              {expanded.has(category) && (
                <div className="border-t border-[#E5E2DA] px-4 py-1">
                  {list.map(item => (
                    editingItem?.id === item.id ? (
                      <div key={item.id} className="py-2.5">
                        <EquipmentForm
                          initial={{ name: item.name, category: item.category, notes: item.notes ?? "", active: item.active }}
                          onSave={form => handleEdit(item.id, form)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <EquipmentRow
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
          ))}
        </div>
      )}
    </div>
  );
}
