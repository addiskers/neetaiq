from pydantic import BaseModel
from typing import Optional, List


class StateOverview(BaseModel):
    state: str
    constituency_count: int
    total_electors: int
    swing_status: str = "Stable"  # Aggregate


class DistrictOverview(BaseModel):
    id: int
    name: str
    constituency_count: int
    total_electors: int
    total_polling_stations: int


class GenderDemographics(BaseModel):
    male_electors: int
    female_electors: int
    third_gender_electors: int
    total_electors: int
    male_pct: float
    female_pct: float
    third_gender_pct: float


class ResourceAllocation(BaseModel):
    safe: int
    swing: int
    volatile: int
    leaning: int
    stable: int


class DossierRow(BaseModel):
    id: int
    name: str
    constituency_name: str
    party_short_name: Optional[str] = None
    party_color: Optional[str] = None
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0


class CountdownResponse(BaseModel):
    days: int
    hours: int
    minutes: int
    seconds: int
    election_date: str


class ElectionStats(BaseModel):
    total_constituencies: int
    total_polling_stations: int
    total_electors: int
    total_candidates: int
    total_contesting: int
    total_parties: int
