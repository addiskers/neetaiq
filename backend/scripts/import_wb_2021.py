"""
Import West Bengal 2021 election data.
Sources: WB -2021/10-Detailed Results.xlsx, 5-Performance of Political Parties.xlsx,
         6-Electors Data Summary.xlsx, 9-Candidate Data Summary.xlsx
"""
import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import openpyxl
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Election, District, Constituency, Party, Candidate

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "WB -2021")

# West Bengal 2021: AC number -> District mapping
# Source: Election Commission of India, WB 2021 delimitation
WB_AC_DISTRICT = {
    # Cooch Behar
    1: "Cooch Behar", 2: "Cooch Behar", 3: "Cooch Behar", 4: "Cooch Behar",
    5: "Cooch Behar", 6: "Cooch Behar", 7: "Cooch Behar", 8: "Cooch Behar", 9: "Cooch Behar",
    # Alipurduar
    10: "Alipurduar", 11: "Alipurduar", 12: "Alipurduar",
    # Jalpaiguri
    13: "Jalpaiguri", 14: "Jalpaiguri", 15: "Jalpaiguri", 16: "Jalpaiguri",
    17: "Jalpaiguri", 18: "Jalpaiguri", 19: "Jalpaiguri",
    # Darjeeling
    20: "Darjeeling", 21: "Darjeeling", 22: "Darjeeling", 23: "Darjeeling",
    24: "Darjeeling", 25: "Darjeeling",
    # Kalimpong
    26: "Kalimpong",
    # Uttar Dinajpur
    27: "Uttar Dinajpur", 28: "Uttar Dinajpur", 29: "Uttar Dinajpur",
    30: "Uttar Dinajpur", 31: "Uttar Dinajpur", 32: "Uttar Dinajpur",
    33: "Uttar Dinajpur", 34: "Uttar Dinajpur", 35: "Uttar Dinajpur",
    # Dakshin Dinajpur
    36: "Dakshin Dinajpur", 37: "Dakshin Dinajpur", 38: "Dakshin Dinajpur",
    39: "Dakshin Dinajpur", 40: "Dakshin Dinajpur", 41: "Dakshin Dinajpur",
    # Malda
    42: "Malda", 43: "Malda", 44: "Malda", 45: "Malda", 46: "Malda",
    47: "Malda", 48: "Malda", 49: "Malda", 50: "Malda",
    51: "Malda", 52: "Malda", 53: "Malda",
    # Murshidabad
    54: "Murshidabad", 55: "Murshidabad", 56: "Murshidabad", 57: "Murshidabad",
    58: "Murshidabad", 59: "Murshidabad", 60: "Murshidabad", 61: "Murshidabad",
    62: "Murshidabad", 63: "Murshidabad", 64: "Murshidabad", 65: "Murshidabad",
    66: "Murshidabad", 67: "Murshidabad", 68: "Murshidabad", 69: "Murshidabad",
    70: "Murshidabad", 71: "Murshidabad", 72: "Murshidabad", 73: "Murshidabad",
    74: "Murshidabad", 75: "Murshidabad",
    # Birbhum
    76: "Birbhum", 77: "Birbhum", 78: "Birbhum", 79: "Birbhum",
    80: "Birbhum", 81: "Birbhum", 82: "Birbhum", 83: "Birbhum",
    84: "Birbhum", 85: "Birbhum", 86: "Birbhum",
    293: "Birbhum", 294: "Birbhum",
    # Jhargram
    87: "Jhargram", 88: "Jhargram",
    # Paschim Medinipur
    89: "Paschim Medinipur", 90: "Paschim Medinipur", 91: "Paschim Medinipur",
    92: "Paschim Medinipur", 93: "Paschim Medinipur", 94: "Paschim Medinipur",
    95: "Paschim Medinipur", 96: "Paschim Medinipur", 97: "Paschim Medinipur",
    98: "Paschim Medinipur", 99: "Paschim Medinipur", 100: "Paschim Medinipur",
    101: "Paschim Medinipur",
    # Purba Medinipur
    102: "Purba Medinipur", 103: "Purba Medinipur", 104: "Purba Medinipur",
    105: "Purba Medinipur", 106: "Purba Medinipur", 107: "Purba Medinipur",
    108: "Purba Medinipur", 109: "Purba Medinipur", 110: "Purba Medinipur",
    111: "Purba Medinipur", 112: "Purba Medinipur", 113: "Purba Medinipur",
    114: "Purba Medinipur", 115: "Purba Medinipur", 116: "Purba Medinipur",
    # Bankura
    117: "Bankura", 118: "Bankura", 119: "Bankura", 120: "Bankura",
    121: "Bankura", 122: "Bankura", 123: "Bankura", 124: "Bankura",
    125: "Bankura", 126: "Bankura", 127: "Bankura", 128: "Bankura",
    # Purulia
    129: "Purulia", 130: "Purulia", 131: "Purulia", 132: "Purulia",
    133: "Purulia", 134: "Purulia", 135: "Purulia", 136: "Purulia",
    137: "Purulia",
    # Bardhaman (Purba)
    138: "Purba Bardhaman", 139: "Purba Bardhaman", 140: "Purba Bardhaman",
    141: "Purba Bardhaman", 142: "Purba Bardhaman", 143: "Purba Bardhaman",
    144: "Purba Bardhaman", 145: "Purba Bardhaman", 146: "Purba Bardhaman",
    147: "Purba Bardhaman", 148: "Purba Bardhaman", 149: "Purba Bardhaman",
    150: "Purba Bardhaman", 151: "Purba Bardhaman", 152: "Purba Bardhaman",
    # Paschim Bardhaman
    153: "Paschim Bardhaman", 154: "Paschim Bardhaman", 155: "Paschim Bardhaman",
    156: "Paschim Bardhaman", 157: "Paschim Bardhaman", 158: "Paschim Bardhaman",
    159: "Paschim Bardhaman",
    # Nadia
    160: "Nadia", 161: "Nadia", 162: "Nadia", 163: "Nadia",
    164: "Nadia", 165: "Nadia", 166: "Nadia", 167: "Nadia",
    168: "Nadia", 169: "Nadia", 170: "Nadia", 171: "Nadia",
    172: "Nadia", 173: "Nadia", 174: "Nadia", 175: "Nadia",
    176: "Nadia",
    # North 24 Parganas
    177: "North 24 Parganas", 178: "North 24 Parganas", 179: "North 24 Parganas",
    180: "North 24 Parganas", 181: "North 24 Parganas", 182: "North 24 Parganas",
    183: "North 24 Parganas", 184: "North 24 Parganas", 185: "North 24 Parganas",
    186: "North 24 Parganas", 187: "North 24 Parganas", 188: "North 24 Parganas",
    189: "North 24 Parganas", 190: "North 24 Parganas", 191: "North 24 Parganas",
    192: "North 24 Parganas", 193: "North 24 Parganas", 194: "North 24 Parganas",
    195: "North 24 Parganas", 196: "North 24 Parganas", 197: "North 24 Parganas",
    198: "North 24 Parganas", 199: "North 24 Parganas", 200: "North 24 Parganas",
    201: "North 24 Parganas", 202: "North 24 Parganas", 203: "North 24 Parganas",
    204: "North 24 Parganas", 205: "North 24 Parganas", 206: "North 24 Parganas",
    207: "North 24 Parganas", 208: "North 24 Parganas", 209: "North 24 Parganas",
    210: "North 24 Parganas",
    # Howrah
    211: "Howrah", 212: "Howrah", 213: "Howrah", 214: "Howrah",
    215: "Howrah", 216: "Howrah", 217: "Howrah", 218: "Howrah",
    219: "Howrah", 220: "Howrah", 221: "Howrah", 222: "Howrah",
    223: "Howrah", 224: "Howrah", 225: "Howrah", 226: "Howrah",
    # Hooghly
    227: "Hooghly", 228: "Hooghly", 229: "Hooghly", 230: "Hooghly",
    231: "Hooghly", 232: "Hooghly", 233: "Hooghly", 234: "Hooghly",
    235: "Hooghly", 236: "Hooghly", 237: "Hooghly", 238: "Hooghly",
    239: "Hooghly", 240: "Hooghly", 241: "Hooghly", 242: "Hooghly",
    243: "Hooghly", 244: "Hooghly",
    # Kolkata
    245: "Kolkata", 246: "Kolkata", 247: "Kolkata", 248: "Kolkata",
    249: "Kolkata", 250: "Kolkata", 251: "Kolkata", 252: "Kolkata",
    253: "Kolkata", 254: "Kolkata", 255: "Kolkata",
    # South 24 Parganas
    256: "South 24 Parganas", 257: "South 24 Parganas", 258: "South 24 Parganas",
    259: "South 24 Parganas", 260: "South 24 Parganas", 261: "South 24 Parganas",
    262: "South 24 Parganas", 263: "South 24 Parganas", 264: "South 24 Parganas",
    265: "South 24 Parganas", 266: "South 24 Parganas", 267: "South 24 Parganas",
    268: "South 24 Parganas", 269: "South 24 Parganas", 270: "South 24 Parganas",
    271: "South 24 Parganas", 272: "South 24 Parganas", 273: "South 24 Parganas",
    274: "South 24 Parganas", 275: "South 24 Parganas", 276: "South 24 Parganas",
    277: "South 24 Parganas", 278: "South 24 Parganas", 279: "South 24 Parganas",
    280: "South 24 Parganas", 281: "South 24 Parganas", 282: "South 24 Parganas",
    283: "South 24 Parganas", 284: "South 24 Parganas", 285: "South 24 Parganas",
    286: "South 24 Parganas", 287: "South 24 Parganas", 288: "South 24 Parganas",
    289: "South 24 Parganas", 290: "South 24 Parganas", 291: "South 24 Parganas",
    292: "South 24 Parganas",
}


