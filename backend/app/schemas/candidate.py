from pydantic import BaseModel
from typing import Optional, List


class PartyOut(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class CriminalRecordOut(BaseModel):
    id: int
    ipc_section: Optional[str] = None
    description: Optional[str] = None
    case_status: Optional[str] = None
    case_year: Optional[int] = None

    class Config:
        from_attributes = True


class PoliticalAffiliationOut(BaseModel):
    id: int
    party_name: str
    party_short_name: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    is_current: bool = False

    class Config:
        from_attributes = True


class CandidateBrief(BaseModel):
    id: int
    name: str
    constituency_name: str
    constituency_ac_number: int
    party_name: str
    party_short_name: Optional[str] = None
    party_color: Optional[str] = None
    status: str
    is_contesting: bool
    age: Optional[int] = None
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0

    class Config:
        from_attributes = True


class CandidateDetail(BaseModel):
    id: int
    name: str
    constituency_name: str
    constituency_ac_number: int
    district_name: str
    party_name: str
    party_short_name: Optional[str] = None
    party_color: Optional[str] = None
    status: str
    is_contesting: bool
    is_incumbent: bool = False
    profile_url: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    declared_assets: Optional[int] = None
    liabilities: Optional[int] = None
    criminal_cases: int = 0
    approval_rating: Optional[float] = None
    criminal_records: List[CriminalRecordOut] = []
    political_affiliations: List[PoliticalAffiliationOut] = []

    class Config:
        from_attributes = True
