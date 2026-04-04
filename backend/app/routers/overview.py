from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models import Election, District, Constituency, Candidate, Party, PollingStation
from app.schemas.overview import (
    StateOverview, DistrictOverview, GenderDemographics,
    ResourceAllocation, DossierRow, CountdownResponse, ElectionStats,
)
from app.schemas.election import ElectionOut, DistrictOut, ConstituencyOut, ConstituencyBrief
from app.config import ELECTION_DATE

router = APIRouter(prefix="/api/overview", tags=["overview"])


def _resolve_eid(election_id: Optional[int], db: Session) -> int:
    if election_id:
        return election_id
    e = db.query(Election).order_by(Election.id.desc()).first()
    return e.id if e else 1


def _filter_constituencies(
    db: Session, eid: int,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
):
    """Get filtered constituency IDs based on district/AC selection."""
    q = db.query(Constituency).filter(Constituency.election_id == eid)
    if ac_number:
        q = q.filter(Constituency.ac_number == ac_number)
    elif district:
        q = q.join(District).filter(func.lower(District.name) == district.lower())
    return q.all()


@router.get("/elections", response_model=List[ElectionOut])
def list_elections(db: Session = Depends(get_db)):
    return db.query(Election).all()


@router.get("/states", response_model=List[StateOverview])
def list_states(db: Session = Depends(get_db)):
    elections = db.query(Election).all()
    results = []
    for e in elections:
        total = db.query(func.sum(Constituency.total_electors)).filter(
            Constituency.election_id == e.id
        ).scalar() or 0
        count = db.query(Constituency).filter(Constituency.election_id == e.id).count()
        results.append(StateOverview(
            state=e.state,
            constituency_count=count,
            total_electors=total,
            swing_status="Volatile",
        ))
    return results


