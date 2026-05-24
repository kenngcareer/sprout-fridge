import { useEffect, useState, useMemo, useCallback } from "react";
import { api, formatDays, freshnessLabel, freshnessColor } from "@/lib/api";
import { Camera, Plus, Search, Trash2, Pencil, X, Check, Filter } from "lucide-react";
import { toast } from "sonner";
import CameraScan from "@/components/CameraScan";
import ItemDialog from "@/components/ItemDialog";

const categories = [
  { id: "all", label: "All" },
  { id: "dairy", label: "Dairy" },
  { id: "produce", label: "Produce" },
  { id: "meat", label: "Meat" },
  { id: "pantry", label: "Pantry" },
  { id: "beverage", label: "Drinks" },
  { id: "other", label: "Other" },
];

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited or "new"
  const [loading, setLoading] = useState(true);
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listInventory();
      setItems(data);
    } catch {
      toast.error("Couldn't load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter !== "all" && it.category !== filter) return false;
      if (onlyExpiring && !["expiring", "expired"].includes(it.freshness)) return false;
      if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, search, onlyExpiring]);

  const handleDelete = async (id) => {
    try {
      await api.deleteInventory(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item removed");
    } catch (e) {
      toast.error("Couldn't remove item");
    }
  };

  const handleUseOne = async (item) => {
    const newQty = Math.max(0, (item.quantity || 0) - 1);
    try {
      const updated = await api.updateInventory(item.id, { quantity: newQty });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (e) {
      toast.error("Couldn't update");
    }
  };

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      {/* Hero */}
      <div className="bg-white border border-line rounded-3xl p-5 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash font-semibold">Fridge inventory</div>
            <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-ink mt-1">
              {items.length} items <span className="text-ash font-medium text-base">tracked</span>
            </h1>
            <p className="text-sm text-ash mt-1">Auto-detected from your last fridge scan.</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setShowScan(true)}
              data-testid="btn-scan-fridge"
              className="bg-sage text-cream rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 hover:bg-sage-dark transition-colors"
            >
              <Camera className="w-4 h-4" /> Scan
            </button>
            <button
              onClick={() => setEditing("new")}
              data-testid="btn-add-item"
              className="bg-oat text-ink rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-1.5 hover:bg-line transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            data-testid="input-search-inventory"
            className="w-full bg-white border border-line rounded-full pl-11 pr-4 py-3 text-sm placeholder:text-ash focus:border-sage outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setOnlyExpiring(!onlyExpiring)}
            data-testid="filter-expiring"
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
              onlyExpiring ? "bg-terracotta text-white border-terracotta" : "bg-white text-ink border-line"
            }`}
          >
            <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> Expiring</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              data-testid={`filter-cat-${c.id}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                filter === c.id ? "bg-sage text-cream border-sage" : "bg-white text-ink border-line hover:border-sage"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <InventoryGrid
        loading={loading}
        items={filtered}
        onUseOne={handleUseOne}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      {showScan && (
        <CameraScan
          onClose={() => setShowScan(false)}
          onCommit={async () => { await load(); setShowScan(false); }}
        />
      )}
      {editing && (
        <ItemDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await load(); setEditing(null); }}
        />
      )}
    </div>
  );
}

function InventoryGrid({ loading, items, onUseOne, onEdit, onDelete }) {
  if (loading) {
    return <div className="text-center py-12 text-ash text-sm">Loading...</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-ash text-sm" data-testid="inventory-empty">
        No items found. Try scanning your fridge.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="inventory-list">
      {items.map((it) => (
        <InventoryCard key={it.id} item={it} onUseOne={onUseOne} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function InventoryCard({ item: it, onUseOne, onEdit, onDelete }) {
  const isUrgent = ["expiring", "expired"].includes(it.freshness);
  return (
    <div
      className="card-lift bg-white border border-line rounded-3xl p-4 flex flex-col gap-2"
      data-testid={`inv-item-${it.id}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{it.emoji}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${freshnessColor(it.freshness)}`}>
          {freshnessLabel(it.freshness)}
        </span>
      </div>
      <div>
        <div className="font-outfit font-semibold text-ink text-[15px] leading-tight">{it.name}</div>
        <div className="text-xs text-ash mt-0.5 capitalize">{it.category}</div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ash">{it.quantity} {it.unit}</span>
        <span className={`font-semibold ${isUrgent ? "text-terracotta" : "text-ash"}`}>
          {formatDays(it.expires_at)}
        </span>
      </div>
      <div className="flex gap-1.5 mt-1 pt-2 border-t border-line">
        <button
          onClick={() => onUseOne(it)}
          data-testid={`btn-use-${it.id}`}
          className="flex-1 bg-sage-light text-sage-dark rounded-full py-1.5 text-[11px] font-semibold hover:bg-sage hover:text-cream transition-colors"
        >
          Used one
        </button>
        <button
          onClick={() => onEdit(it)}
          data-testid={`btn-edit-${it.id}`}
          className="w-8 h-8 rounded-full bg-oat hover:bg-line flex items-center justify-center transition-colors"
        >
          <Pencil className="w-3.5 h-3.5 text-ink" />
        </button>
        <button
          onClick={() => onDelete(it.id)}
          data-testid={`btn-delete-${it.id}`}
          className="w-8 h-8 rounded-full bg-oat hover:bg-terracotta-light flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-terracotta" />
        </button>
      </div>
    </div>
  );
}
