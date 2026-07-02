"""Update existing 2021 candidates with affidavit data (assets, education, criminal, etc).

Matches JSON candidates to DB candidates by constituency name + candidate name from CSV.
JSON district field is broken (same as ac_name), so we ignore it.
"""
import sys
import os
import re
import json
import csv
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session
from app.database import engine
from app.models.assam import Election, Candidate, Constituency

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
JSON_FILE = os.path.join(PROJECT_ROOT, "assam2021", "structured_output_2021.json")
CSV_FILE = os.path.join(PROJECT_ROOT, "assam2021", "assam_candidates_2021.csv")


def parse_rupees(val):
    if not val or val == "Nil":
        return 0
    cleaned = re.sub(r"[Rs\s\xa0,~]", "", str(val))
    digits = re.match(r"^(\d+)", cleaned)
    return int(digits.group(1)) if digits else 0


def parse_criminal_cases(status):
    if not status or "No criminal" in status:
        return 0
    match = re.search(r"(\d+)", status)
    return int(match.group(1)) if match else 0


def run():
    # Load CSV for candidate_id -> name + constituency
    csv_map = {}
    with open(CSV_FILE, "r", encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get("candidate_id", "").strip()
            con = row.get("constituency", "").strip().upper()
            # Strip (SC)/(ST) suffix to match DB names
            con = re.sub(r"\s*\(SC\)\s*$", "", con)
            con = re.sub(r"\s*\(ST\)\s*$", "", con)
            csv_map[cid] = {
                "name": row.get("candidate_name", "").strip(),
                "constituency": con,
            }

    # Load JSON
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        candidates_json = json.load(f)
    print(f"Loaded {len(candidates_json)} from JSON, {len(csv_map)} from CSV")

    with Session(engine) as session:
        election = session.query(Election).filter(Election.state == "Assam", Election.year == 2021).first()
        if not election:
            print("ERROR: No 2021 election found")
            return

        # Build DB lookup: (constituency_upper, candidate_name_upper) -> Candidate
        db_candidates = (
            session.query(Candidate)
            .join(Constituency)
            .filter(Candidate.election_id == election.id, Candidate.is_nota == False)
            .all()
        )
        db_lookup = {}
        for c in db_candidates:
            key = (c.constituency.name.upper(), c.name.upper())
            db_lookup[key] = c
        print(f"DB has {len(db_lookup)} real 2021 candidates")

        updated = 0
        not_in_csv = 0
        not_in_db = 0
        not_found_names = []

        for cand_json in candidates_json:
            cp = cand_json.get("candidate_profile", {})
            cid = str(cp.get("candidate_id", ""))

            csv_info = csv_map.get(cid)
            if not csv_info:
                not_in_csv += 1
                continue

            con_name = csv_info["constituency"]
            cand_name = csv_info["name"].upper()

            # Exact match
            db_cand = db_lookup.get((con_name, cand_name))

            # Fuzzy: try substring match within same constituency
            if not db_cand:
                for (con, nam), c in db_lookup.items():
                    if con == con_name and (cand_name in nam or nam in cand_name):
                        db_cand = c
                        break

            if not db_cand:
                not_in_db += 1
                if len(not_found_names) < 10:
                    not_found_names.append(f"{csv_info['name']} ({con_name})")
                continue

            # Parse affidavit data
            education = (cp.get("education") or "").strip()
            if education.startswith("Category:"):
                education = education[len("Category:"):].strip()

            occupation = (cand_json.get("profession", {}).get("self") or "").strip() or None
            assets_summary = cand_json.get("assets_summary", {})
            declared_assets = parse_rupees(assets_summary.get("total_assets"))
            liabilities_val = parse_rupees(assets_summary.get("total_liabilities"))
            criminal_cases = parse_criminal_cases(cp.get("crime_status"))
            image_url = (cp.get("image_url") or "").strip() or None

            # Update fields
            if education:
                db_cand.education = education
            if occupation:
                db_cand.occupation = occupation
            if declared_assets > 0:
                db_cand.declared_assets = declared_assets
            if liabilities_val > 0:
                db_cand.liabilities = liabilities_val
            db_cand.criminal_cases = criminal_cases
            if image_url:
                db_cand.image_url = image_url

            updated += 1

        session.commit()

        # Summary
        has_edu = session.query(Candidate).filter(Candidate.election_id == election.id, Candidate.education != None).count()
        has_assets = session.query(Candidate).filter(Candidate.election_id == election.id, Candidate.declared_assets != None).count()
        has_image = session.query(Candidate).filter(Candidate.election_id == election.id, Candidate.image_url != None).count()
        has_criminal = session.query(Candidate).filter(Candidate.election_id == election.id, Candidate.criminal_cases > 0).count()

        print(f"\n=== Update Summary ===")
        print(f"Updated:       {updated}")
        print(f"Not in CSV:    {not_in_csv}")
        print(f"Not in DB:     {not_in_db}")
        if not_found_names:
            print(f"  Sample unmatched: {not_found_names}")
        print(f"\n=== 2021 Data Now ===")
        print(f"Has education:     {has_edu} / {len(db_candidates)}")
        print(f"Has assets:        {has_assets} / {len(db_candidates)}")
        print(f"Has criminal (>0): {has_criminal} / {len(db_candidates)}")
        print(f"Has image:         {has_image} / {len(db_candidates)}")


if __name__ == "__main__":
    run()
