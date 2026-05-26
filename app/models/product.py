from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey
)

from sqlalchemy.orm import relationship

from app.database import Base

class Product(Base):

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)
    description = Column(String)
    price = Column(Float)

    category_id = Column(
        Integer,
        ForeignKey("categories.id")
    )

    category = relationship(
        "Category",
        back_populates="products"
    )

    store_id = Column(
        Integer,
        ForeignKey("stores.id"),
        nullable=True
    )

    store = relationship(
        "Store",
        back_populates="products"
    )