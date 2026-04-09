from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=True)  # NULL for NOTA
    name = Column(String(300), nullable=False)
    gender = Column(String(10))  # MALE/FEMALE
    age = Column(Integer)
    position = Column(Integer)  # rank by votes (1=winner)
    votes_general = Column(Integer)  # EVM votes
    votes_postal = Column(Integer)  # postal votes
    votes_total = Column(Integer)  # total votes
    vote_pct = Column(Numeric(5, 2))  # % of votes polled
    is_nota = Column(Boolean, default=False)
    # Affidavit data (2026+, NULL for older elections)
    education = Column(String(200))
    occupation = Column(String(300))
    declared_assets = Column(BigInteger)  # in rupees
    liabilities = Column(BigInteger)  # in rupees
    criminal_cases = Column(Integer, default=0)
    image_url = Column(Text)

    election = relationship("Election", back_populates="candidates")
    constituency = relationship("Constituency", back_populates="candidates")
    party = relationship("Party", back_populates="candidates")
