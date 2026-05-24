import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Clock, Sprout, Leaf, X, ChefHat, Plus, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const allergenChoices = ["nuts", "dairy", "gluten", "eggs", "shellfish"];

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kidOnly, setKidOnly] = useState(false);
  const [maxPrep, setMaxPrep] = useState(0);
  const [useExpiring, setUseExpiring] = useState(true);
  const [allergens, setAllergens] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { use_expiring: useExpiring };
      if (kidOnly) params.kid_friendly = true;
      if (maxPrep > 0) params.max_prep = maxPrep;
      if (allergens.length) params.exclude_allergens = allergens.join(",");
      const data = await api.listRecipes(params);
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [kidOnly, maxPrep, useExpiring, allergens]);

  useEffect(() => {
    if (openId) {
      api.getRecipe(openId).then(setOpenRecipe).catch(() => toast.error("Couldn't load recipe"));
    } else {
      setOpenRecipe(null);
    }
  }, [openId]);

  const toggleAllergen = (a) => {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  return (
    <div className="px-5 pt-2 pb-6 space-y-4">
      {/* Hero */}
      <div className="bg-white border border-line rounded-3xl p-5 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.16em] text-sage-dark font-semibold flex items-center gap-1.5">
          <Sprout className="w-3.5 h-3.5" /> AI Recipe Assistant
        </div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-ink mt-1.5 leading-tight">
          What can I cook tonight?
        </h1>
        <p className="text-sm text-ash mt-1">Suggestions matched to your fridge, your family, and tonight's clock.</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Toggle active={useExpiring} onClick={() => setUseExpiring(!useExpiring)} testid="filter-expiring">
            <Leaf className="w-3 h-3" /> Use expiring first
          </Toggle>
          <Toggle active={kidOnly} onClick={() => setKidOnly(!kidOnly)} testid="filter-kid">
            Kid-friendly only
          </Toggle>
          <div className="flex items-center gap-1.5 bg-white border border-line rounded-full px-3 py-1.5 text-xs font-semibold text-ink">
            <Clock className="w-3 h-3 text-ash" />
            <select
              value={maxPrep}
              onChange={(e) => setMaxPrep(Number(e.target.value))}
              data-testid="filter-prep"
              className="bg-transparent outline-none text-xs font-semibold"
            >
              <option value={0}>Any time</option>
              <option value={15}>≤ 15 min</option>
              <option value={20}>≤ 20 min</option>
              <option value={30}>≤ 30 min</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold self-center mr-1">Avoid:</span>
          {allergenChoices.map((a) => (
            <button
              key={a}
              onClick={() => toggleAllergen(a)}
              data-testid={`allergen-${a}`}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors capitalize ${
                allergens.includes(a)
                  ? "bg-terracotta text-white border-terracotta"
                  : "bg-white text-ink border-line hover:border-sage"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-ash text-sm">Loading recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 text-ash text-sm" data-testid="recipes-empty">No recipes match your filters.</div>
      ) : (
        <div className="space-y-3" data-testid="recipes-list">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenId(r.id)}
              data-testid={`recipe-${r.id}`}
              className="card-lift w-full bg-white border border-line rounded-3xl overflow-hidden text-left flex flex-col sm:flex-row gap-0 sm:gap-3"
            >
              <div className="sm:w-40 aspect-[16/9] sm:aspect-[4/3] bg-oat shrink-0 overflow-hidden">
                <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {r.kid_friendly && (
                    <span className="bg-[#F4F1E1] text-[#A67C00] rounded-full px-2 py-0.5 text-[10px] font-semibold">Kid-friendly</span>
                  )}
                  {r.uses_expiring?.length > 0 && (
                    <span className="bg-sage-light text-sage-dark rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-0.5">
                      <Leaf className="w-2.5 h-2.5" /> Uses expiring
                    </span>
                  )}
                  <span className="text-ash text-[10px] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {r.prep_time_min} min
                  </span>
                </div>
                <div className="font-outfit font-semibold text-ink text-base leading-tight">{r.title}</div>
                <div className="text-xs text-ash mt-1 line-clamp-2">{r.description}</div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="text-[11px] text-ash">
                    <span className="font-semibold text-sage-dark">{r.ingredients_have}</span>
                    /{r.ingredients_total} ingredients ready
                  </div>
                  <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sage-light text-sage-dark">
                    {r.match_score}% match
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {openId && (
        <RecipeDetail
          recipe={openRecipe}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function Toggle({ active, onClick, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors flex items-center gap-1 ${
        active ? "bg-sage text-cream border-sage" : "bg-white text-ink border-line hover:border-sage"
      }`}
    >
      {children}
    </button>
  );
}

function RecipeDetail({ recipe, onClose }) {
  const [adding, setAdding] = useState(false);

  const handleAddMissing = async () => {
    if (!recipe) return;
    setAdding(true);
    try {
      const res = await api.groceryFromRecipe(recipe.id);
      toast.success(`Added ${res.count} item(s) to grocery list`);
    } catch (e) {
      toast.error("Couldn't add to grocery list");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-cream w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-line shadow-2xl overflow-hidden animate-fade-up max-h-[92vh] flex flex-col"
        data-testid="recipe-detail"
      >
        {!recipe ? (
          <div className="p-8 text-center text-ash">Loading...</div>
        ) : (
          <>
            <div className="relative aspect-[16/9] bg-oat shrink-0">
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
              <button
                onClick={onClose}
                data-testid="recipe-close"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-ink" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {recipe.kid_friendly && (
                  <span className="bg-[#F4F1E1] text-[#A67C00] rounded-full px-2 py-0.5 text-[10px] font-semibold">Kid-friendly</span>
                )}
                <span className="bg-sage-light text-sage-dark rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {recipe.prep_time_min} min
                </span>
                <span className="bg-oat text-ash rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize">{recipe.difficulty}</span>
              </div>
              <h2 className="text-2xl font-outfit font-semibold text-ink leading-tight">{recipe.title}</h2>
              <p className="text-sm text-ash mt-1">{recipe.description}</p>

              {recipe.allergens?.length > 0 && (
                <div className="mt-3 text-[11px] text-ash flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-terracotta" />
                  Contains: <span className="capitalize">{recipe.allergens.join(", ")}</span>
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold">Ingredients</div>
                  <div className="text-[11px] font-semibold text-sage-dark">
                    {recipe.ingredients_have}/{recipe.ingredients_total} ready
                  </div>
                </div>
                <ul className="space-y-1.5" data-testid="recipe-ingredients">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-2xl bg-white border border-line">
                      <span className={`flex items-center gap-2 ${ing.have ? "text-ink" : "text-ash line-through decoration-terracotta/50"}`}>
                        {ing.have ? (
                          <Check className="w-3.5 h-3.5 text-sage-dark" strokeWidth={3} />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-terracotta" />
                        )}
                        {ing.name}
                      </span>
                      <span className="text-xs text-ash">{ing.qty} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-ash font-semibold mb-2">Steps</div>
                <ol className="space-y-2" data-testid="recipe-steps">
                  {recipe.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink">
                      <span className="w-6 h-6 rounded-full bg-sage-light text-sage-dark text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="p-4 border-t border-line bg-cream/80 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-oat text-ink rounded-full py-3 text-sm font-semibold hover:bg-line transition-colors"
                data-testid="recipe-detail-close"
              >
                Close
              </button>
              <button
                onClick={handleAddMissing}
                disabled={adding || (recipe.missing_ingredients?.length || 0) === 0}
                className="flex-1 bg-sage text-cream rounded-full py-3 text-sm font-semibold hover:bg-sage-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                data-testid="recipe-add-grocery"
              >
                <ChefHat className="w-4 h-4" />
                {recipe.missing_ingredients?.length ? `Add ${recipe.missing_ingredients.length} to grocery` : "All set"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
