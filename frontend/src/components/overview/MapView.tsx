"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFilters } from "@/lib/filter-context";
import { api } from "@/lib/api";
import { guard } from "@/lib/guard";

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF9933", INC: "#00BFFF", AIUDF: "#006400", AGP: "#C8A2C8",
  BOPF: "#FF7F50", UPPL: "#FFD700", "CPI(M)": "#FF0000", IND: "#808080",
  AITC: "#00FF00", AIFB: "#CC0000", RSP: "#FF6600",
  CPI: "#FF4444", BSP: "#0000FF", GJM: "#FFD700", SUCI: "#8B0000",
  AINRC: "#800080", DMK: "#FF0000", AIADMK: "#228B22", PMK: "#FFFF00",
  // Goa parties
  MGP: "#006400", MAG: "#006400", GFP: "#FF4500", AAP: "#0066CC",
  RVLTGONP: "#8B008B", RGP: "#800080",
  // Punjab parties
  SAD: "#003580", "SAD(M)": "#1A5276", LIP: "#2E86C1",
  // Gujarat parties
  BTP: "#228B22",
  // UP parties
  // AAAP was listed here in brown. The ECI writes the Aam Aadmi Party that way
  // in most states and plain AAP in a few, and every importer now folds the two
  // together, so nothing reaches this table under AAAP any more — it would only
  // have coloured the party differently depending on which spelling its state's
  // sheets happened to use. AAP's blue is set in the Goa block above.
  SP: "#FF0000", RLD: "#00CC00", SBSP: "#FF6633",
  // Uttarakhand parties
  UKD: "#8B008B", UKDP: "#6B0000",
  // Kerala parties
  IUML: "#006400", "JD(S)": "#FFD700", "KC(M)": "#800080", "KEC(M)": "#8B008B",
  INL: "#4B0082",
  // Tripura parties
  IPFT: "#FF8C00", TMP: "#8B4513", INPT: "#556B2F",
  // Rajasthan parties
  RLP: "#2E8B57", RLTP: "#2E8B57", BYS: "#8B4513", JGP: "#9932CC", BVHP: "#B22222", ARJP: "#556B2F", NUZP: "#B8860B",
  // Haryana parties. INLD took 19 seats in 2014 and JNJP 10 in 2019, so both
  // need a colour of their own; ASPKR already has one above, set for Madhya
  // Pradesh. HaLP is listed in both casings because the ECI writes it that way
  // in 2019 and the lookup is case-sensitive.
  INLD: "#138808", JNJP: "#E8112D", HJCBL: "#9932CC",
  HaLP: "#8B4513", HALP: "#8B4513", LTSP: "#4682B4", SMBHP: "#B22222",
  // Odisha parties
  // SUCI already has a colour above, set for West Bengal — same party, so it
  // is deliberately not repeated here.
  BJD: "#138808", AOP: "#8B4513", OJM: "#9932CC",
  HND: "#20B2AA", MLD: "#C71585", KRUP: "#DAA520",
  // Arunachal Pradesh parties
  PPA: "#2E8B57", AIP: "#9932CC", ANCHDMCP: "#8B4513",
  // Sikkim parties
  SKM: "#E8112D", SDF: "#1F8A4C", SPP: "#8B008B", CAPS: "#4682B4",
  HSP: "#20B2AA", HMSKP: "#9932CC",
  // Mizoram parties
  MNF: "#E31E24", ZPM: "#0F9D58", ZNP: "#8B008B", MPC: "#20B2AA",
  PRISMP: "#9932CC", MDF: "#556B2F",
  // Chhattisgarh parties
  JCCJ: "#2E8B57", CSM: "#9932CC", JCGP: "#20B2AA", HMR: "#C71585",
  // Madhya Pradesh parties
  GGP: "#2E8B57", BSCP: "#8B4513", SPAKP: "#9932CC", ASPKR: "#20B2AA",
  JANADIP: "#B22222", BMUP: "#5F9EA0", PPID: "#8B008B", BHRTADVSIP: "#C71585",
  // Telangana parties
  TRS: "#E91E63", BRS: "#E91E63", TDP: "#FFD700", BLFP: "#8B4513",
  DHRMSMJP: "#4682B4", BCYP: "#20B2AA", AODRP: "#9932CC", VTRP: "#C71585",
  YSRCP: "#1F4E9C", TJS: "#008080",
  // Karnataka parties
  KJP: "#B8860B", BSRCP: "#8B4513", KRPP: "#C71585", KRS: "#20B2AA",
  UPJP: "#4682B4", KPJP: "#9932CC", AIMEP: "#008080", SDPI: "#006400",
  SKP: "#556B2F", KMP: "#A0522D",
  // Nagaland parties
  NDPP: "#1F4E9C", NPF: "#E8112D", UNDP: "#2E8B57", RSNPLSP: "#00A0A0",
  RPPRINAT: "#4B0082", LJP: "#800000", LJPRV: "#9B2226",
  // Meghalaya parties
  NPP: "#0055A5", NPEP: "#0055A5", UDP: "#1E90FF", HSPDP: "#8B008B",
  PDF: "#DC143C", VOTPP: "#20B2AA", KHNAM: "#DAA520", GNC: "#556B2F",
  "RPI(A)": "#4B0082", RPI: "#6A0DAD", "JD(U)": "#006400", GNASURKP: "#B8860B",
  MDP: "#2F4F4F", NESDP: "#708090", NEINDP: "#5F9EA0",
  // Bihar parties. Two colours moved here from the blocks above rather than
  // being repeated, because Bihar is the first state where the clash shows:
  //   RJD was #008000, all but indistinguishable from JD(U)'s #006400 — and
  //   these two are the state's dominant rivals across 243 seats.
  //   AIMIM was #006400, exactly JD(U)'s colour, and both win seats here.
  // Neither party wins seats in the states that previously set those values,
  // so moving them costs nothing there.
  RJD: "#7CB342", AIMIM: "#00838F",
  VSIP: "#FDD835",        // Vikassheel Insaan Party
  VIP: "#6D4C41",         // Vanchitsamaj Insaaf Party — a different party
  HAMS: "#8E24AA",        // Hindustani Awam Morcha (Secular)
  RLSP: "#AFB42B",        // Rashtriya Lok Samta Party (ECI also writes BLSP)
  JNSRJP: "#00ACC1",      // Jan Suraaj Party (2025)
  RSHTLKM: "#5D4037",     // Rashtriya Lok Morcha (2025)
  IIP: "#AD1457",         // Indian Inclusive Party (2025)
  "CPI(ML)(L)": "#E53935",
  JAPL: "#9932CC",        // Jan Adhikar Party (Loktantrik)
  TPLRSP: "#4682B4",      // The Plurals Party
  // Jammu & Kashmir parties
  JKN: "#E01F26",         // J&K National Conference
  JKPDP: "#1B7B3A",       // J&K Peoples Democratic Party
  JKNPP: "#8B4513", JKNPPB: "#A0522D",   // Panthers Party, and its 2024 listing
  JKPC: "#00838F", JPC: "#00838F",       // Peoples Conference, 2024 and 2014
  DPAP: "#7B1FA2",        // Democratic Progressive Azad Party
  JAKAP: "#0066CC",       // J&K Apni Party
  // AIP is deliberately not set here: it already appears above as the Arunachal
  // Independent Party. J&K's Awami Ittehad Party is a different party that the
  // ECI happens to abbreviate the same way, and the two states never share a
  // map, so the existing entry is left to serve both rather than one silently
  // overwriting the other.
  JKPM: "#20B2AA",        // J&K Peoples Movement
  AJKMP: "#B8860B",       // Awami J&K Motherland Party
  JKPDF: "#556B2F",       // J&K Peoples Democratic Front
  // Maharashtra parties. The Shiv Sena split in 2022 and the NCP in 2023, and
  // in 2024 both halves of each contested the same seats, so all four need
  // colours of their own — SHS and SHSUBT are different parties, as are NCP
  // and NCPSP. AIMIM and CPI(M) already have colours above.
  //
  // SHS and NCP were previously set in the Karnataka and West Bengal blocks
  // above; both are moved here rather than repeated, because neither party
  // wins a seat in those states while in Maharashtra they take 57 and 41.
  // Shiv Sena's saffron is deliberately pushed away from the BJP's #FF9933:
  // they are allies in real life but the two largest blocks on this map, and
  // the old #FF7F00 was near enough to the BJP's to be unreadable beside it.
  SHS: "#E85D04", SHSUBT: "#7B2D26",
  NCP: "#00B2B2", NCPSP: "#1B7B3A",
  MNS: "#8B008B",         // Maharashtra Navnirman Sena
  VBA: "#4B0082",         // Vanchit Bahujan Aaghadi
  BBM: "#4B0082",         // Bharipa Bahujan Mahasangh — VBA's forerunner
  PWPI: "#B22222",        // Peasants and Workers Party of India
  RSPS: "#DAA520",        // Rashtriya Samaj Paksha
  SWP: "#CD5C5C",         // Swabhimani Paksha
  BVA: "#2E8B57",         // Bahujan Vikas Aaghadi
  // Andhra Pradesh parties. TDP, YSRCP and TRS already have colours above, set
  // for Telangana — the same three parties, since both states share a history.
  //
  // The three Jana-Sena-looking abbreviations are three different parties and
  // are coloured apart deliberately: JnP is Pawan Kalyan's Janasena Party,
  // JaSPa was the Jai Samaikyandhra Party of the anti-bifurcation moment in
  // 2014, and JJSP is the Jatiya Jana Sena Party that stood in 2024.
  JnP: "#D32F2F",         // Janasena Party
  JaSPa: "#8E24AA",       // Jai Samaikyandhra Party (2014)
  LSP: "#20B2AA",         // Lok Satta Party (2014)
  PPOI: "#9932CC",        // Pyramid Party of India
  PRSHP: "#00838F",       // Praja Shanthi Party
  JBNP: "#5D4037",        // Jai Bharat National Party
  JJSP: "#AFB42B",        // Jatiya Jana Sena Party (2024)
  JRBP: "#C71585",        // Jaibhim Rao Bharat Party (2024)
  NPT: "#6D4C41",         // Navodyam Party — one seat in the undivided 2014
  // Jharkhand parties. RJD, JD(U), LJPRV, PPID and CPI(ML)(L) already have
  // colours above, set for Bihar and Madhya Pradesh — the same parties.
  JMM: "#128807",         // Jharkhand Mukti Morcha
  JVM: "#1F4E9C",         // Jharkhand Vikas Morcha (Prajatantrik), merged into
                          // the BJP in 2020, so 2014 and 2019 only
  AJSUP: "#FDD835",       // AJSU Party
  JLKM: "#E8112D",        // Jharkhand Loktantrik Krantikari Morcha (2024)
  LKHAP: "#5D4037",       // Lokhit Adhikar Party (2024)
  // Single-seat winners in 2014, each needing to be told apart from IND grey.
  MCO: "#7B1FA2",         // Marxist Co-ordination
  JBSP: "#00838F",        // Jharkhand Party
  JKP: "#AFB42B",
  NSAM: "#CD5C5C",
  // Delhi parties. AAP, BJP, INC, BSP, SHS and PPID already have colours above.
  // AAPP is "Aapki Apni Party (Peoples)" — one letter from the AAP's own
  // abbreviation and a different party, so it gets a colour of its own rather
  // than being allowed to blend into the AAP's blue.
  AAPP: "#7B1FA2",
  RTORP: "#00838F",       // Right to Recall Party
  SASAPT: "#AFB42B",      // Samras Samaj Party (2015)
};

