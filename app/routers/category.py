from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import (
    CategoryCreate
)

from app.services.db import get_db

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)

# Create a new category
@router.post("/")
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):

    new_category = Category(
        name=category.name
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category

# Get all categories
@router.get("/")
def get_categories(
    db: Session = Depends(get_db)
):

    return db.query(Category).all()

# Get a single category by ID
@router.get("/{category_id}")
def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):

    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


  


