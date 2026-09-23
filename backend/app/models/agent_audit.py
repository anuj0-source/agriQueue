from database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

class AgentAuditLog(Base):
    __tablename__ = "agent_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    role = Column(String(50), nullable=True, index=True)  # farmer, staff, admin, anonymous
    raw_query = Column(Text, nullable=False)
    language = Column(String(20), default="en")  # en, hi, hinglish
    intent = Column(String(100), nullable=True)
    action_type = Column(String(50), nullable=True)  # query, staged_action, executed_action, unauthorized
    parameters = Column(Text, nullable=True)  # JSON-encoded parameters
    status = Column(String(50), default="success")  # success, requires_confirmation, confirmed, rejected, failed
    response_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
