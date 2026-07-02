"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFilters } from "@/lib/filter-context";
import { api } from "@/lib/api";

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF9933", INC: "#00BFFF", AIUDF: "#006400", AGP: "#C8A2C8",
  BOPF: "#FF7F50", UPPL: "#FFD700", "CPI(M)": "#FF0000", IND: "#808080",
  AITC: "#00FF00", NCP: "#004080", AIFB: "#CC0000", RSP: "#FF6600",
  CPI: "#FF4444", BSP: "#0000FF", GJM: "#FFD700", SUCI: "#8B0000",
  AINRC: "#800080", DMK: "#FF0000", AIADMK: "#228B22", PMK: "#FFFF00",
  // Goa parties
  MGP: "#006400", MAG: "#006400", GFP: "#FF4500", AAP: "#0066CC",
  RVLTGONP: "#8B008B", RGP: "#800080",
  // Punjab parties
  SAD: "#003580", "SAD(M)": "#1A5276", LIP: "#2E86C1",
  // Gujarat parties
  BTP: "#228B22", AIMIM: "#006400",
  // UP parties
  SP: "#FF0000", RLD: "#00CC00", SBSP: "#FF6633", AAAP: "#8B4513",
  // Uttarakhand parties
  UKD: "#8B008B", UKDP: "#6B0000",
  // Kerala parties
  IUML: "#006400", "JD(S)": "#FFD700", "KC(M)": "#800080", "KEC(M)": "#8B008B",
  INL: "#4B0082",
  // Tripura parties
  IPFT: "#FF8C00", TMP: "#8B4513", INPT: "#556B2F",
};

const CATEGORY_COLORS: Record<string, string> = {
  GEN: "#93C5FD", SC: "#FCD34D", ST: "#6EE7B7",
};

const STATE_MAP_CONFIG: Record<string, { center: L.LatLngExpression; zoom: number; geojson: string }> = {
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

  // Load GeoJSON based on current state
  useEffect(() => {
    const geojsonPath = config.geojson;
    if (geoCache.current[geojsonPath]) {
      setAcGeoData(geoCache.current[geojsonPath]);
      return;
    }
    fetch(geojsonPath)
      .then((r) => r.json())
      .then((data) => {
        geoCache.current[geojsonPath] = data;
        setAcGeoData(data);
      });
  }, [config.geojson]);

  useEffect(() => {
    if (electionId) {
      api.getAcResults(electionId, stateSlug).then(setAcResults).catch(() => setAcResults([]));
    }
  }, [electionId, stateSlug]);

  // Fetch previous election results for "prev_winner" mode
  useEffect(() => {
    if (mapMode === "prev_winner" && currentElection) {
      api.getElections(stateSlug).then((elections) => {
        const sameState = elections
          .filter((e: any) => e.state === currentElection.state && e.year < currentElection.year)
          .sort((a: any, b: any) => b.year - a.year);
        if (sameState.length > 0) {
          api.getAcResults(sameState[0].id, stateSlug).then(setPrevResults);
        }
      });
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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    labelLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
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
    if (!map || !acGeoData || !labelLayer) return;

    if (layerRef.current) map.removeLayer(layerRef.current);
    labelLayer.clearLayers();

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
    };
    const buildDistrictMap = (rows: any[]) => {
      const seats: Record<string, Record<string, { count: number; color: string }>> = {};
      for (const r of rows) {
        if (!r.party) continue;
        const dbName = (r.district_name || r.district || "").toUpperCase();
        if (!dbName) continue;
        const geoKey = (DB_TO_GEOJSON[dbName] || dbName).toUpperCase();
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
        const featureDistrictName = (feature?.properties?.district_name || feature?.properties?.DIST_NAME || feature?.properties?.Dist_Name || feature?.properties?.dist_name || feature?.properties?.NAME_2 || feature?.properties?.district || "").toUpperCase();
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
        const featureDistrictName = (feature?.properties?.district_name || feature?.properties?.DIST_NAME || feature?.properties?.Dist_Name || feature?.properties?.dist_name || feature?.properties?.NAME_2 || feature?.properties?.district || "").toUpperCase();
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
        const fDist = (fAcNo != null ? conMap[fAcNo]?.district_name : undefined) || f.properties?.district || "";
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

  return <div ref={mapContainer} className="w-full h-full rounded-xl" />;
}
