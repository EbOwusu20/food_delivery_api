from pydantic import BaseModel
from typing import List

from app.schemas.product import ProductResponse

class CategoryCreate(BaseModel):
    name: str

class CategoryResponse(BaseModel):

    id: int
    name: str

    products: List[ProductResponse] = []

    class Config:
        orm_mode = True