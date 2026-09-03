const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Retries back off 300ms, 600ms, 1200ms, 2400ms — about 4.5s in total. The
// window is sized to outlast an API restart: two attempts covered under a
// second, which meant every panel on the page gave up and logged a failure
// while the backend was still coming back up.
const RETRY_DELAY_MS = 300;
const MAX_RETRIES = 4;

async function fetchApi<T>(path: string, attempt = 0): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    // fetch() rejects with a TypeError ("Failed to fetch") only for transport
    // level failures: the API restarting, a dropped connection, or a browser
    // extension that wraps window.fetch interfering with the request. Those
    // usually succeed on a second attempt. An HTTP status error or a malformed
    // JSON body is deterministic, so it is rethrown straight away.
    if (err instanceof TypeError && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
      return fetchApi<T>(path, attempt + 1);
    }
    throw err;
  }
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

/** The election the app opens on: the most recent one, ties broken by state
 * name. That currently resolves to Assam 2026, which is the state the app has
 * always opened on.
 *
 * The point of having it as a function is that the server render and the client
 * picker both call it, so the two agree. They used not to: the server sent no
 * state at all and so server-rendered West Bengal's newest election, while the
 * client picked the newest election across every state. The first paint showed
 * one state's numbers under another state's name, and the page only became
 * consistent once something forced a refetch — which is why the data appeared
 * to arrive only after switching year.
 */
export function pickDefaultElection(elections: Election[]): Election | undefined {
  if (elections.length === 0) return undefined;
  return [...elections].sort(
    (a, b) => b.year - a.year || a.state.localeCompare(b.state),
  )[0];
}

/** Convert a state display name to the slug the backend expects.
 *
 * Everything that is not a letter or digit is dropped, not just whitespace:
 * "Jammu & Kashmir" has to become "jammukashmir", and stripping spaces alone
 * left "jammu&kashmir", which matched no state on the backend. Every other
 * state's name is already punctuation-free, so this changes nothing for them.
 */
export function toStateSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function qs(electionId?: number, extra?: string, state?: string): string {
  const parts = [
    state ? `state=${encodeURIComponent(state)}` : "",
    electionId ? `election_id=${electionId}` : "",
    extra || "",
  ].filter(Boolean).join("&");
  return parts ? `?${parts}` : "";
}

// API functions
export const api = {
  getAllElections: () => fetchApi<Election[]>("/overview/all-elections"),
  getElections: (state?: string) =>
    fetchApi<Election[]>(`/overview/elections${state ? `?state=${state}` : ""}`),
  getStates: () => fetchApi<StateOverview[]>("/overview/states"),
  getDistricts: (electionId?: number, state?: string) =>
    fetchApi<DistrictOverview[]>(`/overview/districts${qs(electionId, undefined, state)}`),
  getConstituencies: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<ConstituencyBrief[]>(`/overview/constituencies${qs(electionId, extra, state)}`),
  getConstituency: (ac: number, electionId?: number, state?: string) =>
    fetchApi<ConstituencyDetail>(`/overview/constituencies/${ac}${qs(electionId, undefined, state)}`),
  getDossierTable: (electionId?: number, limit = 20, offset = 0, extra?: string, state?: string) =>
    fetchApi<DossierRow[]>(`/overview/dossier-table${qs(electionId, `limit=${limit}&offset=${offset}${extra ? `&${extra}` : ""}`, state)}`),
  getStats: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<ElectionStats>(`/overview/stats${qs(electionId, extra, state)}`),
  getTurnoutByConstituency: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/turnout-by-constituency${qs(electionId, extra, state)}`),
  getTurnoutByDistrict: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/turnout-by-district${qs(electionId, extra, state)}`),
  getPartyPerformance: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/party-performance${qs(electionId, extra, state)}`),
  getMarginDistribution: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/vote-margin-distribution${qs(electionId, extra, state)}`),
  getCategoryMix: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/category-mix${qs(electionId, extra, state)}`),
  getCountdown: (electionId?: number, state?: string) =>
    fetchApi<any>(`/overview/countdown${qs(electionId, undefined, state)}`),
  getAcResults: (electionId?: number, state?: string) =>
    fetchApi<any[]>(`/overview/ac-results${qs(electionId, undefined, state)}`),
  getHistoricalWave: (electionId?: number, state?: string) =>
    fetchApi<any>(`/overview/historical-wave${qs(electionId, undefined, state)}`),
  getClosestContests: (electionId?: number, limit = 10, state?: string) =>
    fetchApi<any[]>(`/overview/closest-contests${qs(electionId, `limit=${limit}`, state)}`),
  getNotaImpact: (electionId?: number, state?: string) =>
    fetchApi<any[]>(`/overview/nota-impact${qs(electionId, undefined, state)}`),
  getCrorepatiCandidates: (electionId?: number, state?: string) =>
    fetchApi<any>(`/overview/crorepati-candidates${qs(electionId, undefined, state)}`),
  getGenderDemographics: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/gender-demographics${qs(electionId, extra, state)}`),
  getEducationBreakdown: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/education-breakdown${qs(electionId, extra, state)}`),
  getCriminalOverview: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any>(`/overview/criminal-overview${qs(electionId, extra, state)}`),
  getMarginVsTurnout: (electionId?: number, state?: string) =>
    fetchApi<any[]>(`/overview/margin-vs-turnout${qs(electionId, undefined, state)}`),
  getConstituencyTracker: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<any[]>(`/overview/constituency-tracker${qs(electionId, extra, state)}`),
  getPlacesToWatch: (electionId?: number, state?: string) =>
    fetchApi<any[]>(`/overview/places-to-watch${qs(electionId, undefined, state)}`),
  getSwingAnalysis: (electionId?: number, state?: string) =>
    fetchApi<any[]>(`/overview/swing-analysis${qs(electionId, undefined, state)}`),
  getCandidates: (electionId?: number, extra?: string, state?: string) =>
    fetchApi<CandidateBrief[]>(`/candidates${qs(electionId, extra, state)}`),
  getCandidate: (id: number, state?: string) => fetchApi<CandidateDetail>(`/candidates/${id}${state ? `?state=${state}` : ""}`),
  getParties: (electionId?: number, state?: string) =>
    fetchApi<Party[]>(`/candidates/parties${qs(electionId, undefined, state)}`),
  search: (q: string, state?: string) =>
    fetchApi<{ candidates: any[]; constituencies: any[] }>(
      `/search?q=${encodeURIComponent(q)}${state ? `&state=${state}` : ""}`
    ),
  getPredictionSummary: () => fetchApi<any>("/predictions/summary"),
  getConstituencyPredictions: (params?: string) =>
    fetchApi<any[]>(`/predictions/constituencies${params ? `?${params}` : ""}`),
  getBattlegrounds: (limit = 20) => fetchApi<any[]>(`/predictions/battlegrounds?limit=${limit}`),
  getSwingMap: () => fetchApi<any[]>("/predictions/swing-map"),
  generateTweets: (electionId?: number, category?: string, state?: string) => {
    const parts: string[] = [];
    if (state) parts.push(`state=${state}`);
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
