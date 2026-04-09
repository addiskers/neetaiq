from pydantic import BaseModel
from typing import Optional


class StateOverview(BaseModel):
    state: str
    constituency_count: int
    total_electors: int


class DistrictOverview(BaseModel):
    id: int
    name: str
    constituency_count: int
    total_electors: int


class DossierRow(BaseModel):
    id: int
    name: str
    constituency_name: str
    party_abbr: Optional[str] = None
    party_color: Optional[str] = None
    position: Optional[int] = None
    votes_total: Optional[int] = None
    vote_pct: Optional[float] = None
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0
    image_url: Optional[str] = None


class ElectionStats(BaseModel):
    total_constituencies: int
    total_electors: int
    total_candidates: int
    total_parties: int
