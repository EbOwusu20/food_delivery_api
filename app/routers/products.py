from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductResponse
)

from app.services.db import get_db
from app.auth.oauth2 import admin_required

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


#   Create a new product
# @router.post("/")
@router.post("/")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(admin_required)
):
    new_product = Product(**product.dict())

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


# Get all products
# @router.get("/")
# @router.get("/")
# def get_products(
#     search: str = "",
#     db: Session = Depends(get_db)
# ):

#     return db.query(Product).filter(
#         Product.name.contains(search)
#     ).all()
@router.get("/")
def get_products(
    search: str = "",
    min_price: float = 0,
    max_price: float = 100000,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):

    products = db.query(Product).filter(
        Product.name.contains(search),
        Product.price >= min_price,
        Product.price <= max_price
    ).offset(skip).limit(limit).all()

    return products
    

# def get_products(
#     db: Session = Depends(get_db)
# ):
#     return db.query(Product).all()


# Get a single product by ID
@router.get("/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product

# Update a product by ID
@router.put("/{product_id}")
def update_product(
    product_id: int,
    updated_product: ProductCreate,
    db: Session = Depends(get_db)
):

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    for key, value in updated_product.dict().items():
        setattr(product, key, value)

    db.commit()

    return {
        "message": "Product updated"
    } 


# Delete a product
@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted"
    }


# Product filtering
@router.get("/")
def get_products(
    search: str = "",
    min_price: float = 0,
    max_price: float = 100000,
    db: Session = Depends(get_db)
):

    products = db.query(Product).filter(
        Product.name.contains(search),
        Product.price >= min_price,
        Product.price <= max_price
    ).all()

    return products