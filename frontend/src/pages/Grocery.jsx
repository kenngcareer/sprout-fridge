import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Sparkles, Trash2, ShoppingBasket, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const sourceLabel = {
  manual: { label: "Added", color: "bg-oat text-ash" },
  predicted: { label: "Predicted", color: "bg-sage-light text-sage-dark" },
  recipe: { label: "From recipe", color: "bg-[#F4F1E1] text-[#A67C00]" },
};

const categoryEmojis = {
  dairy: "🥛", produce: "🥬", meat: "🍗", pantry: "🌾", beverage: "🥤", other: "🛒",
};

export default function Grocery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("other");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listGrocery();
      setItems(data);
    } catch {
      toast.error("Couldn't load grocery list");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      const k = it.category || "other";
      if (!map[k]) map[k] = [];
      map[k].push(it);
    });
    return map;
  }, [items]);

  const remaining = items.filter((i) => !i.checked).length;
  const total = items.length;

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.addGrocery({
        name: newName.trim(),
        category: newCategory,
        quantity: 1,
        unit: "pcs",
        source: "manual",
        emoji: categoryEmojis[newCategory] || "🛒",
      });
      setNewName("");
      await load();
    } catch (e) {
      toast.error("Couldn't add item");
    }
  };

  const handleToggle = async (item) => {
    try {
      await api.updateGrocery(item.id, { checked: !item.checked });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    } catch (e) {
      toast.error("Couldn't update");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteGrocery(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      toast.error("Couldn't remove");
    }
  };

  const handleAutoReplenish = async () => {
    try {
      const res = await api.autoReplenish();
      if (res.count === 0) toast.info("Nothing to predict — staples are stocked.");
      else toast.success(`Added ${res.count} predicted staple(s)`);
      await load();
    } catch (e) {
      toast.error("Couldn't auto-fill");
    }
  };

  const handleClearChecked = async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    await Promise.all(checked.map((i) => api.deleteGrocery(i.id)));
    toast.success(`Cleared ${checked.length} items`);
    await load();
  };

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      {/* Hero */}
      <div className="bg-white border border-line rounded-3xl p-5 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash font-semibold flex items-center gap-1.5">
              <ShoppingBasket className="w-3.5 h-3.5" /> Smart grocery
            </div>
            <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-ink mt-1 leading-tight">
              {remaining} <span className="text-ash font-medium text-base">left to buy</span>
            </h1>
            <p className="text-sm text-ash mt-1">Predicted, recipe-based, and your manual adds — in one place.</p>
          </div>
          <button
            onClick={handleAutoReplenish}
            data-testid="btn-auto-replenish"
            className="bg-sage text-cream rounded-full px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-sage-dark transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-fill
          </button>
        </div>
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs text-ash">
            <span>{total - remaining} of {total} checked off</span>
            <button
              onClick={handleClearChecked}
              data-testid="btn-clear-checked"
              className="text-sage-dark font-semibold hover:text-ink transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Clear bought
            </button>
          </div>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2" data-testid="grocery-add-form">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add an item..."
          data-testid="grocery-input"
          className="flex-1 bg-white border border-line rounded-full px-4 py-3 text-sm placeholder:text-ash focus:border-sage outline-none"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          data-testid="grocery-category"
          className="bg-white border border-line rounded-full px-3 py-3 text-sm outline-none"
        >
          <option value="dairy">Dairy</option>
          <option value="produce">Produce</option>
          <option value="meat">Meat</option>
          <option value="pantry">Pantry</option>
          <option value="beverage">Drinks</option>
          <option value="other">Other</option>
        </select>
        <button
          type="submit"
          data-testid="grocery-add-btn"
          className="bg-sage text-cream rounded-full w-12 h-12 flex items-center justify-center hover:bg-sage-dark transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* List */}
      <GrocerySection
        loading={loading}
        items={items}
        grouped={grouped}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    </div>
  );
}

function GrocerySection({ loading, items, grouped, onToggle, onDelete }) {
  if (loading) {
    return <div className="text-center py-12 text-ash text-sm">Loading...</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-ash text-sm" data-testid="grocery-empty">
        Your grocery list is empty. Try "Auto-fill" to predict needs.
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="grocery-list">
      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold px-1 mb-2 flex items-center gap-1.5">
            <span>{categoryEmojis[cat] || "🛒"}</span> {cat}
          </div>
          <div className="space-y-2">
            {list.map((it) => (
              <GroceryRow key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroceryRow({ item: it, onToggle, onDelete }) {
  const src = sourceLabel[it.source] || sourceLabel.manual;
  return (
    <div
      data-testid={`grocery-item-${it.id}`}
      className={`bg-white border border-line rounded-2xl p-3 flex items-center gap-3 transition-opacity ${
        it.checked ? "opacity-50" : ""
      }`}
    >
      <button
        onClick={() => onToggle(it)}
        data-testid={`grocery-toggle-${it.id}`}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
          it.checked ? "bg-sage border-sage text-cream" : "border-line bg-white hover:border-sage"
        }`}
      >
        {it.checked && <Check className="w-4 h-4" strokeWidth={3} />}
      </button>
      <span className="text-2xl">{it.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-outfit font-semibold text-sm leading-tight ${it.checked ? "line-through text-ash" : "text-ink"}`}>
          {it.name}
        </div>
        <div className="text-[11px] text-ash mt-0.5">{it.quantity} {it.unit}</div>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${src.color}`}>{src.label}</span>
      <button
        onClick={() => onDelete(it.id)}
        data-testid={`grocery-delete-${it.id}`}
        className="w-8 h-8 rounded-full bg-oat hover:bg-terracotta-light flex items-center justify-center transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-terracotta" />
      </button>
    </div>
  );
}
