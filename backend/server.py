from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Smart Fridge API")
api_router = APIRouter(prefix="/api")


# ----------------------- Helpers -----------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def days_from_now(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def compute_freshness(expires_at: Optional[str]) -> str:
    if not expires_at:
        return "fresh"
    try:
        exp = datetime.fromisoformat(expires_at)
    except Exception:
        return "fresh"
    now = datetime.now(timezone.utc)
    delta_days = (exp - now).total_seconds() / 86400
    if delta_days < 0:
        return "expired"
    if delta_days <= 2:
        return "expiring"
    if delta_days <= 5:
        return "good"
    return "fresh"


# ----------------------- Models -----------------------
class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "other"  # dairy | produce | meat | pantry | beverage | other
    quantity: float = 1
    unit: str = "pcs"
    expires_at: Optional[str] = None
    added_at: str = Field(default_factory=now_iso)
    is_staple: bool = False
    low_threshold: float = 1
    emoji: str = "🍎"


class InventoryCreate(BaseModel):
    name: str
    category: str = "other"
    quantity: float = 1
    unit: str = "pcs"
    expires_at: Optional[str] = None
    is_staple: bool = False
    low_threshold: float = 1
    emoji: str = "🍎"


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expires_at: Optional[str] = None
    is_staple: Optional[bool] = None
    low_threshold: Optional[float] = None
    emoji: Optional[str] = None


class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    prep_time_min: int
    kid_friendly: bool = False
    allergens: List[str] = []  # contains: nuts, dairy, gluten, eggs, shellfish
    ingredients: List[Dict[str, Any]] = []  # [{name, qty, unit}]
    steps: List[str] = []
    cuisine: str = "Family"
    description: str = ""
    image_url: str = ""
    difficulty: str = "Easy"


class GroceryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "other"
    quantity: float = 1
    unit: str = "pcs"
    checked: bool = False
    source: str = "manual"  # manual | predicted | recipe
    added_at: str = Field(default_factory=now_iso)
    emoji: str = "🛒"


class GroceryCreate(BaseModel):
    name: str
    category: str = "other"
    quantity: float = 1
    unit: str = "pcs"
    source: str = "manual"
    emoji: str = "🛒"


class GroceryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    checked: Optional[bool] = None
    emoji: Optional[str] = None


class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str = "kid"  # parent | kid
    age: Optional[int] = None
    allergies: List[str] = []
    dislikes: List[str] = []
    favorites: List[str] = []
    avatar: str = "👧"


class Family(BaseModel):
    id: str = "household"
    household_name: str = "The Williams Family"
    members: List[FamilyMember] = []
    staples: List[str] = []
    dietary_filters: List[str] = []
    kid_friendly_default: bool = True


