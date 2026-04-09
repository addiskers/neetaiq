from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)  # "Assembly"
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("District", back_populates="election")
    constituencies = relationship("Constituency", back_populates="election")
    candidates = relationship("Candidate", back_populates="election")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("Election", back_populates="districts")
    constituencies = relationship("Constituency", back_populates="district")


class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    ac_no = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(10))  # GEN/SC/ST
    total_electors = Column(Integer)
    male_electors = Column(Integer)
    female_electors = Column(Integer)
    third_gender_electors = Column(Integer)
    total_polling_stations = Column(Integer)
    total_votes_polled = Column(Integer)
    turnout_pct = Column(Numeric(5, 2))
    winning_margin = Column(Integer)

    __table_args__ = (UniqueConstraint("election_id", "ac_no"),)

    election = relationship("Election", back_populates="constituencies")
    district = relationship("District", back_populates="constituencies")
    candidates = relationship("Candidate", back_populates="constituency")


class DistrictMapping(Base):
    """Links districts across election years (same row in mapping file)."""
    __tablename__ = "district_mappings"

    id = Column(Integer, primary_key=True, index=True)
    district_2016_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    district_2021_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    district_2026_id = Column(Integer, ForeignKey("districts.id"), nullable=True)

    district_2016 = relationship("District", foreign_keys=[district_2016_id])
    district_2021 = relationship("District", foreign_keys=[district_2021_id])
    district_2026 = relationship("District", foreign_keys=[district_2026_id])
