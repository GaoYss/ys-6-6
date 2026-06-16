from pydantic import BaseModel, Field


class DishBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=40)
    flavor: str = Field(min_length=1, max_length=40)
    status: str = Field(default="active", pattern="^(active|paused|seasonal)$")
    description: str = Field(default="", max_length=300)


class DishCreate(DishBase):
    pass


class DishUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    category: str | None = Field(default=None, min_length=1, max_length=40)
    flavor: str | None = Field(default=None, min_length=1, max_length=40)
    status: str | None = Field(default=None, pattern="^(active|paused|seasonal)$")
    description: str | None = Field(default=None, max_length=300)


class Dish(DishBase):
    id: str


class RecipeItemCreate(BaseModel):
    ingredient_id: str
    qty: float = Field(gt=0)


class RecipeItem(BaseModel):
    ingredient_id: str
    ingredient_name: str
    qty: float
    unit: str
    unit_price: float
    subtotal: float


class SpecificationBase(BaseModel):
    dish_id: str
    name: str = Field(min_length=1, max_length=60)
    serving_size: str = Field(min_length=1, max_length=60)
    sale_price: float = Field(gt=0)
    packaging_cost: float = Field(ge=0)


class SpecificationCreate(SpecificationBase):
    recipe_items: list[RecipeItemCreate] = Field(default_factory=list)


class SpecificationUpdate(BaseModel):
    dish_id: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=60)
    serving_size: str | None = Field(default=None, min_length=1, max_length=60)
    sale_price: float | None = Field(default=None, gt=0)
    packaging_cost: float | None = Field(default=None, ge=0)
    recipe_items: list[RecipeItemCreate] | None = None


class Specification(SpecificationBase):
    id: str
    ingredient_cost: float
    gross_profit: float
    gross_margin: float
    recipe_items: list[RecipeItem] = Field(default_factory=list)
