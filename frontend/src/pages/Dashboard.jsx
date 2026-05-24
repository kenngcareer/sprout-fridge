import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDays } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, ChefHat, Camera, ShoppingBasket, Sprout, Leaf, Clock } from "lucide-react";

const Stat = ({ label, value, sub, testid }) => (
  <div className="bg-white border border-line rounded-3xl p-4" data-testid={testid}>
    <div className="text-[11px] uppercase tracking-[0.16em] text-ash font-semibold">{label}</div>
    <div className="text-3xl font-outfit font-semibold text-ink mt-1.5">{value}</div>
    {sub && <div className="text-xs text-ash mt-1">{sub}</div>}
  </div>
);

const QuickAction = ({ to, icon: Icon, title, subtitle, accent, testid }) => (
  <Link
    to={to}
    data-testid={testid}
    className="card-lift bg-white border border-line rounded-3xl p-4 flex items-center gap-3 group"
  >
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent}`}>
      <Icon className="w-5 h-5" strokeWidth={2} />
    </div>
    <div className="flex-1">
      <div className="font-outfit font-semibold text-ink text-[15px] leading-tight">{title}</div>
      <div className="text-xs text-ash mt-0.5">{subtitle}</div>
    </div>
    <ArrowUpRight className="w-4 h-4 text-ash group-hover:text-sage-dark transition-colors" />
  </Link>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [family, setFamily] = useState(null);
  const [topRecipe, setTopRecipe] = useState(null);

  useEffect(() => {
    Promise.all([api.getStats(), api.getAlerts(), api.getFamily(), api.listRecipes({ use_expiring: true })])
      .then(([s, a, f, r]) => {
        setStats(s); setAlerts(a); setFamily(f); setTopRecipe(r[0] || null);
      })
      .catch(() => toast.error("Couldn't load dashboard"));
    // Mount-only fetch; setters and api are stable references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstParent = family?.members?.find((m) => m.role === "parent")?.name || "there";

  return (
    <div className="px-5 pt-2 pb-6 space-y-5">
      {/* Greeting */}
      <section className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.16em] text-ash font-semibold">{greeting}</div>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-ink mt-1 leading-tight">
          Hi {firstParent}, <span className="text-sage-dark">let's make dinner easy.</span>
        </h1>
        <p className="text-sm text-ash mt-2">Here's what's happening in your kitchen today.</p>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <Stat
          label="In your fridge"
          value={stats?.inventory_total ?? "—"}
          sub="items tracked"
          testid="stat-inventory"
        />
        <Stat
          label="Use soon"
          value={stats?.expiring_soon ?? "—"}
          sub="expiring this week"
          testid="stat-expiring"
        />
        <Stat
          label="On grocery list"
          value={stats?.grocery_pending ?? "—"}
          sub="items to pick up"
          testid="stat-grocery"
        />
        <Stat
          label="Waste saved"
          value={`${stats?.estimated_waste_saved_lb ?? 0} lb`}
          sub="this week, estimated"
          testid="stat-waste"
        />
      </section>

      {/* Alerts */}
      {alerts && alerts.total_alerts > 0 && (
        <section
          className="bg-terracotta-light border border-terracotta/20 rounded-3xl p-5 animate-fade-up"
          data-testid="alerts-card"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-terracotta" />
            <div className="text-[11px] uppercase tracking-[0.16em] text-terracotta font-semibold">
              Needs attention
            </div>
          </div>
          <div className="space-y-2">
            {alerts.expired.slice(0, 2).map((it) => (
              <div key={it.id} className="flex items-center justify-between" data-testid={`alert-expired-${it.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{it.emoji}</span>
                  <span className="font-medium text-ink text-sm">{it.name}</span>
                </div>
                <span className="text-xs text-terracotta font-semibold">{formatDays(it.expires_at)}</span>
              </div>
            ))}
            {alerts.expiring.slice(0, 3).map((it) => (
              <div key={it.id} className="flex items-center justify-between" data-testid={`alert-expiring-${it.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{it.emoji}</span>
                  <span className="font-medium text-ink text-sm">{it.name}</span>
                </div>
                <span className="text-xs text-terracotta font-semibold">{formatDays(it.expires_at)}</span>
              </div>
            ))}
            {alerts.low_stock.slice(0, 2).map((it) => (
              <div key={`low-${it.id}`} className="flex items-center justify-between" data-testid={`alert-lowstock-${it.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{it.emoji}</span>
                  <span className="font-medium text-ink text-sm">{it.name}</span>
                </div>
                <span className="text-xs text-gold font-semibold">Running low</span>
              </div>
            ))}
          </div>
          <Link
            to="/inventory"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sage-dark hover:text-ink transition-colors"
            data-testid="alerts-view-all"
          >
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* AI Recipe of the moment */}
      {topRecipe && (
        <section className="animate-fade-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-sage-dark font-semibold flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5" /> Suggested for tonight
              </span>
            </div>
            <Link to="/recipes" className="text-xs text-ash hover:text-ink" data-testid="link-all-recipes">
              See all
            </Link>
          </div>
          <Link
            to="/recipes"
            data-testid="featured-recipe"
            className="card-lift block bg-white border border-line rounded-3xl overflow-hidden"
          >
            <div className="aspect-[16/9] bg-oat overflow-hidden">
              <img src={topRecipe.image_url} alt={topRecipe.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {topRecipe.kid_friendly && (
                  <span className="bg-[#F4F1E1] text-[#A67C00] rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    Kid-friendly
                  </span>
                )}
                {topRecipe.uses_expiring?.length > 0 && (
                  <span className="bg-sage-light text-sage-dark rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                    <Leaf className="w-3 h-3" /> Uses expiring
                  </span>
                )}
                <span className="text-ash text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {topRecipe.prep_time_min} min
                </span>
              </div>
              <div className="font-outfit font-semibold text-ink text-lg leading-tight">{topRecipe.title}</div>
              <div className="text-sm text-ash mt-1">{topRecipe.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-ash">
                  <span className="font-semibold text-sage-dark">{topRecipe.ingredients_have}</span>
                  /{topRecipe.ingredients_total} ingredients ready
                </div>
                <div className="text-xs font-semibold text-sage-dark">Match {topRecipe.match_score}%</div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Quick actions */}
      <section className="space-y-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ash font-semibold px-1">Quick actions</div>
        <div className="grid grid-cols-1 gap-3">
          <QuickAction
            to="/inventory"
            icon={Camera}
            title="Scan the fridge"
            subtitle="Detect items in seconds — no manual entry."
            accent="bg-sage-light text-sage-dark"
            testid="quick-scan"
          />
          <QuickAction
            to="/recipes"
            icon={ChefHat}
            title="What can I cook tonight?"
            subtitle="Recipes built around what's already inside."
            accent="bg-terracotta-light text-terracotta"
            testid="quick-recipes"
          />
          <QuickAction
            to="/grocery"
            icon={ShoppingBasket}
            title="Smart grocery list"
            subtitle="Predicted before you run out."
            accent="bg-[#F4F1E1] text-[#A67C00]"
            testid="quick-grocery"
          />
        </div>
      </section>
    </div>
  );
}
