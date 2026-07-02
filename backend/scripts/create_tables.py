"""Drop all tables and recreate from scratch."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import engine, Base
from app.models.westbengal import WBElection, WBDistrict, WBConstituency, WBParty, WBCandidate  # noqa
from app.models.assam import AssamElection, AssamDistrict, AssamConstituency, AssamParty, AssamCandidate, AssamDistrictMapping  # noqa
from app.models.puducherry import PuducherryElection, PuducherryDistrict, PuducherryConstituency, PuducherryParty, PuducherryCandidate  # noqa
from app.models.tamilnadu import TamilNaduElection, TamilNaduDistrict, TamilNaduConstituency, TamilNaduParty, TamilNaduCandidate  # noqa
from app.models.goa import GoaElection, GoaDistrict, GoaConstituency, GoaParty, GoaCandidate  # noqa
from app.models.manipur import ManipurElection, ManipurDistrict, ManipurConstituency, ManipurParty, ManipurCandidate  # noqa
from app.models.punjab import PunjabElection, PunjabDistrict, PunjabConstituency, PunjabParty, PunjabCandidate  # noqa
from app.models.gujarat import GujaratElection, GujaratDistrict, GujaratConstituency, GujaratParty, GujaratCandidate  # noqa
from app.models.himachal import HimachalElection, HimachalDistrict, HimachalConstituency, HimachalParty, HimachalCandidate  # noqa
from app.models.up import UPElection, UPDistrict, UPConstituency, UPParty, UPCandidate  # noqa
from app.models.uttarakhand import UKElection, UKDistrict, UKConstituency, UKParty, UKCandidate  # noqa
from app.models.kerala import KeralaElection, KeralaDistrict, KeralaConstituency, KeralaParty, KeralaCandidate  # noqa
from app.models.tripura import TripuraElection, TripuraDistrict, TripuraConstituency, TripuraParty, TripuraCandidate  # noqa

if __name__ == "__main__":
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")
