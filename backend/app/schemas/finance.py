from pydantic import BaseModel

from app.schemas.dishes import RecipeItem


class ProfitLine(BaseModel):
    dish_id: str
    dish_name: str
    spec_name: str
    sale_price: float
    cost: float
    ingredient_cost: float
    packaging_cost: float
    gross_profit: float
    gross_margin: float
    recipe_items: list[RecipeItem] = []


class FinanceSummary(BaseModel):
    active_dishes: int
    low_stock_items: int
    pending_purchase_orders: int
    average_margin: float
    estimated_inventory_value: float