# ----------------------- Seed data -----------------------
SEED_INVENTORY = [
    {"name": "Whole Milk", "category": "dairy", "quantity": 0.5, "unit": "gal", "expires_at": days_from_now(2), "is_staple": True, "low_threshold": 1, "emoji": "🥛"},
    {"name": "Eggs", "category": "dairy", "quantity": 6, "unit": "pcs", "expires_at": days_from_now(8), "is_staple": True, "low_threshold": 6, "emoji": "🥚"},
    {"name": "Greek Yogurt", "category": "dairy", "quantity": 3, "unit": "cups", "expires_at": days_from_now(5), "is_staple": True, "low_threshold": 2, "emoji": "🥣"},
    {"name": "Cheddar Cheese", "category": "dairy", "quantity": 1, "unit": "block", "expires_at": days_from_now(14), "is_staple": False, "low_threshold": 1, "emoji": "🧀"},
    {"name": "Baby Spinach", "category": "produce", "quantity": 1, "unit": "bag", "expires_at": days_from_now(1), "is_staple": False, "low_threshold": 1, "emoji": "🥬"},
    {"name": "Tomatoes", "category": "produce", "quantity": 4, "unit": "pcs", "expires_at": days_from_now(4), "is_staple": False, "low_threshold": 2, "emoji": "🍅"},
    {"name": "Apples", "category": "produce", "quantity": 5, "unit": "pcs", "expires_at": days_from_now(9), "is_staple": True, "low_threshold": 4, "emoji": "🍎"},
    {"name": "Bananas", "category": "produce", "quantity": 2, "unit": "pcs", "expires_at": days_from_now(2), "is_staple": True, "low_threshold": 4, "emoji": "🍌"},
    {"name": "Bell Peppers", "category": "produce", "quantity": 2, "unit": "pcs", "expires_at": days_from_now(6), "is_staple": False, "low_threshold": 1, "emoji": "🫑"},
    {"name": "Carrots", "category": "produce", "quantity": 5, "unit": "pcs", "expires_at": days_from_now(12), "is_staple": False, "low_threshold": 3, "emoji": "🥕"},
    {"name": "Chicken Breast", "category": "meat", "quantity": 1.2, "unit": "lb", "expires_at": days_from_now(2), "is_staple": False, "low_threshold": 1, "emoji": "🍗"},
    {"name": "Ground Beef", "category": "meat", "quantity": 0.5, "unit": "lb", "expires_at": days_from_now(1), "is_staple": False, "low_threshold": 1, "emoji": "🥩"},
    {"name": "Whole Wheat Bread", "category": "pantry", "quantity": 1, "unit": "loaf", "expires_at": days_from_now(5), "is_staple": True, "low_threshold": 1, "emoji": "🍞"},
    {"name": "Pasta", "category": "pantry", "quantity": 2, "unit": "boxes", "expires_at": days_from_now(180), "is_staple": True, "low_threshold": 1, "emoji": "🍝"},
    {"name": "Orange Juice", "category": "beverage", "quantity": 1, "unit": "carton", "expires_at": days_from_now(7), "is_staple": False, "low_threshold": 1, "emoji": "🧃"},
    {"name": "Butter", "category": "dairy", "quantity": 1, "unit": "stick", "expires_at": days_from_now(20), "is_staple": True, "low_threshold": 1, "emoji": "🧈"},
]

