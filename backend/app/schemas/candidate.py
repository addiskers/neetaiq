from pydantic import BaseModel
from typing import Optional


class PartyOut(BaseModel):
    id: int
    name: str
    abbr: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateBrief(BaseModel):
    id: int
    name: str
    constituency_name: str
    constituency_ac_no: int
    party_name: Optional[str] = None
    party_abbr: Optional[str] = None
    party_color: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    position: Optional[int] = None
    votes_total: Optional[int] = None
    vote_pct: Optional[float] = None
    is_nota: bool = False
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateDetail(BaseModel):
    id: int
    name: str
    constituency_name: str
    constituency_ac_no: int
    district_name: str
    party_name: Optional[str] = None
    party_abbr: Optional[str] = None
    party_color: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    position: Optional[int] = None
    votes_general: Optional[int] = None
    votes_postal: Optional[int] = None
    votes_total: Optional[int] = None
    vote_pct: Optional[float] = None
    is_nota: bool = False
    education: Optional[str] = None
    occupation: Optional[str] = None
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0
    image_url: Optional[str] = None

    class Config:
        from_attributes = True