def import_wb_2021():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if WB 2021 already exists
        existing = db.query(Election).filter_by(year=2021, state="West Bengal").first()
        if existing:
            print("West Bengal 2021 already imported. Skipping.")
            return

        # Step 1: Create election
        print("\n[1/5] Creating West Bengal 2021 election record...")
        election = Election(
            year=2021,
            election_name="West Bengal Legislative Assembly Election 2021",
            election_type="AC - GENERAL",
            state="West Bengal",
        )
        db.add(election)
        db.flush()
        print(f"  Election ID: {election.id}")

        # Step 2: Load detailed results and import districts & constituencies
        print("\n[2/5] Importing districts & constituencies...")
        detailed = _load_detailed_results()
        district_map = _import_districts(db, election.id, detailed)
        constituency_map = _import_constituencies(db, election.id, detailed, district_map)
        print(f"  Districts: {len(district_map)}, Constituencies: {len(constituency_map)}")

        # Step 3: Ensure parties exist
        print("\n[3/5] Ensuring parties exist...")
        party_map = _ensure_parties(db)
        print(f"  Total parties: {len(party_map)}")

        # Step 4: Import candidates
        print("\n[4/5] Importing candidates...")
        cand_count = _import_candidates(db, election.id, detailed, constituency_map, party_map)
        print(f"  Imported {cand_count} candidates")

        # Step 5: Mark winners (first candidate per AC sorted by votes)
        print("\n[5/5] Marking winners...")
        _mark_winners(db, election.id, detailed, constituency_map)

        db.commit()
        print("\n=== West Bengal 2021 Import Complete! ===")
        _print_summary(db, election.id)

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()


