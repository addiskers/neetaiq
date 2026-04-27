"""Generate West Bengal AC-level GeoJSON from India_AC shapefile.

Usage: python backend/scripts/generate_wb_geojson.py
Output: frontend/public/west-bengal-ac.geojson
"""
import os
import re
import json
import geopandas as gpd

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SHP_FILE = os.path.join(PROJECT_ROOT, "temp_shp", "India_AC.shp")
OUTPUT = os.path.join(PROJECT_ROOT, "frontend", "public", "west-bengal-ac.geojson")

# Shapefile district name -> canonical DB name (matching electors_data_2011.xlsx)
DISTRICT_NORM = {
    "KOCH BIHAR": "COOCHBEHAR",
    "BARDDHAMAN": "BARDHAMAN",
    "DARJILING": "DARJEELING",
    "HAORA": "HOWRAH",
    "HUGLI": "HOOGHLY",
    "PASCHIM MEDINAPUR": "PASCHIM MEDINIPUR",
    "PURBA MEDINAPUR": "PURBO MEDINIPUR",
    "PURULIYA": "PURULIA",
    "MALDAH": "MALDAHA",
    "DAKSHIN DINAJPUR *": "DAKSHIN DINAJPUR",
}

# ACs that belong to ALIPURDUAR district (split from Jalpaiguri in electors file)
ALIPURDUAR_ACS = {10, 11, 12, 13, 14}  # Kumargram, Kalchini, Alipurduar, Falakata, Madarihat

# ACs for Kolkata North vs South split (from electors_data_2011.xlsx)
KOLKATA_SOUTH_ACS = {158, 159, 160, 161}  # Kolkata Port, Bhabanipore, Rashbehari, Ballygunge
KOLKATA_NORTH_ACS = {162, 163, 164, 165, 166, 167, 168}  # Chowrangee to Kashipur-Belgachia


def run():
    print(f"Reading shapefile: {SHP_FILE}")
    gdf = gpd.read_file(SHP_FILE)

    # Filter West Bengal
    wb = gdf[gdf["ST_NAME"].str.contains("Bengal", case=False, na=False)].copy()
    print(f"Found {len(wb)} WB features")

    # Normalize district names
    wb["district"] = wb["DIST_NAME"].map(lambda d: DISTRICT_NORM.get(d, d))

    # Handle Alipurduar split from Jalpaiguri
    wb.loc[wb["AC_NO"].isin(ALIPURDUAR_ACS), "district"] = "ALIPURDUAR"

    # Handle Kolkata North/South split
    wb.loc[wb["AC_NO"].isin(KOLKATA_NORTH_ACS), "district"] = "KOLKATA NORTH"
    wb.loc[wb["AC_NO"].isin(KOLKATA_SOUTH_ACS), "district"] = "KOLKATA SOUTH"

    # Strip category suffix from AC_NAME for clean name
    def clean_name(name):
        return re.sub(r"\s*\((SC|ST)\)\s*$", "", str(name)).strip()

    wb["name"] = wb["AC_NAME"].map(clean_name)
    wb["ac_no"] = wb["AC_NO"].astype(int)

    # Simplify geometry
    wb = wb.to_crs(epsg=4326)
    wb["geometry"] = wb["geometry"].simplify(tolerance=0.001, preserve_topology=True)

    # Select output columns
    out = wb[["ac_no", "name", "district", "AC_NO", "AC_NAME", "DIST_NAME", "geometry"]].copy()
    out = out.sort_values("ac_no")

    # Write GeoJSON
    out.to_file(OUTPUT, driver="GeoJSON")
    print(f"Written {len(out)} features to {OUTPUT}")

    # Verify
    with open(OUTPUT, "r") as f:
        data = json.load(f)
    print(f"GeoJSON features: {len(data['features'])}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")

    # Show district mapping
    districts = sorted(out["district"].unique())
    print(f"\nDistricts ({len(districts)}):")
    for d in districts:
        count = len(out[out["district"] == d])
        print(f"  {d}: {count} ACs")


if __name__ == "__main__":
    run()
