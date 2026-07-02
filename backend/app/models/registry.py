from fastapi import Query


def get_models(state: str = "westbengal"):
    s = (state or "westbengal").lower().replace(" ", "").replace("_", "")
    if s in ("assam", "as"):
        from app.models.assam import (
            AssamElection as Election, AssamDistrict as District,
            AssamConstituency as Constituency, AssamCandidate as Candidate, AssamParty as Party,
        )
    elif s in ("puducherry", "pondicherry", "py"):
        from app.models.puducherry import (
            PuducherryElection as Election, PuducherryDistrict as District,
            PuducherryConstituency as Constituency, PuducherryCandidate as Candidate, PuducherryParty as Party,
        )
    elif s in ("tamilnadu", "tamil_nadu", "tn"):
        from app.models.tamilnadu import (
            TamilNaduElection as Election, TamilNaduDistrict as District,
            TamilNaduConstituency as Constituency, TamilNaduCandidate as Candidate, TamilNaduParty as Party,
        )
    elif s in ("goa", "ga"):
        from app.models.goa import (
            GoaElection as Election, GoaDistrict as District,
            GoaConstituency as Constituency, GoaCandidate as Candidate, GoaParty as Party,
        )
    elif s in ("manipur", "mn"):
        from app.models.manipur import (
            ManipurElection as Election, ManipurDistrict as District,
            ManipurConstituency as Constituency, ManipurCandidate as Candidate, ManipurParty as Party,
        )
    elif s in ("punjab", "pb"):
        from app.models.punjab import (
            PunjabElection as Election, PunjabDistrict as District,
            PunjabConstituency as Constituency, PunjabCandidate as Candidate, PunjabParty as Party,
        )
    elif s in ("gujarat", "gj"):
        from app.models.gujarat import (
            GujaratElection as Election, GujaratDistrict as District,
            GujaratConstituency as Constituency, GujaratCandidate as Candidate, GujaratParty as Party,
        )
    elif s in ("himachalpradesh", "himachal", "hp"):
        from app.models.himachal import (
            HimachalElection as Election, HimachalDistrict as District,
            HimachalConstituency as Constituency, HimachalCandidate as Candidate, HimachalParty as Party,
        )
    elif s in ("uttarpradesh", "uttar_pradesh", "up"):
        from app.models.up import (
            UPElection as Election, UPDistrict as District,
            UPConstituency as Constituency, UPCandidate as Candidate, UPParty as Party,
        )
    elif s in ("uttarakhand", "uk", "ua"):
        from app.models.uttarakhand import (
            UKElection as Election, UKDistrict as District,
            UKConstituency as Constituency, UKCandidate as Candidate, UKParty as Party,
        )
    elif s in ("kerala", "kl"):
        from app.models.kerala import (
            KeralaElection as Election, KeralaDistrict as District,
            KeralaConstituency as Constituency, KeralaCandidate as Candidate, KeralaParty as Party,
        )
    elif s in ("tripura", "tr"):
        from app.models.tripura import (
            TripuraElection as Election, TripuraDistrict as District,
            TripuraConstituency as Constituency, TripuraCandidate as Candidate, TripuraParty as Party,
        )
    else:
        from app.models.westbengal import (
            WBElection as Election, WBDistrict as District,
            WBConstituency as Constituency, WBCandidate as Candidate, WBParty as Party,
        )
    return Election, District, Constituency, Candidate, Party


def models_dependency(state: str = Query("westbengal")):
    """FastAPI dependency — injects (Election, District, Constituency, Candidate, Party) for the given state."""
    return get_models(state)
