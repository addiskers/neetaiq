import random
from fastapi import APIRouter, Depends, Query
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
    """Generate election-related tweet templates from real data."""
    eid = _resolve_eid(election_id, db)
    election = db.query(Election).filter(Election.id == eid).first()
    if not election:
        return []

    state = election.state
    year = election.year
    tweets = []

    # --- Stats-based tweets ---
    total_constituencies = db.query(Constituency).filter_by(election_id=eid).count()
    total_electors = db.query(func.sum(Constituency.total_electors)).filter(
        Constituency.election_id == eid
    ).scalar() or 0
    total_candidates = db.query(Candidate).filter_by(election_id=eid, is_contesting=True).count()
    total_parties = db.query(func.count(func.distinct(Candidate.party_id))).filter(
        Candidate.election_id == eid, Candidate.is_contesting == True
    ).scalar() or 0

    electors_cr = round(total_electors / 10000000, 1)

    if not category or category == "overview":
        tweets.extend([
            {
                "category": "overview",
                "emoji": "🗳️",
                "text": f"🗳️ {state} {year} Elections: {total_constituencies} constituencies, {electors_cr} Cr electors, {total_candidates} candidates from {total_parties} parties. Democracy at scale! #Election{year} #{state}Elections",
            },
            {
                "category": "overview",
                "emoji": "📊",
                "text": f"📊 {state} {year} by the numbers:\n\n🏛️ {total_constituencies} Assembly Constituencies\n👥 {electors_cr} Cr voters\n🎯 {total_candidates} candidates\n🏳️ {total_parties} political parties\n\n#Election{year} #{state}",
            },
            {
                "category": "overview",
                "emoji": "🇮🇳",
                "text": f"🇮🇳 The battle for {state} {year} is ON!\n\n{total_candidates} candidates fighting across {total_constituencies} seats for the mandate of {electors_cr} Cr voters.\n\nWho will emerge victorious? 🤔\n\n#{state}Elections #{state}{year}",
            },
        ])

    # --- Gender-based tweets ---
    male = db.query(func.sum(Constituency.male_electors)).filter(Constituency.election_id == eid).scalar() or 0
    female = db.query(func.sum(Constituency.female_electors)).filter(Constituency.election_id == eid).scalar() or 0
    total = male + female or 1
    female_pct = round(female / total * 100, 1)

    if not category or category == "demographics":
        tweets.extend([
            {
                "category": "demographics",
                "emoji": "👩",
                "text": f"👩 Women voters make up {female_pct}% of {state}'s electorate in {year}!\n\n{round(female/10000000, 1)} Cr women will decide the fate of {total_constituencies} constituencies.\n\nWomen power! 💪 #{state}Elections #WomenVoters",
            },
            {
                "category": "demographics",
                "emoji": "📈",
                "text": f"📈 {state} {year} voter demographics:\n\n🔵 Male: {round(male/10000000, 1)} Cr ({round(male/total*100, 1)}%)\n🔴 Female: {round(female/10000000, 1)} Cr ({female_pct}%)\n\nNearly equal representation! #{state}Elections #DemocracyMatters",
            },
        ])

    # --- Party-based tweets ---
    top_parties = (
        db.query(
            Party.name, Party.short_name,
            func.count(Candidate.id).label("contested"),
            func.sum(Candidate.votes).label("total_votes"),
        )
        .join(Candidate)
        .filter(Candidate.election_id == eid, Candidate.is_contesting == True)
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
            lines.append(f"• {p.short_name}: {p.contested} seats{votes_str}")

        tweets.extend([
            {
                "category": "party",
                "emoji": "🏛️",
                "text": f"🏛️ Top parties in {state} {year}:\n\n" + "\n".join(lines) + f"\n\nWho will form the government? 🤔\n\n#{state}Elections #ElectionResults",
            },
        ])

    # --- Winners / Results tweets (only if vote data exists) ---
    winners = db.query(Candidate).filter(
        Candidate.election_id == eid, Candidate.position == 1
    ).all()

    if winners and (not category or category == "results"):
        # Party-wise seat count
        party_seats = {}
        for w in winners:
            pname = w.party.short_name or w.party.name
            party_seats[pname] = party_seats.get(pname, 0) + 1

        sorted_parties = sorted(party_seats.items(), key=lambda x: x[1], reverse=True)
        top = sorted_parties[0] if sorted_parties else None

        if top:
            seat_lines = [f"🏆 {p}: {s} seats" if i == 0 else f"  {p}: {s} seats" for i, (p, s) in enumerate(sorted_parties[:5])]
            tweets.extend([
                {
                    "category": "results",
                    "emoji": "🏆",
                    "text": f"🏆 {state} {year} RESULTS:\n\n" + "\n".join(seat_lines) + f"\n\n{top[0]} emerges as the single largest party with {top[1]} seats!\n\n#{state}Results #{state}Elections",
                },
            ])

        # Closest contests
        close_contests = db.query(Constituency).filter(
            Constituency.election_id == eid,
            Constituency.winning_margin != None,
            Constituency.winning_margin < 5000,
        ).order_by(Constituency.winning_margin).limit(3).all()

        if close_contests:
            contest_lines = [f"• {c.name}: margin of just {c.winning_margin:,} votes!" for c in close_contests]
            tweets.extend([
                {
                    "category": "results",
                    "emoji": "⚔️",
                    "text": f"⚔️ Nail-biters in {state} {year}!\n\n" + "\n".join(contest_lines) + f"\n\nEvery vote counts! 🗳️\n\n#{state}Elections #CloseContest",
                },
            ])

    # --- Turnout tweets ---
    high_turnout = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.turnout_percentage != None,
    ).order_by(Constituency.turnout_percentage.desc()).limit(3).all()

    low_turnout = db.query(Constituency).filter(
        Constituency.election_id == eid,
        Constituency.turnout_percentage != None,
    ).order_by(Constituency.turnout_percentage.asc()).limit(3).all()

    if high_turnout and (not category or category == "turnout"):
        high_lines = [f"🟢 {c.name}: {c.turnout_percentage}%" for c in high_turnout]
        low_lines = [f"🔴 {c.name}: {c.turnout_percentage}%" for c in low_turnout]
        tweets.extend([
            {
                "category": "turnout",
                "emoji": "📊",
                "text": f"📊 {state} {year} Voter Turnout:\n\nHighest:\n" + "\n".join(high_lines) + "\n\nLowest:\n" + "\n".join(low_lines) + f"\n\n#{state}Elections #VoterTurnout",
            },
        ])

    # --- Trivia / Fun facts ---
    if not category or category == "trivia":
        youngest = db.query(Candidate).filter(
            Candidate.election_id == eid, Candidate.age != None, Candidate.is_contesting == True
        ).order_by(Candidate.age.asc()).first()

        oldest = db.query(Candidate).filter(
            Candidate.election_id == eid, Candidate.age != None, Candidate.is_contesting == True
        ).order_by(Candidate.age.desc()).first()

        if youngest and oldest:
            tweets.extend([
                {
                    "category": "trivia",
                    "emoji": "🧑‍💼",
                    "text": f"🧑‍💼 Age range of {state} {year} candidates:\n\n👶 Youngest: {youngest.name} ({youngest.age} yrs) from {youngest.constituency.name}\n👴 Oldest: {oldest.name} ({oldest.age} yrs) from {oldest.constituency.name}\n\nDemocracy has no age bar! #{state}Elections",
                },
            ])

        # Independents count
        ind_count = db.query(Candidate).join(Party).filter(
            Candidate.election_id == eid,
            Candidate.is_contesting == True,
            Party.short_name == "IND",
        ).count()

        if ind_count > 0:
            tweets.extend([
                {
                    "category": "trivia",
                    "emoji": "🎯",
                    "text": f"🎯 {ind_count} Independent candidates are contesting in {state} {year}!\n\nThat's {round(ind_count/total_candidates*100, 1)}% of all candidates going solo without party backing.\n\n#{state}Elections #IndependentCandidates",
                },
            ])

    return tweets
