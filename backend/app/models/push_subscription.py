from database import Base
from sqlalchemy import Column, Integer, String

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String, nullable=False) # 'farmer' or 'staff'
    endpoint = Column(String, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
