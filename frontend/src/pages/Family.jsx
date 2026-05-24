import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Users, Shield, Sprout, Camera, Save } from "lucide-react";
import { toast } from "sonner";

const allergenChoices = ["nuts", "dairy", "gluten", "eggs", "shellfish", "fish"];
const avatarChoices = ["👩", "👨", "👧", "👦", "🧑", "👶", "👵", "👴"];

export default function Family() {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStaple, setNewStaple] = useState("");
  const [cameraOptIn, setCameraOptIn] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFamily();
      setFamily(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (updates) => {
    try {
      const updated = await api.updateFamily(updates);
      setFamily(updated);
      toast.success("Saved");
    } catch (e) {
      toast.error("Couldn't save");
    }
  };

  const updateMember = (id, patch) => {
    const members = family.members.map((m) => (m.id === id ? { ...m, ...patch } : m));
    save({ members });
  };

  const removeMember = (id) => {
    const members = family.members.filter((m) => m.id !== id);
    save({ members });
  };

  const addMember = () => {
    const members = [
      ...family.members,
      {
        id: `m${Date.now()}`,
        name: "New member",
        role: "kid",
        age: 6,
        allergies: [],
        dislikes: [],
        favorites: [],
        avatar: "👧",
      },
    ];
    save({ members });
  };

  const addStaple = () => {
    if (!newStaple.trim()) return;
    const staples = [...(family.staples || []), newStaple.trim()];
    setNewStaple("");
    save({ staples });
  };

  const removeStaple = (s) => {
    save({ staples: family.staples.filter((x) => x !== s) });
  };

  if (loading || !family) return <div className="px-5 py-10 text-center text-ash text-sm">Loading household...</div>;

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      {/* Hero */}
      <div className="bg-white border border-line rounded-3xl p-5 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ash font-semibold flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Household
        </div>
        <input
          value={family.household_name}
          onChange={(e) => setFamily({ ...family, household_name: e.target.value })}
          onBlur={() => save({ household_name: family.household_name })}
          data-testid="household-name"
          className="text-2xl sm:text-3xl font-outfit font-semibold text-ink mt-1 leading-tight w-full bg-transparent outline-none border-b border-transparent focus:border-line"
        />
        <p className="text-sm text-ash mt-1">{family.members.length} members · {family.staples?.length || 0} household staples</p>
      </div>

      {/* Members */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold">Family members</div>
          <button
            onClick={addMember}
            data-testid="btn-add-member"
            className="text-xs font-semibold text-sage-dark flex items-center gap-1 hover:text-ink transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3" data-testid="family-members">
          {family.members.map((m) => (
            <MemberCard key={m.id} member={m} onUpdate={updateMember} onRemove={removeMember} />
          ))}
        </div>
      </section>

      {/* Staples */}
      <section className="bg-white border border-line rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sprout className="w-4 h-4 text-sage-dark" />
          <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold">Household staples</div>
        </div>
        <p className="text-xs text-ash mb-3">Items you want auto-replenished when running low.</p>
        <div className="flex flex-wrap gap-1.5 mb-3" data-testid="staples-list">
          {family.staples?.map((s) => (
            <span
              key={s}
              data-testid={`staple-${s}`}
              className="bg-sage-light text-sage-dark rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold flex items-center gap-1.5"
            >
              {s}
              <button
                onClick={() => removeStaple(s)}
                data-testid={`remove-staple-${s}`}
                className="w-5 h-5 rounded-full hover:bg-sage hover:text-cream flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); addStaple(); }}
          className="flex gap-2"
        >
          <input
            value={newStaple}
            onChange={(e) => setNewStaple(e.target.value)}
            placeholder="Add a staple (e.g. Apples)"
            data-testid="staple-input"
            className="flex-1 bg-cream border border-line rounded-full px-4 py-2.5 text-sm focus:border-sage outline-none"
          />
          <button
            type="submit"
            data-testid="staple-add-btn"
            className="bg-sage text-cream rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-sage-dark transition-colors"
          >
            Add
          </button>
        </form>
      </section>

      {/* Privacy */}
      <section className="bg-white border border-line rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-sage-dark" />
          <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold">Privacy & camera</div>
        </div>
        <p className="text-xs text-ash mb-3">Your fridge cameras only run when the door closes. Images are processed on-device first.</p>
        <Row
          label="Internal camera scanning"
          desc="Auto-detect items when fridge door closes."
          checked={cameraOptIn}
          onChange={() => setCameraOptIn(!cameraOptIn)}
          testid="toggle-camera"
        />
        <Row
          label="Kid-friendly recipes by default"
          desc="Suggestions filter for child preferences."
          checked={family.kid_friendly_default}
          onChange={() => save({ kid_friendly_default: !family.kid_friendly_default })}
          testid="toggle-kidfriendly"
        />
      </section>
    </div>
  );
}

function Row({ label, desc, checked, onChange, testid }) {
  return (
    <button
      onClick={onChange}
      data-testid={testid}
      className="w-full flex items-center justify-between py-3 border-t border-line first:border-t-0"
    >
      <div className="text-left">
        <div className="font-outfit font-semibold text-ink text-sm">{label}</div>
        <div className="text-xs text-ash mt-0.5">{desc}</div>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-sage" : "bg-oat"}`}>
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </div>
    </button>
  );
}

function MemberCard({ member, onUpdate, onRemove }) {
  const [draft, setDraft] = useState(member);
  const [open, setOpen] = useState(false);

  const toggleAllergen = (a) => {
    const cur = draft.allergies || [];
    const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
    const updated = { ...draft, allergies: next };
    setDraft(updated);
    onUpdate(member.id, { allergies: next });
  };

  return (
    <div className="bg-white border border-line rounded-3xl p-4" data-testid={`member-${member.id}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          className="w-12 h-12 rounded-2xl bg-oat flex items-center justify-center text-2xl"
          data-testid={`member-avatar-${member.id}`}
        >
          {draft.avatar}
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onBlur={() => onUpdate(member.id, { name: draft.name })}
            data-testid={`member-name-${member.id}`}
            className="font-outfit font-semibold text-ink text-base bg-transparent w-full outline-none border-b border-transparent focus:border-line"
          />
          <div className="flex items-center gap-2 mt-1 text-xs text-ash">
            <select
              value={draft.role}
              onChange={(e) => { const r = e.target.value; setDraft({ ...draft, role: r }); onUpdate(member.id, { role: r }); }}
              data-testid={`member-role-${member.id}`}
              className="bg-transparent outline-none font-semibold capitalize"
            >
              <option value="parent">Parent</option>
              <option value="kid">Kid</option>
            </select>
            <span>·</span>
            <input
              type="number"
              value={draft.age || ""}
              onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
              onBlur={() => onUpdate(member.id, { age: draft.age })}
              className="w-12 bg-transparent outline-none"
              data-testid={`member-age-${member.id}`}
            />
            <span>yrs</span>
            {(draft.allergies?.length || 0) > 0 && (
              <span className="bg-terracotta-light text-terracotta rounded-full px-2 py-0.5 font-semibold capitalize">
                Allergic: {draft.allergies.join(", ")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onRemove(member.id)}
          data-testid={`member-remove-${member.id}`}
          className="w-8 h-8 rounded-full bg-oat hover:bg-terracotta-light flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-terracotta" />
        </button>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-line space-y-3 animate-fade-up">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ash font-semibold mb-1.5">Avatar</div>
            <div className="flex flex-wrap gap-1.5">
              {avatarChoices.map((a) => (
                <button
                  key={a}
                  onClick={() => { setDraft({ ...draft, avatar: a }); onUpdate(member.id, { avatar: a }); }}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border ${
                    draft.avatar === a ? "bg-sage-light border-sage" : "bg-white border-line"
                  }`}
                  data-testid={`avatar-${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ash font-semibold mb-1.5">Allergies</div>
            <div className="flex flex-wrap gap-1.5">
              {allergenChoices.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  data-testid={`member-allergen-${member.id}-${a}`}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors capitalize ${
                    draft.allergies?.includes(a)
                      ? "bg-terracotta text-white border-terracotta"
                      : "bg-white text-ink border-line"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ash font-semibold mb-1.5">Dislikes (comma-separated)</div>
            <input
              value={draft.dislikes?.join(", ") || ""}
              onChange={(e) => setDraft({ ...draft, dislikes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              onBlur={() => onUpdate(member.id, { dislikes: draft.dislikes })}
              data-testid={`member-dislikes-${member.id}`}
              placeholder="e.g. mushrooms, broccoli"
              className="w-full bg-cream border border-line rounded-full px-4 py-2 text-sm outline-none focus:border-sage"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ash font-semibold mb-1.5">Favorites (comma-separated)</div>
            <input
              value={draft.favorites?.join(", ") || ""}
              onChange={(e) => setDraft({ ...draft, favorites: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              onBlur={() => onUpdate(member.id, { favorites: draft.favorites })}
              data-testid={`member-favorites-${member.id}`}
              placeholder="e.g. pancakes, pasta"
              className="w-full bg-cream border border-line rounded-full px-4 py-2 text-sm outline-none focus:border-sage"
            />
          </div>
        </div>
      )}
    </div>
  );
}