// The district name on a boundary feature.
//
// These files come from different sources and do not agree on what to call the
// property: most use DIST_NAME, Gujarat's uses dist_name, and a few carry
// district or district_name. Reading them in several places with slightly
// different fallback chains meant Gujarat's district-level colouring matched
// nothing at all, because the two places that mattered only looked for
// DIST_NAME and district. One helper keeps every caller reading the same set.
const DISTRICT_PROPS = [
  "district_name", "DIST_NAME", "Dist_Name", "dist_name", "NAME_2", "district",
] as const;

function featureDistrict(props: any): string {
  if (!props) return "";
  for (const key of DISTRICT_PROPS) {
    const v = props[key];
    if (v) return String(v).trim();
  }
  return "";
}

const CATEGORY_COLORS: Record<string, string> = {
  GEN: "#93C5FD", SC: "#FCD34D", ST: "#6EE7B7",
  // Bhutia-Lepcha, a reservation that exists only in Sikkim and covers twelve
  // of its thirty-two seats. Without an entry here they would render as the
  // no-data grey in Category mode.
  BL: "#C4B5FD",
};

// Basemap tiles.
//
// This was CARTO (basemaps.cartocdn.com/light_nolabels). CARTO now requires an
// API key: unkeyed requests still return HTTP 200, but with "API KEY REQUIRED"
// stamped across every tile, so the map arrived defaced rather than failing.
// Their free key is licensed for non-commercial use only, so we moved off it.
//
// Esri's World Light Gray Base needs no key and is the closest free equivalent
// — same pale canvas, subtle boundaries — though it carries faint state and
// country labels where CARTO's variant had none. Verified serving tiles across
// this map's whole range (minZoom 5 to maxZoom 13).
//
// Note the {z}/{y}/{x} order: Esri puts the row before the column, the reverse
// of the usual slippy-map URL. Swapping those silently yields wrong tiles.
const TILE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

