"""Patch assets/liabilities from JSON for Assam 2021 and Tamil Nadu 2016.

Both elections have JSON profiles with full assets_summary data but either
no matching or incomplete matching was done at import time.

Usage: cd backend && python -m scripts.patch_assets
"""
import sys, os, re, json
from collections import defaultdict
from difflib import SequenceMatcher
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session, joinedload
from app.database import engine

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().upper())


def _name_score(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if sorted(a) == sorted(b):
        return 0.99
    if (a in b or b in a) and min(len(a), len(b)) >= 5:
        return 0.95
    return SequenceMatcher(None, a, b).ratio()


def parse_rupees(val) -> int | None:
    if not val or str(val).strip() in ("", "Nil", "Rs\xa00 ~", "Rs 0 ~"):
        return None
    cleaned = re.sub(r"[Rs\s\xa0,~]", "", str(val))
    cleaned = cleaned.split("Lac")[0].split("Cr")[0].strip()
    m = re.match(r"^([\d.]+)", cleaned)
    if not m:
        return None
    v = int(float(m.group(1)))
    return v if v > 0 else None


def patch_from_json(session, Election, Constituency, Candidate, state, year,
                    json_path, only_null=True):
    """Match JSON profiles to DB candidates and update assets/liabilities.

    Args:
        only_null: if True, only update candidates that currently have NULL assets.
    """
    election = session.query(Election).filter_by(state=state, year=year).first()
    if not election:
        print(f"  {state} {year}: not found in DB")
        return

    with open(json_path, encoding="utf-8") as f:
        profiles = json.load(f)

    # Load candidates (with constituency eagerly)
    candidates = (
        session.query(Candidate)
        .options(joinedload(Candidate.constituency))
        .filter_by(election_id=election.id, is_nota=False)
        .all()
    )

    # Build per-AC lookup: norm_ac → [(norm_name, Candidate)]
    ac_cand_map: dict[str, list] = defaultdict(list)
    for c in candidates:
        if only_null and c.declared_assets is not None:
            continue
        norm_ac = _norm(c.constituency.name)
        ac_cand_map[norm_ac].append((_norm(c.name), c))

    total_candidates_eligible = sum(len(v) for v in ac_cand_map.values())
    print(f"  {state} {year}: {len(candidates)} total, "
          f"{total_candidates_eligible} eligible for update, {len(profiles)} JSON profiles")

    updated = skipped_no_assets = no_match = 0

    for profile in profiles:
        cp = profile.get("candidate_profile", {})
        summary = profile.get("assets_summary", {})

        assets = parse_rupees(summary.get("total_assets"))
        liabilities = parse_rupees(summary.get("total_liabilities"))

        if not assets and not liabilities:
            skipped_no_assets += 1
            continue

        json_ac = _norm(cp.get("ac_name", ""))
        json_name = _norm(cp.get("name", ""))

        # Find matching AC: exact first, then fuzzy
        ac_cands = ac_cand_map.get(json_ac, [])
        if not ac_cands:
            best_ac = None
            best_ac_score = 0.0
            for ac in ac_cand_map:
                s = SequenceMatcher(None, json_ac, ac).ratio()
                if s > best_ac_score:
                    best_ac_score, best_ac = s, ac
            if best_ac and best_ac_score >= 0.80:
                ac_cands = ac_cand_map[best_ac]

        if not ac_cands:
            no_match += 1
            continue

        # Find best candidate name match within AC
        best_score, best_cand = 0.0, None
        for norm_cn, c in ac_cands:
            score = _name_score(json_name, norm_cn)
            if score > best_score:
                best_score, best_cand = score, c

        if best_cand and best_score >= 0.82:
            best_cand.declared_assets = assets
            best_cand.liabilities = liabilities
            updated += 1
        else:
            no_match += 1

    session.commit()
    print(f"  => Updated: {updated}, no JSON assets: {skipped_no_assets}, unmatched: {no_match}")


def run():
    # ── Assam 2021 ──────────────────────────────────────────────────────────────
    print("Patching Assam 2021...")
    from app.models.assam import (
        AssamElection as Election, AssamConstituency as Constituency,
        AssamCandidate as Candidate,
    )
    with Session(engine) as session:
        patch_from_json(session, Election, Constituency, Candidate, "Assam", 2021,
                        os.path.join(PROJECT_ROOT, "assam2021", "structured_output_2021.json"))

    # ── Tamil Nadu 2016 ─────────────────────────────────────────────────────────
    print("Patching Tamil Nadu 2016...")
    from app.models.tamilnadu import (
        TamilNaduElection as Election, TamilNaduConstituency as Constituency,
        TamilNaduCandidate as Candidate,
    )
    with Session(engine) as session:
        patch_from_json(session, Election, Constituency, Candidate, "Tamil Nadu", 2016,
                        os.path.join(PROJECT_ROOT, "tamil_nadu", "Tamil Nadu_2016",
                                     "my_neta_2016_candidate_profile.json"))

    # ── Puducherry 2016 ─────────────────────────────────────────────────────────
    print("Patching Puducherry 2016...")
    from app.models.puducherry import (
        PuducherryElection as Election, PuducherryConstituency as Constituency,
        PuducherryCandidate as Candidate,
    )
    with Session(engine) as session:
        patch_from_json(session, Election, Constituency, Candidate, "Puducherry", 2016,
                        os.path.join(PROJECT_ROOT, "puducherry", "Puducherry_2016",
                                     "my_neta_2016_candidate_profile.json"))

    # ── Goa 2012 / 2017 / 2022 ──────────────────────────────────────────────────
    from app.models.goa import (
        GoaElection as Election, GoaConstituency as Constituency,
        GoaCandidate as Candidate,
    )
    for year, json_name in [
        (2012, "2012_candidate_profile.json"),
        (2017, "2017_candidate_profile.json"),
        (2022, "2022_candidate_profile.json"),
    ]:
        print(f"Patching Goa {year}...")
        with Session(engine) as session:
            patch_from_json(session, Election, Constituency, Candidate, "Goa", year,
                            os.path.join(PROJECT_ROOT, "Goa", f"Goa_{year}", json_name))


if __name__ == "__main__":
    run()
