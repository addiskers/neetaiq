"""
WB 2026 Election Prediction Model

Uses historical data (2011, 2016, 2021) to predict constituency-level winners.

Features per constituency (per major party):
  HISTORICAL:
    - vote_share_2011, vote_share_2016, vote_share_2021
    - won_2011, won_2016, won_2021 (binary)
    - margin_pct_2021 (winning/losing margin as % of votes)
    - vote_share_trend (linear slope across years)
    - incumbency (1 if won last election)
    - consecutive_wins (0, 1, 2, 3)

  CONSTITUENCY:
    - turnout_2011, turnout_2016, turnout_2021
    - turnout_trend
    - total_electors_2026
    - electors_growth (2026 vs 2021)
    - category (GEN/SC/ST one-hot)

  CANDIDATE 2026:
    - has_candidate (1 if party fielded candidate)
    - candidate_assets (log-scaled)
    - candidate_criminal_cases
    - candidate_age
    - candidate_education_level (ordinal)

  ANTI-INCUMBENCY:
    - same_party_years (how many consecutive years this party has won)
    - margin_shrinking (is margin decreasing over time)

Target: winner party for each AC (classification)

Training: use 2011→2016 prediction and 2016→2021 prediction as training data.
"""
import sys
import os
import json
import math
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session
from app.database import engine
from app.models.westbengal import Election, Constituency, Candidate, Party, District

from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report, accuracy_score

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "backend", "predictions_wb_2026.json")

EDUCATION_LEVELS = {
    "Illiterate": 0, "Literate": 1, "5th Pass": 2, "8th Pass": 3,
    "10th Pass": 4, "12th Pass": 5, "Graduate": 6, "Graduate Professional": 7,
    "Post Graduate": 8, "Doctorate": 9, "Others": 3,
}

MAJOR_PARTIES = ["AITC", "BJP", "INC", "CPI(M)", "AIFB", "RSP"]


def load_all_data():
    """Load all WB election data into structured dicts."""
    with Session(engine) as s:
        elections = {}
        for year in [2011, 2016, 2021, 2026]:
            e = s.query(Election).filter(Election.state == "West Bengal", Election.year == year).first()
            if not e:
                continue

            constituencies = {}
            for c in s.query(Constituency).filter(Constituency.election_id == e.id).all():
                cands = s.query(Candidate).filter(
                    Candidate.constituency_id == c.id, Candidate.is_nota == False
                ).all()

                cand_list = []
                for ca in cands:
                    cand_list.append({
                        "name": ca.name,
                        "party": ca.party.abbr if ca.party else "IND",
                        "votes": ca.votes_total or 0,
                        "position": ca.position,
                        "vote_pct": float(ca.vote_pct) if ca.vote_pct else 0,
                        "assets": ca.declared_assets,
                        "criminal_cases": ca.criminal_cases or 0,
                        "age": ca.age,
                        "education": ca.education,
                        "gender": ca.gender,
                    })

                constituencies[c.ac_no] = {
                    "name": c.name,
                    "district": c.district.name if c.district else "",
                    "category": c.category or "GEN",
                    "total_electors": c.total_electors,
                    "turnout_pct": float(c.turnout_pct) if c.turnout_pct else None,
                    "winning_margin": c.winning_margin,
                    "total_votes": c.total_votes_polled,
                    "candidates": cand_list,
                }

            elections[year] = constituencies

    return elections


def get_party_vote_share(constituency, party):
    """Get vote share for a specific party in a constituency."""
    for c in constituency.get("candidates", []):
        if c["party"] == party:
            return c["vote_pct"]
    return 0.0


def get_winner(constituency):
    """Get winning party for a constituency."""
    for c in constituency.get("candidates", []):
        if c["position"] == 1:
            return c["party"]
    return None


def edu_level(edu_str):
    """Convert education string to ordinal level."""
    if not edu_str:
        return 3  # default to middle
    edu_str = edu_str.strip()
    for key, val in EDUCATION_LEVELS.items():
        if key.lower() in edu_str.lower():
            return val
    return 3


