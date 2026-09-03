from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class NagalandElection(Base):
    __tablename__ = "nagaland_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("NagalandDistrict", back_populates="election")
    constituencies = relationship("NagalandConstituency", back_populates="election")
    candidates = relationship("NagalandCandidate", back_populates="election")


class NagalandDistrict(Base):
    __tablename__ = "nagaland_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("nagaland_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("NagalandElection", back_populates="districts")
    constituencies = relationship("NagalandConstituency", back_populates="district")


class NagalandConstituency(Base):
    __tablename__ = "nagaland_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("nagaland_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("nagaland_districts.id"), nullable=False)
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

    election = relationship("NagalandElection", back_populates="constituencies")
    district = relationship("NagalandDistrict", back_populates="constituencies")
    candidates = relationship("NagalandCandidate", back_populates="constituency")


class NagalandParty(Base):
    __tablename__ = "nagaland_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("NagalandCandidate", back_populates="party")


class NagalandCandidate(Base):
    __tablename__ = "nagaland_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("nagaland_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("nagaland_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("nagaland_parties.id"), nullable=True)
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

    election = relationship("NagalandElection", back_populates="candidates")
    constituency = relationship("NagalandConstituency", back_populates="candidates")
    party = relationship("NagalandParty", back_populates="candidates")


# Aliases
Election = NagalandElection
District = NagalandDistrict
Constituency = NagalandConstituency
Party = NagalandParty
Candidate = NagalandCandidate