// Attribution is hidden at the product owner's request. Esri and OpenStreetMap
// both ask for visible credit for these tiles, so if that needs restoring, pass
// this string as the tileLayer's `attribution` option and add
// L.control.attribution({ position: "bottomleft", prefix: false }) below:
//   "Tiles © Esri — Esri, DeLorme, NAVTEQ · © OpenStreetMap contributors"

// `geojson` is the state's boundaries. `geojsonByYear` overrides it for a
// particular election year, and a null there means "no boundaries exist for
// this election" — the map then draws base tiles only rather than colouring the
// wrong shapes. Only Jammu & Kashmir needs that so far; see its entry below.
type StateMapConfig = {
  center: L.LatLngExpression;
  zoom: number;
  geojson: string | null;
  geojsonByYear?: Record<number, string | null>;
};

const STATE_MAP_CONFIG: Record<string, StateMapConfig> = {
  "Assam": { center: [26.15, 92.50], zoom: 7.3, geojson: "/assam-ac.geojson" },
  "West Bengal": { center: [23.0, 87.85], zoom: 6.5, geojson: "/west-bengal-ac.geojson" },
  "Puducherry": { center: [11.93, 79.83], zoom: 10, geojson: "/puducherry-ac.geojson" },
  "Tamil Nadu": { center: [11.0, 78.5], zoom: 6.5, geojson: "/tn_ac_2021.geojson" },
  "Goa": { center: [15.3, 74.05], zoom: 9.5, geojson: "/GOA_ASSEMBLY.geojson" },
  "Manipur": { center: [24.66, 93.9], zoom: 7.5, geojson: "/MANIPUR_ASSEMBLY.geojson" },
  "Punjab": { center: [30.9, 75.4], zoom: 7.5, geojson: "/Punjab.geojson" },
  "Gujarat": { center: [22.3, 71.5], zoom: 7.0, geojson: "/gujarat_AC.geojson" },
  "Himachal Pradesh": { center: [31.8, 77.3], zoom: 7.5, geojson: "/himachalpradesh_AC.geojson" },
  "Uttar Pradesh": { center: [27.0, 80.5], zoom: 6.5, geojson: "/uttarpradesh_AC.geojson" },
  "Uttarakhand": { center: [30.1, 79.0], zoom: 8.0, geojson: "/uttarakhand_AC.geojson" },
  "Kerala": { center: [10.5, 76.5], zoom: 7.0, geojson: "/kerala_AC.geojson" },
  "Tripura": { center: [23.75, 91.75], zoom: 8.5, geojson: "/tripura_AC.geojson" },
  "Meghalaya": { center: [25.57, 91.30], zoom: 8.0, geojson: "/meghalaya_AC.geojson" },
  "Nagaland": { center: [26.12, 94.28], zoom: 8.0, geojson: "/nagaland_AC.geojson" },
  "Karnataka": { center: [15.04, 76.34], zoom: 6.5, geojson: "/karnataka_AC.geojson" },
  "Telangana": { center: [17.88, 79.52], zoom: 7.0, geojson: "/telangana_AC.geojson" },
  "Madhya Pradesh": { center: [23.97, 78.42], zoom: 6.3, geojson: "/madhyapradesh_AC.geojson" },
  "Chhattisgarh": { center: [20.94, 82.32], zoom: 6.8, geojson: "/chhattisgarh_AC.geojson" },
  "Mizoram": { center: [23.23, 92.85], zoom: 8.2, geojson: "/mizoram_AC.geojson" },
  "Sikkim": { center: [27.60, 88.47], zoom: 9.4, geojson: "/sikkim_AC.geojson" },
  "Arunachal Pradesh": { center: [28.06, 94.48], zoom: 7.2, geojson: "/arunachalpradesh_AC.geojson" },
  "Odisha": { center: [20.19, 84.44], zoom: 6.8, geojson: "/odisha_AC.geojson" },
  "Rajasthan": { center: [26.63, 73.88], zoom: 6.3, geojson: "/rajasthan_AC.geojson" },
  "Haryana": { center: [29.20, 76.35], zoom: 7.4, geojson: "/haryana_AC.geojson" },
  "Bihar": { center: [25.80, 85.60], zoom: 6.9, geojson: "/bihar_AC.geojson" },
  "Maharashtra": { center: [19.20, 76.20], zoom: 6.3, geojson: "/maharashtra_AC.geojson" },
  // Andhra Pradesh is the second state needing a boundary file per year. The
  // 2014 election was held for the undivided state, so it uses the 294-seat
  // pre-bifurcation map: AP's own seats are numbered 120-294 there and colour
  // in, while Telangana's 1-119 draw uncoloured, which is what the state
  // actually looked like that year. 2019 and 2024 use the 175-seat successor
  // state, renumbered 1-175 to match the ECI's own numbering from 2019 — see
  // backend/scripts/build_ap_post2014_geojson.py.
  "Jharkhand": { center: [23.65, 85.35], zoom: 7.0, geojson: "/jharkhand_AC.geojson" },
  // Delhi's file carries no district property at all, only AC numbers. That is
  // fine: seats join by number, and district-level colouring only ever applies
  // to files whose features have no AC number.
  "Delhi": { center: [28.65, 77.10], zoom: 9.6, geojson: "/delhi_AC.geojson" },
  "Andhra Pradesh": {
    center: [15.90, 80.20], zoom: 6.4,
    geojson: "/andhrapradesh_post2014_AC.geojson",
    geojsonByYear: {
      2014: "/andhrapradesh-pre2014_AC.geojson",
      2019: "/andhrapradesh_post2014_AC.geojson",
      2024: "/andhrapradesh_post2014_AC.geojson",
    },
  },
  // Jammu & Kashmir is the one state whose seats were redrawn between the two
  // elections held here, so it is the one state that needs a boundary file per
  // year. 2014 uses the pre-delimitation map — 87 seats, Ladakh included — and
  // 2024 uses the 2022 delimitation's 90 seats with no Ladakh. The AC numbers
  // do not correspond between them, so drawing one year on the other's file
  // would colour the wrong constituencies.
  // backend/scripts/build_jk2024_geojson.py records where the 2024 file came
  // from and how it was checked against the imported election.
  "Jammu & Kashmir": {
    center: [33.60, 75.30], zoom: 7.0,
    geojson: null,
    geojsonByYear: {
      2014: "/jammukashmir_AC.geojson",
      2024: "/jammukashmir_AC_2024.geojson",
    },
  },
};
const DEFAULT_CONFIG = STATE_MAP_CONFIG["Assam"];