def _load_detailed_results() -> list:
    """Load 10-Detailed Results.xlsx into list of dicts."""
    path = os.path.join(DATA_DIR, "10-Detailed Results.xlsx")
    wb = openpyxl.load_workbook(path, read_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    headers = rows[0]
    data = []
    for r in rows[1:]:
        d = dict(zip(headers, r))
        data.append(d)
    wb.close()
    return data


def _parse_int(val) -> int | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return int(val)
    s = str(val).replace(",", "").replace(" ", "").strip()
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _parse_float(val) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace(",", "").replace("%", "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _import_districts(db: Session, election_id: int, detailed: list) -> dict:
    """Create districts for WB 2021. Returns {district_name_lower: district_id}."""
    # Get unique districts from AC mapping
    district_names = set()
    for row in detailed:
        ac_no = _parse_int(row.get("AC NO."))
        if ac_no and ac_no in WB_AC_DISTRICT:
            district_names.add(WB_AC_DISTRICT[ac_no])

    district_map = {}
    for name in sorted(district_names):
        district = District(
            election_id=election_id,
            name=name,
            name_previous=None,
            rename_status=None,
        )
        db.add(district)
        db.flush()
        district_map[name.lower()] = district.id

    return district_map


def _import_constituencies(db: Session, election_id: int, detailed: list, district_map: dict) -> dict:
    """Import constituencies from detailed results. Returns {ac_number: constituency_id}."""
    # Collect per-AC data
    ac_data = {}
    for row in detailed:
        ac_no = _parse_int(row.get("AC NO."))
        if not ac_no:
            continue
        ac_name = str(row.get("AC NAME", "")).strip()
        total_electors = _parse_int(row.get("TOTAL ELECTORS"))
        total_votes = _parse_int(row.get("TOTAL"))
        vote_pct = _parse_float(row.get("% VOTES POLLED"))

        if ac_no not in ac_data:
            ac_data[ac_no] = {
                "ac_name": ac_name,
                "total_electors": total_electors,
                "total_votes": 0,
                "candidates": [],
            }
        # Sum up votes for turnout calculation
        if total_votes:
            ac_data[ac_no]["total_votes"] += total_votes
            ac_data[ac_no]["candidates"].append({
                "name": str(row.get("CANDIDATE NAME", "")).strip(),
                "party": str(row.get("PARTY", "")).strip(),
                "votes": total_votes,
            })

    constituency_map = {}
    for ac_no, info in sorted(ac_data.items()):
        district_name = WB_AC_DISTRICT.get(ac_no, "West Bengal")
        district_id = district_map.get(district_name.lower())
        if not district_id:
            print(f"  WARNING: District '{district_name}' not found for AC {ac_no}")
            continue

        # Determine winner and margin
        candidates = sorted(info["candidates"], key=lambda x: x["votes"], reverse=True)
        winner_party = candidates[0]["party"] if candidates else None
        margin = None
        if len(candidates) >= 2:
            margin = candidates[0]["votes"] - candidates[1]["votes"]

        # Calculate turnout
        turnout = None
        if info["total_electors"] and info["total_votes"]:
            turnout = round(info["total_votes"] / info["total_electors"] * 100, 2)

        constituency = Constituency(
            election_id=election_id,
            district_id=district_id,
            ac_number=ac_no,
            name=info["ac_name"],
            total_electors=info["total_electors"],
            total_votes=info["total_votes"],
            turnout_percentage=turnout,
            ruling_party=winner_party,
            winning_margin=margin,
            swing_status="Safe" if (margin and margin > 20000) else "Swing" if margin else "Stable",
        )
        db.add(constituency)
        db.flush()
        constituency_map[ac_no] = constituency.id

    return constituency_map


def _ensure_parties(db: Session) -> dict:
    """Get existing parties + add any missing from WB 2021 data. Returns {abbr: party_id}."""
    existing = db.query(Party).all()
    party_map = {}
    for p in existing:
        party_map[p.name] = p.id
        if p.short_name:
            party_map[p.short_name] = p.id

    # WB major party full names
    abbr_to_full = {
        "AITC": "All India Trinamool Congress",
        "BJP": "Bharatiya Janata Party",
        "BSP": "Bahujan Samaj Party",
        "CPI": "Communist Party of India",
        "CPI(M)": "Communist Party of India (Marxist)",
        "INC": "Indian National Congress",
        "AIFB": "All India Forward Bloc",
        "RSP": "Revolutionary Socialist Party",
        "AIMIM": "All India Majlis-E-Ittehadul Muslimeen",
        "CPI(ML)(L)": "Communist Party of India (Marxist-Leninist) (Liberation)",
        "JD(U)": "Janata Dal (United)",
        "LJP": "Lok Janshakti Party",
        "SUCI": "Socialist Unity Centre of India (Communist)",
        "AMB": "Ambedkarite Party of India",
        "IND": "Independent",
        "BMUP": "Bharatiya Momin United Party",
        "NPEP": "National People's Party",
        "IUML": "Indian Union Muslim League",
        "SDPI": "Social Democratic Party of India",
        "AJSUP": "All Jharkhand Students Union Party",
    }

    # Load all unique parties from detailed results
    path = os.path.join(DATA_DIR, "10-Detailed Results.xlsx")
    wb = openpyxl.load_workbook(path, read_only=True)
    rows = list(wb.active.iter_rows(values_only=True))

    party_abbrs = set()
    for r in rows[1:]:
        if r[7]:
            party_abbrs.add(str(r[7]).strip())

    for abbr in sorted(party_abbrs):
        if abbr == "NOTA":
            continue
        if abbr in party_map:
            continue

        full_name = abbr_to_full.get(abbr, abbr)
        # Check if full name already exists
        if full_name in party_map:
            party_map[abbr] = party_map[full_name]
            continue

        # Check by short_name in DB
        existing_p = db.query(Party).filter(Party.short_name == abbr).first()
        if existing_p:
            party_map[full_name] = existing_p.id
            party_map[abbr] = existing_p.id
        else:
            p = Party(name=full_name, short_name=abbr, color="#A9A9A9")
            db.add(p)
            db.flush()
            party_map[full_name] = p.id
            party_map[abbr] = p.id
            print(f"  Added party: {abbr} = {full_name}")

    wb.close()
    return party_map


def _import_candidates(db: Session, election_id: int, detailed: list, constituency_map: dict, party_map: dict) -> int:
    """Import candidates from detailed results."""
    count = 0
    for row in detailed:
        ac_no = _parse_int(row.get("AC NO."))
        if not ac_no:
            continue

        raw_name = str(row.get("CANDIDATE NAME", "")).strip()
        if not raw_name:
            continue

        # Strip leading number: "1 BIJOY MALAKAR" -> "BIJOY MALAKAR"
        name = re.sub(r'^\d+\s+', '', raw_name).strip()
        if name == "NOTA":
            continue

        sex = str(row.get("SEX", "")).strip() if row.get("SEX") else None
        age = _parse_int(row.get("AGE"))
        category = str(row.get("CATEGORY", "")).strip() if row.get("CATEGORY") else None
        party_abbr = str(row.get("PARTY", "")).strip() if row.get("PARTY") else None
        total_votes = _parse_int(row.get("TOTAL"))
        vote_pct = _parse_float(row.get("% VOTES POLLED"))

        constituency_id = constituency_map.get(ac_no)
        if not constituency_id:
            continue

        party_id = party_map.get(party_abbr)
        if not party_id:
            for k, v in party_map.items():
                if party_abbr and party_abbr.lower() in k.lower():
                    party_id = v
                    break
            if not party_id:
                print(f"  WARNING: Party '{party_abbr}' not found for {name}")
                continue

        gender = None
        if sex:
            if sex.upper() in ("MALE", "M"):
                gender = "Male"
            elif sex.upper() in ("FEMALE", "F"):
                gender = "Female"
            else:
                gender = "Other"

        candidate = Candidate(
            election_id=election_id,
            constituency_id=constituency_id,
            party_id=party_id,
            name=name,
            status="Accepted",
            is_contesting=True,
            age=age,
            gender=gender,
            category=category,
            votes=total_votes,
            vote_percentage=vote_pct,
        )
        db.add(candidate)
        count += 1

    db.flush()
    return count


def _mark_winners(db: Session, election_id: int, detailed: list, constituency_map: dict):
    """Mark winning candidates (highest votes per constituency) as incumbent with position."""
    from collections import defaultdict

    # Group candidates by AC
    ac_candidates = defaultdict(list)
    for row in detailed:
        ac_no = _parse_int(row.get("AC NO."))
        if not ac_no:
            continue
        raw_name = str(row.get("CANDIDATE NAME", "")).strip()
        name = re.sub(r'^\d+\s+', '', raw_name).strip()
        if name == "NOTA":
            continue
        total_votes = _parse_int(row.get("TOTAL")) or 0
        ac_candidates[ac_no].append((name, total_votes))

    for ac_no, cands in ac_candidates.items():
        constituency_id = constituency_map.get(ac_no)
        if not constituency_id:
            continue

        # Sort by votes descending
        cands_sorted = sorted(cands, key=lambda x: x[1], reverse=True)

        # Get all candidates for this constituency from DB
        db_candidates = db.query(Candidate).filter(
            Candidate.constituency_id == constituency_id,
            Candidate.election_id == election_id,
        ).all()

        for pos, (cand_name, _votes) in enumerate(cands_sorted, 1):
            for c in db_candidates:
                if c.name.upper() == cand_name.upper() or cand_name.upper() in c.name.upper() or c.name.upper() in cand_name.upper():
                    c.position = pos
                    if pos == 1:
                        c.is_incumbent = True
                    break


def _print_summary(db: Session, election_id: int):
    print(f"\n--- Summary for Election ID {election_id} (WB 2021) ---")
    print(f"  Districts:       {db.query(District).filter_by(election_id=election_id).count()}")
    print(f"  Constituencies:  {db.query(Constituency).filter_by(election_id=election_id).count()}")
    print(f"  Parties:         {db.query(Party).count()}")
    print(f"  Candidates:      {db.query(Candidate).filter_by(election_id=election_id).count()}")
    winners = db.query(Candidate).filter_by(election_id=election_id, is_incumbent=True).count()
    print(f"  Winners marked:  {winners}")


if __name__ == "__main__":
    import_wb_2021()
