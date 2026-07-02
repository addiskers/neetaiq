from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class GujaratElection(Base):
    __tablename__ = "gujarat_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("GujaratDistrict", back_populates="election")
    constituencies = relationship("GujaratConstituency", back_populates="election")
    candidates = relationship("GujaratCandidate", back_populates="election")


class GujaratDistrict(Base):
    __tablename__ = "gujarat_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("gujarat_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("GujaratElection", back_populates="districts")
    constituencies = relationship("GujaratConstituency", back_populates="district")


class GujaratConstituency(Base):
    __tablename__ = "gujarat_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("gujarat_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("gujarat_districts.id"), nullable=False)
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

    election = relationship("GujaratElection", back_populates="constituencies")
    district = relationship("GujaratDistrict", back_populates="constituencies")
    candidates = relationship("GujaratCandidate", back_populates="constituency")


class GujaratParty(Base):
    __tablename__ = "gujarat_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("GujaratCandidate", back_populates="party")


class GujaratCandidate(Base):
    __tablename__ = "gujarat_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("gujarat_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("gujarat_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("gujarat_parties.id"), nullable=True)
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

    election = relationship("GujaratElection", back_populates="candidates")
    constituency = relationship("GujaratConstituency", back_populates="candidates")
    party = relationship("GujaratParty", back_populates="candidates")


Election = GujaratElection
District = GujaratDistrict
Constituency = GujaratConstituency
Party = GujaratParty
Candidate = GujaratCandidate
