"""
Live Election router — scrapes ECI results in real-time.
URL patterns:
  partywiseresult-{CODE}.htm   → party tally
  statewise{CODE}{1..N}.htm    → constituency-level results (paginated)
"""
import asyncio
import re
import time
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/live-election", tags=["live-election"])

# ── Config ─────────────────────────────────────────────────────────────────
ECI_BASE = "https://results.eci.gov.in/ResultAcGenMay2026"

STATE_CONFIG: dict[str, dict] = {
    "S03": {"name": "Assam", "total_ac": 126},
    "S11": {"name": "Kerala", "total_ac": 140},
    "U07": {"name": "Puducherry", "total_ac": 30},
    "S22": {"name": "Tamil Nadu", "total_ac": 234},
    "S25": {"name": "West Bengal", "total_ac": 294},
}

# Reverse lookup: state name → code
_NAME_TO_CODE = {v["name"]: k for k, v in STATE_CONFIG.items()}

PARTY_COLORS: dict[str, str] = {
    "BJP": "#f97316", "AITC": "#1bbb65", "INC": "#2563eb",
    "ADMK": "#d97706", "DMK": "#dc2626", "TVK": "#7c3aed",
    "CPI(M)": "#b91c1c", "CPI": "#ef4444", "IUML": "#0d9488",
    "KEC": "#16a34a", "KEC(M)": "#065f46", "AGP": "#0891b2",
    "BOPF": "#6d28d9", "AINRC": "#9d4700", "PMK": "#15803d",
    "BGPM": "#1d4ed8", "AIUDF": "#047857", "RSP": "#6d28d9",
    "JMM": "#92400e", "BSP": "#3b82f6", "NCP": "#a21caf",
    "ASMJTYP": "#0369a1", "DMDK": "#92400e", "IND": "#64748b",
}

CACHE_TTL = 60
_cache: dict = {}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": f"{ECI_BASE}/index.htm",
}


# ── Cache ──────────────────────────────────────────────────────────────────
def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data):
    _cache[key] = {"ts": time.time(), "data": data}


# ── HTTP ───────────────────────────────────────────────────────────────────
async def _fetch_html(client: httpx.AsyncClient, url: str) -> BeautifulSoup:
    resp = await client.get(url, headers=HEADERS)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


# ── Helpers ────────────────────────────────────────────────────────────────
def _party_color(short: str) -> str:
    s = short.upper().strip()
    if s in PARTY_COLORS:
        return PARTY_COLORS[s]
    for k, v in PARTY_COLORS.items():
        if k.replace("(", "").replace(")", "") == s.replace("(", "").replace(")", ""):
            return v
    return "#64748b"


def _short_name(full: str) -> str:
    """Extract short name from 'Full Party Name - SHORT'."""
    return full.split("-")[-1].strip() if "-" in full else full.strip()


def _to_int(val: str) -> Optional[int]:
    val = val.replace(",", "").strip()
    return int(val) if val.isdigit() else None


def _parse_last_updated(soup: BeautifulSoup) -> Optional[str]:
    for text in soup.stripped_strings:
        if "Last Updated" in text:
            return text.strip()
    return None


def _discover_total_pages(soup: BeautifulSoup, state_code: str) -> int:
    """Find the highest statewise page number from pagination links."""
    pattern = re.compile(
        rf"statewise{re.escape(state_code)}(\d+)\.htm", re.IGNORECASE
    )
    max_page = 1
    for a in soup.find_all("a", href=True):
        m = pattern.search(a["href"])
        if m:
            max_page = max(max_page, int(m.group(1)))
    return max_page


# ── Parsers ────────────────────────────────────────────────────────────────
def _parse_parties(soup: BeautifulSoup) -> list:
    """Parse party-wise results table.
    Columns: Party Name | Won | Leading | Total
    """
    parties = []
    seen: set = set()
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) < 4:
                continue
            party_full = cells[0].strip()
            if not party_full or party_full.lower() in ("party name", "party", ""):
                continue
            if not any(c.isdigit() for c in cells[1:4]):
                continue
            won = _to_int(cells[1]) or 0
            leading = _to_int(cells[2]) or 0
            total = _to_int(cells[3]) or 0
            if party_full in seen:
                continue
            seen.add(party_full)
            short = _short_name(party_full)
            parties.append({
                "party": party_full,
                "short": short,
                "won": won,
                "leading": leading,
                "total": total,
                "color": _party_color(short),
            })
    return sorted(parties, key=lambda x: x["total"], reverse=True)