SEED_RECIPES = [
    {
        "id": "r1",
        "title": "Cheesy Spinach Scramble",
        "prep_time_min": 12,
        "kid_friendly": True,
        "allergens": ["dairy", "eggs"],
        "cuisine": "Breakfast",
        "description": "A creamy, kid-approved scramble that hides spinach in melty cheddar.",
        "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Eggs", "qty": 4, "unit": "pcs"},
            {"name": "Baby Spinach", "qty": 1, "unit": "handful"},
            {"name": "Cheddar Cheese", "qty": 0.25, "unit": "cup"},
            {"name": "Butter", "qty": 1, "unit": "tbsp"},
            {"name": "Whole Milk", "qty": 2, "unit": "tbsp"},
        ],
        "steps": [
            "Whisk eggs with milk and a pinch of salt.",
            "Melt butter in a non-stick pan over medium-low heat.",
            "Add spinach and wilt for 30 seconds.",
            "Pour in eggs, stir gently until just set.",
            "Fold in cheddar and serve warm.",
        ],
    },
    {
        "id": "r2",
        "title": "Sheet-Pan Chicken & Veggies",
        "prep_time_min": 30,
        "kid_friendly": True,
        "allergens": [],
        "cuisine": "Dinner",
        "description": "A simple one-pan dinner using fresh peppers, carrots, and chicken.",
        "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Chicken Breast", "qty": 1, "unit": "lb"},
            {"name": "Bell Peppers", "qty": 2, "unit": "pcs"},
            {"name": "Carrots", "qty": 3, "unit": "pcs"},
            {"name": "Olive Oil", "qty": 2, "unit": "tbsp"},
        ],
        "steps": [
            "Preheat oven to 425°F.",
            "Slice chicken and veggies into bite-sized pieces.",
            "Toss with olive oil, salt, pepper, and a sprinkle of paprika.",
            "Spread on a sheet pan and roast for 22 minutes.",
            "Serve over rice or with bread.",
        ],
    },
    {
        "id": "r3",
        "title": "Banana Yogurt Pancakes",
        "prep_time_min": 18,
        "kid_friendly": True,
        "allergens": ["dairy", "gluten", "eggs"],
        "cuisine": "Breakfast",
        "description": "Fluffy pancakes that use up ripe bananas — a weekend favorite.",
        "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Bananas", "qty": 2, "unit": "pcs"},
            {"name": "Greek Yogurt", "qty": 0.5, "unit": "cup"},
            {"name": "Eggs", "qty": 2, "unit": "pcs"},
            {"name": "Whole Wheat Bread", "qty": 0, "unit": "optional"},
            {"name": "Whole Milk", "qty": 0.25, "unit": "cup"},
        ],
        "steps": [
            "Mash bananas in a bowl.",
            "Whisk in yogurt, eggs, and milk.",
            "Fold in 1 cup flour and 1 tsp baking powder.",
            "Cook scoops in a buttered pan for 2 min per side.",
            "Top with honey or fresh fruit.",
        ],
    },
    {
        "id": "r4",
        "title": "Quick Tomato Pasta",
        "prep_time_min": 20,
        "kid_friendly": True,
        "allergens": ["gluten", "dairy"],
        "cuisine": "Dinner",
        "description": "Garlic-tomato pasta that gets dinner on the table fast.",
        "image_url": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Pasta", "qty": 1, "unit": "box"},
            {"name": "Tomatoes", "qty": 4, "unit": "pcs"},
            {"name": "Cheddar Cheese", "qty": 0.5, "unit": "cup"},
            {"name": "Butter", "qty": 1, "unit": "tbsp"},
            {"name": "Garlic", "qty": 2, "unit": "cloves"},
        ],
        "steps": [
            "Boil pasta to al dente.",
            "Sauté garlic in butter, add diced tomatoes.",
            "Simmer 8 minutes until saucy.",
            "Toss with pasta and shredded cheese.",
            "Serve with extra cheese on top.",
        ],
    },
    {
        "id": "r5",
        "title": "Veggie Quesadillas",
        "prep_time_min": 15,
        "kid_friendly": True,
        "allergens": ["dairy", "gluten"],
        "cuisine": "Lunch",
        "description": "Crispy quesadillas filled with melted cheese and hidden veggies.",
        "image_url": "https://images.unsplash.com/photo-1618040996337-11ebe71a6c84?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Cheddar Cheese", "qty": 1, "unit": "cup"},
            {"name": "Bell Peppers", "qty": 1, "unit": "pcs"},
            {"name": "Baby Spinach", "qty": 1, "unit": "handful"},
            {"name": "Tortillas", "qty": 4, "unit": "pcs"},
            {"name": "Butter", "qty": 1, "unit": "tbsp"},
        ],
        "steps": [
            "Dice peppers and chop spinach finely.",
            "Layer veggies and cheese on tortillas.",
            "Cook in buttered pan until golden, 2 min per side.",
            "Slice into wedges and serve with salsa.",
        ],
    },
    {
        "id": "r6",
        "title": "Mini Beef Sliders",
        "prep_time_min": 25,
        "kid_friendly": True,
        "allergens": ["gluten", "dairy"],
        "cuisine": "Dinner",
        "description": "Small, juicy beef sliders perfect for little hands.",
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Ground Beef", "qty": 0.5, "unit": "lb"},
            {"name": "Cheddar Cheese", "qty": 4, "unit": "slices"},
            {"name": "Whole Wheat Bread", "qty": 4, "unit": "slices"},
            {"name": "Tomatoes", "qty": 1, "unit": "pcs"},
        ],
        "steps": [
            "Form beef into 4 small patties, season with salt.",
            "Pan-sear 3 minutes per side.",
            "Top each with cheese and let melt.",
            "Toast bread, assemble with tomato slice.",
            "Serve with apple slices on the side.",
        ],
    },
    {
        "id": "r7",
        "title": "Carrot Apple Slaw",
        "prep_time_min": 10,
        "kid_friendly": True,
        "allergens": ["dairy"],
        "cuisine": "Side",
        "description": "Sweet, crunchy side that pairs with anything.",
        "image_url": "https://images.unsplash.com/photo-1572441713132-c542fc4fe282?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Carrots", "qty": 3, "unit": "pcs"},
            {"name": "Apples", "qty": 2, "unit": "pcs"},
            {"name": "Greek Yogurt", "qty": 0.25, "unit": "cup"},
            {"name": "Honey", "qty": 1, "unit": "tbsp"},
        ],
        "steps": [
            "Shred carrots and apples on a box grater.",
            "Whisk yogurt with honey and a squeeze of lemon.",
            "Toss everything together.",
            "Chill 10 minutes before serving.",
        ],
    },
    {
        "id": "r8",
        "title": "French Toast Sticks",
        "prep_time_min": 15,
        "kid_friendly": True,
        "allergens": ["dairy", "gluten", "eggs"],
        "cuisine": "Breakfast",
        "description": "Dippable French toast sticks the kids will demolish.",
        "image_url": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Whole Wheat Bread", "qty": 4, "unit": "slices"},
            {"name": "Eggs", "qty": 2, "unit": "pcs"},
            {"name": "Whole Milk", "qty": 0.5, "unit": "cup"},
            {"name": "Butter", "qty": 1, "unit": "tbsp"},
        ],
        "steps": [
            "Cut bread into 1-inch sticks.",
            "Whisk eggs, milk, and a dash of cinnamon.",
            "Dip sticks and pan-fry in butter until golden.",
            "Serve with maple syrup for dipping.",
        ],
    },
    {
        "id": "r9",
        "title": "Pepper Cheddar Frittata",
        "prep_time_min": 22,
        "kid_friendly": False,
        "allergens": ["dairy", "eggs"],
        "cuisine": "Dinner",
        "description": "A hearty oven frittata loaded with peppers and sharp cheddar.",
        "image_url": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800",
        "difficulty": "Medium",
        "ingredients": [
            {"name": "Eggs", "qty": 6, "unit": "pcs"},
            {"name": "Bell Peppers", "qty": 2, "unit": "pcs"},
            {"name": "Cheddar Cheese", "qty": 0.5, "unit": "cup"},
            {"name": "Whole Milk", "qty": 0.25, "unit": "cup"},
            {"name": "Butter", "qty": 1, "unit": "tbsp"},
        ],
        "steps": [
            "Preheat oven to 375°F.",
            "Sauté diced peppers in butter in an oven-safe pan.",
            "Whisk eggs with milk and salt, pour into pan.",
            "Top with cheese and bake 12 minutes.",
            "Slice into wedges.",
        ],
    },
    {
        "id": "r10",
        "title": "Apple Yogurt Parfait",
        "prep_time_min": 5,
        "kid_friendly": True,
        "allergens": ["dairy"],
        "cuisine": "Snack",
        "description": "A no-cook snack layered with cinnamon apples and creamy yogurt.",
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800",
        "difficulty": "Easy",
        "ingredients": [
            {"name": "Greek Yogurt", "qty": 1, "unit": "cup"},
            {"name": "Apples", "qty": 1, "unit": "pcs"},
            {"name": "Honey", "qty": 1, "unit": "tbsp"},
            {"name": "Granola", "qty": 0.25, "unit": "cup"},
        ],
        "steps": [
            "Dice apple finely and toss with cinnamon.",
            "Layer yogurt, apples, and granola in a glass.",
            "Drizzle honey and serve.",
        ],
    },
]

