from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class HaryanaElection(Base):
    __tablename__ = "haryana_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("HaryanaDistrict", back_populates="election")
    constituencies = relationship("HaryanaConstituency", back_populates="election")
    candidates = relationship("HaryanaCandidate", back_populates="election")


class HaryanaDistrict(Base):
    __tablename__ = "haryana_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("haryana_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("HaryanaElection", back_populates="districts")
    constituencies = relationship("HaryanaConstituency", back_populates="district")


class HaryanaConstituency(Base):
    __tablename__ = "haryana_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("haryana_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("haryana_districts.id"), nullable=False)
    ac_no = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(10))
    total_electors = Column(Integer)
    male_electors = Column(Integer)
    female_electors = Column(Integer)
    third_gender_electors = Column(Integer)
    total_polling_stations = Column(Integer)
    total_votes_polled = Column(Integer)
    turnout_pct = Column(Numeric(5, 2))
    winning_margin = Column(Integer)

    __table_args__ = (UniqueConstraint("election_id", "ac_no"),)

    election = relationship("HaryanaElection", back_populates="constituencies")
    district = relationship("HaryanaDistrict", back_populates="constituencies")
    candidates = relationship("HaryanaCandidate", back_populates="constituency")


class HaryanaParty(Base):
    __tablename__ = "haryana_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("HaryanaCandidate", back_populates="party")


class HaryanaCandidate(Base):
    __tablename__ = "haryana_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("haryana_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("haryana_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("haryana_parties.id"), nullable=True)
    name = Column(String(300), nullable=False)
    gender = Column(String(10))
    age = Column(Integer)
    position = Column(Integer)
    votes_general = Column(Integer)
    votes_postal = Column(Integer)
    votes_total = Column(Integer)
    vote_pct = Column(Numeric(5, 2))
    is_nota = Column(Boolean, default=False)
    education = Column(String(200))
    occupation = Column(String(300))
    declared_assets = Column(BigInteger)
    liabilities = Column(BigInteger)
    criminal_cases = Column(Integer, default=0)
    image_url = Column(Text)

    election = relationship("HaryanaElection", back_populates="candidates")
    constituency = relationship("HaryanaConstituency", back_populates="candidates")
    party = relationship("HaryanaParty", back_populates="candidates")


# Aliases
Election = HaryanaElection
District = HaryanaDistrict
Constituency = HaryanaConstituency
Party = HaryanaParty
Candidate = HaryanaCandidate
