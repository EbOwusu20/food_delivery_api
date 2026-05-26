from fastapi import FastAPI

from app.database import engine, Base

from app.routers import category

from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    user,
    product,
    category,
    store
)

from app.routers import (
    user,
    auth,
    products,
    category  
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Food Delivery API"
)

# Add this CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(category.router)

@app.get("/")
def home():
    return {"message": "API Running"}