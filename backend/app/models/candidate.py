from sqlalchemy import Column, Integer, String, Boolean, BigInteger, ForeignKey, Numeric, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    name = Column(String(300), nullable=False)
    status = Column(String(20), nullable=False)  # Accepted/Rejected/Withdrawn
    is_contesting = Column(Boolean, default=False)
    profile_url = Column(Text)
    age = Column(Integer)
    gender = Column(String(10))
    education = Column(String(100))
    occupation = Column(String(200))
    declared_assets = Column(BigInteger)  # in rupees
    liabilities = Column(BigInteger)
    criminal_cases = Column(Integer, default=0)
    is_incumbent = Column(Boolean, default=False)
    approval_rating = Column(Numeric(5, 2))
    category = Column(String(10))        # GEN/SC/ST
    votes = Column(Integer)              # total votes received
    vote_percentage = Column(Numeric(5, 2))  # % of votes polled
    position = Column(Integer)           # ranking (1=winner)
    created_at = Column(DateTime, server_default=func.now())

    election = relationship("Election", back_populates="candidates")
    constituency = relationship("Constituency", back_populates="candidates")
    party = relationship("Party", back_populates="candidates")
    criminal_records = relationship("CriminalRecord", back_populates="candidate")
    political_affiliations = relationship("PoliticalAffiliation", back_populates="candidate")


class CriminalRecord(Base):
    __tablename__ = "criminal_records"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    ipc_section = Column(String(100))
    description = Column(String(500))
    case_status = Column(String(50))  # Active/Disposed
    case_year = Column(Integer)

    candidate = relationship("Candidate", back_populates="criminal_records")


class PoliticalAffiliation(Base):
    __tablename__ = "political_affiliations"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    start_year = Column(Integer)
    end_year = Column(Integer)  # NULL = present
    is_current = Column(Boolean, default=False)

    candidate = relationship("Candidate", back_populates="political_affiliations")
    party = relationship("Party")
