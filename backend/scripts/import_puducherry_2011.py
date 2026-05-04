"""Import Puducherry 2011 election data.

Data sources (all under Puducherry/Puducherry_2011/):
  - Results: Detailed_Results_2011.xlsx
  - Electors: District_Constituency wise Electors & Voters Data_2011.xlsx
  - Party names: List Of Political Parties Participated_2011.xlsx
  - Candidate profiles: my_neta_2011_candidate_profile.json
  - Candidate bridge: my_neta_puducherry_candidates_2011.csv

Usage: cd backend && python -m scripts.import_puducherry_2011
"""
import sys
import os
import re
import json
import csv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import openpyxl
from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models import Election, District, Constituency, Party, Candidate

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
DATA_DIR = os.path.join(PROJECT_ROOT, "Puducherry", "Puducherry_2011")

RESULTS_FILE = os.path.join(DATA_DIR, "Detailed_Results_2011.xlsx")
ELECTORS_FILE = os.path.join(DATA_DIR, "District_Constituency wise Electors & Voters Data_2011.xlsx")
PARTIES_FILE = os.path.join(DATA_DIR, "List Of Political Parties Participated_2011.xlsx")
PROFILES_JSON = os.path.join(DATA_DIR, "my_neta_2011_candidate_profile.json")
CANDIDATES_CSV = os.path.join(DATA_DIR, "my_neta_puducherry_candidates_2011.csv")

PARTY_COLORS = {
    "AINRC": "#800080",
    "DMK": "#FF0000",
    "AIADMK": "#228B22",
    "INC": "#00BFFF",
    "BJP": "#FF9933",
    "PMK": "#FFFF00",
    "CPI": "#FF4444",
    "CPM": "#FF0000",
    "CPI(M)": "#FF0000",
    "BSP": "#0000FF",
    "IND": "#808080",
    "JD(U)": "#003366",
    "NOTA": None,
}

ABBR_ALIASES = {
    "CPM": "CPI(M)",
}

# Results file name -> CSV/JSON name (for affidavit matching)
CANDIDATE_NAME_FIXES = {
    ("MANNADIPET", "D. GUNASHAKARAN"): "D. GUNASEKARAN",
    ("OUSSUDU", "M. PITCHEKARANE @ PITCHAIAPPAN"): "M.PITCHAIAPPANE @ PITCHAIKARANE",
    ("VILLIANUR", "NADARAJAN K."): "K. NADARAJAN",
    ("VILLIANUR", "K. ATHIRIYEN"): "K. ATHIRAYEN",
    ("OZHUKARAI", "N.G. PANNIR SELVAM"): "N.G.PANNEERSELVAM",
    ("THATTANCHAVADY", "MASTHANJI MOHAMED KALIMULLA"): "MASTHANJI MOHAMMED KALIMULLA",
    ("MUTHIALPET", "KRISHNAKANTHAN @ BASKAR"): "KRISHNAKANTH @ BHASKAR",
    ("MUTHIALPET", "NANDHA T. SARAVANAN"): "NANDA T. SARAVANAN",
    ("MUTHIALPET", "R. KUMARAN @ PAVADAISAMI"): "R. KUMARAN @ PAVADAISAMY",
    ("OUPALAM", "ANNIBAL KENNEDY"): "ANIBAL KENNEDY",
    ("OUPALAM", "ANGAPPIN @ ROUSSEAU ANGAPPIN"): "ANGAPPIN @ ROUSSEAU ANGAPPIN. S",
    ("OUPALAM", "S. ANTHONI"): "ANTHONI. S",
    ("ARIANKUPPAM", "V. SABAPATHY"): "V. SABAPATHY @ KOTHANDARAMAN",
    ("LAWSPET", "G. SATHIARAJ"): "G. SATHIRAJ",
    ("MUTHIALPET", "S. MOTHILAL"): "S. MOTILAL",
}

# AC name in results -> AC name in CSV/JSON (for constituency mismatches)
AC_NAME_ALIASES = {
    "INDIRA NAGAR": "INDIRA NAGAR: BEFORE BYE-ELECTION",
}

# GeoJSON has correct districts; electors file lists all as "PUDUCHERRY".
# Map AC numbers to their actual district (from shapefile).
AC_DISTRICT = {}
# ACs 1-23: Puducherry, 24-28: Karaikal, 29: Mahe, 30: Yanam
for _n in range(1, 24):
    AC_DISTRICT[_n] = "PUDUCHERRY"
for _n in range(24, 29):
    AC_DISTRICT[_n] = "KARAIKAL"
AC_DISTRICT[29] = "MAHE"
AC_DISTRICT[30] = "YANAM"


