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
};

const CATEGORY_COLORS: Record<string, string> = {
  GEN: "#93C5FD", SC: "#FCD34D", ST: "#6EE7B7",
};

const STATE_MAP_CONFIG: Record<string, { center: L.LatLngExpression; zoom: number; geojson: string }> = {
  "Assam": { center: [26.15, 92.50], zoom: 7.3, geojson: "/assam-ac.geojson" },
  "West Bengal": { center: [23.0, 87.85], zoom: 6.5, geojson: "/west-bengal-ac.geojson" },
};
const DEFAULT_CONFIG = STATE_MAP_CONFIG["Assam"];

export type MapMode = "results" | "category" | "prev_winner" | "prediction";

export default function MapView({ mapMode = "results" }: { mapMode?: MapMode }) {
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
    electionId, currentElection, selectedDistrict, setSelectedDistrict,
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
      api.getAcResults(electionId).then(setAcResults).catch(() => setAcResults([]));
    }
  }, [electionId]);

  // Fetch previous election results for "prev_winner" mode
  useEffect(() => {
    if (mapMode === "prev_winner" && currentElection) {
      api.getElections().then((elections) => {
        const sameState = elections
          .filter((e: any) => e.state === currentElection.state && e.year < currentElection.year)
          .sort((a: any, b: any) => b.year - a.year);
        if (sameState.length > 0) {
          api.getAcResults(sameState[0].id).then(setPrevResults);
        }
      });
    }
  }, [mapMode, currentElection]);

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
    L.control.zoom({ position: "topright" }).addTo(map);
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

    const hasPartyResults = acResults.some((r) => r.party);
    const hasPredictions = predictionData.length > 0;
    const conMap: Record<number, any> = {};
    for (const c of constituencies) conMap[c.ac_no] = c;

    // Determine effective mode
    let effectiveMode = mapMode;
    if (mapMode === "prediction" && hasPredictions) {
      effectiveMode = "prediction";
    } else if (hasPartyResults) {
      effectiveMode = "results";
    } else if (mapMode !== "prev_winner") {
      effectiveMode = mapMode;
    }

    const geoLayer = L.geoJSON(acGeoData, {
      style: (feature) => {
        const acNo = feature?.properties?.ac_no;
        const result = resultMap[acNo];
        const prev = prevMap[acNo];
        const pred = predMap[acNo];
        const con = conMap[acNo];
        const isSelectedAC = selectedAC === acNo;
        const districtName = con?.district_name || feature?.properties?.district || "";
        const isSelectedDistrict = selectedDistrict &&
          districtName.toUpperCase() === selectedDistrict.toUpperCase();

        let fillColor = "#E2E8F0";
        if (effectiveMode === "prediction" && pred?.predicted_winner) {
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
          color: isSelectedAC ? "#1D4ED8" : pred?.swing && effectiveMode === "prediction" ? "#FBBF24" : "#fff",
          weight: isSelectedAC ? 3 : pred?.swing && effectiveMode === "prediction" ? 1.5 : 0.8,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const acNo = feature.properties?.ac_no;
        const acName = feature.properties?.name || "";
        const result = resultMap[acNo];
        const prev = prevMap[acNo];
        const con = conMap[acNo];
        const pred = predMap[acNo];
        const district = con?.district_name || feature.properties?.district || "";
        const electors = con?.total_electors ? `${(con.total_electors / 100000).toFixed(1)}L electors` : "";
        const cat = con?.category || "";

        let tip = "";
        if (effectiveMode === "prediction" && pred) {
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
        layer.on("click", () => handleAcClick(acNo, district));
      },
    }).addTo(map);

    layerRef.current = geoLayer;

    const addLabels = () => {
      labelLayer.clearLayers();
      if (map.getZoom() >= 8) {
        acGeoData.features.forEach((feature: any) => {
          const acNo = feature.properties?.ac_no;
          if (!feature.geometry) return;
          const bounds = L.geoJSON(feature).getBounds();
          const center = bounds.getCenter();
          L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<div style="font-size:${map.getZoom() >= 10 ? 10 : 8}px;font-weight:700;color:#1e293b;text-shadow:0 0 3px #fff,0 0 3px #fff;text-align:center;pointer-events:none;">${acNo}</div>`,
              iconSize: [20, 12], iconAnchor: [10, 6],
            }),
            interactive: false,
          }).addTo(labelLayer);
        });
      }
    };
    addLabels();
    map.on("zoomend", addLabels);

    if (selectedDistrict && !selectedAC) {
      const distFeatures = acGeoData.features.filter((f: any) => {
        const fAcNo = f.properties?.ac_no;
        const fDist = conMap[fAcNo]?.district_name || f.properties?.district || "";
        return fDist.toUpperCase() === selectedDistrict.toUpperCase();
      });
      if (distFeatures.length > 0) map.flyToBounds(L.geoJSON({ type: "FeatureCollection", features: distFeatures } as any).getBounds(), { padding: [30, 30], duration: 0.6 });
    } else if (selectedAC) {
      const acFeature = acGeoData.features.find((f: any) => f.properties?.ac_no === selectedAC);
      if (acFeature) map.flyToBounds(L.geoJSON(acFeature).getBounds(), { padding: [50, 50], duration: 0.6 });
    } else {
      map.flyTo(config.center, config.zoom, { duration: 0.6 });
    }

    return () => { map.off("zoomend", addLabels); };
  }, [acGeoData, acResults, prevResults, predictionData, constituencies, selectedDistrict, selectedAC, handleAcClick, mapMode, config]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl" />;
}
