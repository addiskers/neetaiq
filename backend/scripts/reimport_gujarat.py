"""Delete and re-import Gujarat 2012 and 2017 election data.

Use this when the source JSON/CSV/XLSX files have been updated and the
database needs to reflect the changes.

Usage: cd backend && python -m scripts.reimport_gujarat
       cd backend && python -m scripts.reimport_gujarat --year 2012
       cd backend && python -m scripts.reimport_gujarat --year 2017
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session
from app.database import engine
from app.models.gujarat import Election, District, Constituency, Candidate


def delete_year(session: Session, year: int):
    election = session.query(Election).filter_by(state="Gujarat", year=year).first()
    if not election:
        print(f"Gujarat {year} not found in DB — nothing to delete.")
        return False

    n_cands = session.query(Candidate).filter_by(election_id=election.id).delete()
    n_cons  = session.query(Constituency).filter_by(election_id=election.id).delete()
    n_dists = session.query(District).filter_by(election_id=election.id).delete()
    session.delete(election)
    session.flush()
    print(f"Deleted Gujarat {year}: {n_cands} candidates, {n_cons} constituencies, {n_dists} districts")
    return True


def run(years=None):
    if years is None:
        years = [2012, 2017]

    with Session(engine) as session:
        for year in years:
            delete_year(session, year)
        session.commit()

    if 2012 in years:
        print("\n--- Importing Gujarat 2012 ---")
        from scripts.import_gujarat_2012 import run as run_2012
        run_2012()

    if 2017 in years:
        print("\n--- Importing Gujarat 2017 ---")
        from scripts.import_gujarat_2017 import run as run_2017
        run_2017()


if __name__ == "__main__":
    years = None
    if "--year" in sys.argv:
        idx = sys.argv.index("--year")
        years = [int(sys.argv[idx + 1])]
    run(years)
