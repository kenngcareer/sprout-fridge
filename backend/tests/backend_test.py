"""Backend tests for Smart Fridge (Sprout) API."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fridge-inventory-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ----------------------- Root / Health -----------------------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()


# ----------------------- Inventory -----------------------
class TestInventory:
    def test_list_with_freshness(self, session):
        r = session.get(f"{API}/inventory")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        valid = {"fresh", "good", "expiring", "expired"}
        for item in data:
            assert "freshness" in item
            assert item["freshness"] in valid
            assert "id" in item and "name" in item

    def test_crud_flow(self, session):
        # Create
        payload = {"name": "TEST_Apple", "category": "produce", "quantity": 3, "unit": "pcs", "emoji": "🍎"}
        r = session.post(f"{API}/inventory", json=payload)
        assert r.status_code == 200
        created = r.json()
        assert created["name"] == "TEST_Apple"
        assert created["quantity"] == 3
        item_id = created["id"]

        # Verify via list
        r = session.get(f"{API}/inventory")
        assert any(i["id"] == item_id for i in r.json())

        # Update
        r = session.patch(f"{API}/inventory/{item_id}", json={"quantity": 2})
        assert r.status_code == 200
        assert r.json()["quantity"] == 2

        # Delete
        r = session.delete(f"{API}/inventory/{item_id}")
        assert r.status_code == 200

        # Verify deleted
        r = session.get(f"{API}/inventory")
        assert not any(i["id"] == item_id for i in r.json())

    def test_update_not_found(self, session):
        r = session.patch(f"{API}/inventory/nonexistent-id", json={"quantity": 5})
        assert r.status_code == 404

    def test_delete_not_found(self, session):
        r = session.delete(f"{API}/inventory/nonexistent-id")
        assert r.status_code == 404


# ----------------------- Scan -----------------------
class TestScan:
    def test_simulate_scan(self, session):
        r = session.post(f"{API}/inventory/scan")
        assert r.status_code == 200
        data = r.json()
        assert "detected" in data
        detected = data["detected"]
        assert 5 <= len(detected) <= 7
        for d in detected:
            assert "name" in d
            assert "quantity" in d
            assert "expires_at" in d
            assert 0 < d["confidence"] <= 1

    def test_scan_commit(self, session):
        scan = session.post(f"{API}/inventory/scan").json()
        items = scan["detected"][:2]
        # prefix names for cleanup tracking
        for it in items:
            it["name"] = "TEST_" + it["name"]
        r = session.post(f"{API}/inventory/scan/commit", json={"items": items})
        assert r.status_code == 200
        body = r.json()
        assert body["count"] == len(items)
        assert len(body["added"]) == len(items)
        # cleanup
        for it in body["added"]:
            session.delete(f"{API}/inventory/{it['id']}")


# ----------------------- Recipes -----------------------
class TestRecipes:
    def test_list_recipes(self, session):
        r = session.get(f"{API}/recipes")
        assert r.status_code == 200
        recipes = r.json()
        assert len(recipes) > 0
        for rec in recipes:
            assert "match_score" in rec
            assert "ingredients_have" in rec
            assert "missing_ingredients" in rec
            assert "uses_expiring" in rec
            assert 0 <= rec["match_score"] <= 100

    def test_filter_kid_friendly(self, session):
        r = session.get(f"{API}/recipes", params={"kid_friendly": "true"})
        assert r.status_code == 200
        assert all(rec["kid_friendly"] for rec in r.json())

    def test_filter_max_prep(self, session):
        r = session.get(f"{API}/recipes", params={"max_prep": 15})
        assert r.status_code == 200
        assert all(rec["prep_time_min"] <= 15 for rec in r.json())

    def test_filter_exclude_allergens(self, session):
        r = session.get(f"{API}/recipes", params={"exclude_allergens": "dairy,nuts"})
        assert r.status_code == 200
        for rec in r.json():
            assert "dairy" not in rec.get("allergens", [])
            assert "nuts" not in rec.get("allergens", [])

    def test_use_expiring_sort(self, session):
        r = session.get(f"{API}/recipes", params={"use_expiring": "true"})
        assert r.status_code == 200
        recipes = r.json()
        # first item should have >= uses_expiring as the last
        if len(recipes) >= 2:
            assert len(recipes[0]["uses_expiring"]) >= len(recipes[-1]["uses_expiring"])

    def test_get_recipe_detail(self, session):
        r = session.get(f"{API}/recipes/r1")
        assert r.status_code == 200
        rec = r.json()
        assert rec["id"] == "r1"
        for ing in rec["ingredients"]:
            assert "have" in ing
            assert isinstance(ing["have"], bool)

    def test_get_recipe_not_found(self, session):
        r = session.get(f"{API}/recipes/xxx")
        assert r.status_code == 404


# ----------------------- Grocery -----------------------
class TestGrocery:
    def test_list_grocery(self, session):
        r = session.get(f"{API}/grocery")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_grocery_crud(self, session):
        r = session.post(f"{API}/grocery", json={"name": "TEST_Item", "category": "produce", "quantity": 2})
        assert r.status_code == 200
        item = r.json()
        item_id = item["id"]
        assert item["name"] == "TEST_Item"

        r = session.patch(f"{API}/grocery/{item_id}", json={"checked": True})
        assert r.status_code == 200
        assert r.json()["checked"]

        r = session.delete(f"{API}/grocery/{item_id}")
        assert r.status_code == 200

    def test_auto_replenish(self, session):
        r = session.post(f"{API}/grocery/auto-replenish")
        assert r.status_code == 200
        body = r.json()
        assert "added" in body
        assert "count" in body
        # cleanup
        for it in body["added"]:
            session.delete(f"{API}/grocery/{it['id']}")

    def test_from_recipe(self, session):
        r = session.post(f"{API}/grocery/from-recipe/r4")
        assert r.status_code == 200
        body = r.json()
        assert "added" in body
        for it in body["added"]:
            session.delete(f"{API}/grocery/{it['id']}")

    def test_from_recipe_not_found(self, session):
        r = session.post(f"{API}/grocery/from-recipe/xxx")
        assert r.status_code == 404


# ----------------------- Family -----------------------
class TestFamily:
    def test_get_family(self, session):
        r = session.get(f"{API}/family")
        assert r.status_code == 200
        fam = r.json()
        assert "household_name" in fam
        assert isinstance(fam.get("members"), list)
        assert isinstance(fam.get("staples"), list)

    def test_update_family_household(self, session):
        orig = session.get(f"{API}/family").json()
        orig_name = orig["household_name"]
        new_name = "TEST_Household"
        r = session.patch(f"{API}/family", json={"household_name": new_name})
        assert r.status_code == 200
        assert r.json()["household_name"] == new_name
        # restore
        session.patch(f"{API}/family", json={"household_name": orig_name})

    def test_update_family_members(self, session):
        orig = session.get(f"{API}/family").json()
        new_members = orig["members"] + [{"id": "test-m", "name": "TEST_Member", "role": "kid", "age": 4, "allergies": [], "dislikes": [], "favorites": [], "avatar": "👶"}]
        r = session.patch(f"{API}/family", json={"members": new_members})
        assert r.status_code == 200
        names = [m["name"] for m in r.json()["members"]]
        assert "TEST_Member" in names
        # restore
        session.patch(f"{API}/family", json={"members": orig["members"]})


# ----------------------- Alerts & Stats -----------------------
class TestAlertsStats:
    def test_alerts(self, session):
        r = session.get(f"{API}/alerts")
        assert r.status_code == 200
        data = r.json()
        for k in ("expiring", "expired", "low_stock", "total_alerts"):
            assert k in data
        assert isinstance(data["expiring"], list)
        assert data["total_alerts"] == len(data["expiring"]) + len(data["expired"]) + len(data["low_stock"])

    def test_stats(self, session):
        r = session.get(f"{API}/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ("inventory_total", "expiring_soon", "grocery_pending", "categories", "estimated_waste_saved_lb"):
            assert k in data
        for cat in ("dairy", "produce", "meat", "pantry", "beverage"):
            assert cat in data["categories"]
