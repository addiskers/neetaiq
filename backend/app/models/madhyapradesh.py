from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class MadhyaPradeshElection(Base):
    __tablename__ = "madhyapradesh_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("MadhyaPradeshDistrict", back_populates="election")
    constituencies = relationship("MadhyaPradeshConstituency", back_populates="election")
    candidates = relationship("MadhyaPradeshCandidate", back_populates="election")


class MadhyaPradeshDistrict(Base):
    __tablename__ = "madhyapradesh_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("madhyapradesh_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("MadhyaPradeshElection", back_populates="districts")
    constituencies = relationship("MadhyaPradeshConstituency", back_populates="district")


class MadhyaPradeshConstituency(Base):
    __tablename__ = "madhyapradesh_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("madhyapradesh_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("madhyapradesh_districts.id"), nullable=False)
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

    election = relationship("MadhyaPradeshElection", back_populates="constituencies")
    district = relationship("MadhyaPradeshDistrict", back_populates="constituencies")
    candidates = relationship("MadhyaPradeshCandidate", back_populates="constituency")


class MadhyaPradeshParty(Base):
    __tablename__ = "madhyapradesh_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("MadhyaPradeshCandidate", back_populates="party")


class MadhyaPradeshCandidate(Base):
    __tablename__ = "madhyapradesh_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("madhyapradesh_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("madhyapradesh_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("madhyapradesh_parties.id"), nullable=True)
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

    election = relationship("MadhyaPradeshElection", back_populates="candidates")
    constituency = relationship("MadhyaPradeshConstituency", back_populates="candidates")
    party = relationship("MadhyaPradeshParty", back_populates="candidates")


# Aliases
Election = MadhyaPradeshElection
District = MadhyaPradeshDistrict
Constituency = MadhyaPradeshConstituency
Party = MadhyaPradeshParty
Candidate = MadhyaPradeshCandidate
