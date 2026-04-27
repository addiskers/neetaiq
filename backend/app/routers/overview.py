from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models import Election, District, Constituency, Candidate, Party
from app.schemas.overview import (
    StateOverview, DistrictOverview, DossierRow, ElectionStats,
)
from app.schemas.election import ElectionOut, ConstituencyOut, ConstituencyBrief

router = APIRouter(prefix="/api/overview", tags=["overview"])


def _resolve_eid(election_id: Optional[int], db: Session) -> int:
    if election_id:
        return election_id
    e = db.query(Election).order_by(Election.id.desc()).first()
    return e.id if e else 1


def _filter_constituencies(
    db: Session, eid: int,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
):
    q = db.query(Constituency).filter(Constituency.election_id == eid)
    if ac_no:
        q = q.filter(Constituency.ac_no == ac_no)
    elif district:
        q = q.join(District).filter(func.lower(District.name) == district.lower())
    return q.all()


@router.get("/elections", response_model=List[ElectionOut])
def list_elections(db: Session = Depends(get_db)):
    return db.query(Election).all()


@router.get("/countdown")
def get_countdown(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Countdown to election date."""
    from datetime import datetime, date
    eid = _resolve_eid(election_id, db)
    election = db.query(Election).filter(Election.id == eid).first()
    if not election or not election.election_date:
        return {"has_countdown": False}

    now = datetime.now()
    target = datetime.combine(election.election_date, datetime.min.time().replace(hour=7))  # 7 AM poll start
    diff = target - now

    if diff.total_seconds() <= 0:
        return {
            "has_countdown": False,
            "is_past": True,
            "election_date": election.election_date.isoformat(),
            "days_ago": abs(diff.days),
        }

    total_seconds = int(diff.total_seconds())
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    return {
        "has_countdown": True,
        "is_past": False,
        "election_date": election.election_date.isoformat(),
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
    }


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
        results.append(DistrictOverview(
            id=d.id,
            name=d.name,
            constituency_count=len(constituencies),
            total_electors=total_electors,
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

    constituencies = q.order_by(Constituency.ac_no).all()

    if party:
        party_obj = db.query(Party).filter(
            (func.lower(Party.abbr) == party.lower()) |
            (func.lower(Party.name) == party.lower())
        ).first()
        if party_obj:
            constituency_ids = {c.constituency_id for c in db.query(Candidate).filter(
                Candidate.party_id == party_obj.id,
                Candidate.election_id == eid,
                Candidate.is_nota == False,
            ).all()}
            constituencies = [c for c in constituencies if c.id in constituency_ids]

    return [
        ConstituencyBrief(
            id=c.id,
            ac_no=c.ac_no,
            name=c.name,
            district_name=c.district.name,
            total_electors=c.total_electors,
            category=c.category,
        )
        for c in constituencies
    ]


@router.get("/constituencies/{ac_no}", response_model=ConstituencyOut)
def get_constituency(ac_no: int, election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    c = db.query(Constituency).filter(
        Constituency.ac_no == ac_no,
        Constituency.election_id == eid,
    ).first()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Constituency not found")
    return ConstituencyOut(
        id=c.id,
        ac_no=c.ac_no,
        name=c.name,
        district_name=c.district.name,
        category=c.category,
        total_electors=c.total_electors,
        total_votes_polled=c.total_votes_polled,
        turnout_pct=float(c.turnout_pct) if c.turnout_pct else None,
        winning_margin=c.winning_margin,
    )


@router.get("/dossier-table", response_model=List[DossierRow])
def get_dossier_table(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    limit: int = Query(20),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid,
        Candidate.is_nota == False,
    )
    if ac_no or district:
        cs = _filter_constituencies(db, eid, district, ac_no)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.order_by(Candidate.name).offset(offset).limit(limit).all()
    return [
        DossierRow(
            id=c.id,
            name=c.name,
            constituency_name=c.constituency.name,
            party_abbr=c.party.abbr if c.party else None,
            party_color=c.party.color if c.party else None,
            position=c.position,
            votes_total=c.votes_total,
            vote_pct=float(c.vote_pct) if c.vote_pct else None,
            declared_assets=c.declared_assets,
            liabilities=c.liabilities,
            criminal_cases=c.criminal_cases or 0,
            image_url=c.image_url,
        )
        for c in candidates
    ]


@router.get("/stats", response_model=ElectionStats)
def get_stats(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    cs = _filter_constituencies(db, eid, district, ac_no)
    c_ids = [c.id for c in cs]

    total_electors = sum(c.total_electors or 0 for c in cs)

    cand_q = db.query(Candidate).filter(
        Candidate.election_id == eid,
        Candidate.is_nota == False,
    )
    if c_ids:
        cand_q = cand_q.filter(Candidate.constituency_id.in_(c_ids))

    total_candidates = cand_q.count()
    total_parties = db.query(func.count(func.distinct(Candidate.party_id))).filter(
        Candidate.election_id == eid,
        Candidate.is_nota == False,
        Candidate.constituency_id.in_(c_ids) if c_ids else True,
    ).scalar() or 0

    return ElectionStats(
        total_constituencies=len(cs),
        total_electors=total_electors,
        total_candidates=total_candidates,
        total_parties=total_parties,
    )


@router.get("/category-mix")
def get_category_mix(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Constituency category breakdown (GEN/SC/ST) for pie chart."""
    eid = _resolve_eid(election_id, db)
    cs = _filter_constituencies(db, eid, district, ac_no)
    cats: dict = {}
    for c in cs:
        cat = c.category or "GEN"
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


@router.get("/turnout-by-constituency")
def get_turnout_by_constituency(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    eid = _resolve_eid(election_id, db)
    cs = (
        db.query(Constituency)
        .filter(Constituency.election_id == eid, Constituency.turnout_pct != None)
        .order_by(Constituency.ac_no)
        .all()
    )
    return [
        {
            "ac_no": c.ac_no,
            "name": c.name,
            "district": c.district.name,
            "turnout": float(c.turnout_pct) if c.turnout_pct else 0,
            "total_electors": c.total_electors,
            "total_votes_polled": c.total_votes_polled,
            "winning_margin": c.winning_margin,
        }
        for c in cs
    ]


@router.get("/turnout-by-district")
def get_turnout_by_district(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(District).filter(District.election_id == eid)
    if district:
        q = q.filter(func.lower(District.name) == district.lower())
    districts_db = q.all()
    result = []
    for d in districts_db:
        cs = db.query(Constituency).filter(Constituency.district_id == d.id).all()
        total_electors = sum(c.total_electors or 0 for c in cs)
        total_votes = sum(c.total_votes_polled or 0 for c in cs)
        turnout = round(total_votes / total_electors * 100, 1) if total_electors > 0 else 0
        result.append({
            "district": d.name,
            "total_electors": total_electors,
            "total_votes_polled": total_votes,
            "turnout": turnout,
            "constituency_count": len(cs),
        })
    return sorted(result, key=lambda x: x["turnout"], reverse=True)


@router.get("/party-performance")
def get_party_performance(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid,
        Candidate.is_nota == False,
    )
    if ac_no or district:
        cs = _filter_constituencies(db, eid, district, ac_no)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.all()
    party_data: dict = {}
    for c in candidates:
        pid = c.party_id
        if pid not in party_data:
            party_data[pid] = {
                "party": c.party.name,
                "abbr": c.party.abbr,
                "color": c.party.color,
                "seats_contested": 0,
                "seats_won": 0,
                "total_votes": 0,
            }
        party_data[pid]["seats_contested"] += 1
        party_data[pid]["total_votes"] += c.votes_total or 0
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
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    filtered = _filter_constituencies(db, eid, district, ac_no)
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


@router.get("/ac-results")
def get_ac_results(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Winning party per AC for map coloring."""
    eid = _resolve_eid(election_id, db)
    constituencies = db.query(Constituency).filter(Constituency.election_id == eid).all()
    result = []
    for c in constituencies:
        winner = db.query(Candidate).filter(
            Candidate.constituency_id == c.id, Candidate.position == 1, Candidate.is_nota == False
        ).first()
        result.append({
            "ac_no": c.ac_no,
            "name": c.name,
            "district": c.district.name,
            "winner": winner.name if winner else None,
            "party": winner.party.abbr if winner and winner.party else None,
            "party_color": winner.party.color if winner and winner.party else None,
            "votes": winner.votes_total if winner else None,
            "margin": c.winning_margin,
        })
    return result


@router.get("/historical-wave")
def get_historical_wave(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Party seats across all elections for the same state, for line/area chart."""
    eid = _resolve_eid(election_id, db)
    current = db.query(Election).filter(Election.id == eid).first()
    state = current.state if current else "Assam"
    elections = db.query(Election).filter(Election.state == state).order_by(Election.year).all()
    # Get top parties by total seats across all elections
    all_parties = set()
    data_by_year = {}
    for e in elections:
        winners = db.query(Candidate).filter(
            Candidate.election_id == e.id, Candidate.position == 1, Candidate.is_nota == False
        ).all()
        party_seats = {}
        for w in winners:
            abbr = w.party.abbr if w.party else "IND"
            party_seats[abbr] = party_seats.get(abbr, 0) + 1
            all_parties.add(abbr)
        data_by_year[e.year] = party_seats

    # For 2026 (no results), use candidate count per party as "contested"
    for e in elections:
        if e.year not in data_by_year or not data_by_year[e.year]:
            candidates = db.query(Candidate).filter(
                Candidate.election_id == e.id, Candidate.is_nota == False
            ).all()
            party_counts = {}
            for c in candidates:
                abbr = c.party.abbr if c.party else "IND"
                party_counts[abbr] = party_counts.get(abbr, 0) + 1
                all_parties.add(abbr)
            data_by_year[e.year] = {"_contested": party_counts}

    # Build series for top parties
    top_parties = sorted(all_parties, key=lambda p: sum(
        data_by_year.get(e.year, {}).get(p, 0) for e in elections
    ), reverse=True)[:6]

    result = []
    for e in elections:
        entry = {"year": e.year}
        for p in top_parties:
            entry[p] = data_by_year.get(e.year, {}).get(p, 0)
        result.append(entry)

    return {"data": result, "parties": top_parties}


@router.get("/closest-contests")
def get_closest_contests(
    election_id: Optional[int] = None,
    limit: int = Query(10),
    db: Session = Depends(get_db),
):
    """Constituencies with smallest winning margins."""
    eid = _resolve_eid(election_id, db)
    cs = (
        db.query(Constituency)
        .filter(
            Constituency.election_id == eid,
            Constituency.winning_margin != None,
            Constituency.winning_margin > 0,
        )
        .order_by(Constituency.winning_margin)
        .limit(limit)
        .all()
    )
    result = []
    for c in cs:
        winner = db.query(Candidate).filter(
            Candidate.constituency_id == c.id, Candidate.position == 1, Candidate.is_nota == False
        ).first()
        runner = db.query(Candidate).filter(
            Candidate.constituency_id == c.id, Candidate.position == 2, Candidate.is_nota == False
        ).first()
        result.append({
            "name": c.name,
            "margin": c.winning_margin,
            "winner": winner.name if winner else None,
            "winner_party": winner.party.abbr if winner and winner.party else None,
            "winner_votes": winner.votes_total if winner else None,
            "runner": runner.name if runner else None,
            "runner_party": runner.party.abbr if runner and runner.party else None,
            "runner_votes": runner.votes_total if runner else None,
        })
    return result


@router.get("/nota-impact")
def get_nota_impact(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """NOTA votes vs winning margin per constituency."""
    eid = _resolve_eid(election_id, db)
    cs = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.winning_margin != None,
    ).all()

    result = []
    for c in cs:
        nota = db.query(Candidate).filter(
            Candidate.constituency_id == c.id, Candidate.is_nota == True
        ).first()
        nota_votes = nota.votes_total if nota else 0
        nota_pct = round(nota_votes / c.total_votes_polled * 100, 2) if c.total_votes_polled else 0
        result.append({
            "name": c.name,
            "margin": c.winning_margin,
            "nota_votes": nota_votes,
            "nota_pct": nota_pct,
            "danger": nota_votes > c.winning_margin if c.winning_margin else False,
        })
    return sorted(result, key=lambda x: x["nota_pct"], reverse=True)


@router.get("/crorepati-candidates")
def get_crorepati_candidates(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Candidates with declared assets > 1 Crore, grouped by party."""
    eid = _resolve_eid(election_id, db)
    candidates = db.query(Candidate).filter(
        Candidate.election_id == eid,
        Candidate.is_nota == False,
        Candidate.declared_assets != None,
        Candidate.declared_assets >= 10000000,  # 1 Crore
    ).all()

    party_data = {}
    for c in candidates:
        abbr = c.party.abbr if c.party else "IND"
        if abbr not in party_data:
            party_data[abbr] = {
                "party": abbr,
                "color": c.party.color if c.party else "#808080",
                "count": 0,
                "total_assets": 0,
            }
        party_data[abbr]["count"] += 1
        party_data[abbr]["total_assets"] += c.declared_assets

    total = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.is_nota == False
    ).count()

    return {
        "crorepati_count": len(candidates),
        "total_candidates": total,
        "crorepati_pct": round(len(candidates) / total * 100, 1) if total > 0 else 0,
        "by_party": sorted(party_data.values(), key=lambda x: x["count"], reverse=True),
    }


@router.get("/gender-demographics")
def get_gender_demographics(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Candidate gender breakdown, filtered by district/AC."""
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.is_nota == False
    )
    if ac_no or district:
        cs = _filter_constituencies(db, eid, district, ac_no)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))

    candidates = q.all()
    gender_counts = {}
    for c in candidates:
        g = (c.gender or "Unknown").upper()
        if g == "M":
            g = "MALE"
        elif g == "F":
            g = "FEMALE"
        gender_counts[g] = gender_counts.get(g, 0) + 1

    total = sum(gender_counts.values()) or 1
    return [
        {"gender": k, "count": v, "pct": round(v / total * 100, 1)}
        for k, v in sorted(gender_counts.items())
    ]


@router.get("/education-breakdown")
def get_education_breakdown(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Candidate education levels."""
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.is_nota == False, Candidate.education != None
    )
    if ac_no or district:
        cs = _filter_constituencies(db, eid, district, ac_no)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.all()

    edu_counts = {}
    for c in candidates:
        edu_counts[c.education] = edu_counts.get(c.education, 0) + 1

    total = sum(edu_counts.values()) or 1
    return sorted(
        [{"education": k, "count": v, "pct": round(v / total * 100, 1)} for k, v in edu_counts.items()],
        key=lambda x: x["count"], reverse=True,
    )


@router.get("/criminal-overview")
def get_criminal_overview(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    ac_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Criminal cases overview."""
    eid = _resolve_eid(election_id, db)
    q = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.is_nota == False
    )
    if ac_no or district:
        cs = _filter_constituencies(db, eid, district, ac_no)
        c_ids = [c.id for c in cs]
        q = q.filter(Candidate.constituency_id.in_(c_ids))
    candidates = q.all()

    total = len(candidates)
    with_cases = [c for c in candidates if c.criminal_cases and c.criminal_cases > 0]
    by_party = {}
    for c in with_cases:
        abbr = c.party.abbr if c.party else "IND"
        if abbr not in by_party:
            by_party[abbr] = {"party": abbr, "count": 0, "total_cases": 0}
        by_party[abbr]["count"] += 1
        by_party[abbr]["total_cases"] += c.criminal_cases

    return {
        "total_candidates": total,
        "with_criminal_cases": len(with_cases),
        "pct": round(len(with_cases) / total * 100, 1) if total > 0 else 0,
        "by_party": sorted(by_party.values(), key=lambda x: x["count"], reverse=True),
    }


@router.get("/margin-vs-turnout")
def get_margin_vs_turnout(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Margin buckets vs average turnout for bar chart."""
    eid = _resolve_eid(election_id, db)
    cs = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.winning_margin != None,
        Constituency.turnout_pct != None,
    ).all()

    buckets = {
        "< 2%": {"margins": [], "turnouts": []},
        "2-5%": {"margins": [], "turnouts": []},
        "5-10%": {"margins": [], "turnouts": []},
        "10-15%": {"margins": [], "turnouts": []},
        "> 15%": {"margins": [], "turnouts": []},
    }

    for c in cs:
        if not c.total_votes_polled or not c.winning_margin:
            continue
        margin_pct = c.winning_margin / c.total_votes_polled * 100
        turnout = float(c.turnout_pct)

        if margin_pct < 2:
            buckets["< 2%"]["turnouts"].append(turnout)
        elif margin_pct < 5:
            buckets["2-5%"]["turnouts"].append(turnout)
        elif margin_pct < 10:
            buckets["5-10%"]["turnouts"].append(turnout)
        elif margin_pct < 15:
            buckets["10-15%"]["turnouts"].append(turnout)
        else:
            buckets["> 15%"]["turnouts"].append(turnout)

    result = []
    for label, data in buckets.items():
        avg_turnout = round(sum(data["turnouts"]) / len(data["turnouts"]), 1) if data["turnouts"] else 0
        result.append({
            "range": label,
            "avg_turnout": avg_turnout,
            "count": len(data["turnouts"]),
        })
    return result


@router.get("/places-to-watch")
def get_places_to_watch(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Constituencies with thin margins -- key battlegrounds."""
    eid = _resolve_eid(election_id, db)
    current = db.query(Election).filter(Election.id == eid).first()
    if not current:
        return []
    state = current.state
    # Find most recent election with results for the same state
    prev = db.query(Election).filter(
        Election.state == state,
        Election.year <= current.year,
    ).order_by(Election.year.desc()).first()
    if not prev:
        return []

    close = (
        db.query(Constituency)
        .filter(Constituency.election_id == prev.id, Constituency.winning_margin != None, Constituency.winning_margin < 10000)
        .order_by(Constituency.winning_margin)
        .limit(15)
        .all()
    )

    result = []
    for c in close:
        winner = db.query(Candidate).filter(Candidate.constituency_id == c.id, Candidate.position == 1, Candidate.is_nota == False).first()
        runner = db.query(Candidate).filter(Candidate.constituency_id == c.id, Candidate.position == 2, Candidate.is_nota == False).first()
        margin_pct = round(c.winning_margin / c.total_votes_polled * 100, 1) if c.total_votes_polled else 0

        result.append({
            "name": c.name, "district": c.district.name, "ac_no": c.ac_no,
            "margin_2021": c.winning_margin, "margin_pct": margin_pct,
            "winner_2021": winner.name if winner else None,
            "winner_party": winner.party.abbr if winner and winner.party else None,
            "runner_2021": runner.name if runner else None,
            "runner_party": runner.party.abbr if runner and runner.party else None,
            "turnout_2021": float(c.turnout_pct) if c.turnout_pct else None,
            "risk_level": "High" if c.winning_margin < 3000 else "Medium" if c.winning_margin < 6000 else "Watch",
        })
    return result


@router.get("/swing-analysis")
def get_swing_analysis(election_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Compare party performance between the two most recent elections for the same state."""
    eid = _resolve_eid(election_id, db)
    current = db.query(Election).filter(Election.id == eid).first()
    state = current.state if current else "Assam"
    elections = db.query(Election).filter(Election.state == state).order_by(Election.year).all()
    if len(elections) < 2:
        return []
    e2016 = elections[-2]
    e2021 = elections[-1]

    def get_party_data(eid):
        winners = db.query(Candidate).filter(Candidate.election_id == eid, Candidate.position == 1, Candidate.is_nota == False).all()
        seats = {}
        for w in winners:
            abbr = w.party.abbr if w.party else "IND"
            seats[abbr] = seats.get(abbr, 0) + 1
        all_cands = db.query(Candidate).filter(Candidate.election_id == eid, Candidate.is_nota == False).all()
        total_votes = sum(c.votes_total or 0 for c in all_cands)
        votes = {}
        for c in all_cands:
            abbr = c.party.abbr if c.party else "IND"
            votes[abbr] = votes.get(abbr, 0) + (c.votes_total or 0)
        return seats, votes, total_votes

    s16, v16, t16 = get_party_data(e2016.id)
    s21, v21, t21 = get_party_data(e2021.id)

    all_p = sorted(set(list(s16.keys()) + list(s21.keys())), key=lambda p: s21.get(p, 0) + s16.get(p, 0), reverse=True)[:8]
    return [{
        "party": p,
        "seats_2016": s16.get(p, 0), "seats_2021": s21.get(p, 0),
        "seat_change": s21.get(p, 0) - s16.get(p, 0),
        "vote_share_2016": round(v16.get(p, 0) / t16 * 100, 1) if t16 else 0,
        "vote_share_2021": round(v21.get(p, 0) / t21 * 100, 1) if t21 else 0,
        "vote_swing": round((v21.get(p, 0) / t21 * 100) - (v16.get(p, 0) / t16 * 100), 1) if t16 and t21 else 0,
    } for p in all_p]


@router.get("/constituency-tracker")
def get_constituency_tracker(
    election_id: Optional[int] = None,
    district: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """All constituencies with embedded candidate data for tracker page."""
    eid = _resolve_eid(election_id, db)
    election = db.query(Election).filter(Election.id == eid).first()

    q = db.query(Constituency).filter(Constituency.election_id == eid)
    if district:
        q = q.join(District).filter(func.lower(District.name) == district.lower())
    if category:
        q = q.filter(func.upper(Constituency.category) == category.upper())
    if search:
        q = q.filter(Constituency.name.ilike(f"%{search}%"))

    constituencies = q.order_by(Constituency.ac_no).all()

    # Get previous election winners for comparison
    winner_2021 = {}
    if election:
        e_prev = db.query(Election).filter(
            Election.state == election.state,
            Election.year < election.year,
        ).order_by(Election.year.desc()).first()
        if e_prev:
            for w in db.query(Candidate).filter(Candidate.election_id == e_prev.id, Candidate.position == 1, Candidate.is_nota == False).all():
                winner_2021[w.constituency.name.upper()] = {
                    "name": w.name,
                    "party": w.party.abbr if w.party else None,
                    "votes": w.votes_total,
                    "margin": w.constituency.winning_margin,
                }

    result = []
    for c in constituencies:
        candidates = db.query(Candidate).filter(
            Candidate.constituency_id == c.id, Candidate.is_nota == False
        ).order_by(
            Candidate.position.asc().nullsfirst() if False else Candidate.votes_total.desc().nullslast()
        ).all()

        # Sort: by position if available, otherwise by declared_assets desc
        if any(ca.position for ca in candidates):
            candidates = sorted(candidates, key=lambda x: x.position or 999)
        else:
            candidates = sorted(candidates, key=lambda x: x.declared_assets or 0, reverse=True)

        cand_list = [{
            "id": ca.id,
            "name": ca.name,
            "party": ca.party.abbr if ca.party else None,
            "party_color": ca.party.color if ca.party else None,
            "position": ca.position,
            "votes_total": ca.votes_total,
            "vote_pct": float(ca.vote_pct) if ca.vote_pct else None,
            "declared_assets": ca.declared_assets,
            "criminal_cases": ca.criminal_cases or 0,
            "education": ca.education,
            "age": ca.age,
            "gender": ca.gender,
            "image_url": ca.image_url,
        } for ca in candidates]

        entry = {
            "ac_no": c.ac_no,
            "name": c.name,
            "district": c.district.name,
            "category": c.category,
            "total_electors": c.total_electors,
            "total_votes_polled": c.total_votes_polled,
            "turnout_pct": float(c.turnout_pct) if c.turnout_pct else None,
            "winning_margin": c.winning_margin,
            "candidate_count": len(cand_list),
            "candidates": cand_list,
        }

        # Add 2021 comparison for 2026
        prev = winner_2021.get(c.name.upper())
        if prev:
            entry["winner_2021"] = prev

        result.append(entry)

    return result
