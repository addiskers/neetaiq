from sqlalchemy import Column, Integer, BigInteger, String, Boolean, ForeignKey, Numeric, Date, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class AssamElection(Base):
    __tablename__ = "assam_elections"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    election_date = Column(Date)

    districts = relationship("AssamDistrict", back_populates="election")
    constituencies = relationship("AssamConstituency", back_populates="election")
    candidates = relationship("AssamCandidate", back_populates="election")


class AssamDistrict(Base):
    __tablename__ = "assam_districts"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("assam_elections.id"), nullable=False)
    name = Column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("election_id", "name"),)

    election = relationship("AssamElection", back_populates="districts")
    constituencies = relationship("AssamConstituency", back_populates="district")


class AssamConstituency(Base):
    __tablename__ = "assam_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("assam_elections.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("assam_districts.id"), nullable=False)
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

    election = relationship("AssamElection", back_populates="constituencies")
    district = relationship("AssamDistrict", back_populates="constituencies")
    candidates = relationship("AssamCandidate", back_populates="constituency")


class AssamParty(Base):
    __tablename__ = "assam_parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    abbr = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))

    candidates = relationship("AssamCandidate", back_populates="party")


class AssamDistrictMapping(Base):
    __tablename__ = "assam_district_mappings"

    id = Column(Integer, primary_key=True, index=True)
    district_2016_id = Column(Integer, ForeignKey("assam_districts.id"), nullable=True)
    district_2021_id = Column(Integer, ForeignKey("assam_districts.id"), nullable=True)
    district_2026_id = Column(Integer, ForeignKey("assam_districts.id"), nullable=True)

    district_2016 = relationship("AssamDistrict", foreign_keys=[district_2016_id])
    district_2021 = relationship("AssamDistrict", foreign_keys=[district_2021_id])
    district_2026 = relationship("AssamDistrict", foreign_keys=[district_2026_id])


class AssamCandidate(Base):
    __tablename__ = "assam_candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("assam_elections.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("assam_constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("assam_parties.id"), nullable=True)
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

    election = relationship("AssamElection", back_populates="candidates")
    constituency = relationship("AssamConstituency", back_populates="candidates")
    party = relationship("AssamParty", back_populates="candidates")


# Aliases so import scripts can use generic names
Election = AssamElection
District = AssamDistrict
Constituency = AssamConstituency
Party = AssamParty
Candidate = AssamCandidate
DistrictMapping = AssamDistrictMapping
