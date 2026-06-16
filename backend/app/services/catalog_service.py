from fastapi import HTTPException, status

from app.data import store
from app.schemas.dishes import DishCreate, DishUpdate, RecipeItemCreate, SpecificationCreate, SpecificationUpdate


def _compute_recipe_items(spec_id: str) -> tuple[list[dict], float]:
    recipe_entries = store.spec_recipes.get(spec_id, [])
    items = []
    total = 0.0
    for entry in recipe_entries:
        ingredient = store.ingredients.get(entry["ingredient_id"])
        if not ingredient:
            continue
        subtotal = round(entry["qty"] * ingredient["avg_price"], 2)
        total += subtotal
        items.append({
            "ingredient_id": ingredient["id"],
            "ingredient_name": ingredient["name"],
            "qty": entry["qty"],
            "unit": ingredient["unit"],
            "unit_price": ingredient["avg_price"],
            "subtotal": subtotal,
        })
    return items, round(total, 2)


def _spec_with_profit(spec: dict) -> dict:
    recipe_items, ingredient_cost = _compute_recipe_items(spec["id"])
    cost = ingredient_cost + spec["packaging_cost"]
    gross_profit = round(spec["sale_price"] - cost, 2)
    gross_margin = round(gross_profit / spec["sale_price"], 4) if spec["sale_price"] else 0
    return {
        **spec,
        "ingredient_cost": ingredient_cost,
        "gross_profit": gross_profit,
        "gross_margin": gross_margin,
        "recipe_items": recipe_items,
    }


def list_dishes() -> list[dict]:
    return list(store.dishes.values())


def create_dish(payload: DishCreate) -> dict:
    item = {"id": store.new_id("dish"), **payload.model_dump()}
    store.dishes[item["id"]] = item
    return item


def update_dish(dish_id: str, payload: DishUpdate) -> dict:
    dish = store.dishes.get(dish_id)
    if not dish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")
    dish.update(payload.model_dump(exclude_unset=True))
    return dish


def delete_dish(dish_id: str) -> None:
    if dish_id not in store.dishes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")
    linked_specs = [spec_id for spec_id, spec in store.specifications.items() if spec["dish_id"] == dish_id]
    for spec_id in linked_specs:
        store.spec_recipes.pop(spec_id, None)
        store.specifications.pop(spec_id)
    store.dishes.pop(dish_id)


def list_specifications(dish_id: str | None = None) -> list[dict]:
    specs = store.specifications.values()
    if dish_id:
        specs = [spec for spec in specs if spec["dish_id"] == dish_id]
    return [_spec_with_profit(spec) for spec in specs]


def _save_recipe_items(spec_id: str, items: list[RecipeItemCreate]) -> None:
    for item in items:
        if item.ingredient_id not in store.ingredients:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingredient {item.ingredient_id} not found",
            )
    store.spec_recipes[spec_id] = [{"ingredient_id": ri.ingredient_id, "qty": ri.qty} for ri in items]


def create_specification(payload: SpecificationCreate) -> dict:
    if payload.dish_id not in store.dishes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")
    data = payload.model_dump(exclude={"recipe_items"})
    item = {"id": store.new_id("spec"), **data}
    store.specifications[item["id"]] = item
    if payload.recipe_items:
        _save_recipe_items(item["id"], payload.recipe_items)
    return _spec_with_profit(item)


def update_specification(spec_id: str, payload: SpecificationUpdate) -> dict:
    spec = store.specifications.get(spec_id)
    if not spec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specification not found")
    changes = payload.model_dump(exclude_unset=True, exclude={"recipe_items"})
    if changes.get("dish_id") and changes["dish_id"] not in store.dishes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")
    spec.update(changes)
    if payload.recipe_items is not None:
        _save_recipe_items(spec_id, payload.recipe_items)
    return _spec_with_profit(spec)


def delete_specification(spec_id: str) -> None:
    if spec_id not in store.specifications:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specification not found")
    store.spec_recipes.pop(spec_id, None)
    store.specifications.pop(spec_id)


def add_recipe_item(spec_id: str, payload: RecipeItemCreate) -> dict:
    spec = store.specifications.get(spec_id)
    if not spec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specification not found")
    if payload.ingredient_id not in store.ingredients:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")
    recipes = store.spec_recipes.setdefault(spec_id, [])
    for entry in recipes:
        if entry["ingredient_id"] == payload.ingredient_id:
            entry["qty"] = payload.qty
            return _spec_with_profit(spec)
    recipes.append({"ingredient_id": payload.ingredient_id, "qty": payload.qty})
    return _spec_with_profit(spec)


def remove_recipe_item(spec_id: str, ingredient_id: str) -> dict:
    spec = store.specifications.get(spec_id)
    if not spec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specification not found")
    recipes = store.spec_recipes.get(spec_id, [])
    store.spec_recipes[spec_id] = [r for r in recipes if r["ingredient_id"] != ingredient_id]
    return _spec_with_profit(spec)
