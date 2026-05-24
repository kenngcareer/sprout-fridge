# Sprout — AI-Powered Smart Fridge Companion App

## Original Problem Statement
Build a functional UI for an AI-powered smart fridge for families, based on a PRD covering three integrated features:
1. **AI Recipe Assistant** — Suggests family-friendly recipes from current fridge inventory, prioritising expiring ingredients, with allergy + kid-friendly filters, prep time, and missing-ingredient detection.
2. **Smart Inventory & Expiration Tracking** — Auto-detects items via simulated camera scan, surfaces low-stock/expiration alerts, supports manual corrections and staple lists.
3. **Predictive Family Grocery Planner** — Generates smart grocery lists from consumption patterns, recipe gaps, and inventory trends. Supports manual edits and category grouping.

**User Choices (Iteration 1, 2026-02):**
- App form factor: Companion mobile/web app
- Recipes: Mocked seed data (no LLM)
- Inventory: Simulated camera scan
- Design vibe: design_agent decides (chose "Organic & Earthy" — sage / terracotta / cream)

## Architecture
- **Backend** FastAPI + MongoDB (`/api` prefix). Collections: `inventory`, `recipes`, `grocery`, `family`.
- **Frontend** React + react-router + Tailwind. Mobile-first, max-w-2xl, bottom-nav layout. Outfit + Work Sans fonts.
- **Auto-seeding** 16 inventory items, 10 recipes, 1 household (4 members), 3 predicted grocery items.
- **No auth** (single-household demo).

## Key Endpoints
- Inventory CRUD + `POST /inventory/scan` (simulated CV) + `/scan/commit`
- Recipes `GET /recipes` with filters (kid_friendly, max_prep, exclude_allergens, use_expiring) and computed match_score
- Grocery CRUD + `/grocery/auto-replenish` + `/grocery/from-recipe/{id}`
- Family `GET/PATCH /family`
- `GET /alerts`, `GET /stats`

## What's Implemented (2026-02)
- ✅ Dashboard with greeting, 4 stat cards, alerts feed, suggested-recipe card, 3 quick actions
- ✅ Inventory grid with freshness badges, search, 7 category filters, expiring filter
- ✅ Camera-scan simulation (scanning → review → commit) with confidence scores
- ✅ Add/edit/delete item dialog with emoji picker, staple flag, low-stock threshold
- ✅ Recipes list with filters (use expiring, kid-only, prep time, 5 allergens), match-score badge, detail modal with per-ingredient have/missing flag and "Add missing to grocery"
- ✅ Smart grocery list grouped by category with predicted/recipe/manual source labels, auto-fill, clear-bought
- ✅ Family profile: editable household name, member CRUD (avatar, role, age, allergies, dislikes, favorites), staples list, privacy toggles
- ✅ Sonner toasts, data-testid attributes on all interactive elements
- ✅ Z-index/safe-area fix so dialog footer buttons don't overlap external floating widgets

## Personas
- **Sarah & James** — busy dual-income parents (36–38)
- **Mia (8)** — picky eater, nut allergy
- **Leo (5)** — dislikes spinach/tomato

## Prioritised Backlog
### P1
- Real LLM-powered recipe generation (Claude/GPT) via Emergent LLM key
- Drag-to-decrement quantity for fast "I used some"
- Weekly meal-plan / calendar view
- Push notifications for expiring items

### P2
- Shared household sync (multiple parents editing)
- Grocery delivery hand-off (Instacart/Walmart deep link)
- Photo-upload "manual scan" for unknown items
- Nutrition coaching for kids
- Budget tracking per shopping trip

## Test Notes
- Backend test suite at `/app/backend/tests/backend_test.py` — 24/24 passing
- Frontend tested via Playwright; all 5 pages render and route correctly
