"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, pickDefaultElection, toStateSlug, type DistrictOverview, type ConstituencyBrief, type Election } from "./api";
import { guard } from "./guard";

export type Granularity = "STATE" | "DISTRICT" | "AC";

interface FilterState {
  elections: Election[];
  electionId: number | undefined;
  currentElection: Election | null;
  stateSlug: string;
  setElection: (e: Election) => void;
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

function electionKey(e: Election) {
  return `${e.state}:${e.id}`;
}

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [elections, setElections] = useState<Election[]>([]);
  // Key is "State Name:id" — unique across both states
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("DISTRICT");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedAC, setSelectedAC] = useState<number | null>(null);
  const [districts, setDistricts] = useState<DistrictOverview[]>([]);
  const [constituencies, setConstituencies] = useState<ConstituencyBrief[]>([]);

  // Load every state's elections on mount
  useEffect(() => {
    guard(
      api.getAllElections().then((data) => {
        const sorted = data.sort((a, b) => b.year - a.year || a.state.localeCompare(b.state));
        setElections(sorted);
        // Same choice the server render made, so the two agree on the first
        // paint instead of briefly disagreeing about which state is on screen.
        const initial = pickDefaultElection(sorted);
        if (initial) {
          setSelectedKey(electionKey(initial));
        }
      }),
      "elections",
    );
  }, []);

  // Derive current election unambiguously via composite key
  const currentElection = selectedKey
    ? elections.find((e) => electionKey(e) === selectedKey) ?? null
    : null;

  const electionId = currentElection?.id;
  const stateSlug = currentElection ? toStateSlug(currentElection.state) : "westbengal";

  // Reload districts + constituencies when election changes
  useEffect(() => {
    if (!electionId || !stateSlug) return;
    // Clear first. These are guarded, so a failed request leaves whatever was
    // here before — and what was here before belongs to the previously selected
    // election. That showed Chhattisgarh's districts under a Jammu & Kashmir
    // heading when the API was briefly unreachable. An empty list while the
    // request is in flight is honest; another state's districts are not.
    setDistricts([]);
    setConstituencies([]);
    guard(api.getDistricts(electionId, stateSlug).then(setDistricts), "districts");
    guard(api.getConstituencies(electionId, undefined, stateSlug).then(setConstituencies), "constituencies");
  }, [selectedKey]); // use selectedKey so both id AND state must match

  const setElection = (e: Election) => {
    setSelectedKey(electionKey(e));
    setGranularity("DISTRICT");
    setSelectedDistrict(null);
    setSelectedAC(null);
  };

  useEffect(() => {
    if (granularity === "DISTRICT") setSelectedAC(null);
  }, [granularity]);

  const filteredConstituencies = selectedDistrict
    ? constituencies.filter((c) => c.district_name.toLowerCase() === selectedDistrict.toLowerCase())
    : constituencies;

  return (
    <FilterContext.Provider
      value={{
        elections, electionId, currentElection, stateSlug,
        setElection,
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

const EMPTY_FILTERS: FilterState = {
  elections: [],
  electionId: undefined,
  currentElection: null,
  stateSlug: "westbengal",
  setElection: () => {},
  granularity: "DISTRICT",
  setGranularity: () => {},
  selectedDistrict: null,
  setSelectedDistrict: () => {},
  selectedAC: null,
  setSelectedAC: () => {},
  districts: [],
  constituencies: [],
  filteredConstituencies: [],
};

export function useFilters() {
  return useContext(FilterContext) ?? EMPTY_FILTERS;
}
