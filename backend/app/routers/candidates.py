from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models.registry import models_dependency
from app.schemas.candidate import CandidateBrief, CandidateDetail, PartyOut

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _resolve_eid(election_id: Optional[int], db: Session, Election) -> int:
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
    exclude_nota: bool = Query(True),
    limit: int = Query(50),
    offset: int = Query(0),
    models=Depends(models_dependency),
    db: Session = Depends(get_db),
):
    Election, District, Constituency, Candidate, Party = models
    eid = _resolve_eid(election_id, db, Election)
    q = (
        db.query(Candidate)
        .options(joinedload(Candidate.party), joinedload(Candidate.constituency))
        .filter(Candidate.election_id == eid)
    )

    if exclude_nota:
        q = q.filter(Candidate.is_nota == False)

    if constituency:
        q = q.join(Constituency).filter(Constituency.name.ilike(f"%{constituency}%"))

    if party:
        q = q.join(Party).filter(
            (func.lower(Party.abbr) == party.lower()) |
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
            constituency_ac_no=c.constituency.ac_no,
            party_name=c.party.name if c.party else None,
            party_abbr=c.party.abbr if c.party else None,
            party_color=c.party.color if c.party else None,
            gender=c.gender,
            age=c.age,
            position=c.position,
            votes_total=c.votes_total,
            vote_pct=float(c.vote_pct) if c.vote_pct else None,
            is_nota=c.is_nota,
            declared_assets=c.declared_assets,
            liabilities=c.liabilities,
            criminal_cases=c.criminal_cases or 0,
            image_url=c.image_url,
        )
        for c in candidates
    ]


@router.get("/parties", response_model=List[PartyOut])
def list_parties(
    election_id: Optional[int] = None,
    models=Depends(models_dependency),
    db: Session = Depends(get_db),
):
    Election, District, Constituency, Candidate, Party = models
    eid = _resolve_eid(election_id, db, Election)
    party_ids = (
        db.query(func.distinct(Candidate.party_id))
        .filter(
            Candidate.election_id == eid,
            Candidate.is_nota == False,
            Candidate.party_id != None,
        )
        .all()
    )
    ids = [p[0] for p in party_ids]
    parties = db.query(Party).filter(Party.id.in_(ids)).order_by(Party.name).all()
    return parties


@router.get("/{candidate_id}", response_model=CandidateDetail)
def get_candidate(
    candidate_id: int,
    models=Depends(models_dependency),
    db: Session = Depends(get_db),
):
    Election, District, Constituency, Candidate, Party = models
    c = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.party),
            joinedload(Candidate.constituency).joinedload(Constituency.district),
        )
        .filter(Candidate.id == candidate_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return CandidateDetail(
        id=c.id,
        name=c.name,
        constituency_name=c.constituency.name,
        constituency_ac_no=c.constituency.ac_no,
        district_name=c.constituency.district.name,
        party_name=c.party.name if c.party else None,
        party_abbr=c.party.abbr if c.party else None,
        party_color=c.party.color if c.party else None,
        gender=c.gender,
        age=c.age,
        position=c.position,
        votes_general=c.votes_general,
        votes_postal=c.votes_postal,
        votes_total=c.votes_total,
        vote_pct=float(c.vote_pct) if c.vote_pct else None,
        is_nota=c.is_nota,
        education=c.education,
        occupation=c.occupation,
        declared_assets=c.declared_assets,
        liabilities=c.liabilities,
        criminal_cases=c.criminal_cases or 0,
        image_url=c.image_url,
    )
