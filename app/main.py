from fastapi import FastAPI

from app.database import engine, Base

from app.models import (
    user,
    product,
    category
)

from app.routers import (
    user,
    auth,
    products
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Food Delivery API"
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(products.router)

@app.get("/")
def home():
    return {"message": "API Running"}