@router.get("/districts", response_model=List[DistrictOverview])
def list_districts(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    districts = db.query(District).filter(District.election_id == eid).all()
    results = []
    for d in districts:
        constituencies = db.query(Constituency).filter(Constituency.district_id == d.id).all()
        total_electors = sum(c.total_electors or 0 for c in constituencies)
        total_ps = sum(c.total_polling_stations or 0 for c in constituencies)
        results.append(DistrictOverview(
            id=d.id,
            name=d.name,
            constituency_count=len(constituencies),
            total_electors=total_electors,
            total_polling_stations=total_ps,
        ))
    return sorted(results, key=lambda x: x.name)


@router.get("/constituencies", response_model=List[ConstituencyBrief])
def list_constituencies(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    party: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(Constituency).filter(Constituency.election_id == eid)

    if district:
        q = q.join(District).filter(func.lower(District.name) == district.lower())

    if search:
        q = q.filter(Constituency.name.ilike(f"%{search}%"))

    constituencies = q.order_by(Constituency.ac_number).all()

    if party:
        party_obj = db.query(Party).filter(
            (func.lower(Party.short_name) == party.lower()) |
            (func.lower(Party.name) == party.lower())
        ).first()
        if party_obj:
            constituency_ids = {c.constituency_id for c in db.query(Candidate).filter(
                Candidate.party_id == party_obj.id,
                Candidate.election_id == eid,
                Candidate.is_contesting == True,
            ).all()}
            constituencies = [c for c in constituencies if c.id in constituency_ids]

    return [
        ConstituencyBrief(
            id=c.id,
            ac_number=c.ac_number,
            name=c.name,
            district_name=c.district.name,
            total_electors=c.total_electors,
            swing_status=c.swing_status or "Stable",
        )
        for c in constituencies
    ]


@router.get("/constituencies/{ac_number}", response_model=ConstituencyOut)
def get_constituency(ac_number: int, election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    c = db.query(Constituency).filter(
        Constituency.ac_number == ac_number,
        Constituency.election_id == eid,
    ).first()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Constituency not found")
    return ConstituencyOut(
        id=c.id,
        ac_number=c.ac_number,
        name=c.name,
        district_name=c.district.name,
        total_polling_stations=c.total_polling_stations,
        male_electors=c.male_electors,
        female_electors=c.female_electors,
        third_gender_electors=c.third_gender_electors,
        total_electors=c.total_electors,
        swing_status=c.swing_status,
        ruling_party=c.ruling_party,
        turnout_percentage=float(c.turnout_percentage) if c.turnout_percentage else None,
    )


@router.get("/demographics", response_model=GenderDemographics)
def get_demographics(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(
        func.sum(Constituency.male_electors),
        func.sum(Constituency.female_electors),
        func.sum(Constituency.third_gender_electors),
        func.sum(Constituency.total_electors),
    ).filter(Constituency.election_id == eid)
    if ac_number:
        q = q.filter(Constituency.ac_number == ac_number)
    elif district:
        q = q.join(District).filter(func.lower(District.name) == district.lower())
    result = q.first()

    male, female, third, total = result
    male = male or 0
    female = female or 0
    third = third or 0
    total = total or 1

    return GenderDemographics(
        male_electors=male,
        female_electors=female,
        third_gender_electors=third,
        total_electors=total,
        male_pct=round(male / total * 100, 1),
        female_pct=round(female / total * 100, 1),
        third_gender_pct=round(third / total * 100, 2),
    )


@router.get("/resource-allocation", response_model=ResourceAllocation)
def get_resource_allocation(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    constituencies = db.query(Constituency).filter(Constituency.election_id == eid).all()
    counts = {"Safe": 0, "Swing": 0, "Volatile": 0, "Leaning": 0, "Stable": 0}
    for c in constituencies:
        status = c.swing_status or "Stable"
        counts[status] = counts.get(status, 0) + 1
    return ResourceAllocation(
        safe=counts.get("Safe", 0),
        swing=counts.get("Swing", 0),
        volatile=counts.get("Volatile", 0),
        leaning=counts.get("Leaning", 0),
        stable=counts.get("Stable", 0),
    )


@router.get("/dossier-table", response_model=List[DossierRow])
def get_dossier_table(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    limit: int = Query(20),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(Candidate.election_id == eid, Candidate.is_contesting == True)
    if ac_number or district:
        cs = _filter_constituencies(db, eid, district, ac_number)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.order_by(Candidate.name).offset(offset).limit(limit).all()
    return [
        DossierRow(
            id=c.id,
            name=c.name,
            constituency_name=c.constituency.name,
            party_short_name=c.party.short_name,
            party_color=c.party.color,
            declared_assets=c.declared_assets,
            liabilities=c.liabilities,
            criminal_cases=c.criminal_cases or 0,
        )
        for c in candidates
    ]


@router.get("/countdown", response_model=CountdownResponse)
def get_countdown(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    election = db.query(Election).filter(Election.id == eid).first()
    if election and election.election_date:
        target = datetime.combine(election.election_date, datetime.min.time())
    else:
        target = datetime.strptime(ELECTION_DATE, "%Y-%m-%d")
    now = datetime.now()
    delta = target - now
    total_seconds = max(int(delta.total_seconds()), 0)
    is_past = delta.total_seconds() < 0
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return CountdownResponse(
        days=days, hours=hours, minutes=minutes, seconds=seconds,
        election_date=str(election.election_date) if election and election.election_date else ELECTION_DATE,
    )


@router.get("/category-mix")
def get_category_mix(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Candidate category breakdown (GEN/SC/ST) for pie chart."""
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid,
        Candidate.is_contesting == True,
        Candidate.category != None,
    )
    if ac_number or district:
        cs = _filter_constituencies(db, eid, district, ac_number)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))

    candidates = q.all()
    cats: dict = {}
    for c in candidates:
        cat = c.category or "GENERAL"
        cats[cat] = cats.get(cat, 0) + 1

    total = sum(cats.values()) or 1
    return [
        {
            "category": k,
            "count": v,
            "percentage": round(v / total * 100, 1),
        }
        for k, v in sorted(cats.items())
    ]


@router.get("/stats", response_model=ElectionStats)
def get_stats(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    cs = _filter_constituencies(db, eid, district, ac_number)
    c_ids = [c.id for c in cs]

    total_ps = sum(c.total_polling_stations or 0 for c in cs)
    total_electors = sum(c.total_electors or 0 for c in cs)

    cand_q = db.query(Candidate).filter(Candidate.election_id == eid)
    if c_ids:
        cand_q = cand_q.filter(Candidate.constituency_id.in_(c_ids))

    total_candidates = cand_q.count()
    total_contesting = cand_q.filter(Candidate.is_contesting == True).count()
    total_parties = db.query(func.count(func.distinct(Candidate.party_id))).filter(
        Candidate.election_id == eid,
        Candidate.constituency_id.in_(c_ids) if c_ids else True,
    ).scalar() or 0

    return ElectionStats(
        total_constituencies=len(cs),
        total_polling_stations=total_ps,
        total_electors=total_electors,
        total_candidates=total_candidates,
        total_contesting=total_contesting,
        total_parties=total_parties,
    )


@router.get("/turnout-by-constituency")
def get_turnout_by_constituency(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Constituency-wise turnout % for bar chart."""
    eid = _resolve_eid(election_id, db)
    cs = (
        db.query(Constituency)
        .filter(Constituency.election_id == eid, Constituency.turnout_percentage != None)
        .order_by(Constituency.ac_number)
        .all()
    )
    return [
        {
            "ac_number": c.ac_number,
            "name": c.name,
            "district": c.district.name,
            "turnout": float(c.turnout_percentage) if c.turnout_percentage else 0,
            "total_electors": c.total_electors,
            "total_votes": c.total_votes,
            "winning_margin": c.winning_margin,
            "ruling_party": c.ruling_party,
        }
        for c in cs
    ]


@router.get("/turnout-by-district")
def get_turnout_by_district(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """District-wise aggregated turnout for bar chart."""
    eid = _resolve_eid(election_id, db)
    q = db.query(District).filter(District.election_id == eid)
    if district:
        q = q.filter(func.lower(District.name) == district.lower())
    districts_db = q.all()
    result = []
    for d in districts_db:
        cs = db.query(Constituency).filter(Constituency.district_id == d.id).all()
        total_electors = sum(c.total_electors or 0 for c in cs)
        total_votes = sum(c.total_votes or 0 for c in cs)
        turnout = round(total_votes / total_electors * 100, 1) if total_electors > 0 else 0
        result.append({
            "district": d.name,
            "total_electors": total_electors,
            "total_votes": total_votes,
            "turnout": turnout,
            "constituency_count": len(cs),
        })
    return sorted(result, key=lambda x: x["turnout"], reverse=True)


@router.get("/party-performance")
def get_party_performance(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Party-wise vote share and seats won."""
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(Candidate.election_id == eid, Candidate.is_contesting == True)
    if ac_number or district:
        cs = _filter_constituencies(db, eid, district, ac_number)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.all()
    party_data: dict = {}
    for c in candidates:
        pid = c.party_id
        if pid not in party_data:
            party_data[pid] = {
                "party": c.party.name,
                "short_name": c.party.short_name,
                "color": c.party.color,
                "seats_contested": 0,
                "seats_won": 0,
                "total_votes": 0,
            }
        party_data[pid]["seats_contested"] += 1
        party_data[pid]["total_votes"] += c.votes or 0
        if c.position == 1:
            party_data[pid]["seats_won"] += 1

    total_votes = sum(p["total_votes"] for p in party_data.values())
    result = []
    for p in party_data.values():
        p["vote_share"] = round(p["total_votes"] / total_votes * 100, 2) if total_votes > 0 else 0
        result.append(p)
    return sorted(result, key=lambda x: x["total_votes"], reverse=True)


@router.get("/vote-margin-distribution")
def get_margin_distribution(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_number: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Distribution of winning margins across constituencies."""
    eid = _resolve_eid(election_id, db)
    filtered = _filter_constituencies(db, eid, district, ac_number)
    cs = [c for c in filtered if c.winning_margin is not None]
    buckets = {"< 5K": 0, "5K-15K": 0, "15K-30K": 0, "30K-50K": 0, "> 50K": 0}
    for c in cs:
        m = c.winning_margin or 0
        if m < 5000:
            buckets["< 5K"] += 1
        elif m < 15000:
            buckets["5K-15K"] += 1
        elif m < 30000:
            buckets["15K-30K"] += 1
        elif m < 50000:
            buckets["30K-50K"] += 1
        else:
            buckets["> 50K"] += 1
    return [{"range": k, "count": v} for k, v in buckets.items()]
