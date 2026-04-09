"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFilters } from "@/lib/filter-context";
import { api } from "@/lib/api";

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF9933", INC: "#00BFFF", AIUDF: "#006400", AGP: "#C8A2C8",
  BOPF: "#FF7F50", UPPL: "#FFD700", "CPI(M)": "#FF0000", IND: "#808080",
  AITC: "#00FF00", NCP: "#004080",
};

const CATEGORY_COLORS: Record<string, string> = {
  GEN: "#93C5FD", SC: "#FCD34D", ST: "#6EE7B7",
};

const ASSAM_CENTER: L.LatLngExpression = [26.15, 92.50];
const ASSAM_ZOOM = 7.3;

export type MapMode = "results" | "category" | "prev_winner";

export default function MapView({ mapMode = "results" }: { mapMode?: MapMode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const [acGeoData, setAcGeoData] = useState<any>(null);
  const [acResults, setAcResults] = useState<any[]>([]);
  const [prevResults, setPrevResults] = useState<any[]>([]);

  const {
    electionId, currentElection, selectedDistrict, setSelectedDistrict,
    setGranularity, selectedAC, setSelectedAC, constituencies,
  } = useFilters();

  useEffect(() => {
    fetch("/assam-ac.geojson").then((r) => r.json()).then(setAcGeoData);
  }, []);

  useEffect(() => {
    if (electionId) {
      api.getAcResults(electionId).then(setAcResults).catch(() => setAcResults([]));
    }
  }, [electionId]);

  // Fetch 2021 results for "prev_winner" mode
  useEffect(() => {
    if (mapMode === "prev_winner") {
      // Find the 2021 election and fetch its results
      api.getElections().then((elections) => {
        const e2021 = elections.find((e: any) => e.year === 2021);
        if (e2021) {
          api.getAcResults(e2021.id).then(setPrevResults);
        }
      });
    }
  }, [mapMode]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = L.map(mapContainer.current, {
      center: ASSAM_CENTER, zoom: ASSAM_ZOOM, zoomControl: false,
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

    const hasPartyResults = acResults.some((r) => r.party);
    const conMap: Record<number, any> = {};
    for (const c of constituencies) conMap[c.ac_no] = c;

    // Determine effective mode
    const effectiveMode = hasPartyResults ? "results" : mapMode;

    const geoLayer = L.geoJSON(acGeoData, {
      style: (feature) => {
        const acNo = feature?.properties?.ac_no;
        const result = resultMap[acNo];
        const prev = prevMap[acNo];
        const con = conMap[acNo];
        const isSelectedAC = selectedAC === acNo;
        const isSelectedDistrict = selectedDistrict &&
          feature?.properties?.district?.toUpperCase() === selectedDistrict.toUpperCase();

        let fillColor = "#E2E8F0";
        if (effectiveMode === "results" && result?.party) {
          fillColor = PARTY_COLORS[result.party] || result.party_color || "#94A3B8";
        } else if (effectiveMode === "prev_winner" && prev?.party) {
          fillColor = PARTY_COLORS[prev.party] || prev.party_color || "#94A3B8";
        } else if (con?.category) {
          fillColor = CATEGORY_COLORS[con.category] || "#E2E8F0";
        }

        return {
          fillColor,
          fillOpacity: isSelectedAC ? 0.9 : isSelectedDistrict ? 0.8 : 0.65,
          color: isSelectedAC ? "#1D4ED8" : "#fff",
          weight: isSelectedAC ? 3 : 0.8,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const acNo = feature.properties?.ac_no;
        const acName = feature.properties?.name || "";
        const district = feature.properties?.district || "";
        const result = resultMap[acNo];
        const prev = prevMap[acNo];
        const con = conMap[acNo];
        const electors = con?.total_electors ? `${(con.total_electors / 100000).toFixed(1)}L electors` : "";
        const cat = con?.category || "";

        let tip = "";
        if (effectiveMode === "results" && result?.party) {
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[result.party] || '#333'}">${result.party} - ${result.winner}</div>
             ${result.margin ? `<div style="color:#6B7280;font-size:10px;">Margin: ${result.margin.toLocaleString()}</div>` : ""}`;
        } else if (effectiveMode === "prev_winner" && prev?.party) {
          tip = `<div style="font-weight:700;font-size:13px;margin-bottom:2px;">${acNo}. ${acName}</div>
             <div style="color:#475569;font-size:11px;">${district} ${cat ? `(${cat})` : ""}</div>
             <div style="font-weight:600;font-size:11px;margin-top:3px;color:${PARTY_COLORS[prev.party] || '#333'}">2021 Winner: ${prev.party} - ${prev.winner}</div>
             ${prev.margin ? `<div style="color:#6B7280;font-size:10px;">2021 Margin: ${prev.margin.toLocaleString()}</div>` : ""}
             ${electors ? `<div style="color:#6B7280;font-size:10px;">2026: ${electors}</div>` : ""}`;
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
      const distFeatures = acGeoData.features.filter((f: any) => f.properties?.district?.toUpperCase() === selectedDistrict.toUpperCase());
      if (distFeatures.length > 0) map.flyToBounds(L.geoJSON({ type: "FeatureCollection", features: distFeatures } as any).getBounds(), { padding: [30, 30], duration: 0.6 });
    } else if (selectedAC) {
      const acFeature = acGeoData.features.find((f: any) => f.properties?.ac_no === selectedAC);
      if (acFeature) map.flyToBounds(L.geoJSON(acFeature).getBounds(), { padding: [50, 50], duration: 0.6 });
    } else {
      map.flyTo(ASSAM_CENTER, ASSAM_ZOOM, { duration: 0.6 });
    }

    return () => { map.off("zoomend", addLabels); };
  }, [acGeoData, acResults, prevResults, constituencies, selectedDistrict, selectedAC, handleAcClick, mapMode]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl" />;
}
