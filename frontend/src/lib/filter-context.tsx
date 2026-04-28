"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, type DistrictOverview, type ConstituencyBrief, type Election } from "./api";

export type Granularity = "STATE" | "DISTRICT" | "AC";

interface FilterState {
  elections: Election[];
  electionId: number | undefined;
  setElectionId: (id: number) => void;
  currentElection: Election | null;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (d: string | null) => void;
  selectedAC: number | null;
  setSelectedAC: (ac: number | null) => void;
  districts: DistrictOverview[];
  constituencies: ConstituencyBrief[];
  filteredConstituencies: ConstituencyBrief[];
}

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionId, setElectionIdRaw] = useState<number | undefined>(undefined);
  const [granularity, setGranularity] = useState<Granularity>("DISTRICT");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedAC, setSelectedAC] = useState<number | null>(null);
  const [districts, setDistricts] = useState<DistrictOverview[]>([]);
  const [constituencies, setConstituencies] = useState<ConstituencyBrief[]>([]);

  // Load elections on mount
  useEffect(() => {
    api.getElections().then((data) => {
      // Sort: latest year first
      const sorted = data.sort((a, b) => b.year - a.year);
      setElections(sorted);
      if (sorted.length > 0) {
        setElectionIdRaw(sorted[0].id);
      }
    });
  }, []);

  // Reload districts + constituencies when election changes
  useEffect(() => {
    if (!electionId) return;
    api.getDistricts(electionId).then(setDistricts);
    api.getConstituencies(electionId).then(setConstituencies);
  }, [electionId]);

  // When changing election, reset filters
  const setElectionId = (id: number) => {
    setElectionIdRaw(id);
    setGranularity("DISTRICT");
    setSelectedDistrict(null);
    setSelectedAC(null);
  };

  // Reset selections when granularity changes
  useEffect(() => {
    if (granularity === "DISTRICT") {
      setSelectedAC(null);
    }
  }, [granularity]);

  const currentElection = elections.find((e) => e.id === electionId) || null;

  const filteredConstituencies = selectedDistrict
    ? constituencies.filter((c) => c.district_name.toLowerCase() === selectedDistrict.toLowerCase())
    : constituencies;

  return (
    <FilterContext.Provider
      value={{
        elections, electionId, setElectionId, currentElection,
        granularity, setGranularity,
        selectedDistrict, setSelectedDistrict,
        selectedAC, setSelectedAC,
        districts, constituencies, filteredConstituencies,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
