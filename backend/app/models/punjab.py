from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class PunjabElection(Base):
    __tablename__ = "punjab_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("PunjabDistrict", back_populates="election")
    constituencies = relationship("PunjabConstituency", back_populates="election")
    candidates = relationship("PunjabCandidate", back_populates="election")


class PunjabDistrict(Base):
    __tablename__ = "punjab_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("punjab_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("PunjabElection", back_populates="districts")
    constituencies = relationship("PunjabConstituency", back_populates="district")


class PunjabConstituency(Base):
    __tablename__ = "punjab_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("punjab_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("punjab_districts.id"), nullable=False)
    ac_no = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(10))
    total_electors = Column(Integer)
    male_electors = Column(Integer)
    female_electors = Column(Integer)
    third_gender_electors = Column(Integer)
    total_votes_polled = Column(Integer)
    turnout_pct = Column(Numeric(5, 2))
    winning_margin = Column(Integer)

    __table_args__ = (UniqueConstraint("election_id", "ac_no"),)

    election = relationship("PunjabElection", back_populates="constituencies")
    district = relationship("PunjabDistrict", back_populates="constituencies")
    candidates = relationship("PunjabCandidate", back_populates="constituency")


class PunjabParty(Base):
    __tablename__ = "punjab_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("PunjabCandidate", back_populates="party")


class PunjabCandidate(Base):
    __tablename__ = "punjab_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("punjab_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("punjab_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("punjab_parties.id"), nullable=True)
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

    election = relationship("PunjabElection", back_populates="candidates")
    constituency = relationship("PunjabConstituency", back_populates="candidates")
    party = relationship("PunjabParty", back_populates="candidates")


Election = PunjabElection
District = PunjabDistrict
Constituency = PunjabConstituency
Party = PunjabParty
Candidate = PunjabCandidate
