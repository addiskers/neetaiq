"use client";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFilters } from "@/lib/filter-context";

// --- State configs ---
interface StateMapConfig {
  center: L.LatLngExpression;
  zoom: number;
  geoJsonFile: string;
  districtColors: Record<string, string>;
  districtCenters: Record<string, [number, number]>;
}

const ASSAM_CONFIG: StateMapConfig = {
  center: [26.15, 92.50],
  zoom: 7.3,
  geoJsonFile: "/assam-districts.geojson",
  districtColors: {
    "Kokrajhar": "#A3E4D7", "Chirang": "#F9E79F", "Bongaigaon": "#E8DAEF",
    "Dhubri": "#ABEBC6", "South Salmara-Mankachar": "#F5CBA7", "Goalpara": "#AED6F1",
    "Barpeta": "#F5DEB3", "Bajali": "#E8D5B7", "Nalbari": "#A2D9CE",
    "Baksa": "#B8E6B8", "Tamulpur": "#FADBD8", "Kamrup Rural": "#E59866",
    "Kamrup Metropolitan": "#F7DC6F", "Darrang": "#D6EAF8", "Udalguri": "#E8DAEF",
    "Morigaon": "#D5D8DC", "Nagaon": "#EDBB99", "Hojai": "#F1948A",
    "Sonitpur": "#AED6F1", "Biswanath": "#D4E6F1", "West Karbi Anglong": "#D5F5E3",
    "Karbi Anglong": "#D7BDE2", "Golaghat": "#F0B27A", "Jorhat": "#85C1E9",
    "Majuli": "#A9CCE3", "Sivasagar": "#F9E79F", "Charaideo": "#D5F5E3",
    "Dibrugarh": "#F5B7B1", "Lakhimpur": "#FAD7A0", "Dhemaji": "#F9E79F",
    "Tinsukia": "#D6DBDF", "Dima Hasao": "#D2B4DE", "Cachar": "#FADBD8",
    "Hailakandi": "#82E0AA", "Sribhumi": "#D4EFDF",
  },
  districtCenters: {
    "Bajali": [26.40, 91.10], "Baksa": [26.70, 91.25], "Barpeta": [26.32, 91.00],
    "Biswanath": [26.73, 93.15], "Bongaigaon": [26.47, 90.56], "Cachar": [24.79, 92.82],
    "Charaideo": [27.05, 95.00], "Chirang": [26.50, 90.22], "Darrang": [26.45, 92.17],
    "Dhemaji": [27.47, 94.56], "Dhubri": [26.02, 89.98], "Dibrugarh": [27.47, 94.91],
    "Dima Hasao": [25.50, 93.01], "Goalpara": [26.17, 90.62], "Golaghat": [26.52, 93.96],
    "Hailakandi": [24.68, 92.56], "Hojai": [25.85, 92.85], "Jorhat": [26.75, 94.22],
    "Kamrup Metropolitan": [26.14, 91.74], "Kamrup Rural": [26.22, 91.50],
    "Karbi Anglong": [26.00, 93.56], "Kokrajhar": [26.40, 89.88], "Lakhimpur": [27.23, 94.10],
    "Majuli": [26.95, 94.17], "Morigaon": [26.25, 92.40], "Nagaon": [26.35, 92.69],
    "Nalbari": [26.44, 91.44], "Sivasagar": [26.98, 94.63], "Sonitpur": [26.70, 92.95],
    "South Salmara-Mankachar": [26.10, 90.20], "Sribhumi": [24.87, 92.35],
    "Tamulpur": [26.60, 91.30], "Tinsukia": [27.49, 95.36], "Udalguri": [26.75, 92.10],
    "West Karbi Anglong": [25.80, 93.20],
  },
};

