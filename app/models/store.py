from sqlalchemy import (
    Column,
    Integer,
    String
)

from sqlalchemy.orm import relationship

from app.database import Base

class Store(Base):

    __tablename__ = "stores"

    id = Column(Integer, primary_key=True)

    name = Column(String)
    address = Column(String)

    products = relationship(
        "Product",
        back_populates="store"
    )