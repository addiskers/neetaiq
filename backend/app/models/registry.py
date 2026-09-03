import re

from fastapi import HTTPException, Query


# Canonical slug for every state get_models() knows about. This is the single
# list to extend when a new state is added — endpoints that aggregate across all
# states (e.g. /overview/all-elections) iterate this instead of hardcoding their
# own subset, so they never fall out of sync with the registry again.
CANONICAL_STATES = [
    "westbengal", "assam", "puducherry", "tamilnadu", "goa", "manipur",
    "punjab", "gujarat", "himachalpradesh", "uttarpradesh", "uttarakhand",
    "kerala", "tripura", "rajasthan", "delhi", "jharkhand", "andhrapradesh",
    "maharashtra", "jammukashmir", "bihar", "haryana", "odisha",
    "arunachalpradesh", "sikkim", "mizoram", "chhattisgarh", "madhyapradesh",
    "telangana", "karnataka", "nagaland", "meghalaya",
]


def get_models(state: str = "westbengal"):
    """Return (Election, District, Constituency, Candidate, Party) for a state.

    The slug is reduced to letters and digits, so "Jammu & Kashmir",
    "jammu_kashmir" and "jammu-kashmir" all arrive as "jammukashmir". Stripping
    only spaces and underscores, as this did before, left the ampersand in place
    and no branch matched — which mattered because an unmatched state used to
    fall through to West Bengal. The page then showed West Bengal's 294 seats
    and districts under a Jammu & Kashmir heading, with nothing to indicate the
    data was not the state that had been asked for.

    An unrecognised state is now an error rather than a silent substitution.
    Omitting the parameter still defaults to West Bengal, which several callers
    rely on.
    """
    s = re.sub(r"[^a-z0-9]", "", (state or "westbengal").lower())
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
    elif s in ("rajasthan", "rj"):
        from app.models.rajasthan import (
            RajasthanElection as Election, RajasthanDistrict as District,
            RajasthanConstituency as Constituency, RajasthanCandidate as Candidate,
            RajasthanParty as Party,
        )
    elif s in ("delhi", "dl", "nctofdelhi"):
        from app.models.delhi import (
            DelhiElection as Election, DelhiDistrict as District,
            DelhiConstituency as Constituency, DelhiCandidate as Candidate,
            DelhiParty as Party,
        )
    elif s in ("jharkhand", "jh"):
        from app.models.jharkhand import (
            JharkhandElection as Election, JharkhandDistrict as District,
            JharkhandConstituency as Constituency, JharkhandCandidate as Candidate,
            JharkhandParty as Party,
        )
    elif s in ("andhrapradesh", "andhra_pradesh", "ap"):
        from app.models.andhrapradesh import (
            AndhraPradeshElection as Election, AndhraPradeshDistrict as District,
            AndhraPradeshConstituency as Constituency, AndhraPradeshCandidate as Candidate,
            AndhraPradeshParty as Party,
        )
    elif s in ("maharashtra", "mh"):
        from app.models.maharashtra import (
            MaharashtraElection as Election, MaharashtraDistrict as District,
            MaharashtraConstituency as Constituency, MaharashtraCandidate as Candidate,
            MaharashtraParty as Party,
        )
    elif s in ("jammukashmir", "jammu_kashmir", "jk"):
        from app.models.jammukashmir import (
            JammuKashmirElection as Election, JammuKashmirDistrict as District,
            JammuKashmirConstituency as Constituency, JammuKashmirCandidate as Candidate,
            JammuKashmirParty as Party,
        )
    elif s in ("bihar", "br"):
        from app.models.bihar import (
            BiharElection as Election, BiharDistrict as District,
            BiharConstituency as Constituency, BiharCandidate as Candidate,
            BiharParty as Party,
        )
    elif s in ("haryana", "hr"):
        from app.models.haryana import (
            HaryanaElection as Election, HaryanaDistrict as District,
            HaryanaConstituency as Constituency, HaryanaCandidate as Candidate,
            HaryanaParty as Party,
        )
    elif s in ("odisha", "orissa", "od", "or"):
        from app.models.odisha import (
            OdishaElection as Election, OdishaDistrict as District,
            OdishaConstituency as Constituency, OdishaCandidate as Candidate, OdishaParty as Party,
        )
    elif s in ("arunachalpradesh", "arunachal_pradesh", "ar"):
        from app.models.arunachalpradesh import (
            ArunachalPradeshElection as Election, ArunachalPradeshDistrict as District,
            ArunachalPradeshConstituency as Constituency, ArunachalPradeshCandidate as Candidate,
            ArunachalPradeshParty as Party,
        )
    elif s in ("sikkim", "sk", "si"):
        from app.models.sikkim import (
            SikkimElection as Election, SikkimDistrict as District,
            SikkimConstituency as Constituency, SikkimCandidate as Candidate, SikkimParty as Party,
        )
    elif s in ("mizoram", "mz", "mi"):
        from app.models.mizoram import (
            MizoramElection as Election, MizoramDistrict as District,
            MizoramConstituency as Constituency, MizoramCandidate as Candidate, MizoramParty as Party,
        )
    elif s in ("chhattisgarh", "chattisgarh", "cg"):
        from app.models.chhattisgarh import (
            ChhattisgarhElection as Election, ChhattisgarhDistrict as District,
            ChhattisgarhConstituency as Constituency, ChhattisgarhCandidate as Candidate,
            ChhattisgarhParty as Party,
        )
    elif s in ("madhyapradesh", "madhya_pradesh", "mp"):
        from app.models.madhyapradesh import (
            MadhyaPradeshElection as Election, MadhyaPradeshDistrict as District,
            MadhyaPradeshConstituency as Constituency, MadhyaPradeshCandidate as Candidate,
            MadhyaPradeshParty as Party,
        )
    elif s in ("telangana", "tg", "ts"):
        from app.models.telangana import (
            TelanganaElection as Election, TelanganaDistrict as District,
            TelanganaConstituency as Constituency, TelanganaCandidate as Candidate, TelanganaParty as Party,
        )
    elif s in ("karnataka", "ka", "kn"):
        from app.models.karnataka import (
            KarnatakaElection as Election, KarnatakaDistrict as District,
            KarnatakaConstituency as Constituency, KarnatakaCandidate as Candidate, KarnatakaParty as Party,
        )
    elif s in ("nagaland", "nl", "ng"):
        from app.models.nagaland import (
            NagalandElection as Election, NagalandDistrict as District,
            NagalandConstituency as Constituency, NagalandCandidate as Candidate, NagalandParty as Party,
        )
    elif s in ("meghalaya", "ml", "mg"):
        from app.models.meghalaya import (
            MeghalayaElection as Election, MeghalayaDistrict as District,
            MeghalayaConstituency as Constituency, MeghalayaCandidate as Candidate, MeghalayaParty as Party,
        )
    elif s in ("westbengal", "wb"):
        from app.models.westbengal import (
            WBElection as Election, WBDistrict as District,
            WBConstituency as Constituency, WBCandidate as Candidate, WBParty as Party,
        )
    else:
        raise HTTPException(status_code=404, detail=f"Unknown state: {state!r}")
    return Election, District, Constituency, Candidate, Party


def models_dependency(state: str = Query("westbengal")):
    """FastAPI dependency — injects (Election, District, Constituency, Candidate, Party) for the given state."""
    return get_models(state)
