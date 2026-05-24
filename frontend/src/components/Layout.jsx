import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Refrigerator, ChefHat, ShoppingBasket, Users, Sprout } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home, testid: "nav-home" },
  { to: "/inventory", label: "Fridge", icon: Refrigerator, testid: "nav-inventory" },
  { to: "/recipes", label: "Recipes", icon: ChefHat, testid: "nav-recipes" },
  { to: "/grocery", label: "Grocery", icon: ShoppingBasket, testid: "nav-grocery" },
  { to: "/family", label: "Family", icon: Users, testid: "nav-family" },
];

export default function Layout() {
  const location = useLocation();
  const titleMap = {
    "/": "Kitchen Home",
    "/inventory": "Inside the Fridge",
    "/recipes": "Tonight's Ideas",
    "/grocery": "Smart Grocery",
    "/family": "Our Household",
  };
  const title = titleMap[location.pathname] || "Sprout";

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col bg-cream relative">
      <header className="sticky top-0 z-30 bg-cream/85 backdrop-blur-xl border-b border-line">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sage flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-cream" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ash font-semibold">Sprout</div>
              <div className="text-base font-outfit font-semibold text-ink" data-testid="page-title">{title}</div>
            </div>
          </div>
          <div className="text-xs text-ash hidden sm:block" data-testid="header-tagline">
            Your family's kitchen, simplified.
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
        <div className="bg-white border border-line shadow-[0_12px_30px_rgba(28,32,24,0.08)] rounded-full px-2 py-2 flex items-center justify-between">
          {navItems.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              data-testid={testid}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full text-[10.5px] font-semibold transition-colors ${
                  isActive ? "bg-sage-light text-sage-dark" : "text-ash hover:text-ink"
                }`
              }
            >
              <Icon className="w-5 h-5" strokeWidth={1.9} />
              <span className="leading-none">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