const WB_CONFIG: StateMapConfig = {
  center: [23.8, 87.85],
  zoom: 6.8,
  geoJsonFile: "/west-bengal-districts.geojson",
  districtColors: {
    "Cooch Behar": "#A3E4D7", "Alipurduar": "#F9E79F", "Jalpaiguri": "#E8DAEF",
    "Darjeeling": "#ABEBC6", "Kalimpong": "#F5CBA7", "Uttar Dinajpur": "#AED6F1",
    "Dakshin Dinajpur": "#F5DEB3", "Malda": "#A2D9CE", "Murshidabad": "#B8E6B8",
    "Birbhum": "#FADBD8", "Jhargram": "#E59866", "Paschim Medinipur": "#F7DC6F",
    "Purba Medinipur": "#D6EAF8", "Bankura": "#E8DAEF", "Purulia": "#D5D8DC",
    "Purba Bardhaman": "#EDBB99", "Paschim Bardhaman": "#F1948A", "Nadia": "#AED6F1",
    "North 24 Parganas": "#D4E6F1", "Howrah": "#D5F5E3", "Hooghly": "#D7BDE2",
    "Kolkata": "#F0B27A", "South 24 Parganas": "#85C1E9",
  },
  districtCenters: {
    "Cooch Behar": [26.30, 89.35], "Alipurduar": [26.65, 89.45],
    "Jalpaiguri": [26.65, 88.65], "Darjeeling": [26.90, 88.10],
    "Kalimpong": [26.95, 88.55], "Uttar Dinajpur": [26.05, 88.00],
    "Dakshin Dinajpur": [25.45, 88.15], "Malda": [25.15, 87.90],
    "Murshidabad": [24.20, 88.00], "Birbhum": [24.10, 87.45],
    "Jhargram": [22.35, 86.70], "Paschim Medinipur": [22.40, 87.10],
    "Purba Medinipur": [22.05, 87.55], "Bankura": [23.05, 87.10],
    "Purulia": [23.15, 86.30], "Purba Bardhaman": [23.35, 87.65],
    "Paschim Bardhaman": [23.55, 87.05], "Nadia": [23.70, 88.35],
    "North 24 Parganas": [22.80, 88.55], "Howrah": [22.55, 87.95],
    "Hooghly": [22.85, 87.85], "Kolkata": [22.55, 88.32],
    "South 24 Parganas": [21.95, 88.40],
  },
};

