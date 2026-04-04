from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class PollingStation(Base):
    __tablename__ = "polling_stations"

    id = Column(Integer, primary_key=True, index=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=False)
    part_no = Column(Integer, nullable=False)
    name = Column(String(500), nullable=False)

    __table_args__ = (UniqueConstraint("constituency_id", "part_no"),)

    constituency = relationship("Constituency", back_populates="polling_stations")
