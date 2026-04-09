from pydantic import BaseModel
from typing import Optional
from datetime import date


class ElectionOut(BaseModel):
    id: int
    state: str
    year: int
    type: str
    name: str
    election_date: Optional[date] = None

    class Config:
        from_attributes = True


class DistrictOut(BaseModel):
    id: int
    name: str
    constituency_count: int = 0

    class Config:
        from_attributes = True


class ConstituencyOut(BaseModel):
    id: int
    ac_no: int
    name: str
    district_name: str
    category: Optional[str] = None
    total_electors: Optional[int] = None
    total_votes_polled: Optional[int] = None
    turnout_pct: Optional[float] = None
    winning_margin: Optional[int] = None

    class Config:
        from_attributes = True


class ConstituencyBrief(BaseModel):
    id: int
    ac_no: int
    name: str
    district_name: str
    total_electors: Optional[int] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True
