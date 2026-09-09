from database import Base
from sqlalchemy import Column,Integer,String


class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer,primary_key=True,index=True)
    mobile_number = Column(String(15),unique=True,index=True,nullable=False)
    hashed_password = Column(String,nullable=False)
    full_name = Column(String,nullable=False)
    farmer_id = Column(String,unique=True,nullable=True)
    state = Column(String,nullable=False)
    village = Column(String,nullable=False)
    district = Column(String,nullable=False)