SEED_FAMILY = {
    "id": "household",
    "household_name": "The Williams Family",
    "members": [
        {"id": "m1", "name": "Sarah", "role": "parent", "age": 36, "allergies": [], "dislikes": [], "favorites": ["pasta", "salad"], "avatar": "👩"},
        {"id": "m2", "name": "James", "role": "parent", "age": 38, "allergies": [], "dislikes": ["mushrooms"], "favorites": ["beef", "eggs"], "avatar": "👨"},
        {"id": "m3", "name": "Mia", "role": "kid", "age": 8, "allergies": ["nuts"], "dislikes": ["fish", "broccoli"], "favorites": ["pancakes", "cheese"], "avatar": "👧"},
        {"id": "m4", "name": "Leo", "role": "kid", "age": 5, "allergies": [], "dislikes": ["spinach", "tomato"], "favorites": ["pasta", "bananas"], "avatar": "👦"},
    ],
    "staples": ["Whole Milk", "Eggs", "Bread", "Butter", "Apples", "Bananas", "Greek Yogurt", "Pasta"],
    "dietary_filters": ["nut-free"],
    "kid_friendly_default": True,
}

SCAN_POOL = [
    {"name": "Whole Milk", "category": "dairy", "quantity": 1, "unit": "gal", "expires_in": 7, "emoji": "🥛", "confidence": 0.97},
    {"name": "Eggs", "category": "dairy", "quantity": 12, "unit": "pcs", "expires_in": 14, "emoji": "🥚", "confidence": 0.96},
    {"name": "Strawberries", "category": "produce", "quantity": 1, "unit": "pkg", "expires_in": 3, "emoji": "🍓", "confidence": 0.91},
    {"name": "Blueberries", "category": "produce", "quantity": 1, "unit": "pkg", "expires_in": 4, "emoji": "🫐", "confidence": 0.89},
    {"name": "Romaine Lettuce", "category": "produce", "quantity": 1, "unit": "head", "expires_in": 5, "emoji": "🥬", "confidence": 0.93},
    {"name": "Cucumber", "category": "produce", "quantity": 2, "unit": "pcs", "expires_in": 7, "emoji": "🥒", "confidence": 0.94},
    {"name": "Salmon Fillet", "category": "meat", "quantity": 1, "unit": "lb", "expires_in": 2, "emoji": "🐟", "confidence": 0.88},
    {"name": "Hummus", "category": "pantry", "quantity": 1, "unit": "tub", "expires_in": 10, "emoji": "🥣", "confidence": 0.85},
    {"name": "Sparkling Water", "category": "beverage", "quantity": 6, "unit": "cans", "expires_in": 200, "emoji": "🥤", "confidence": 0.98},
    {"name": "Mozzarella", "category": "dairy", "quantity": 1, "unit": "ball", "expires_in": 8, "emoji": "🧀", "confidence": 0.9},
]


