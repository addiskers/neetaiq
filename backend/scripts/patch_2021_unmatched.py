"""Patch the 18 unmatched 2021 candidates with affidavit data.

These failed due to name/constituency spelling differences between
the detailed results file and the myneta CSV/JSON.
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

# Manual mapping: (DB constituency, DB name) -> CSV candidate_id
MANUAL_MAP = {
    ("SONAI", "KARIM UDDIN BARBHUIYA"): "594",
    ("SONAI", "M. SANTI KUMAR SINGHA"): "337",
    ("LAKHIPUR", "MUKESH PANDEY"): "607",          # Panday in CSV
    ("KOKRAJHAR WEST", "RANJAY KR. BRAHMA"): "901", # Ranjay Kumar Brahma
    ("GOALPARA WEST", "ABTABUL AMBIA MOLLAH"): "960", # Mollam in CSV
    ("PATACHAR KUCHI", "RANJEET KUMAR DASS"): "732",
    ("PATACHAR KUCHI", "SANTANU SARMA"): "762",
    ("PATACHAR KUCHI", "PABINDRA DEKA"): "703",
    ("PATACHAR KUCHI", "CHAKRA PANI MEDHI"): "1013",
    ("PATACHAR KUCHI", "KRISHNAMANI DAS"): "1012",
    ("GAUHATI WEST", "BALESWAR RANGPI"): "1057",    # Rongpi in CSV
    ("GAUHATI WEST", "DEBAKESH MALLA BUZAR BARUAH"): "830",
    ("MAJBAT", "GOLAM MOSTAFA"): "662",             # Mustafa in CSV
    # Title/honorific prefix mismatches
    ("KOKRAJHAR EAST", "SHRI SAILENDRA NATH BRAHMA"): "752",  # "Shri" prefix in DB
    ("HAJO", "SRI SUMAN HARIPRIYA"): "1025",                  # "Sri" prefix in DB
    ("BARAMA", "NABA KUMAR SARANIA"): "706",                   # "Sri" prefix in profile CSV
    ("DHING", "Md. Anjar Hussain"): "134",                     # "Md." prefix in DB
    ("NAHARKATIA", "NAREN SONOWAL (BOTALI)"): "275",           # "(BOTALI)" suffix in DB
    ("TINSUKIA", "HIRA DEVI"): "278",                          # "Smt" prefix in profile CSV
    # These have no match in CSV at all
    # ("BISWANATH", "MILICHARAN BASUMATARY"): None,
    # ("BATADROBA", "Fakar Uddin"): None,
    # ("RUPOHIHAT", "NURUL AMIN CHOWDHURY"): None,
    # ("MAHMARA", "LOHIT GOGOI"): None,
    # ("NAOBOICHA", "BIRI JOY"): None,
}


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
    # Load JSON indexed by candidate_id
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        candidates_json = json.load(f)
    json_by_id = {}
    for c in candidates_json:
        cid = str(c["candidate_profile"]["candidate_id"])
        json_by_id[cid] = c

    with Session(engine) as session:
        election = session.query(Election).filter(Election.state == "Assam", Election.year == 2021).first()

        patched = 0
        for (db_con, db_name), csv_cid in MANUAL_MAP.items():
            # Find DB candidate
            db_cand = (
                session.query(Candidate)
                .join(Constituency)
                .filter(
                    Candidate.election_id == election.id,
                    Constituency.name.ilike(db_con.replace(" ", "%")),
                    Candidate.name.ilike(db_name.replace(" ", "%")),
                )
                .first()
            )
            if not db_cand:
                print(f"  DB not found: {db_name} in {db_con}")
                continue

            cand_json = json_by_id.get(csv_cid)
            if not cand_json:
                print(f"  JSON not found: cid={csv_cid} for {db_name}")
                continue

            cp = cand_json["candidate_profile"]
            education = (cp.get("education") or "").strip()
            if education.startswith("Category:"):
                education = education[len("Category:"):].strip()

            occupation = (cand_json.get("profession", {}).get("self") or "").strip() or None
            assets_summary = cand_json.get("assets_summary", {})
            declared_assets = parse_rupees(assets_summary.get("total_assets"))
            liabilities_val = parse_rupees(assets_summary.get("total_liabilities"))
            criminal_cases = parse_criminal_cases(cp.get("crime_status"))
            image_url = (cp.get("image_url") or "").strip() or None

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

            patched += 1
            print(f"  Patched: {db_name} ({db_con})")

        session.commit()

        # Check remaining
        missing = (
            session.query(Candidate)
            .filter(
                Candidate.election_id == election.id,
                Candidate.is_nota == False,
                Candidate.education == None,
            )
            .count()
        )
        print(f"\nPatched {patched} candidates. Still missing: {missing}")


if __name__ == "__main__":
    run()
