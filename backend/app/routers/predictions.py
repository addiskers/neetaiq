"""Predictions API — serves ML model predictions for upcoming elections."""
import os
import json
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

PREDICTIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "predictions_wb_2026.json")

_cache = {}


def _load_predictions():
    if "data" not in _cache:
        if os.path.exists(PREDICTIONS_FILE):
            with open(PREDICTIONS_FILE, "r") as f:
                _cache["data"] = json.load(f)
        else:
            _cache["data"] = None
    return _cache["data"]


@router.get("/summary")
def get_prediction_summary():
    """Overall prediction summary — seat counts, model info, confidence stats."""
    data = _load_predictions()
    if not data:
        return {"available": False}

    predictions = data["predictions"]
    high_conf = sum(1 for p in predictions if p["confidence"] >= 0.6)
    medium_conf = sum(1 for p in predictions if 0.4 <= p["confidence"] < 0.6)
    swings = sum(1 for p in predictions if p["swing"])

    return {
        "available": True,
        "model": data["model"],
        "validation_accuracy": data["validation_accuracy_2021"],
        "total_constituencies": len(predictions),
        "predicted_seats": data["predicted_seats"],
        "confidence_breakdown": {
            "high": high_conf,
            "medium": medium_conf,
            "low": len(predictions) - high_conf - medium_conf,
        },
        "total_swings": swings,
        "features_used": len(data["features_used"]),
    }


@router.get("/constituencies")
def get_constituency_predictions(
    party: Optional[str] = None,
    district: Optional[str] = None,
    swing_only: bool = False,
    min_confidence: float = Query(0, ge=0, le=1),
    sort_by: str = Query("ac_no", regex="^(ac_no|confidence|party)$"),
):
    """Per-constituency predictions with filtering."""
    data = _load_predictions()
    if not data:
        return []

    predictions = data["predictions"]

    if party:
        predictions = [p for p in predictions if p["predicted_winner"] == party.upper()]
    if district:
        predictions = [p for p in predictions if district.lower() in p.get("district", "").lower()]
    if swing_only:
        predictions = [p for p in predictions if p["swing"]]
    if min_confidence > 0:
        predictions = [p for p in predictions if p["confidence"] >= min_confidence]

    if sort_by == "confidence":
        predictions = sorted(predictions, key=lambda x: x["confidence"], reverse=True)
    elif sort_by == "party":
        predictions = sorted(predictions, key=lambda x: (x["predicted_winner"], -x["confidence"]))
    else:
        predictions = sorted(predictions, key=lambda x: x["ac_no"])

    return predictions


@router.get("/battlegrounds")
def get_battlegrounds(limit: int = Query(20)):
    """Constituencies with close predicted margins between top 2 parties."""
    data = _load_predictions()
    if not data:
        return []

    predictions = data["predictions"]
    battlegrounds = []
    for p in predictions:
        probs = p["party_probabilities"]
        sorted_probs = sorted(probs.values(), reverse=True)
        if len(sorted_probs) >= 2:
            gap = sorted_probs[0] - sorted_probs[1]
            top2 = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:2]
            battlegrounds.append({
                **p,
                "gap": round(gap, 4),
                "top2": [{"party": t[0], "prob": round(t[1], 3)} for t in top2],
            })

    battlegrounds = sorted(battlegrounds, key=lambda x: x["gap"])
    return battlegrounds[:limit]


@router.get("/swing-map")
def get_swing_map():
    """Predicted swings from 2021 — for map visualization."""
    data = _load_predictions()
    if not data:
        return []

    return [
        {
            "ac_no": p["ac_no"],
            "name": p["name"],
            "district": p["district"],
            "predicted_winner": p["predicted_winner"],
            "incumbent_2021": p["incumbent_2021"],
            "confidence": p["confidence"],
            "swing": p["swing"],
            "party_probabilities": p["party_probabilities"],
        }
        for p in data["predictions"]
    ]