# ----------------------- Seeding -----------------------
async def seed_database():
    inv_count = await db.inventory.count_documents({})
    if inv_count == 0:
        for item in SEED_INVENTORY:
            obj = InventoryItem(**item)
            await db.inventory.insert_one(obj.model_dump())

    rec_count = await db.recipes.count_documents({})
    if rec_count == 0:
        for r in SEED_RECIPES:
            await db.recipes.insert_one(r)

    fam = await db.family.find_one({"id": "household"})
    if not fam:
        await db.family.insert_one(SEED_FAMILY)

    gro_count = await db.grocery.count_documents({})
    if gro_count == 0:
        # Seed a few predicted grocery items
        predicted_seed = [
            {"name": "Whole Milk", "category": "dairy", "quantity": 1, "unit": "gal", "source": "predicted", "emoji": "🥛"},
            {"name": "Bananas", "category": "produce", "quantity": 6, "unit": "pcs", "source": "predicted", "emoji": "🍌"},
            {"name": "Bread", "category": "pantry", "quantity": 1, "unit": "loaf", "source": "predicted", "emoji": "🍞"},
        ]
        for g in predicted_seed:
            obj = GroceryItem(**g)
            await db.grocery.insert_one(obj.model_dump())


# ----------------------- Inventory -----------------------
@api_router.get("/inventory")
async def list_inventory():
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    for it in items:
        it["freshness"] = compute_freshness(it.get("expires_at"))
    items.sort(key=lambda x: x.get("expires_at") or "9999")
    return items


@api_router.post("/inventory")
async def add_inventory(payload: InventoryCreate):
    obj = InventoryItem(**payload.model_dump())
    await db.inventory.insert_one(obj.model_dump())
    doc = obj.model_dump()
    doc["freshness"] = compute_freshness(doc.get("expires_at"))
    return doc