export type MapMode = "results" | "category" | "prev_winner" | "prediction" | "live";

export default function MapView({ mapMode = "results", liveResults }: { mapMode?: MapMode; liveResults?: { ac_no: number; party: string; status: string; candidate?: string; margin?: number | null }[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const [acGeoData, setAcGeoData] = useState<any>(null);
  const [acResults, setAcResults] = useState<any[]>([]);
  const [prevResults, setPrevResults] = useState<any[]>([]);
  const [predictionData, setPredictionData] = useState<any[]>([]);
  const geoCache = useRef<Record<string, any>>({});

  const {
    electionId, currentElection, stateSlug, selectedDistrict, setSelectedDistrict,
    setGranularity, selectedAC, setSelectedAC, constituencies,
  } = useFilters();

  const config = STATE_MAP_CONFIG[currentElection?.state || ""] || DEFAULT_CONFIG;

  // Boundaries for this particular election: a year-specific file when the
  // state has one, otherwise the state's default. null means this election has
  // no boundary file, which is a deliberate state and not a failure.
  const year = currentElection?.year;
  const geojsonPath =
    year != null && config.geojsonByYear && year in config.geojsonByYear
      ? config.geojsonByYear[year]
      : config.geojson;

  // Load GeoJSON based on the current election
  useEffect(() => {
    if (!geojsonPath) {
      setAcGeoData(null);
      return;
    }
    if (geoCache.current[geojsonPath]) {
      setAcGeoData(geoCache.current[geojsonPath]);
      return;
    }
    guard(
      fetch(geojsonPath)
        .then((r) => r.json())
        .then((data) => {
          geoCache.current[geojsonPath] = data;
          setAcGeoData(data);
        }),
      `basemap boundaries ${geojsonPath}`,
    );
  }, [geojsonPath]);

  useEffect(() => {
    if (electionId) {
      api.getAcResults(electionId, stateSlug).then(setAcResults).catch(() => setAcResults([]));
    }
  }, [electionId, stateSlug]);

  // Fetch previous election results for "prev_winner" mode
  useEffect(() => {
    if (mapMode === "prev_winner" && currentElection) {
      guard(
        api.getElections(stateSlug).then((elections) => {
          const sameState = elections
            .filter((e: any) => e.state === currentElection.state && e.year < currentElection.year)
            .sort((a: any, b: any) => b.year - a.year);
          if (sameState.length > 0) {
            return guard(
              api.getAcResults(sameState[0].id, stateSlug).then(setPrevResults),
              "previous-election results",
            );
          }
        }),
        "previous elections",
      );
    }
  }, [mapMode, currentElection, stateSlug]);

  // Fetch prediction data for "prediction" mode
  useEffect(() => {
    if (mapMode === "prediction") {
      api.getSwingMap().then(setPredictionData).catch(() => setPredictionData([]));
    }
  }, [mapMode]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = L.map(mapContainer.current, {
      center: config.center, zoom: config.zoom, zoomControl: false,
      attributionControl: false, minZoom: 5, maxZoom: 13,
    });
    L.tileLayer(TILE_URL, { maxZoom: 18 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    labelLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    // Leaflet measures its container once and caches the size, so anything that
    // resizes the box afterwards leaves it drawing into the old one: tiles stop
    // short of the edge and clicks land on the wrong constituency. The single
    // invalidateSize above only covered the first paint. The map now fills the
    // height its card is given rather than a fixed 350px, so its box genuinely
    // does change — when the panel beside it grows, when the window is resized,
    // and when the sidebar opens or closes.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      // Coalesce to one call per frame: a resize drag fires this continuously,
      // and invalidateSize forces a full redraw each time.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(mapContainer.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleAcClick = useCallback((acNo: number, districtName: string) => {
    if (selectedAC === acNo) {
      setSelectedAC(null); setSelectedDistrict(null); setGranularity("STATE");
    } else {
      setSelectedAC(acNo); setSelectedDistrict(districtName); setGranularity("AC");
    }
  }, [selectedAC, setSelectedAC, setSelectedDistrict, setGranularity]);

  useEffect(() => {
    const map = mapRef.current;
    const labelLayer = labelLayerRef.current;
    if (!map || !labelLayer) return;

    // Clear what is currently drawn before deciding whether there is anything
    // new to draw. These layers are added to Leaflet imperatively, so bailing
    // out early used to leave the previous election's boundaries on the map:
    // selecting Jammu & Kashmir 2014 and then 2024 kept 2014's 87
    // constituencies on screen and coloured them with 2024's results, which is
    // precisely the mismatch the null entry in geojsonByYear exists to avoid.
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    labelLayer.clearLayers();

    if (!acGeoData) return;

    const resultMap: Record<number, any> = {};
    for (const r of acResults) resultMap[r.ac_no] = r;

    const prevMap: Record<number, any> = {};
    for (const r of prevResults) prevMap[r.ac_no] = r;

    const predMap: Record<number, any> = {};
    for (const p of predictionData) predMap[p.ac_no] = p;

    const liveMap: Record<number, any> = {};
    if (liveResults) for (const l of liveResults) liveMap[l.ac_no] = l;

    const hasPartyResults = acResults.some((r) => r.party);
    const hasPredictions = predictionData.length > 0;
    const hasLiveResults = liveResults && liveResults.length > 0;
    const conMap: Record<number, any> = {};
    for (const c of constituencies) conMap[c.ac_no] = c;

    // District-level aggregation for GeoJSON files that only have district boundaries (e.g. Tamil Nadu)
    // DB district name -> GeoJSON district_name key (uppercase)
    // Handles: newer districts not in GeoJSON (merge to parent) + spelling differences
    const DB_TO_GEOJSON: Record<string, string> = {
      // Newer districts absent from pincode GeoJSON → merged into parent
      "CHENGALPATTU": "KANCHEEPURAM",
      "KALLAKURICHI": "VILLUPURAM",
      "RANIPET": "VELLORE",
      "TENKASI": "TIRUNELVELI",
      "THIRUPATHUR": "VELLORE",
      // Spelling differences between DB and GeoJSON
      "THE  NILGIRIS": "THE NILGIRIS",    // DB has double space
      "TIRUCHIRAPPALLI": "TIRUCHIRAPALLI", // DB double-P, GeoJSON single-P
      "PUDUKKOTTAI": "PUDUKOTTAI",         // DB double-K, GeoJSON single-K
      // Punjab: abbreviated district names in DB vs full names in GeoJSON
      "S.A.S NAGAR": "SAHIBZADA AJIT SINGH NAGAR",
      "S.B.S NAGAR": "SHAHID BHAGAT SINGH NAGAR",
      // Malerkotla is a new district (2021) carved from Sangrur, not in GeoJSON
      "MALERKOTLA": "SANGRUR",
      // Gujarat: spelling differences between ECI results and GeoJSON
      "AHMEDABAD": "AHMADABAD",
      "BANASKANTHA": "BANAS KANTHA",
      "SABARKANTHA": "SABAR KANTHA",
      "PANCHMAHAL": "PANCH MAHALS",
      "DAHOD": "DOHAD",
      "DANGS": "THE DANGS",
      // Gujarat: new districts (post-2013) not in the GeoJSON — mapped to parent
      "ARVALLI": "SABAR KANTHA",
      "MORBI": "RAJKOT",
      "DEVBHUMI DWARKA": "JAMNAGAR",
      "GIR SOMNATH": "JUNAGADH",
      "BOTAD": "BHAVNAGAR",
      "CHHOTA UDEPUR": "VADODARA",
      "MAHISAGAR": "PANCH MAHALS",
      "TAPI": "SURAT",
      // Himachal Pradesh: GeoJSON uses "LAHUL & SPITI" (no A), DB stores "Lahaul & Spiti"
      "LAHAUL & SPITI": "LAHUL & SPITI",
      // Uttarakhand: district name differences between DB (ECI) and GeoJSON
      "PAURI GARHWAL": "GARHWAL",           // GeoJSON abbreviates to GARHWAL
      "HARIDWAR": "HARDWAR",                 // GeoJSON uses old spelling HARDWAR
      "RUDRAPRAYAG": "RUDRAPRAYAG *",        // GeoJSON has asterisk suffix
      "UDHAM SINGH NAGAR": "UDHAM SINGH NAGAR *",  // GeoJSON has asterisk suffix
      // Haryana: the GeoJSON carries only the 19 districts that existed at the
      // 2008 delimitation, so the four created since are merged into the parent
      // the file actually draws them inside. Each target below was read off the
      // seats' own features, not inferred from the name.
      "PALWAL": "FARIDABAD",                 // split from Faridabad in 2008
      "MEWAT": "GURGAON",                    // split from Gurgaon in 2005
      "NUH": "GURGAON",                      // Mewat renamed Nuh in 2016
      "CHARKHI DADRI": "BHIWANI",            // split from Bhiwani in 2016
      "GURUGRAM": "GURGAON",                 // Gurgaon renamed Gurugram in 2016
      "FATEHABAD": "FATEHABAD *",            // GeoJSON has asterisk suffix
      "JHAJJAR": "JHAJJAR *",                // GeoJSON has asterisk suffix
      "PANCHKULA": "PANCHKULA *",            // GeoJSON has asterisk suffix
      // Bihar: seven districts carry an asterisk suffix in the GeoJSON, two
      // Champarans are spelled differently in every source, and Arwal — split
      // from Jehanabad in 2001 — is absent, so its two seats fall back to the
      // parent the file actually draws them inside (read off AC 214 and 215).
      "ARWAL": "JEHANABAD",
      "JAHANABAD": "JEHANABAD",              // DB spells it with an A
      "WEST CHAMPARAN": "PASHCHIM CHAMPARAN",   // 2015 wording
      "PASCHIM CHAMPARAN": "PASHCHIM CHAMPARAN",  // 2020/2025 wording
      "EAST CHAMPARAN": "PURBA CHAMPARAN",      // 2015 wording
      "PURVI CHAMPARAN": "PURBA CHAMPARAN",     // 2020/2025 wording
      "KAIMUR (BHABUA)": "KAIMUR (BHABUA) *",
      "KAIMUR (BHABHUA)": "KAIMUR (BHABUA) *",  // 2025 adds an H
      "BANKA": "BANKA *",
      "BUXAR": "BUXAR *",
      "JAMUI": "JAMUI *",
      "LAKHISARAI": "LAKHISARAI *",
      "SHEIKHPURA": "SHEIKHPURA *",
      "SHEOHAR": "SHEOHAR *",
      "SUPAUL": "SUPAUL *",
      // Jammu & Kashmir 2014. The GeoJSON carries the pre-2007 district set, so
      // the eight districts created in 2006-07 are merged into the parent the
      // file draws them inside, and four more differ only in spelling. Each
      // target was read off the seats' own features.
      "BANDIPUR": "BARAMULA",      // split from Baramulla in 2007
      // 2024's file spells this district Bandipora where the ECI writes
      // Bandipore. It is its own district in that map, not merged like above.
      "BANDIPORE": "BANDIPORA",
      "GANDERBAL": "SRINAGAR",     // split from Srinagar in 2007
      "KISHTWAR": "DODA",          // split from Doda in 2007
      "RAMBAN": "DODA",            // split from Doda in 2007
      "KULGAM": "ANANTNAG",        // split from Anantnag in 2007
      "SHOPIAN": "PULWAMA",        // split from Pulwama in 2007
      "REASI": "UDHAMPUR",         // split from Udhampur in 2007
      "SAMBA": "JAMMU",            // split from Jammu in 2007
      "BARAMULLA": "BARAMULA",     // 2014's GeoJSON drops an L
      "BUDGAM": "BADGAM",          // U/A in 2014's GeoJSON
      "POONCH": "PUNCH",           // 2014's GeoJSON drops the O
      "LEH": "LEH(LADAKH)",
      // Maharashtra: four districts carry an asterisk suffix in the GeoJSON,
      // seven differ in spelling, and Palghar — split from Thane in 2014 — is
      // absent, so its six seats fall back to the parent the file draws them
      // inside. Each target was read off the seats' own features.
      "PALGHAR": "THANE",                  // split from Thane in 2014
      "AHMEDNAGAR": "AHMADNAGAR",
      "AMARAVATI": "AMRAVATI",
      "BEED": "BID",
      "BULDHANA": "BULDANA",
      "RAIGAD": "RAIGARH",
      "MUMBAI CITY": "MUMBAI",
      "MUMBAI SUBURBAN": "MUMBAI (SUBURBAN) *",
      "NANDURABAR": "NANDURBAR *",
      "GONDIYA": "GONDIYA *",
      "HINGOLI": "HINGOLI *",
      "WASHIM": "WASHIM *",
      // Andhra Pradesh: both boundary files use the district's old name.
      // Cuddapah was renamed YSR Kadapa in 2005; the ECI results say Kadapa.
      "KADAPA": "CUDDAPAH",
      // Rangareddy appears only in 2014, when the state still included the
      // districts that became Telangana; the pre-bifurcation map spells it
      // with an I. Every other one of those 23 districts matches outright.
      "RANGAREDDY": "RANGAREDDI",
      // Jharkhand: seven spelling differences, plus Khunti and Ramgarh, both
      // carved out in 2007 and absent from the map, which fall back to the
      // parent their seats are drawn inside. Each target was read off the
      // seats' own features.
      "EAST SINGHBHUM": "PURBI SINGHBHUM",
      "WEST SINGHBHUM": "PACHIM SINGHBHUM",
      "SERAIKELA KHARSAWAN": "SARAIKELA",
      "HAZARIBAGH": "HAZARIBAG",
      "KODERMA": "KODARMA",
      "PAKUR": "PAKAUR",
      "SAHEBGANJ": "SAHIBGANJ",
      "KHUNTI": "RANCHI",              // split from Ranchi in 2007
      "RAMGARH": "HAZARIBAG",          // split from Hazaribagh in 2007
    };

    // The district names actually present in the boundary file on screen.
    // An alias above is only worth applying if the district's own name is not
    // in the file: this map is global, but the same district can be spelled
    // differently in two files. Jammu & Kashmir has both — its 2014 map writes
    // Baramula, Badgam and Punch, its 2024 map writes them the way the ECI
    // does, and applying the 2014 aliases to the 2024 file sent three
    // districts to names that file does not contain. Preferring the real name
    // and treating the alias as the fallback keeps one table correct for both.
    const geoDistrictNames = new Set<string>();
    for (const f of acGeoData.features ?? []) {
      const d = featureDistrict(f.properties);
      if (d) geoDistrictNames.add(d.toUpperCase());
    }
    const toGeoDistrict = (dbName: string) => {
      if (geoDistrictNames.has(dbName)) return dbName;
      const alias = DB_TO_GEOJSON[dbName];
      return alias ? alias.toUpperCase() : dbName;
    };

    const buildDistrictMap = (rows: any[]) => {
      const seats: Record<string, Record<string, { count: number; color: string }>> = {};
      for (const r of rows) {
        if (!r.party) continue;
        const dbName = (r.district_name || r.district || "").toUpperCase();
        if (!dbName) continue;
        const geoKey = toGeoDistrict(dbName);
        if (!seats[geoKey]) seats[geoKey] = {};
        if (!seats[geoKey][r.party]) seats[geoKey][r.party] = { count: 0, color: r.party_color || "#94A3B8" };
        seats[geoKey][r.party].count++;
      }
      const out: Record<string, any> = {};
      for (const [dn, parties] of Object.entries(seats)) {
        const top = Object.entries(parties).sort((a, b) => b[1].count - a[1].count)[0];
        if (top) out[dn] = { party: top[0], party_color: top[1].color, seats: top[1].count };
      }
      return out;
    };
    const districtResultMap = buildDistrictMap(acResults);
    const prevDistrictResultMap = buildDistrictMap(prevResults);

    // Determine effective mode
    let effectiveMode = mapMode;
    if (mapMode === "live" && hasLiveResults) {
      effectiveMode = "live";
    } else if (mapMode === "prediction" && hasPredictions) {
      effectiveMode = "prediction";
    } else if (mapMode === "category" || mapMode === "prev_winner") {
      effectiveMode = mapMode; // always respect explicit category/prev_winner selection
    } else if (hasPartyResults) {
      effectiveMode = "results";
    }

    const geoLayer = L.geoJSON(acGeoData, {
      style: (feature) => {
        const acNoRaw = feature?.properties?.ac_no ?? feature?.properties?.AC_NO;
        const acNoNum = acNoRaw != null ? parseInt(String(acNoRaw), 10) : null;
        // ac_no=0 means a district-boundary overlay polygon inside an AC-level GeoJSON (e.g. Gujarat).
        // Render it as a transparent outline so it doesn't obscure the AC-level fill colours.
        if (acNoNum === 0) {
          return { fillOpacity: 0, color: "#94A3B8", weight: 1, opacity: 0.35 };
        }
        const acNo = (acNoNum != null && acNoNum > 0) ? acNoNum : null;
        // District-level GeoJSON uses NAME_2/district_name instead of ac_no
        const featureDistrictName = featureDistrict(feature?.properties).toUpperCase();
        const isDistrictLevel = acNo == null;

        const result = acNo != null ? resultMap[acNo] : undefined;
        const prev = acNo != null ? prevMap[acNo] : undefined;
        const pred = acNo != null ? predMap[acNo] : undefined;
        const live = acNo != null ? liveMap[acNo] : undefined;
        const con = acNo != null ? conMap[acNo] : undefined;
        const districtResult = isDistrictLevel ? districtResultMap[featureDistrictName] : null;
        const prevDistrictResult = isDistrictLevel ? prevDistrictResultMap[featureDistrictName] : null;

        const isSelectedAC = !isDistrictLevel && selectedAC === acNo;
        const districtName = con?.district_name || feature?.properties?.district || featureDistrictName;
        const isSelectedDistrict = selectedDistrict &&
          districtName.toUpperCase() === selectedDistrict.toUpperCase();

        let fillColor = isDistrictLevel ? "#CBD5E1" : "#E2E8F0";
        if (isDistrictLevel) {
          if (effectiveMode === "results" && districtResult?.party) {
            fillColor = PARTY_COLORS[districtResult.party] || districtResult.party_color || "#94A3B8";
          } else if (effectiveMode === "prev_winner" && prevDistrictResult?.party) {
            fillColor = PARTY_COLORS[prevDistrictResult.party] || prevDistrictResult.party_color || "#94A3B8";
          }
          // category / no-data: keeps the visible neutral #CBD5E1
        } else if (effectiveMode === "live" && live?.party) {
          fillColor = PARTY_COLORS[live.party] || "#94A3B8";
        } else if (effectiveMode === "prediction" && pred?.predicted_winner) {
          fillColor = PARTY_COLORS[pred.predicted_winner] || "#94A3B8";
        } else if (effectiveMode === "results" && result?.party) {
          fillColor = PARTY_COLORS[result.party] || result.party_color || "#94A3B8";
        } else if (effectiveMode === "prev_winner" && prev?.party) {
          fillColor = PARTY_COLORS[prev.party] || prev.party_color || "#94A3B8";
        } else if (con?.category) {
          fillColor = CATEGORY_COLORS[con.category] || "#E2E8F0";
        }

        // For prediction mode, modulate opacity by confidence
        let fillOpacity = isSelectedAC ? 0.9 : isSelectedDistrict ? 0.8 : 0.65;
        if (effectiveMode === "prediction" && pred?.confidence) {
          fillOpacity = isSelectedAC ? 0.95 : Math.max(0.35, pred.confidence);
        }

        return {
          fillColor,
          fillOpacity,
          color: isDistrictLevel ? "#64748B" : isSelectedAC ? "#1D4ED8" : pred?.swing && effectiveMode === "prediction" ? "#FBBF24" : "#fff",
          weight: isDistrictLevel ? 1.2 : isSelectedAC ? 3 : pred?.swing && effectiveMode === "prediction" ? 1.5 : 0.8,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const acNoRaw = feature.properties?.ac_no ?? feature.properties?.AC_NO;
        const acNoNum = acNoRaw != null ? parseInt(String(acNoRaw), 10) : null;
        // ac_no=0 boundary overlay — no tooltip or click handler
        if (acNoNum === 0) return;
        const acNo = (acNoNum != null && acNoNum > 0) ? acNoNum : null;
        const isDistrictLevel = acNo == null;
        const featureDistrictName = featureDistrict(feature?.properties).toUpperCase();
        const acName = (feature.properties?.ac_name || feature.properties?.name || feature.properties?.AC_NAME || feature.properties?.NAME_2 || "").replace(/\s*\((SC|ST|GEN)\)\s*$/i, "");
        const result = acNo != null ? resultMap[acNo] : undefined;
        const prev = acNo != null ? prevMap[acNo] : undefined;
        const con = acNo != null ? conMap[acNo] : undefined;
        const pred = acNo != null ? predMap[acNo] : undefined;
        const live = acNo != null ? liveMap[acNo] : undefined;
        const districtResult = isDistrictLevel ? districtResultMap[featureDistrictName] : null;
        const prevDistrictResult = isDistrictLevel ? prevDistrictResultMap[featureDistrictName] : null;
        const district = con?.district_name || feature.properties?.district || featureDistrictName;
        const electors = con?.total_electors ? `${(con.total_electors / 100000).toFixed(1)}L electors` : "";
        const cat = con?.category || "";

        let tip = "";
        if (isDistrictLevel) {
          const displayName = feature?.properties?.district_name || feature?.properties?.NAME_2 || featureDistrictName;
          const activeResult = effectiveMode === "prev_winner" ? prevDistrictResult : districtResult;
          const label = effectiveMode === "prev_winner" ? "Prev dominant" : "Dominant";
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${displayName}</div>
             ${activeResult?.party ? `<div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[activeResult.party] || '#333'}">${label}: ${activeResult.party} (${activeResult.seats} seats)</div>` : "<div style='color:#6B7280;font-size:11px;'>No result data</div>"}`;
        } else if (effectiveMode === "live" && live) {
          const statusLabel = live.status === "won" ? "Winner" : "Leading";
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[live.party] || '#333'}">${statusLabel}: ${live.party}${live.candidate ? ` - ${live.candidate}` : ""}</div>
             ${live.margin ? `<div style="color:#6B7280;font-size:10px;">Margin: ${live.margin.toLocaleString()}</div>` : ""}`;
        } else if (effectiveMode === "prediction" && pred) {
          const confPct = Math.round(pred.confidence * 100);
          const probs = pred.party_probabilities || {};
          const probRows = Object.entries(probs)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 4)
            .map(([p, v]: any) => `<span style="color:${PARTY_COLORS[p] || '#999'}">${p}: ${Math.round(v * 100)}%</span>`)
            .join(" &bull; ");

          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:700;font-size:12px;margin-top:4px;color:${PARTY_COLORS[pred.predicted_winner] || '#333'}">
               Predicted: ${pred.predicted_winner} (${confPct}% confidence)
             </div>
             <div style="color:#6B7280;font-size:10px;margin-top:2px;">${probRows}</div>
             ${pred.incumbent_2021 ? `<div style="color:#6B7280;font-size:10px;">2021 Winner: ${pred.incumbent_2021}</div>` : ""}
             ${pred.swing ? `<div style="color:#FBBF24;font-size:10px;font-weight:600;">SWING from ${pred.incumbent_2021} to ${pred.predicted_winner}</div>` : ""}
             ${electors ? `<div style="color:#6B7280;font-size:10px;">${electors}</div>` : ""}`;
        } else if (effectiveMode === "results" && result?.party) {
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[result.party] || '#333'}">${result.party} - ${result.winner}</div>
             ${result.margin ? `<div style="color:#6B7280;font-size:10px;">Margin: ${result.margin.toLocaleString()}</div>` : ""}`;
        } else if (effectiveMode === "prev_winner" && prev?.party) {
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[prev.party] || '#333'}">Prev Winner: ${prev.party} - ${prev.winner}</div>
             ${prev.margin ? `<div style="color:#6B7280;font-size:10px;">Prev Margin: ${prev.margin.toLocaleString()}</div>` : ""}
             ${electors ? `<div style="color:#6B7280;font-size:10px;">${electors}</div>` : ""}`;
        } else {
          tip = `<div style="font-weight:700;font-size:13px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             ${electors ? `<div style="color:#475569;font-size:10px;">${electors}</div>` : ""}`;
        }

        layer.bindTooltip(tip, { className: "district-tooltip", sticky: true });
        layer.on("mouseover", () => {
          if (selectedAC !== acNo) (layer as any).setStyle({ fillOpacity: 0.95, weight: 2, color: "#3B82F6" });
        });
        layer.on("mouseout", () => { geoLayer.resetStyle(layer); });
        if (!isDistrictLevel) layer.on("click", () => handleAcClick(acNo as number, district));
      },
    }).addTo(map);

    layerRef.current = geoLayer;

    const addLabels = () => {
      labelLayer.clearLayers();
      if (map.getZoom() >= 8) {
        // Group by AC number so multi-polygon constituencies get one label on the largest polygon
        const acGroups: Record<number, any[]> = {};
        acGeoData.features.forEach((feature: any) => {
          const raw = feature.properties?.ac_no ?? feature.properties?.AC_NO;
          const acNo = raw != null ? (parseInt(String(raw), 10) || null) : null;
          if (!feature.geometry || acNo == null) return;
          if (!acGroups[acNo]) acGroups[acNo] = [];
          acGroups[acNo].push(feature);
        });
        Object.entries(acGroups).forEach(([acNo, features]) => {
          let bestFeature = features[0];
          let bestArea = 0;
          features.forEach((f: any) => {
            try {
              const b = L.geoJSON(f).getBounds();
              if (!b.isValid()) return;
              const area = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
              if (area > bestArea) { bestArea = area; bestFeature = f; }
            } catch (_e) { /* skip invalid geometry */ }
          });
          try {
            const bounds = L.geoJSON(bestFeature).getBounds();
            if (!bounds.isValid()) return;
            const center = bounds.getCenter();
            L.marker(center, {
              icon: L.divIcon({
                className: "",
                html: `<div style="font-size:${map.getZoom() >= 10 ? 10 : 8}px;font-weight:700;color:#1e293b;text-shadow:0 0 3px #fff,0 0 3px #fff;text-align:center;pointer-events:none;">${acNo}</div>`,
                iconSize: [20, 12], iconAnchor: [10, 6],
              }),
              interactive: false,
            }).addTo(labelLayer);
          } catch (_e) { /* skip invalid geometry */ }
        });
      }
    };
    addLabels();
    map.on("zoomend", addLabels);

    if (selectedDistrict && !selectedAC) {
      const distFeatures = acGeoData.features.filter((f: any) => {
        const raw = f.properties?.ac_no ?? f.properties?.AC_NO;
        const fAcNo = raw != null ? (parseInt(String(raw), 10) || null) : null;
        const fDist = (fAcNo != null ? conMap[fAcNo]?.district_name : undefined) || featureDistrict(f.properties);
        return fDist.toUpperCase() === selectedDistrict.toUpperCase();
      });
      if (distFeatures.length > 0) map.flyToBounds(L.geoJSON({ type: "FeatureCollection", features: distFeatures } as any).getBounds(), { padding: [30, 30], duration: 0.6 });
    } else if (selectedAC) {
      const acFeature = acGeoData.features.find((f: any) => {
        const raw = f.properties?.ac_no ?? f.properties?.AC_NO;
        return (raw != null ? (parseInt(String(raw), 10) || null) : null) === selectedAC;
      });
      if (acFeature) map.flyToBounds(L.geoJSON(acFeature).getBounds(), { padding: [50, 50], duration: 0.6 });
    } else {
      map.flyTo(config.center, config.zoom, { duration: 0.6 });
    }

    return () => { map.off("zoomend", addLabels); };
  }, [acGeoData, acResults, prevResults, predictionData, liveResults, constituencies, selectedDistrict, selectedAC, handleAcClick, mapMode, config]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl" />
      {!geojsonPath && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <p className="pointer-events-auto max-w-md rounded-lg bg-white/95 px-3 py-2 text-center text-xs leading-snug text-slate-600 shadow ring-1 ring-slate-200">
            Constituency boundaries for this election aren&apos;t available yet —
            the map we have predates the 2022 delimitation. Every other panel on
            this page still reflects the full result.
          </p>
        </div>
      )}
    </div>
  );
}
