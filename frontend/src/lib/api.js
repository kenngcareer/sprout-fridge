import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, headers: { "Content-Type": "application/json" } });

export const api = {
  // Inventory
  listInventory: () => client.get("/inventory").then((r) => r.data),
  addInventory: (data) => client.post("/inventory", data).then((r) => r.data),
  updateInventory: (id, data) => client.patch(`/inventory/${id}`, data).then((r) => r.data),
  deleteInventory: (id) => client.delete(`/inventory/${id}`).then((r) => r.data),
  simulateScan: () => client.post("/inventory/scan").then((r) => r.data),
  commitScan: (items) => client.post("/inventory/scan/commit", { items }).then((r) => r.data),

  // Recipes
  listRecipes: (params = {}) => client.get("/recipes", { params }).then((r) => r.data),
  getRecipe: (id) => client.get(`/recipes/${id}`).then((r) => r.data),

  // Grocery
  listGrocery: () => client.get("/grocery").then((r) => r.data),
  addGrocery: (data) => client.post("/grocery", data).then((r) => r.data),
  updateGrocery: (id, data) => client.patch(`/grocery/${id}`, data).then((r) => r.data),
  deleteGrocery: (id) => client.delete(`/grocery/${id}`).then((r) => r.data),
  groceryFromRecipe: (id) => client.post(`/grocery/from-recipe/${id}`).then((r) => r.data),
  autoReplenish: () => client.post("/grocery/auto-replenish").then((r) => r.data),

  // Family
  getFamily: () => client.get("/family").then((r) => r.data),
  updateFamily: (data) => client.patch("/family", data).then((r) => r.data),

  // Misc
  getAlerts: () => client.get("/alerts").then((r) => r.data),
  getStats: () => client.get("/stats").then((r) => r.data),
  reseed: () => client.post("/reseed").then((r) => r.data),
};

export const freshnessLabel = (f) => ({
  fresh: "Fresh",
  good: "Good",
  expiring: "Use soon",
  expired: "Expired",
}[f] || "—");

export const freshnessColor = (f) => ({
  fresh: "text-sage bg-sage-light",
  good: "text-sage bg-sage-light",
  expiring: "text-terracotta bg-terracotta-light",
  expired: "text-white bg-terracotta",
}[f] || "text-ash bg-oat");

export const daysUntil = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days;
};

export const formatDays = (iso) => {
  const d = daysUntil(iso);
  if (d === null) return "No expiry";
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `${d} days left`;
};

export const categoryEmoji = {
  dairy: "🥛",
  produce: "🥬",
  meat: "🍗",
  pantry: "🌾",
  beverage: "🥤",
  other: "🍽️",
};
