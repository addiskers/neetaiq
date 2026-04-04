from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models import Election, Candidate, Party, Constituency, District
from app.schemas.candidate import (
    CandidateBrief, CandidateDetail, PartyOut,
    CriminalRecordOut, PoliticalAffiliationOut,
)

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _resolve_eid(election_id: Optional[int], db: Session) -> int:
    if election_id:
        return election_id
    e = db.query(Election).order_by(Election.id.desc()).first()
    return e.id if e else 1


@router.get("", response_model=List[CandidateBrief])
def list_candidates(
    election_id: Optional[int] = None,
    constituency: Optional[str] = None,
    party: Optional[str] = None,
    search: Optional[str] = None,
    contesting_only: bool = Query(True),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = (
        db.query(Candidate)
        .options(joinedload(Candidate.party), joinedload(Candidate.constituency))
        .filter(Candidate.election_id == eid)
    )

    if contesting_only:
        q = q.filter(Candidate.is_contesting == True)

    if constituency:
        q = q.join(Constituency).filter(
            Constituency.name.ilike(f"%{constituency}%")
        )

    if party:
        q = q.join(Party).filter(
            (func.lower(Party.short_name) == party.lower()) |
            (func.lower(Party.name).contains(party.lower()))
        )

    if search:
        q = q.filter(Candidate.name.ilike(f"%{search}%"))

    candidates = q.order_by(Candidate.name).offset(offset).limit(limit).all()

    return [
        CandidateBrief(
            id=c.id,
            name=c.name,
            constituency_name=c.constituency.name,
            constituency_ac_number=c.constituency.ac_number,
            party_name=c.party.name,
            party_short_name=c.party.short_name,
            party_color=c.party.color,
            status=c.status,
            is_contesting=c.is_contesting or False,
            age=c.age,
            declared_assets=c.declared_assets,
            liabilities=c.liabilities,
            criminal_cases=c.criminal_cases or 0,
        )
        for c in candidates
    ]


@router.get("/parties", response_model=List[PartyOut])
def list_parties(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List all parties with candidates in this election."""
    eid = _resolve_eid(election_id, db)
    party_ids = (
        db.query(func.distinct(Candidate.party_id))
        .filter(Candidate.election_id == eid, Candidate.is_contesting == True)
        .all()
    )
    ids = [p[0] for p in party_ids]
    parties = db.query(Party).filter(Party.id.in_(ids)).order_by(Party.name).all()
    return parties


@router.get("/{candidate_id}", response_model=CandidateDetail)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.party),
            joinedload(Candidate.constituency).joinedload(Constituency.district),
            joinedload(Candidate.criminal_records),
            joinedload(Candidate.political_affiliations),
        )
        .filter(Candidate.id == candidate_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    affiliations = [
        PoliticalAffiliationOut(
            id=a.id,
            party_name=a.party.name if a.party else "Unknown",
            party_short_name=a.party.short_name if a.party else None,
            start_year=a.start_year,
            end_year=a.end_year,
            is_current=a.is_current or False,
        )
        for a in c.political_affiliations
    ]

    criminal_records = [
        CriminalRecordOut(
            id=r.id,
            ipc_section=r.ipc_section,
            description=r.description,
            case_status=r.case_status,
            case_year=r.case_year,
        )
        for r in c.criminal_records
    ]

    return CandidateDetail(
        id=c.id,
        name=c.name,
        constituency_name=c.constituency.name,
        constituency_ac_number=c.constituency.ac_number,
        district_name=c.constituency.district.name,
        party_name=c.party.name,
        party_short_name=c.party.short_name,
        party_color=c.party.color,
        status=c.status,
        is_contesting=c.is_contesting or False,
        is_incumbent=c.is_incumbent or False,
        profile_url=c.profile_url,
        age=c.age,
        gender=c.gender,
        education=c.education,
        occupation=c.occupation,
        declared_assets=c.declared_assets,
        liabilities=c.liabilities,
        criminal_cases=c.criminal_cases or 0,
        approval_rating=float(c.approval_rating) if c.approval_rating else None,
        criminal_records=criminal_records,
        political_affiliations=affiliations,
    )