def build_features(elections, target_year, ac_no, party):
    """Build feature vector for a (constituency, party) pair predicting target_year."""
    years = sorted([y for y in elections.keys() if y < target_year])
    if not years:
        return None

    features = {}

    # Historical vote shares and wins
    vote_shares = []
    wins = []
    margins = []
    turnouts = []

    for y in years:
        con = elections[y].get(ac_no, {})
        vs = get_party_vote_share(con, party)
        vote_shares.append(vs)
        winner = get_winner(con)
        won = 1 if winner == party else 0
        wins.append(won)

        # Margin
        if won and con.get("winning_margin") and con.get("total_votes"):
            margins.append(con["winning_margin"] / con["total_votes"] * 100)
        elif not won and con.get("winning_margin") and con.get("total_votes"):
            margins.append(-con["winning_margin"] / con["total_votes"] * 100)
        else:
            margins.append(0)

        turnouts.append(con.get("turnout_pct") or 0)

    # Pad to 3 years
    while len(vote_shares) < 3:
        vote_shares.insert(0, 0)
        wins.insert(0, 0)
        margins.insert(0, 0)
        turnouts.insert(0, 0)

    features["vote_share_y1"] = vote_shares[-3]
    features["vote_share_y2"] = vote_shares[-2]
    features["vote_share_y3"] = vote_shares[-1]
    features["won_y1"] = wins[-3]
    features["won_y2"] = wins[-2]
    features["won_y3"] = wins[-1]
    features["margin_pct_latest"] = margins[-1]

    # Vote share trend (slope)
    if len(vote_shares) >= 2:
        x = np.arange(len(vote_shares))
        if np.std(vote_shares) > 0:
            slope = np.polyfit(x, vote_shares, 1)[0]
        else:
            slope = 0
        features["vote_trend"] = slope
    else:
        features["vote_trend"] = 0

    # Incumbency
    features["incumbency"] = wins[-1]

    # Consecutive wins
    consec = 0
    for w in reversed(wins):
        if w:
            consec += 1
        else:
            break
    features["consecutive_wins"] = consec

    # Anti-incumbency signal
    if len(margins) >= 2:
        features["margin_shrinking"] = 1 if margins[-1] < margins[-2] else 0
    else:
        features["margin_shrinking"] = 0

    # Turnout features
    features["turnout_y1"] = turnouts[-3]
    features["turnout_y2"] = turnouts[-2]
    features["turnout_y3"] = turnouts[-1]
    if len(turnouts) >= 2:
        features["turnout_trend"] = turnouts[-1] - turnouts[-2]
    else:
        features["turnout_trend"] = 0

    # Constituency features
    target_con = elections.get(target_year, {}).get(ac_no, {})
    prev_con = elections.get(years[-1], {}).get(ac_no, {})

    cat = target_con.get("category") or prev_con.get("category") or "GEN"
    features["is_sc"] = 1 if cat == "SC" else 0
    features["is_st"] = 1 if cat == "ST" else 0

    target_electors = target_con.get("total_electors") or prev_con.get("total_electors") or 0
    prev_electors = prev_con.get("total_electors") or 0
    features["total_electors"] = target_electors / 100000  # in lakhs
    features["electors_growth"] = (target_electors - prev_electors) / max(prev_electors, 1) * 100

    # Candidate 2026 features
    cand_2026 = None
    for c in target_con.get("candidates", []):
        if c["party"] == party:
            cand_2026 = c
            break

    features["has_candidate"] = 1 if cand_2026 else 0
    if cand_2026:
        features["candidate_assets_log"] = math.log10(max(cand_2026.get("assets") or 1, 1))
        features["candidate_criminal"] = cand_2026.get("criminal_cases", 0)
        features["candidate_age"] = cand_2026.get("age") or 45
        features["candidate_edu"] = edu_level(cand_2026.get("education"))
    else:
        features["candidate_assets_log"] = 0
        features["candidate_criminal"] = 0
        features["candidate_age"] = 0
        features["candidate_edu"] = 0

    # Cross-party competition features
    total_candidates = len(target_con.get("candidates", []))
    features["total_candidates"] = total_candidates

    return features


def build_dataset(elections, target_year):
    """Build training dataset: features + labels for each (ac, party) pair."""
    X, y, meta = [], [], []

    for ac_no in range(1, 295):
        target_con = elections.get(target_year, {}).get(ac_no, {})
        winner = get_winner(target_con)
        if not winner:
            continue

        for party in MAJOR_PARTIES:
            features = build_features(elections, target_year, ac_no, party)
            if features is None:
                continue

            X.append(list(features.values()))
            y.append(1 if winner == party else 0)
            meta.append({"ac_no": ac_no, "party": party, "actual_winner": winner})

    return np.array(X), np.array(y), meta, list(features.keys()) if features else []


