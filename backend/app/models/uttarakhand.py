"""SQLAlchemy models for Uttarakhand election data."""
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, UniqueConstraint, Date
from sqlalchemy.orm import relationship
from app.database import Base


class UKElection(Base):
    __tablename__ = "uk_elections"
    id            = Column(Integer, primary_key=True, index=True)
    state         = Column(String(100), nullable=False)
    year          = Column(Integer, nullable=False)
    type          = Column(String(50), default="Assembly")
    name          = Column(String(200))
    election_date = Column(Date, nullable=True)

    districts      = relationship("UKDistrict",      back_populates="election", cascade="all, delete-orphan")
    constituencies = relationship("UKConstituency",  back_populates="election", cascade="all, delete-orphan")
    candidates     = relationship("UKCandidate",     back_populates="election", cascade="all, delete-orphan")


class UKDistrict(Base):
    __tablename__ = "uk_districts"
    __table_args__ = (UniqueConstraint("election_id", "name"),)
    id          = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("uk_elections.id"), nullable=False)
    name        = Column(String(200), nullable=False)

    election       = relationship("UKElection",      back_populates="districts")
    constituencies = relationship("UKConstituency",  back_populates="district", cascade="all, delete-orphan")


class UKConstituency(Base):
    __tablename__ = "uk_constituencies"
    __table_args__ = (UniqueConstraint("election_id", "ac_no"),)
    id                    = Column(Integer, primary_key=True, index=True)
    election_id           = Column(Integer, ForeignKey("uk_elections.id"),  nullable=False)
    district_id           = Column(Integer, ForeignKey("uk_districts.id"),  nullable=True)
    ac_no                 = Column(Integer, nullable=False)
    name                  = Column(String(200))
    category              = Column(String(10), default="GEN")
    total_electors        = Column(Integer, nullable=True)
    male_electors         = Column(Integer, nullable=True)
    female_electors       = Column(Integer, nullable=True)
    third_gender_electors = Column(Integer, nullable=True)
    total_votes_polled    = Column(Integer, nullable=True)
    turnout_pct           = Column(Float,   nullable=True)
    winning_margin        = Column(Integer, nullable=True)

    election   = relationship("UKElection",      back_populates="constituencies")
    district   = relationship("UKDistrict",      back_populates="constituencies")
    candidates = relationship("UKCandidate",     back_populates="constituency", cascade="all, delete-orphan")


class UKParty(Base):
    __tablename__ = "uk_parties"
    id    = Column(Integer, primary_key=True, index=True)
    name  = Column(String(200), nullable=False)
    abbr  = Column(String(50),  unique=True, nullable=False)
    color = Column(String(20),  nullable=True)

    candidates = relationship("UKCandidate", back_populates="party")


class UKCandidate(Base):
    __tablename__ = "uk_candidates"
    id               = Column(Integer, primary_key=True, index=True)
    election_id      = Column(Integer, ForeignKey("uk_elections.id"),      nullable=False)
    constituency_id  = Column(Integer, ForeignKey("uk_constituencies.id"), nullable=False)
    party_id         = Column(Integer, ForeignKey("uk_parties.id"),        nullable=True)
    name             = Column(String(300), nullable=False)
    gender           = Column(String(10),  nullable=True)
    age              = Column(Integer, nullable=True)
    position         = Column(Integer, nullable=True)
    votes_general    = Column(Integer, default=0)
    votes_postal     = Column(Integer, default=0)
    votes_total      = Column(Integer, default=0)
    vote_pct         = Column(Float,   nullable=True)
    is_nota          = Column(Boolean, default=False)
    education        = Column(String(200), nullable=True)
    occupation       = Column(String(500), nullable=True)
    declared_assets  = Column(Float,   nullable=True)
    liabilities      = Column(Float,   nullable=True)
    criminal_cases   = Column(Integer, default=0)
    image_url        = Column(String(500), nullable=True)

    election      = relationship("UKElection",      back_populates="candidates")
    constituency  = relationship("UKConstituency",  back_populates="candidates")
    party         = relationship("UKParty",         back_populates="candidates")


Election     = UKElection
District     = UKDistrict
Constituency = UKConstituency
Party        = UKParty
Candidate    = UKCandidate
