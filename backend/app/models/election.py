from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    election_name = Column(String(200), nullable=False)
    election_type = Column(String(50), nullable=False)
    state = Column(String(100), nullable=False)
    election_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())

    districts = relationship("District", back_populates="election")
    constituencies = relationship("Constituency", back_populates="election")
    candidates = relationship("Candidate", back_populates="election")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    name = Column(String(200), nullable=False)
    name_previous = Column(String(200))
    rename_status = Column(String(50))

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("Election", back_populates="districts")
    constituencies = relationship("Constituency", back_populates="district")


class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    ac_number = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    total_polling_stations = Column(Integer)
    male_electors = Column(Integer)
    female_electors = Column(Integer)
    third_gender_electors = Column(Integer)
    total_electors = Column(Integer)
    swing_status = Column(String(20), default="Stable")
    ruling_party = Column(String(100))
    turnout_percentage = Column(Numeric(5, 2))
    total_votes = Column(Integer)
    winning_margin = Column(Integer)

    __table_args__ = (UniqueConstraint("election_id", "ac_number"),)

    election = relationship("Election", back_populates="constituencies")
    district = relationship("District", back_populates="constituencies")
    polling_stations = relationship("PollingStation", back_populates="constituency")
    candidates = relationship("Candidate", back_populates="constituency")