@api_router.patch("/inventory/{item_id}")
async def update_inventory(item_id: str, payload: InventoryUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    res = await db.inventory.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Item not found")
    doc = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    doc["freshness"] = compute_freshness(doc.get("expires_at"))
    return doc


@api_router.delete("/inventory/{item_id}")
async def delete_inventory(item_id: str):
    res = await db.inventory.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


@api_router.post("/inventory/scan")
async def simulate_scan():
    """Simulate a camera scan returning detected items with confidence scores."""
    rng = secrets.SystemRandom()
    k = rng.randint(5, 7)
    detected = rng.sample(SCAN_POOL, k=k)
    result = []
    for d in detected:
        result.append({
            "name": d["name"],
            "category": d["category"],
            "quantity": d["quantity"],
            "unit": d["unit"],
            "expires_at": days_from_now(d["expires_in"]),
            "emoji": d["emoji"],
            "confidence": d["confidence"],
        })
    return {"detected": result, "scan_duration_ms": 2400}


class ScanCommit(BaseModel):
    items: List[InventoryCreate]


@api_router.post("/inventory/scan/commit")
async def commit_scan(payload: ScanCommit):
    added = []
    for item in payload.items:
        obj = InventoryItem(**item.model_dump())
        await db.inventory.insert_one(obj.model_dump())
        doc = obj.model_dump()
        doc["freshness"] = compute_freshness(doc.get("expires_at"))
        added.append(doc)
    return {"added": added, "count": len(added)}


# ----------------------- Recipes -----------------------
@api_router.get("/recipes")
async def list_recipes(
    kid_friendly: Optional[bool] = None,
    max_prep: Optional[int] = None,
    exclude_allergens: Optional[str] = None,
    use_expiring: bool = False,
):
    query = {}
    if kid_friendly is not None:
        query["kid_friendly"] = kid_friendly
    if max_prep is not None:
        query["prep_time_min"] = {"$lte": max_prep}
    recipes = await db.recipes.find(query, {"_id": 0}).to_list(1000)

    if exclude_allergens:
        bad = [a.strip().lower() for a in exclude_allergens.split(",") if a.strip()]
        recipes = [r for r in recipes if not any(a in r.get("allergens", []) for a in bad)]

    # Compute ingredient availability against inventory
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    inv_names = {i["name"].lower(): i for i in inv}
    expiring_names = {
        i["name"].lower() for i in inv if compute_freshness(i.get("expires_at")) in ("expiring", "good")
    }

    for r in recipes:
        have = 0
        missing = []
        uses_expiring = []
        for ing in r.get("ingredients", []):
            iname = ing["name"].lower()
            if iname in inv_names:
                have += 1
                if iname in expiring_names:
                    uses_expiring.append(ing["name"])
            else:
                missing.append(ing["name"])
        total = max(len(r.get("ingredients", [])), 1)
        r["ingredients_have"] = have
        r["ingredients_total"] = total
        r["match_score"] = round(have / total * 100)
        r["missing_ingredients"] = missing
        r["uses_expiring"] = uses_expiring

    # Sort: prioritize expiring usage, then match score
    if use_expiring:
        recipes.sort(key=lambda r: (-(len(r["uses_expiring"])), -r["match_score"]))
    else:
        recipes.sort(key=lambda r: -r["match_score"])
    return recipes


@api_router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Recipe not found")
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    inv_names = {i["name"].lower() for i in inv}
    expiring_names = {
        i["name"].lower() for i in inv if compute_freshness(i.get("expires_at")) in ("expiring", "good")
    }
    have = 0
    missing = []
    uses_expiring = []
    for ing in r.get("ingredients", []):
        iname = ing["name"].lower()
        if iname in inv_names:
            have += 1
            ing["have"] = True
            if iname in expiring_names:
                uses_expiring.append(ing["name"])
        else:
            ing["have"] = False
            missing.append(ing["name"])
    total = max(len(r.get("ingredients", [])), 1)
    r["ingredients_have"] = have
    r["ingredients_total"] = total
    r["match_score"] = round(have / total * 100)
    r["missing_ingredients"] = missing
    r["uses_expiring"] = uses_expiring
    return r


# ----------------------- Grocery -----------------------
@api_router.get("/grocery")
async def list_grocery():
    items = await db.grocery.find({}, {"_id": 0}).to_list(1000)
    items.sort(key=lambda x: (x.get("checked", False), x.get("category", "z"), x.get("name", "")))
    return items


@api_router.post("/grocery")
async def add_grocery(payload: GroceryCreate):
    obj = GroceryItem(**payload.model_dump())
    await db.grocery.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.patch("/grocery/{item_id}")
async def update_grocery(item_id: str, payload: GroceryUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    res = await db.grocery.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Grocery item not found")
    return await db.grocery.find_one({"id": item_id}, {"_id": 0})


@api_router.delete("/grocery/{item_id}")
async def delete_grocery(item_id: str):
    res = await db.grocery.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Grocery item not found")
    return {"success": True}


@api_router.post("/grocery/from-recipe/{recipe_id}")
async def grocery_from_recipe(recipe_id: str):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Recipe not found")
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    inv_names = {i["name"].lower() for i in inv}
    added = []
    for ing in r.get("ingredients", []):
        if ing["name"].lower() not in inv_names:
            obj = GroceryItem(
                name=ing["name"],
                category="other",
                quantity=ing.get("qty", 1) or 1,
                unit=ing.get("unit", "pcs"),
                source="recipe",
                emoji="🛒",
            )
            await db.grocery.insert_one(obj.model_dump())
            added.append(obj.model_dump())
    return {"added": added, "count": len(added)}


@api_router.post("/grocery/auto-replenish")
async def auto_replenish():
    """Add low-stock staples to grocery list."""
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    existing_grocery = await db.grocery.find({}, {"_id": 0}).to_list(1000)
    existing_names = {g["name"].lower() for g in existing_grocery if not g.get("checked")}
    added = []
    for item in inv:
        if item.get("is_staple") and item.get("quantity", 0) <= item.get("low_threshold", 1):
            if item["name"].lower() not in existing_names:
                obj = GroceryItem(
                    name=item["name"],
                    category=item.get("category", "other"),
                    quantity=item.get("low_threshold", 1),
                    unit=item.get("unit", "pcs"),
                    source="predicted",
                    emoji=item.get("emoji", "🛒"),
                )
                await db.grocery.insert_one(obj.model_dump())
                added.append(obj.model_dump())
    return {"added": added, "count": len(added)}


# ----------------------- Family -----------------------
@api_router.get("/family")
async def get_family():
    fam = await db.family.find_one({"id": "household"}, {"_id": 0})
    if not fam:
        await db.family.insert_one(SEED_FAMILY)
        fam = await db.family.find_one({"id": "household"}, {"_id": 0})
    return fam


class FamilyUpdate(BaseModel):
    household_name: Optional[str] = None
    members: Optional[List[FamilyMember]] = None
    staples: Optional[List[str]] = None
    dietary_filters: Optional[List[str]] = None
    kid_friendly_default: Optional[bool] = None


@api_router.patch("/family")
async def update_family(payload: FamilyUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "members" in updates:
        updates["members"] = [m if isinstance(m, dict) else m.model_dump() for m in updates["members"]]
    if updates:
        await db.family.update_one({"id": "household"}, {"$set": updates}, upsert=True)
    return await db.family.find_one({"id": "household"}, {"_id": 0})


# ----------------------- Alerts -----------------------
@api_router.get("/alerts")
async def get_alerts():
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    expiring = []
    expired = []
    low_stock = []
    for it in inv:
        f = compute_freshness(it.get("expires_at"))
        it["freshness"] = f
        if f == "expiring":
            expiring.append(it)
        elif f == "expired":
            expired.append(it)
        if it.get("is_staple") and it.get("quantity", 0) <= it.get("low_threshold", 1):
            low_stock.append(it)
    expiring.sort(key=lambda x: x.get("expires_at") or "")
    return {
        "expiring": expiring,
        "expired": expired,
        "low_stock": low_stock,
        "total_alerts": len(expiring) + len(expired) + len(low_stock),
    }


# ----------------------- Stats -----------------------
@api_router.get("/stats")
async def get_stats():
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    grocery = await db.grocery.find({}, {"_id": 0}).to_list(1000)
    expiring_count = sum(1 for i in inv if compute_freshness(i.get("expires_at")) in ("expiring", "expired"))
    return {
        "inventory_total": len(inv),
        "expiring_soon": expiring_count,
        "grocery_pending": sum(1 for g in grocery if not g.get("checked")),
        "categories": {
            "dairy": sum(1 for i in inv if i.get("category") == "dairy"),
            "produce": sum(1 for i in inv if i.get("category") == "produce"),
            "meat": sum(1 for i in inv if i.get("category") == "meat"),
            "pantry": sum(1 for i in inv if i.get("category") == "pantry"),
            "beverage": sum(1 for i in inv if i.get("category") == "beverage"),
        },
        "estimated_waste_saved_lb": round(expiring_count * 0.4, 1),
    }


# ----------------------- Reset (dev) -----------------------
@api_router.post("/reseed")
async def reseed():
    await db.inventory.delete_many({})
    await db.recipes.delete_many({})
    await db.family.delete_many({})
    await db.grocery.delete_many({})
    await seed_database()
    return {"success": True}


@api_router.get("/")
async def root():
    return {"message": "Smart Fridge API ready", "version": "1.0"}


# Mount router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_database()
    logger.info("Smart Fridge API started, seed data ensured.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