def _parse_constituencies(soup: BeautifulSoup) -> list:
    """Parse one statewise page.
    Columns: AC Name | No | Lead Cand | Lead Party | Trail Cand | Trail Party | Margin | Rounds | Status

    Key filter: cells[1] MUST be a valid integer (AC number).
    This skips the nested 'Party Wise State Trends' sub-tables
    and other metadata rows inside each constituency card.
    """
    items = []
    skip_names = {
        "constituency", "ac name", "ac no", "", "sn", "s.no",
        "party wise state trends", "leading in", "won in",
        "trailing in", "party name", "party",
    }
    seen_ac: set = set()

    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) < 3:
                continue

            name = cells[0].strip()
            if not name or name.lower() in skip_names:
                continue

            # AC number in cells[1] is REQUIRED — this is the key filter
            # that separates real constituency rows from nested sub-tables
            if len(cells) < 2:
                continue
            const_no = _to_int(cells[1])
            if const_no is None:
                continue

            # Sanity: AC numbers are typically 1-300
            if const_no < 1 or const_no > 500:
                continue

            # Deduplicate: only keep first occurrence of each AC
            if const_no in seen_ac:
                continue
            seen_ac.add(const_no)

            leading_candidate = cells[2].strip() if len(cells) > 2 else ""
            leading_party_full = cells[3].strip() if len(cells) > 3 else ""
            trailing_candidate = cells[4].strip() if len(cells) > 4 else ""
            trailing_party = cells[5].strip() if len(cells) > 5 else ""
            margin_str = cells[6].strip() if len(cells) > 6 else "-"
            rounds = cells[7].strip() if len(cells) > 7 else "-"
            status = cells[8].strip() if len(cells) > 8 else "Result in Progress"
            margin = _to_int(margin_str) if margin_str not in ("-", "") else None
            lp_short = _short_name(leading_party_full)
            items.append({
                "const_no": const_no,
                "name": name,
                "leading_candidate": leading_candidate,
                "leading_party": leading_party_full,
                "leading_party_short": lp_short,
                "trailing_candidate": trailing_candidate,
                "trailing_party": trailing_party,
                "margin": margin,
                "rounds": rounds,
                "status": status,
                "party_color": _party_color(lp_short),
            })
    return items


# ── Main data builder ──────────────────────────────────────────────────────
async def _get_all_data(state_code: str) -> dict:
    code = state_code.upper()
    if code not in STATE_CONFIG:
        raise ValueError(
            f"Unsupported state '{code}'. Supported: {', '.join(STATE_CONFIG)}"
        )

    cached = _cache_get(f"all_{code}")
    if cached:
        return cached

    cfg = STATE_CONFIG[code]
    partywise_url = f"{ECI_BASE}/partywiseresult-{code}.htm"
    statewise_p1 = f"{ECI_BASE}/statewise{code}1.htm"

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        party_soup, p1_soup = await asyncio.gather(
            _fetch_html(client, partywise_url),
            _fetch_html(client, statewise_p1),
        )
        total_pages = _discover_total_pages(p1_soup, code)
        remaining_urls = [
            f"{ECI_BASE}/statewise{code}{p}.htm"
            for p in range(2, total_pages + 1)
        ]
        rest_soups = await asyncio.gather(
            *[_fetch_html(client, u) for u in remaining_urls]
        )

    parties = _parse_parties(party_soup)
    last_updated = _parse_last_updated(party_soup)

    constituencies: list = _parse_constituencies(p1_soup)
    for soup in rest_soups:
        constituencies.extend(_parse_constituencies(soup))

    result = {
        "state": cfg["name"],
        "state_code": code,
        "total_ac": cfg["total_ac"],
        "parties": parties,
        "constituencies": constituencies,
        "last_updated": last_updated,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
    }
    _cache_set(f"all_{code}", result)
    return result


def _resolve_state_code(state: str) -> str:
    """Accept either state code (S25) or name (West Bengal)."""
    upper = state.upper()
    if upper in STATE_CONFIG:
        return upper
    if state in _NAME_TO_CODE:
        return _NAME_TO_CODE[state]
    # Try case-insensitive name match
    for name, code in _NAME_TO_CODE.items():
        if name.lower() == state.lower():
            return code
    raise ValueError(
        f"Unknown state '{state}'. Available: {list(_NAME_TO_CODE.keys())}"
    )


# ── Routes ─────────────────────────────────────────────────────────────────
@router.get("/results")
async def get_live_results(
    state: str = Query(default="S25"),
    force_refresh: bool = Query(default=False),
):
    """Full live results: party tally + constituency details."""
    try:
        code = _resolve_state_code(state)
    except ValueError as exc:
        return {"error": str(exc), "parties": [], "constituencies": []}

    if force_refresh:
        _cache.pop(f"all_{code}", None)

    try:
        data = await _get_all_data(code)
        return data
    except Exception as exc:
        cfg = STATE_CONFIG.get(code, {})
        return {
            "state": cfg.get("name", state),
            "state_code": code,
            "total_ac": cfg.get("total_ac", 0),
            "parties": [],
            "constituencies": [],
            "last_updated": None,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "error": str(exc),
        }


@router.get("/states")
async def get_available_states():
    """All available state codes and names."""
    return [
        {"code": k, "name": v["name"], "total_ac": v["total_ac"]}
        for k, v in STATE_CONFIG.items()
    ]


@router.get("/cache/clear")
async def clear_cache():
    """Clear the in-memory cache."""
    _cache.clear()
    return {"cleared": True}