def load_electors():
    """Parse electors xlsx -> {ac_no: {district, category, male/female/third/total electors}}."""
    wb = openpyxl.load_workbook(ELECTORS_FILE, read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    elector_map = {}
    for row in rows[1:]:
        ac_no = row[1]
        if ac_no is None:
            continue
        ac_no = int(ac_no)
        name = str(row[2]).strip() if row[2] else ""
        category = str(row[4]).strip().upper() if row[4] else "GEN"
        if category == "GENERAL":
            category = "GEN"

        elector_map[ac_no] = {
            "name": re.sub(r"\s+", " ", name).upper(),
            "district": AC_DISTRICT.get(ac_no, "PUDUCHERRY"),
            "category": category,
            "male_electors": int(row[5]) if row[5] else None,
            "female_electors": int(row[6]) if row[6] else None,
            "third_gender_electors": int(row[7]) if row[7] else None,
            "total_electors": int(row[8]) if row[8] else None,
        }
    return elector_map


def load_party_names():
    """Parse party list -> {abbreviation: full_name}."""
    wb = openpyxl.load_workbook(PARTIES_FILE, read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    mapping = {}
    for row in rows[1:]:
        full = str(row[1]).strip() if row[1] else None
        abbr = str(row[2]).strip() if row[2] else None
        if full and abbr:
            mapping[abbr] = full
    return mapping


def _normalize_name(name):
    """Strip dots, spaces, extra chars for fuzzy comparison."""
    return re.sub(r"[.\s@]+", "", name).upper()


def load_affidavit_bridge():
    """Build {(constituency_upper, candidate_name_upper): affidavit_data} from CSV+JSON.

    Returns (exact_map, fuzzy_map) where fuzzy_map uses stripped names.
    """
    csv_by_id = {}
    with open(CANDIDATES_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get("candidate_id", "").strip()
            name = row.get("candidate_name", "").strip()
            constituency = row.get("constituency", "").strip().upper()
            constituency = re.sub(r"\s*\((SC|ST)\)\s*$", "", constituency).strip()
            constituency = re.sub(r"\s+", " ", constituency)
            if cid:
                csv_by_id[cid] = {"name": name, "constituency": constituency}

    with open(PROFILES_JSON, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    exact_map = {}
    fuzzy_map = {}
    for p in profiles:
        cp = p.get("candidate_profile", {})
        cid = str(cp.get("candidate_id", ""))
        csv_info = csv_by_id.get(cid)

        # Primary key from CSV
        if csv_info:
            key = (csv_info["constituency"], csv_info["name"].upper())
            exact_map[key] = p
            fuzzy_key = (csv_info["constituency"], _normalize_name(csv_info["name"]))
            fuzzy_map[fuzzy_key] = p

        # Secondary key from JSON profile fields (covers missing CSV entries)
        ac = re.sub(r"\s+", " ", (cp.get("ac_name") or "").strip().upper())
        name = (cp.get("name") or "").strip()
        if ac and name:
            exact_map.setdefault((ac, name.upper()), p)
            fuzzy_map.setdefault((ac, _normalize_name(name)), p)

    return exact_map, fuzzy_map


def parse_rupees(val):
    if not val or "Nil" in str(val):
        return 0
    cleaned = re.sub(r"[Rs\s\xa0,~]", "", str(val))
    digits = re.match(r"^([\d.]+)", cleaned)
    return int(float(digits.group(1))) if digits else 0


def parse_criminal(status):
    if not status or "No criminal" in status:
        return 0
    m = re.search(r"(\d+)", status)
    return int(m.group(1)) if m else 0


def run():
    Base.metadata.create_all(bind=engine)

    elector_map = load_electors()
    print(f"Loaded electors: {len(elector_map)} ACs")

    party_names = load_party_names()
    print(f"Loaded {len(party_names)} party name mappings")

    affidavit_exact, affidavit_fuzzy = load_affidavit_bridge()
    print(f"Loaded {len(affidavit_exact)} affidavit profiles ({len(affidavit_fuzzy)} fuzzy keys)")

    # Load detailed results
    wb = openpyxl.load_workbook(RESULTS_FILE, read_only=True)
    ws = wb[wb.sheetnames[0]]
    result_rows = list(ws.iter_rows(values_only=True))
    wb.close()
    print(f"Loaded {len(result_rows) - 1} result rows")

    # Results columns: AC NO(0), Constituency(1), Total Electors(2), Candidate(3),
    # Sex(4), Age(5), Category(6), Party(7), General Votes(8), Postal Votes(9),
    # Total Votes(10), % Votes(11)

    with Session(engine) as session:
        existing = session.query(Election).filter(
            Election.state == "Puducherry", Election.year == 2011
        ).first()
        if existing:
            print(f"ERROR: Puducherry 2011 already exists (id={existing.id}). Skipping.")
            return

        # 1. Create election
        election = Election(
            state="Puducherry", year=2011, type="Assembly",
            name="Puducherry Legislative Assembly Election 2011",
        )
        session.add(election)
        session.flush()
        print(f"Created election: {election.name} (id={election.id})")

        # 2. Create districts (from AC_DISTRICT mapping)
        district_cache = {}
        for dname in sorted(set(AC_DISTRICT.values())):
            district = District(election_id=election.id, name=dname.title())
            session.add(district)
            district_cache[dname] = district
        session.flush()
        print(f"Created {len(district_cache)} districts")

        # 3. Parse results -> group by AC
        ac_data = {}
        for row in result_rows[1:]:
            ac_no = row[0]
            if ac_no is None or not isinstance(ac_no, (int, float)):
                continue
            ac_no = int(ac_no)
            ac_name = str(row[1]).strip() if row[1] else ""
            total_electors_col = int(row[2]) if row[2] else None
            cand_name = str(row[3]).strip() if row[3] else None
            sex = str(row[4]).strip() if row[4] else None
            if sex:
                sex = sex[0].upper() if sex.upper() in ("MALE", "FEMALE") else sex
            age = int(row[5]) if row[5] else None
            category = str(row[6]).strip() if row[6] else "GEN"
            party_abbr = str(row[7]).strip() if row[7] else None
            gen_votes = int(row[8]) if row[8] else 0
            postal_votes = int(row[9]) if row[9] else 0
            total_valid = int(row[10]) if row[10] else 0

            if ac_no not in ac_data:
                ac_data[ac_no] = {
                    "name": ac_name,
                    "category": category,
                    "total_electors_from_results": total_electors_col,
                    "candidates": [],
                }

            ac_data[ac_no]["candidates"].append({
                "name": cand_name,
                "sex": sex,
                "age": age,
                "party": party_abbr,
                "gen_votes": gen_votes,
                "postal_votes": postal_votes,
                "total_votes": total_valid,
            })

        # 4. Create constituencies
        constituency_cache = {}
        for ac_no, info in ac_data.items():
            mapping = elector_map.get(ac_no, {})
            district_name = mapping.get("district", AC_DISTRICT.get(ac_no, "PUDUCHERRY"))
            district = district_cache.get(district_name)

            total_electors = mapping.get("total_electors") or info.get("total_electors_from_results")
            total_votes = sum(c["total_votes"] for c in info["candidates"])
            turnout = round(total_votes / total_electors * 100, 2) if total_electors and total_votes else None

            sorted_cands = sorted(info["candidates"], key=lambda x: x["total_votes"], reverse=True)
            real_cands = [c for c in sorted_cands if c["party"] != "NOTA" and (c["name"] or "") != "None of the Above"]
            margin = None
            if len(real_cands) >= 2:
                margin = real_cands[0]["total_votes"] - real_cands[1]["total_votes"]

            c = Constituency(
                election_id=election.id,
                district_id=district.id if district else None,
                ac_no=ac_no,
                name=re.sub(r"\s+", " ", (mapping.get("name") or info["name"]).upper()),
                category=mapping.get("category") or info.get("category", "GEN"),
                total_electors=total_electors,
                male_electors=mapping.get("male_electors"),
                female_electors=mapping.get("female_electors"),
                third_gender_electors=mapping.get("third_gender_electors"),
                total_votes_polled=total_votes,
                turnout_pct=turnout,
                winning_margin=margin,
            )
            session.add(c)
            constituency_cache[ac_no] = c

        session.flush()
        print(f"Created {len(constituency_cache)} constituencies")

        # 5. Build party cache (reuse existing parties)
        party_cache = {}
        for p in session.query(Party).all():
            party_cache[p.abbr.upper()] = p
            if p.name:
                party_cache[p.name.upper()] = p

        # 6. Import candidates
        imported = 0
        for ac_no, info in ac_data.items():
            constituency = constituency_cache[ac_no]
            sorted_cands = sorted(info["candidates"], key=lambda x: x["total_votes"], reverse=True)
            total_valid_in_ac = sum(c["total_votes"] for c in sorted_cands)

            for pos, cand in enumerate(sorted_cands, start=1):
                is_nota = (cand["party"] == "NOTA" or cand["name"] == "None of the Above")
                name = cand["name"]
                if name == "None of the Above":
                    name = "NOTA"

                # Get or create party
                party = None
                if not is_nota and cand["party"]:
                    raw_abbr = cand["party"]
                    canonical_abbr = ABBR_ALIASES.get(raw_abbr, raw_abbr)

                    p_key = canonical_abbr.upper()
                    if p_key not in party_cache:
                        p_key = raw_abbr.upper()

                    if p_key not in party_cache:
                        full_name = party_names.get(raw_abbr, raw_abbr)
                        new_party = Party(
                            name=full_name,
                            abbr=canonical_abbr,
                            color=PARTY_COLORS.get(raw_abbr) or PARTY_COLORS.get(canonical_abbr),
                        )
                        session.add(new_party)
                        session.flush()
                        party_cache[canonical_abbr.upper()] = new_party
                        party_cache[full_name.upper()] = new_party
                        p_key = canonical_abbr.upper()

                    party = party_cache[p_key]

                vote_pct = round(cand["total_votes"] / total_valid_in_ac * 100, 2) if total_valid_in_ac > 0 else 0

                # Look up affidavit data (exact -> manual fix -> fuzzy -> AC alias)
                ac_name_upper = constituency.name.upper()
                cand_name_upper = (name or "").upper()
                affidavit = affidavit_exact.get((ac_name_upper, cand_name_upper))
                if not affidavit:
                    # Try manual name fix
                    fixed_name = CANDIDATE_NAME_FIXES.get((ac_name_upper, cand_name_upper))
                    if fixed_name:
                        affidavit = affidavit_exact.get((ac_name_upper, fixed_name.upper()))
                        if not affidavit:
                            affidavit = affidavit_fuzzy.get((ac_name_upper, _normalize_name(fixed_name)))
                if not affidavit:
                    affidavit = affidavit_fuzzy.get((ac_name_upper, _normalize_name(cand_name_upper)))
                if not affidavit:
                    # Try AC name alias (e.g. INDIRA NAGAR -> INDIRA NAGAR: BEFORE BYE-ELECTION)
                    alt_ac = AC_NAME_ALIASES.get(ac_name_upper)
                    if alt_ac:
                        affidavit = affidavit_exact.get((alt_ac, cand_name_upper))
                        if not affidavit:
                            affidavit = affidavit_fuzzy.get((alt_ac, _normalize_name(cand_name_upper)))

                education = None
                occupation = None
                declared_assets = None
                liabilities_val = None
                criminal_cases = 0
                image_url = None

                if affidavit:
                    cp = affidavit.get("candidate_profile", {})
                    edu = (cp.get("education") or "").strip()
                    if edu.startswith("Category:"):
                        edu = edu[len("Category:"):].strip()
                    if edu and edu not in ("Not mentioned", "Not Given"):
                        education = edu

                    occ = (affidavit.get("profession", {}).get("self") or "").strip()
                    if occ and occ not in ("Not mentioned", "Not Given"):
                        occupation = occ

                    assets = parse_rupees(affidavit.get("assets_summary", {}).get("total_assets"))
                    if assets > 0:
                        declared_assets = assets
                    liab = parse_rupees(affidavit.get("assets_summary", {}).get("total_liabilities"))
                    if liab > 0:
                        liabilities_val = liab

                    criminal_cases = parse_criminal(cp.get("crime_status"))

                    img = (cp.get("image_url") or "").strip()
                    if img and img != "None":
                        image_url = img

                session.add(Candidate(
                    election_id=election.id,
                    constituency_id=constituency.id,
                    party_id=party.id if party else None,
                    name=name,
                    gender=cand["sex"],
                    age=cand["age"],
                    position=pos,
                    votes_general=cand["gen_votes"],
                    votes_postal=cand["postal_votes"],
                    votes_total=cand["total_votes"],
                    vote_pct=vote_pct,
                    is_nota=is_nota,
                    education=education,
                    occupation=occupation,
                    declared_assets=declared_assets,
                    liabilities=liabilities_val,
                    criminal_cases=criminal_cases,
                    image_url=image_url,
                ))
                imported += 1

        session.flush()
        print(f"Imported {imported} candidates")

        session.commit()

        # Summary
        print(f"\n=== Summary ===")
        n_real = session.query(Candidate).filter(
            Candidate.election_id == election.id, Candidate.is_nota == False
        ).count()
        n_nota = session.query(Candidate).filter(
            Candidate.election_id == election.id, Candidate.is_nota == True
        ).count()
        has_edu = session.query(Candidate).filter(
            Candidate.election_id == election.id, Candidate.education != None
        ).count()
        has_assets = session.query(Candidate).filter(
            Candidate.election_id == election.id, Candidate.declared_assets != None
        ).count()
        print(f"  Candidates: {n_real} real + {n_nota} NOTA")
        print(f"  With education: {has_edu}")
        print(f"  With assets: {has_assets}")

        print(f"\n=== Top Parties by Seats Won ===")
        winners = session.query(Candidate).filter(
            Candidate.election_id == election.id,
            Candidate.position == 1,
            Candidate.is_nota == False,
        ).all()
        party_seats = {}
        for w in winners:
            pname = w.party.abbr if w.party else "IND"
            party_seats[pname] = party_seats.get(pname, 0) + 1
        for p, s in sorted(party_seats.items(), key=lambda x: -x[1]):
            print(f"  {p}: {s} seats")


if __name__ == "__main__":
    run()
