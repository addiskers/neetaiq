from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models import Candidate, Constituency, Party

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search(
    q: str = Query(..., min_length=2),
    type: Optional[str] = None,  # "candidate" or "constituency"
    election_id: int = Query(1),
    limit: int = Query(10),
    db: Session = Depends(get_db),
):
    results = {"candidates": [], "constituencies": []}

    if type is None or type == "constituency":
        constituencies = (
            db.query(Constituency)
            .filter(
                Constituency.election_id == election_id,
                Constituency.name.ilike(f"%{q}%"),
            )
            .limit(limit)
            .all()
        )
        results["constituencies"] = [
            {
                "id": c.id,
                "ac_number": c.ac_number,
                "name": c.name,
                "district": c.district.name,
                "total_electors": c.total_electors,
            }
            for c in constituencies
        ]

    if type is None or type == "candidate":
        candidates = (
            db.query(Candidate)
            .options(joinedload(Candidate.party), joinedload(Candidate.constituency))
            .filter(
                Candidate.election_id == election_id,
                Candidate.name.ilike(f"%{q}%"),
                Candidate.is_contesting == True,
            )
            .limit(limit)
            .all()
        )
        results["candidates"] = [
            {
                "id": c.id,
                "name": c.name,
                "party": c.party.short_name,
                "constituency": c.constituency.name,
            }
            for c in candidates
        ]

    return results
