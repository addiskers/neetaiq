const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Types
export interface Election {
  id: number;
  state: string;
  year: number;
  type: string;
  name: string;
}

export interface StateOverview {
  state: string;
  constituency_count: number;
  total_electors: number;
}

export interface DistrictOverview {
  id: number;
  name: string;
  constituency_count: number;
  total_electors: number;
}

export interface ConstituencyBrief {
  id: number;
  ac_no: number;
  name: string;
  district_name: string;
  total_electors: number | null;
  category: string | null;
}

export interface ConstituencyDetail {
  id: number;
  ac_no: number;
  name: string;
  district_name: string;
  category: string | null;
  total_electors: number | null;
  total_votes_polled: number | null;
  turnout_pct: number | null;
  winning_margin: number | null;
}

export interface DossierRow {
  id: number;
  name: string;
  constituency_name: string;
  party_abbr: string | null;
  party_color: string | null;
  position: number | null;
  votes_total: number | null;
  vote_pct: number | null;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
  image_url: string | null;
}

export interface CandidateBrief {
  id: number;
  name: string;
  constituency_name: string;
  constituency_ac_no: number;
  party_name: string | null;
  party_abbr: string | null;
  party_color: string | null;
  gender: string | null;
  age: number | null;
  position: number | null;
  votes_total: number | null;
  vote_pct: number | null;
  is_nota: boolean;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
  image_url: string | null;
}

export interface CandidateDetail {
  id: number;
  name: string;
  constituency_name: string;
  constituency_ac_no: number;
  district_name: string;
  party_name: string | null;
  party_abbr: string | null;
  party_color: string | null;
  gender: string | null;
  age: number | null;
  position: number | null;
  votes_general: number | null;
  votes_postal: number | null;
  votes_total: number | null;
  vote_pct: number | null;
  is_nota: boolean;
  education: string | null;
  occupation: string | null;
  declared_assets: number | null;
  liabilities: number | null;
  criminal_cases: number;
  image_url: string | null;
}

export interface Party {
  id: number;
  name: string;
  abbr: string | null;
  color: string | null;
}

export interface ElectionStats {
  total_constituencies: number;
  total_electors: number;
  total_candidates: number;
  total_parties: number;
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
  getStats: (electionId?: number, extra?: string) => fetchApi<ElectionStats>(`/overview/stats${qs(electionId, extra)}`),
  getTurnoutByConstituency: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/turnout-by-constituency${qs(electionId, extra)}`),
  getTurnoutByDistrict: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/turnout-by-district${qs(electionId, extra)}`),
  getPartyPerformance: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/party-performance${qs(electionId, extra)}`),
  getMarginDistribution: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/vote-margin-distribution${qs(electionId, extra)}`),
  getCategoryMix: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/category-mix${qs(electionId, extra)}`),
  getCountdown: (electionId?: number) => fetchApi<any>(`/overview/countdown${qs(electionId)}`),
  getAcResults: (electionId?: number) => fetchApi<any[]>(`/overview/ac-results${qs(electionId)}`),
  getHistoricalWave: (electionId?: number) => fetchApi<any>(`/overview/historical-wave${qs(electionId)}`),
  getClosestContests: (electionId?: number, limit = 10) => fetchApi<any[]>(`/overview/closest-contests${qs(electionId, `limit=${limit}`)}`),
  getNotaImpact: (electionId?: number) => fetchApi<any[]>(`/overview/nota-impact${qs(electionId)}`),
  getCrorepatiCandidates: (electionId?: number) => fetchApi<any>(`/overview/crorepati-candidates${qs(electionId)}`),
  getGenderDemographics: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/gender-demographics${qs(electionId, extra)}`),
  getEducationBreakdown: (electionId?: number, extra?: string) => fetchApi<any[]>(`/overview/education-breakdown${qs(electionId, extra)}`),
  getCriminalOverview: (electionId?: number, extra?: string) => fetchApi<any>(`/overview/criminal-overview${qs(electionId, extra)}`),
  getMarginVsTurnout: (electionId?: number) => fetchApi<any[]>(`/overview/margin-vs-turnout${qs(electionId)}`),
  getConstituencyTracker: (electionId?: number, extra?: string) =>
    fetchApi<any[]>(`/overview/constituency-tracker${qs(electionId, extra)}`),
  getPlacesToWatch: (electionId?: number) => fetchApi<any[]>(`/overview/places-to-watch${qs(electionId)}`),
  getSwingAnalysis: (electionId?: number) => fetchApi<any[]>(`/overview/swing-analysis${qs(electionId)}`),
  getCandidates: (electionId?: number, extra?: string) =>
    fetchApi<CandidateBrief[]>(`/candidates${qs(electionId, extra)}`),
  getCandidate: (id: number) => fetchApi<CandidateDetail>(`/candidates/${id}`),
  getParties: (electionId?: number) => fetchApi<Party[]>(`/candidates/parties${qs(electionId)}`),
  search: (q: string) => fetchApi<{ candidates: any[]; constituencies: any[] }>(`/search?q=${q}`),
  getPredictionSummary: () => fetchApi<any>("/predictions/summary"),
  getConstituencyPredictions: (params?: string) => fetchApi<any[]>(`/predictions/constituencies${params ? `?${params}` : ""}`),
  getBattlegrounds: (limit = 20) => fetchApi<any[]>(`/predictions/battlegrounds?limit=${limit}`),
  getSwingMap: () => fetchApi<any[]>("/predictions/swing-map"),
  generateTweets: (electionId?: number, category?: string) => {
    const parts: string[] = [];
    if (electionId) parts.push(`election_id=${electionId}`);
    if (category) parts.push(`category=${category}`);
    const q = parts.length ? `?${parts.join("&")}` : "";
    return fetchApi<any[]>(`/tweets/generate${q}`);
  },
  // Live Election
  getLiveResults: (stateCode: string, forceRefresh = false) =>
    fetchApi<LiveElectionResults>(`/live-election/results?state=${encodeURIComponent(stateCode)}${forceRefresh ? "&force_refresh=true" : ""}`),
  getLiveStates: () => fetchApi<LiveStateInfo[]>("/live-election/states"),
};

// Live Election types
export interface LivePartyResult {
  party: string;
  short: string;
  won: number;
  leading: number;
  total: number;
  color: string;
}

export interface LiveConstituencyResult {
  const_no: number | null;
  name: string;
  leading_candidate: string;
  leading_party: string;
  leading_party_short: string;
  trailing_candidate: string;
  trailing_party: string;
  margin: number | null;
  rounds: string;
  status: string;
  party_color: string;
}

export interface LiveElectionResults {
  state: string;
  state_code: string;
  total_ac: number;
  parties: LivePartyResult[];
  constituencies: LiveConstituencyResult[];
  last_updated: string | null;
  fetched_at: string;
  error?: string;
}

export interface LiveStateInfo {
  code: string;
  name: string;
  total_ac: number;
}