def predict_2026(elections):
    """Train on historical transitions and predict 2026."""
    print("=" * 60)
    print("WEST BENGAL 2026 ELECTION PREDICTION MODEL")
    print("=" * 60)

    # Build training data from 2011→2016 and 2016→2021 transitions
    print("\n[1/4] Building training data...")

    X_16, y_16, meta_16, feat_names = build_dataset(elections, 2016)
    X_21, y_21, meta_21, _ = build_dataset(elections, 2021)

    X_train = np.vstack([X_16, X_21])
    y_train = np.concatenate([y_16, y_21])

    print(f"  Training samples: {len(X_train)} ({len(X_16)} from 2016 + {len(X_21)} from 2021)")
    print(f"  Features: {len(feat_names)}")
    print(f"  Feature names: {feat_names}")
    print(f"  Positive rate: {y_train.mean():.1%}")

    # Train model
    print("\n[2/4] Training model...")
    model = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )

    # Cross-validation on training data
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="accuracy")
    print(f"  5-fold CV accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    # Train on full data
    model.fit(X_train, y_train)

    # Feature importance
    print("\n  Top 10 features:")
    importance = sorted(zip(feat_names, model.feature_importances_), key=lambda x: x[1], reverse=True)
    for name, imp in importance[:10]:
        print(f"    {name:25s} {imp:.4f}")

    # Validate on 2021 data (trained on 2016 only)
    print("\n[3/4] Validation on 2021 results...")
    model_val = GradientBoostingClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.1,
        subsample=0.8, min_samples_leaf=10, random_state=42,
    )
    model_val.fit(X_16, y_16)

    y_pred_21 = model_val.predict(X_21)
    y_prob_21 = model_val.predict_proba(X_21)[:, 1]

    # Reconstruct AC-level predictions for 2021
    ac_predictions_21 = {}
    for i, m in enumerate(meta_21):
        ac = m["ac_no"]
        if ac not in ac_predictions_21:
            ac_predictions_21[ac] = {"actual": m["actual_winner"], "parties": {}}
        ac_predictions_21[ac]["parties"][m["party"]] = y_prob_21[i]

    # Determine predicted winner per AC
    correct = 0
    total = 0
    party_correct = {}
    party_total = {}
    for ac, data in ac_predictions_21.items():
        actual = data["actual"]
        pred_party = max(data["parties"], key=data["parties"].get)
        if pred_party == actual:
            correct += 1
        total += 1
        party_total[actual] = party_total.get(actual, 0) + 1
        if pred_party == actual:
            party_correct[actual] = party_correct.get(actual, 0) + 1

    print(f"  AC-level accuracy (2021 validation): {correct}/{total} = {correct/total:.1%}")
    print(f"  Party-level accuracy:")
    for p in sorted(party_total.keys(), key=lambda x: party_total[x], reverse=True):
        c = party_correct.get(p, 0)
        t = party_total[p]
        print(f"    {p:10s}: {c}/{t} = {c/t:.0%}" if t > 0 else f"    {p}: 0")

    # Predict 2026
    print("\n[4/4] Predicting 2026...")
    predictions = {}
    for ac_no in range(1, 295):
        ac_probs = {}
        for party in MAJOR_PARTIES:
            features = build_features(elections, 2026, ac_no, party)
            if features is None:
                continue
            X_pred = np.array([list(features.values())])
            prob = model.predict_proba(X_pred)[0][1]
            ac_probs[party] = round(float(prob), 4)

        if not ac_probs:
            continue

        pred_party = max(ac_probs, key=ac_probs.get)
        con_2026 = elections.get(2026, {}).get(ac_no, {})
        con_2021 = elections.get(2021, {}).get(ac_no, {})

        predictions[ac_no] = {
            "ac_no": ac_no,
            "name": con_2026.get("name") or con_2021.get("name", ""),
            "district": con_2026.get("district") or con_2021.get("district", ""),
            "category": con_2026.get("category") or con_2021.get("category", "GEN"),
            "predicted_winner": pred_party,
            "confidence": round(ac_probs[pred_party], 3),
            "party_probabilities": ac_probs,
            "incumbent_2021": get_winner(con_2021),
            "swing": pred_party != get_winner(con_2021),
        }

    # Summary
    party_seats = {}
    high_confidence = 0
    swings = 0
    for p in predictions.values():
        pw = p["predicted_winner"]
        party_seats[pw] = party_seats.get(pw, 0) + 1
        if p["confidence"] >= 0.6:
            high_confidence += 1
        if p["swing"]:
            swings += 1

    print(f"\n{'='*60}")
    print("PREDICTED RESULTS - WEST BENGAL 2026")
    print(f"{'='*60}")
    for p, seats in sorted(party_seats.items(), key=lambda x: x[1], reverse=True):
        print(f"  {p:10s}: {seats:3d} seats")
    print(f"\n  High confidence (>60%): {high_confidence}/{len(predictions)}")
    print(f"  Predicted swings from 2021: {swings}")
    print(f"  Total constituencies: {len(predictions)}")

    # Save predictions
    output = {
        "model": "GradientBoosting",
        "training_years": [2016, 2021],
        "features_used": feat_names,
        "validation_accuracy_2021": round(correct / total, 4),
        "predicted_seats": party_seats,
        "predictions": list(predictions.values()),
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nPredictions saved to {OUTPUT_FILE}")

    return predictions


def main():
    print("Loading election data...")
    elections = load_all_data()
    print(f"Loaded {len(elections)} election years")
    predictions = predict_2026(elections)


if __name__ == "__main__":
    main()
