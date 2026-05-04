"""Generate Puducherry AC-level GeoJSON from India_AC shapefile.

Usage: python backend/scripts/generate_puducherry_geojson.py
Output: frontend/public/puducherry-ac.geojson
"""
import os
import re
import json
import geopandas as gpd

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SHP_FILE = os.path.join(PROJECT_ROOT, "temp_shp", "India_AC.shp")
OUTPUT = os.path.join(PROJECT_ROOT, "frontend", "public", "puducherry-ac.geojson")

# Shapefile district name -> canonical DB name (matching electors file)
DISTRICT_NORM = {
    "PONDICHERRY": "PUDUCHERRY",
}

# Shapefile AC name -> canonical DB name
AC_NAME_FIXES = {
    "Kamraj Nagar": "Kamaraj Nagar",
    "Neravy- T.R. Pattin": "Neravy T.R. Pattinam",
}


def run():
    print(f"Reading shapefile: {SHP_FILE}")
    gdf = gpd.read_file(SHP_FILE)

    # Filter Puducherry
    pdy = gdf[gdf["ST_NAME"].str.upper() == "PUDUCHERRY"].copy()
    print(f"Found {len(pdy)} Puducherry features")

    # Normalize district names
    pdy["district"] = pdy["DIST_NAME"].map(lambda d: DISTRICT_NORM.get(d, d))

    # Strip category suffix from AC_NAME for clean name
    def clean_name(name):
        return re.sub(r"\s*\((SC|ST)\)\s*$", "", str(name)).strip()

    pdy["name"] = pdy["AC_NAME"].map(clean_name).map(lambda n: AC_NAME_FIXES.get(n, n))
    pdy["ac_no"] = pdy["AC_NO"].astype(int)

    # Simplify geometry
    pdy = pdy.to_crs(epsg=4326)
    pdy["geometry"] = pdy["geometry"].simplify(tolerance=0.001, preserve_topology=True)

    # Select output columns
    out = pdy[["ac_no", "name", "district", "AC_NO", "AC_NAME", "DIST_NAME", "geometry"]].copy()
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
