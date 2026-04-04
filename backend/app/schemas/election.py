from pydantic import BaseModel
from typing import Optional
from datetime import date


class ElectionOut(BaseModel):
    id: int
    year: int
    election_name: str
    election_type: str
    state: str
    election_date: Optional[date] = None

    class Config:
        from_attributes = True


class DistrictOut(BaseModel):
    id: int
    name: str
    name_previous: Optional[str] = None
    rename_status: Optional[str] = None
    constituency_count: int = 0

    class Config:
        from_attributes = True


class ConstituencyOut(BaseModel):
    id: int
    ac_number: int
    name: str
    district_name: str
    total_polling_stations: Optional[int] = None
    male_electors: Optional[int] = None
    female_electors: Optional[int] = None
    third_gender_electors: Optional[int] = None
    total_electors: Optional[int] = None
    swing_status: Optional[str] = "Stable"
    ruling_party: Optional[str] = None
    turnout_percentage: Optional[float] = None

    class Config:
        from_attributes = True


class ConstituencyBrief(BaseModel):
    id: int
    ac_number: int
    name: str
    district_name: str
    total_electors: Optional[int] = None
    swing_status: Optional[str] = "Stable"

    class Config:
        from_attributes = True
