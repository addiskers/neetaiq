from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models import Election, District, Constituency, Candidate, Party

router = APIRouter(prefix="/api/tweets", tags=["tweets"])


def _resolve_eid(election_id: Optional[int], db: Session) -> int:
    if election_id:
        return election_id
    e = db.query(Election).order_by(Election.id.desc()).first()
    return e.id if e else 1


@router.get("/generate")
def generate_tweets(
    election_id: Optional[int] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    eid = _resolve_eid(election_id, db)
    election = db.query(Election).filter(Election.id == eid).first()
    if not election:
        return []

    state = election.state
    year = election.year
    tweets = []

    total_constituencies = db.query(Constituency).filter_by(election_id=eid).count()
    total_electors = db.query(func.sum(Constituency.total_electors)).filter(
        Constituency.election_id == eid
    ).scalar() or 0
    total_candidates = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.is_nota == False
    ).count()
    total_parties = db.query(func.count(func.distinct(Candidate.party_id))).filter(
        Candidate.election_id == eid, Candidate.is_nota == False
    ).scalar() or 0

    electors_cr = round(total_electors / 10000000, 1)

    if not category or category == "overview":
        tweets.extend([
            {
                "category": "overview",
                "emoji": "\U0001f5f3\ufe0f",
                "text": f"\U0001f5f3\ufe0f {state} {year} Elections: {total_constituencies} constituencies, {electors_cr} Cr electors, {total_candidates} candidates from {total_parties} parties. Democracy at scale! #Election{year} #{state}Elections",
            },
            {
                "category": "overview",
                "emoji": "\U0001f4ca",
                "text": f"\U0001f4ca {state} {year} by the numbers:\n\n\U0001f3db\ufe0f {total_constituencies} Assembly Constituencies\n\U0001f465 {electors_cr} Cr voters\n\U0001f3af {total_candidates} candidates\n\U0001f3f3\ufe0f {total_parties} political parties\n\n#Election{year} #{state}",
            },
        ])

    # Party-based tweets
    top_parties = (
        db.query(
            Party.name, Party.abbr,
            func.count(Candidate.id).label("contested"),
            func.sum(Candidate.votes_total).label("total_votes"),
        )
        .join(Candidate)
        .filter(Candidate.election_id == eid, Candidate.is_nota == False)
        .group_by(Party.id)
        .order_by(func.count(Candidate.id).desc())
        .limit(5)
        .all()
    )

    if top_parties and (not category or category == "party"):
        lines = []
        for p in top_parties[:4]:
            votes_str = ""
            if p.total_votes:
                votes_str = f" ({round(p.total_votes / 100000, 1)}L votes)"
            lines.append(f"\u2022 {p.abbr}: {p.contested} seats{votes_str}")

        tweets.append({
            "category": "party",
            "emoji": "\U0001f3db\ufe0f",
            "text": f"\U0001f3db\ufe0f Top parties in {state} {year}:\n\n" + "\n".join(lines) + f"\n\nWho will form the government? \U0001f914\n\n#{state}Elections #ElectionResults",
        })

    # Winners / Results tweets
    winners = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.position == 1, Candidate.is_nota == False
    ).all()

    if winners and (not category or category == "results"):
        party_seats = {}
        for w in winners:
            pname = w.party.abbr if w.party else "IND"
            party_seats[pname] = party_seats.get(pname, 0) + 1

        sorted_parties = sorted(party_seats.items(), key=lambda x: x[1], reverse=True)
        top = sorted_parties[0] if sorted_parties else None

        if top:
            seat_lines = [f"\U0001f3c6 {p}: {s} seats" if i == 0 else f"  {p}: {s} seats" for i, (p, s) in enumerate(sorted_parties[:5])]
            tweets.append({
                "category": "results",
                "emoji": "\U0001f3c6",
                "text": f"\U0001f3c6 {state} {year} RESULTS:\n\n" + "\n".join(seat_lines) + f"\n\n{top[0]} emerges as the single largest party with {top[1]} seats!\n\n#{state}Results #{state}Elections",
            })

        close_contests = db.query(Constituency).filter(
            Constituency.election_id == eid,
            Constituency.winning_margin != None,
            Constituency.winning_margin < 5000,
        ).order_by(Constituency.winning_margin).limit(3).all()

        if close_contests:
            contest_lines = [f"\u2022 {c.name}: margin of just {c.winning_margin:,} votes!" for c in close_contests]
            tweets.append({
                "category": "results",
                "emoji": "\u2694\ufe0f",
                "text": f"\u2694\ufe0f Nail-biters in {state} {year}!\n\n" + "\n".join(contest_lines) + f"\n\nEvery vote counts! \U0001f5f3\ufe0f\n\n#{state}Elections #CloseContest",
            })

    # Turnout tweets
    high_turnout = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.turnout_pct != None,
    ).order_by(Constituency.turnout_pct.desc()).limit(3).all()

    low_turnout = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.turnout_pct != None,
    ).order_by(Constituency.turnout_pct.asc()).limit(3).all()

    if high_turnout and (not category or category == "turnout"):
        high_lines = [f"\U0001f7e2 {c.name}: {c.turnout_pct}%" for c in high_turnout]
        low_lines = [f"\U0001f534 {c.name}: {c.turnout_pct}%" for c in low_turnout]
        tweets.append({
            "category": "turnout",
            "emoji": "\U0001f4ca",
            "text": f"\U0001f4ca {state} {year} Voter Turnout:\n\nHighest:\n" + "\n".join(high_lines) + "\n\nLowest:\n" + "\n".join(low_lines) + f"\n\n#{state}Elections #VoterTurnout",
        })

    # Trivia
    if not category or category == "trivia":
        youngest = db.query(Candidate).filter(
            Candidate.election_id == eid, Candidate.age != None, Candidate.is_nota == False
        ).order_by(Candidate.age.asc()).first()

        oldest = db.query(Candidate).filter(
            Candidate.election_id == eid, Candidate.age != None, Candidate.is_nota == False
        ).order_by(Candidate.age.desc()).first()

        if youngest and oldest:
            tweets.append({
                "category": "trivia",
                "emoji": "\U0001f9d1\u200d\U0001f4bc",
                "text": f"\U0001f9d1\u200d\U0001f4bc Age range of {state} {year} candidates:\n\n\U0001f476 Youngest: {youngest.name} ({youngest.age} yrs) from {youngest.constituency.name}\n\U0001f474 Oldest: {oldest.name} ({oldest.age} yrs) from {oldest.constituency.name}\n\nDemocracy has no age bar! #{state}Elections",
            })

        ind_count = db.query(Candidate).join(Party).filter(
            Candidate.election_id == eid,
            Candidate.is_nota == False,
            Party.abbr == "IND",
        ).count()

        if ind_count > 0:
            tweets.append({
                "category": "trivia",
                "emoji": "\U0001f3af",
                "text": f"\U0001f3af {ind_count} Independent candidates contested in {state} {year}!\n\nThat's {round(ind_count/total_candidates*100, 1)}% of all candidates going solo without party backing.\n\n#{state}Elections #IndependentCandidates",
            })

    return tweets
