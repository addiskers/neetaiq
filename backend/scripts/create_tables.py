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
from app.models.meghalaya import MeghalayaElection, MeghalayaDistrict, MeghalayaConstituency, MeghalayaParty, MeghalayaCandidate  # noqa
from app.models.nagaland import NagalandElection, NagalandDistrict, NagalandConstituency, NagalandParty, NagalandCandidate  # noqa
from app.models.karnataka import KarnatakaElection, KarnatakaDistrict, KarnatakaConstituency, KarnatakaParty, KarnatakaCandidate  # noqa
from app.models.telangana import TelanganaElection, TelanganaDistrict, TelanganaConstituency, TelanganaParty, TelanganaCandidate  # noqa
from app.models.madhyapradesh import MadhyaPradeshElection, MadhyaPradeshDistrict, MadhyaPradeshConstituency, MadhyaPradeshParty, MadhyaPradeshCandidate  # noqa
from app.models.chhattisgarh import ChhattisgarhElection, ChhattisgarhDistrict, ChhattisgarhConstituency, ChhattisgarhParty, ChhattisgarhCandidate  # noqa
from app.models.mizoram import MizoramElection, MizoramDistrict, MizoramConstituency, MizoramParty, MizoramCandidate  # noqa
from app.models.sikkim import SikkimElection, SikkimDistrict, SikkimConstituency, SikkimParty, SikkimCandidate  # noqa
from app.models.arunachalpradesh import ArunachalPradeshElection, ArunachalPradeshDistrict, ArunachalPradeshConstituency, ArunachalPradeshParty, ArunachalPradeshCandidate  # noqa
from app.models.odisha import OdishaElection, OdishaDistrict, OdishaConstituency, OdishaParty, OdishaCandidate  # noqa
from app.models.rajasthan import RajasthanElection, RajasthanDistrict, RajasthanConstituency, RajasthanParty, RajasthanCandidate  # noqa
from app.models.haryana import HaryanaElection, HaryanaDistrict, HaryanaConstituency, HaryanaParty, HaryanaCandidate  # noqa
from app.models.bihar import BiharElection, BiharDistrict, BiharConstituency, BiharParty, BiharCandidate  # noqa
from app.models.jammukashmir import JammuKashmirElection, JammuKashmirDistrict, JammuKashmirConstituency, JammuKashmirParty, JammuKashmirCandidate  # noqa
from app.models.maharashtra import MaharashtraElection, MaharashtraDistrict, MaharashtraConstituency, MaharashtraParty, MaharashtraCandidate  # noqa
from app.models.andhrapradesh import AndhraPradeshElection, AndhraPradeshDistrict, AndhraPradeshConstituency, AndhraPradeshParty, AndhraPradeshCandidate  # noqa
from app.models.jharkhand import JharkhandElection, JharkhandDistrict, JharkhandConstituency, JharkhandParty, JharkhandCandidate  # noqa
from app.models.delhi import DelhiElection, DelhiDistrict, DelhiConstituency, DelhiParty, DelhiCandidate  # noqa

if __name__ == "__main__":
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")
