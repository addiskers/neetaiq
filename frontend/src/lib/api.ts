const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Types
export interface Election {
  id: number;
  year: number;
  election_name: string;
  election_type: string;
  state: string;
}

export interface StateOverview {
  state: string;
  constituency_count: number;
  total_electors: number;
  swing_status: string;
}

export interface DistrictOverview {
  id: number;
  name: string;
  constituency_count: number;
  total_electors: number;
  total_polling_stations: number;
}

export interface ConstituencyBrief {
  id: number;
  ac_number: number;
  name: string;
  district_name: string;
  total_electors: number | null;
  swing_status: string;
}

export interface ConstituencyDetail {
  id: number;
  ac_number: number;
  name: string;
  district_name: string;
  total_polling_stations: number | null;
  male_electors: number | null;
  female_electors: number | null;
  third_gender_electors: number | null;
  total_electors: number | null;
  swing_status: string | null;
  ruling_party: string | null;
  turnout_percentage: number | null;
}

export interface GenderDemographics {
  male_electors: number;
  female_electors: number;
  third_gender_electors: number;
  total_electors: number;
  male_pct: number;
  female_pct: number;
  third_gender_pct: number;
}

export interface DossierRow {
  id: number;
  name: string;
  constituency_name: string;
  party_short_name: string | null;
  party_color: string | null;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
}

export interface CandidateBrief {
  id: number;
  name: string;
  constituency_name: string;
  constituency_ac_number: number;
  party_name: string;
  party_short_name: string | null;
  party_color: string | null;
  status: string;
  is_contesting: boolean;
  age: number | null;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
}

export interface CandidateDetail {
  id: number;
  name: string;
  constituency_name: string;
  constituency_ac_number: number;
  district_name: string;
  party_name: string;
  party_short_name: string | null;
  party_color: string | null;
  status: string;
  is_contesting: boolean;
  is_incumbent: boolean;
  profile_url: string | null;
  age: number | null;
  gender: string | null;
  education: string | null;
  occupation: string | null;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
  approval_rating: number | null;
  criminal_records: CriminalRecord[];
  political_affiliations: PoliticalAffiliation[];
}

export interface CriminalRecord {
  id: number;
  ipc_section: string | null;
  description: string | null;
  case_status: string | null;
  case_year: number | null;
}

export interface PoliticalAffiliation {
  id: number;
  party_name: string;
  party_short_name: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
}

export interface Party {
  id: number;
  name: string;
  short_name: string | null;
  color: string | null;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  election_date: string;
}

export interface ElectionStats {
  total_constituencies: number;
  total_polling_stations: number;
  total_electors: number;
  total_candidates: number;
  total_contesting: number;
  total_parties: number;
}

export interface ResourceAllocation {
  safe: number;
  swing: number;
  volatile: number;
  leaning: number;
  stable: number;
}

function eid(electionId?: number): string {
  return electionId ? `election_id=${electionId}` : "";
}

function qs(electionId?: number, extra?: string): string {
  const parts = [eid(electionId), extra].filter(Boolean).join("&");
  return parts ? `?${parts}` : "";
}

// API functions
export const api = {
  getElections: () => fetchApi<Election[]>("/overview/elections"),
  getStates: () => fetchApi<StateOverview[]>("/overview/states"),
  getDistricts: (electionId?: number) => fetchApi<DistrictOverview[]>(`/overview/districts${qs(electionId)}`),
  getConstituencies: (electionId?: number, extra?: string) =>
    fetchApi<ConstituencyBrief[]>(`/overview/constituencies${qs(electionId, extra)}`),
  getConstituency: (ac: number, electionId?: number) =>
    fetchApi<ConstituencyDetail>(`/overview/constituencies/${ac}${qs(electionId)}`),
  getDossierTable: (electionId?: number, limit = 20, offset = 0, extra?: string) =>
    fetchApi<DossierRow[]>(`/overview/dossier-table${qs(electionId, `limit=${limit}&offset=${offset}${extra ? `&${extra}` : ""}`)}`),
  getDemographics: (electionId?: number, extra?: string) => fetchApi<GenderDemographics>(`/overview/demographics${qs(electionId, extra)}`),
  getCountdown: (electionId?: number) => fetchApi<Countdown>(`/overview/countdown${qs(electionId)}`),
  getStats: (electionId?: number, extra?: string) => fetchApi<ElectionStats>(`/overview/stats${qs(electionId, extra)}`),
  getTurnoutByConstituency: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/turnout-by-constituency${qs(electionId, extra)}`),
  getTurnoutByDistrict: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/turnout-by-district${qs(electionId, extra)}`),
  getPartyPerformance: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/party-performance${qs(electionId, extra)}`),
  getMarginDistribution: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/vote-margin-distribution${qs(electionId, extra)}`),
  getCategoryMix: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/category-mix${qs(electionId, extra)}`),
  getCandidates: (electionId?: number, extra?: string) =>
    fetchApi<CandidateBrief[]>(`/candidates${qs(electionId, extra)}`),
  getCandidate: (id: number) => fetchApi<CandidateDetail>(`/candidates/${id}`),
  getParties: (electionId?: number) => fetchApi<Party[]>(`/candidates/parties${qs(electionId)}`),
  search: (q: string) => fetchApi<{ candidates: any[]; constituencies: any[] }>(`/search?q=${q}`),
  generateTweets: (electionId?: number, category?: string) => {
    const parts: string[] = [];
    if (electionId) parts.push(`election_id=${electionId}`);
    if (category) parts.push(`category=${category}`);
    const q = parts.length ? `?${parts.join("&")}` : "";
    return fetchApi<any[]>(`/tweets/generate${q}`);
  },
};