const STATE_CONFIGS: Record<string, StateMapConfig> = {
  "Assam": ASSAM_CONFIG,
  "West Bengal": WB_CONFIG,
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [geoData, setGeoData] = useState<any>(null);

  const {
    selectedDistrict, setSelectedDistrict, setGranularity,
    selectedAC, districts, filteredConstituencies, currentElection,
  } = useFilters();

  const stateName = currentElection?.state || "Assam";
  const config = STATE_CONFIGS[stateName] || ASSAM_CONFIG;

  // Load GeoJSON when state changes
  useEffect(() => {
    setGeoData(null);
    fetch(config.geoJsonFile)
      .then((r) => r.json())
      .then(setGeoData);
  }, [config.geoJsonFile]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: config.center,
      zoom: config.zoom,
      zoomControl: false,
      attributionControl: false,
      minZoom: 5,
      maxZoom: 13,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-center map when state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(config.center, config.zoom, { duration: 0.6 });
  }, [config.center, config.zoom]);

  const handleDistrictClick = useCallback((name: string) => {
    if (selectedDistrict === name) {
      setSelectedDistrict(null);
      setGranularity("STATE");
    } else {
      setSelectedDistrict(name);
      setGranularity("DISTRICT");
    }
  }, [selectedDistrict, setSelectedDistrict, setGranularity]);

  // Render GeoJSON districts
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
    }

    const geoLayer = L.geoJSON(geoData, {
      style: (feature) => {
        const name = feature?.properties?.name || "";
        const isSelected = selectedDistrict === name;
        return {
          fillColor: isSelected ? "#3B82F6" : (config.districtColors[name] || "#E2E8F0"),
          fillOpacity: isSelected ? 0.5 : 0.75,
          color: isSelected ? "#1D4ED8" : "#64748B",
          weight: isSelected ? 3 : 1,
          opacity: isSelected ? 1 : 0.6,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name || "";
        const districtData = districts.find((d) => d.name === name);

        const tip = districtData
          ? `<div style="font-weight:700;font-size:13px;margin-bottom:3px;">${name}</div>
             <div style="color:#475569;font-size:11px;">${districtData.constituency_count} Constituencies</div>
             <div style="color:#475569;font-size:11px;">${(districtData.total_electors / 100000).toFixed(1)}L Electors</div>
             <div style="color:#475569;font-size:11px;">${districtData.total_polling_stations.toLocaleString()} Polling Stations</div>
             <div style="color:#3B82F6;font-size:10px;margin-top:4px;font-weight:600;">Click to filter dashboard</div>`
          : `<div style="font-weight:700;font-size:13px;">${name}</div>`;

        layer.bindTooltip(tip, { className: "district-tooltip", sticky: true });

        layer.on("mouseover", () => {
          if (selectedDistrict !== name) {
            (layer as any).setStyle({ fillOpacity: 0.9, weight: 2, color: "#3B82F6" });
          }
        });
        layer.on("mouseout", () => {
          geoLayer.resetStyle(layer);
        });

        layer.on("click", () => handleDistrictClick(name));
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;
  }, [geoData, selectedDistrict, districts, handleDistrictClick, config.districtColors]);

  // Render labels + constituency markers
  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    if (!selectedDistrict) {
      // STATE VIEW — district name labels
      map.flyTo(config.center, config.zoom, { duration: 0.6 });

      Object.entries(config.districtCenters).forEach(([name, center]) => {
        const shortName = name
          .replace("-Mankachar", "")
          .replace(" Metropolitan", " Metro")
          .replace(" Rural", "")
          .replace("North 24 Parganas", "N 24 Pgs")
          .replace("South 24 Parganas", "S 24 Pgs")
          .replace("Paschim Medinipur", "P. Medinipur")
          .replace("Purba Medinipur", "E. Medinipur")
          .replace("Purba Bardhaman", "E. Bardhaman")
          .replace("Paschim Bardhaman", "W. Bardhaman")
          .replace("Uttar Dinajpur", "U. Dinajpur")
          .replace("Dakshin Dinajpur", "D. Dinajpur");

        const label = L.marker(center, {
          icon: L.divIcon({
            className: "district-label",
            html: `<div style="font-size:9px;font-weight:700;color:#1e293b;text-shadow:0 0 4px #fff,0 0 4px #fff,0 0 4px #fff;white-space:nowrap;text-transform:uppercase;letter-spacing:0.3px;pointer-events:none;">${shortName}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 6],
          }),
          interactive: false,
        });
        label.addTo(markerLayer);
      });
    } else {
      // DISTRICT VIEW — zoom in, show constituencies
      const center = config.districtCenters[selectedDistrict];
      if (center) {
        map.flyTo(center, 9.5, { duration: 0.6 });
      }

      // District name header
      if (center) {
        const header = L.marker([center[0] + 0.3, center[1]], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:14px;font-weight:800;color:#1e293b;text-shadow:0 0 6px #fff,0 0 6px #fff;white-space:nowrap;text-transform:uppercase;letter-spacing:1px;">${selectedDistrict}</div>`,
            iconSize: [0, 0],
            iconAnchor: [40, 0],
          }),
          interactive: false,
        });
        header.addTo(markerLayer);
      }

      // Constituency markers
      filteredConstituencies.forEach((c, i) => {
        const dc = config.districtCenters[c.district_name];
        if (!dc) return;

        const angle = (i / Math.max(filteredConstituencies.length, 1)) * Math.PI * 2;
        const spread = 0.05 + (i % 4) * 0.025;
        const lat = dc[0] + Math.cos(angle) * spread;
        const lng = dc[1] + Math.sin(angle) * spread;

        const isSelected = selectedAC === c.ac_number;

        const marker = L.circleMarker([lat, lng], {
          radius: isSelected ? 14 : 9,
          fillColor: isSelected ? "#3B82F6" : "#10B981",
          fillOpacity: isSelected ? 1 : 0.8,
          color: isSelected ? "#1D4ED8" : "#047857",
          weight: isSelected ? 3 : 1.5,
        });

        marker.bindTooltip(
          `<div style="font-weight:700;font-size:12px;">${c.name}</div>
           <div style="color:#475569;font-size:10px;">AC ${c.ac_number} • ${c.district_name}</div>
           <div style="color:#475569;font-size:10px;">${c.total_electors ? (c.total_electors / 100000).toFixed(1) + "L electors" : ""}</div>`,
          { className: "district-tooltip", direction: "top", offset: [0, -8] }
        );

        const acLabel = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:7px;font-weight:700;color:#fff;text-align:center;pointer-events:none;margin-top:-4px;">${c.ac_number}</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          interactive: false,
        });

        marker.addTo(markerLayer);
        acLabel.addTo(markerLayer);
      });

      // Back button
      if (center) {
        const back = L.marker([center[0] - 0.25, center[1] - 0.15] as L.LatLngExpression, {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#3B82F6;color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(59,130,246,0.4);">← Back to ${stateName}</div>`,
            iconSize: [0, 0],
          }),
        });
        back.on("click", () => {
          setSelectedDistrict(null);
          setGranularity("STATE");
        });
        back.addTo(markerLayer);
      }
    }
  }, [selectedDistrict, selectedAC, filteredConstituencies, setSelectedDistrict, setGranularity, config, stateName]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl" />;
}
