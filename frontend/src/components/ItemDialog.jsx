import { useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { toast } from "sonner";

const emojiOptions = ["🥛", "🥚", "🥣", "🧀", "🥬", "🍅", "🍎", "🍌", "🫑", "🥕", "🍗", "🥩", "🍞", "🍝", "🧃", "🧈", "🥥", "🥦", "🍇", "🫐", "🍓", "🐟", "🥤", "🍽️"];

export default function ItemDialog({ item, onClose, onSaved }) {
  const isNew = !item;
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "other",
    quantity: item?.quantity ?? 1,
    unit: item?.unit || "pcs",
    expires_at: item?.expires_at ? item.expires_at.slice(0, 10) : "",
    is_staple: item?.is_staple || false,
    low_threshold: item?.low_threshold ?? 1,
    emoji: item?.emoji || "🍎",
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      low_threshold: Number(form.low_threshold),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    try {
      if (isNew) {
        await api.addInventory(payload);
        toast.success("Item added");
      } else {
        await api.updateInventory(item.id, payload);
        toast.success("Item updated");
      }
      onSaved();
    } catch (e) {
      toast.error("Save failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <form
        onSubmit={handleSave}
        className="bg-cream w-full max-w-md rounded-3xl border border-line shadow-2xl overflow-hidden animate-fade-up max-h-[92vh] flex flex-col"
        data-testid="item-dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-ash font-semibold">
              {isNew ? "New item" : "Edit item"}
            </div>
            <div className="font-outfit font-semibold text-ink text-base">{isNew ? "Add to fridge" : item.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="item-dialog-close"
            className="w-9 h-9 rounded-full bg-oat hover:bg-line flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-ink" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="item-name"
              className="input-field"
              placeholder="e.g. Whole milk"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input
                type="number"
                step="0.5"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                data-testid="item-quantity"
                className="input-field"
              />
            </Field>
            <Field label="Unit">
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                data-testid="item-unit"
                className="input-field"
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="item-category"
              className="input-field"
            >
              <option value="dairy">Dairy</option>
              <option value="produce">Produce</option>
              <option value="meat">Meat</option>
              <option value="pantry">Pantry</option>
              <option value="beverage">Beverage</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Expires on">
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              data-testid="item-expires"
              className="input-field"
            />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {emojiOptions.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setForm({ ...form, emoji: em })}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border ${
                    form.emoji === em ? "bg-sage-light border-sage" : "bg-white border-line"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink py-2">
            <input
              type="checkbox"
              checked={form.is_staple}
              onChange={(e) => setForm({ ...form, is_staple: e.target.checked })}
              data-testid="item-staple"
              className="w-4 h-4 accent-sage"
            />
            Track as household staple
          </label>
          {form.is_staple && (
            <Field label="Low-stock threshold">
              <input
                type="number"
                step="0.5"
                value={form.low_threshold}
                onChange={(e) => setForm({ ...form, low_threshold: e.target.value })}
                data-testid="item-threshold"
                className="input-field"
              />
            </Field>
          )}
        </div>
        <div className="p-4 border-t border-line bg-cream/80 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-oat text-ink rounded-full py-3 text-sm font-semibold hover:bg-line transition-colors"
            data-testid="item-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-sage text-cream rounded-full py-3 text-sm font-semibold hover:bg-sage-dark transition-colors"
            data-testid="item-save"
          >
            {isNew ? "Add item" : "Save changes"}
          </button>
        </div>
        <style>{`.input-field { width: 100%; background:#fff; border:1px solid #E8E3D2; border-radius: 14px; padding: 10px 14px; font-size: 14px; color:#1C2018; outline:none; } .input-field:focus { border-color:#4A6741; }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ash font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
}
