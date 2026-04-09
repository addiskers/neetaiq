"use client";
import { useEffect, useState, useMemo } from "react";
import { api, type ElectionStats, type DossierRow } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { MapPin, TrendingUp, Users, ChevronRight, Search, BarChart3, AlertTriangle, GraduationCap, Shield, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Treemap } from "recharts";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/overview/MapView"), { ssr: false });

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF9933", INC: "#00BFFF", AIUDF: "#006400", AGP: "#FFFFFF",
  BOPF: "#228B22", UPPL: "#FFD700", "CPI(M)": "#FF0000", IND: "#808080",
  AITC: "#00FF00", NCP: "#004080",
};

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  return n.toLocaleString("en-IN");
}

function formatRupees(n: number | null | undefined): string {
  if (!n) return "-";
  if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(0)} L`;
  return `\u20B9${n.toLocaleString("en-IN")}`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm ${className}`}>{children}</div>;
}

function CardTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#3B82F6]" />
      <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">{title}</span>
    </div>
  );
}

export default function OverviewPage() {
  const { electionId, currentElection, granularity, setGranularity, selectedDistrict, setSelectedDistrict, selectedAC, setSelectedAC, districts, filteredConstituencies } = useFilters();
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [dossier, setDossier] = useState<DossierRow[]>([]);
  const [searchDistrict, setSearchDistrict] = useState("");
  const [partyPerformance, setPartyPerformance] = useState<any[]>([]);
  const [turnoutByDistrict, setTurnoutByDistrict] = useState<any[]>([]);
  const [marginDistribution, setMarginDistribution] = useState<any[]>([]);
  const [categoryMix, setCategoryMix] = useState<any[]>([]);
  const [historicalWave, setHistoricalWave] = useState<any>(null);
  const [closestContests, setClosestContests] = useState<any[]>([]);
  const [notaImpact, setNotaImpact] = useState<any[]>([]);
  const [crorepati, setCrorepati] = useState<any>(null);
  const [genderDemo, setGenderDemo] = useState<any[]>([]);
  const [educationData, setEducationData] = useState<any[]>([]);
  const [criminalData, setCriminalData] = useState<any>(null);
  const [marginTurnout, setMarginTurnout] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<any>(null);
  const [placesToWatch, setPlacesToWatch] = useState<any[]>([]);
  const [swingAnalysis, setSwingAnalysis] = useState<any[]>([]);

  const hasResults = currentElection && currentElection.year !== 2026;
  const [mapMode, setMapMode] = useState<"results" | "category" | "prev_winner">("category");

  // Reset map mode when election changes
  useEffect(() => {
    setMapMode(hasResults ? "results" : "category");
  }, [hasResults]);

  const filterParams = useMemo(() => {
    const parts: string[] = [];
    if (selectedDistrict) parts.push(`district=${encodeURIComponent(selectedDistrict)}`);
    if (selectedAC) parts.push(`ac_no=${selectedAC}`);
    return parts.join("&");
  }, [selectedDistrict, selectedAC]);

  useEffect(() => {
    if (!electionId) return;
    api.getStats(electionId, filterParams).then(setStats);
    api.getDossierTable(electionId, 20, 0, filterParams).then(setDossier);
    api.getPartyPerformance(electionId, filterParams).then(setPartyPerformance);
    api.getTurnoutByDistrict(electionId, filterParams).then(setTurnoutByDistrict);
    api.getMarginDistribution(electionId, filterParams).then(setMarginDistribution);
    api.getCategoryMix(electionId, filterParams).then(setCategoryMix);
    api.getHistoricalWave().then(setHistoricalWave);
    api.getClosestContests(electionId).then(setClosestContests);
    api.getNotaImpact(electionId).then(setNotaImpact);
    api.getCrorepatiCandidates(electionId).then(setCrorepati);
    api.getGenderDemographics(electionId, filterParams).then(setGenderDemo);
    api.getEducationBreakdown(electionId, filterParams).then(setEducationData);
    api.getCriminalOverview(electionId, filterParams).then(setCriminalData);
    api.getMarginVsTurnout(electionId).then(setMarginTurnout);
    api.getCountdown(electionId).then(setCountdown);
    api.getPlacesToWatch().then(setPlacesToWatch);
    api.getSwingAnalysis().then(setSwingAnalysis);
  }, [electionId, filterParams]);

  const filteredDistrictsList = districts.filter((d) =>
    d.name.toLowerCase().includes(searchDistrict.toLowerCase())
  );

  const viewLabel = selectedAC
    ? filteredConstituencies.find((c) => c.ac_no === selectedAC)?.name || "Constituency"
    : selectedDistrict || currentElection?.state || "Overview";

  const GENDER_COLORS: Record<string, string> = { MALE: "#3B82F6", FEMALE: "#EC4899", UNKNOWN: "#F59E0B" };
  const CATEGORY_COLORS: Record<string, string> = { GEN: "#3B82F6", SC: "#F59E0B", ST: "#10B981" };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#111827] tracking-tight">Overview</h2>
          </div>
          <p className="text-sm text-[#9CA3AF] ml-12">
            Election countdown, geospatial mapping & candidate intelligence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Countdown Timer */}
          {countdown?.has_countdown && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] px-5 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#9CA3AF] tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
                T-MINUS {currentElection?.state.toUpperCase()} {currentElection?.year}
              </div>
              <LiveCountdown electionDate={countdown.election_date} />
            </div>
          )}
          {countdown?.is_past && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] px-5 py-3 shadow-sm text-sm text-[#6B7280]">
              Election held {countdown.days_ago} days ago
            </div>
          )}
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 bg-white rounded-2xl border border-[#E5E7EB] px-3 sm:px-6 py-3 shadow-sm">
              <div className="text-center"><div className="text-lg sm:text-2xl font-extrabold text-[#111827]">{stats.total_constituencies}</div><div className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase">Constituencies</div></div>
              <div className="text-center"><div className="text-lg sm:text-2xl font-extrabold text-[#111827]">{formatNum(stats.total_electors)}</div><div className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase">Electors</div></div>
              <div className="text-center"><div className="text-lg sm:text-2xl font-extrabold text-[#111827]">{stats.total_candidates}</div><div className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase">Candidates</div></div>
              <div className="text-center"><div className="text-lg sm:text-2xl font-extrabold text-[#3B82F6]">{stats.total_parties}</div><div className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase">Parties</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Map + District List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input type="text" placeholder="Search..." value={searchDistrict} onChange={(e) => setSearchDistrict(e.target.value)} className="bg-transparent text-sm text-[#111827] placeholder-[#64748B] outline-none flex-1" />
          </div>
          <div className="space-y-1 max-h-[250px] sm:max-h-[400px] overflow-y-auto pr-1">
            {granularity === "STATE" || !selectedDistrict ? (
              filteredDistrictsList.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => { setSelectedDistrict(d.name); setGranularity("DISTRICT"); }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all ${
                    selectedDistrict === d.name ? "bg-[#3B82F6]/10 text-[#3B82F6] ring-1 ring-[#3B82F6]/20" : "text-[#6B7280] hover:bg-[#F3F4F6] active:scale-[0.98]"
                  }`}
                >
                  <div className="text-left"><div className="text-sm font-semibold">{d.name}</div><div className="text-[11px] text-[#9CA3AF]">{d.constituency_count} ACs</div></div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-[#3B82F6]/10 text-[#3B82F6]">{formatNum(d.total_electors)}</span>
                </button>
              ))
            ) : (
              filteredConstituencies.filter((c) => c.name.toLowerCase().includes(searchDistrict.toLowerCase())).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => { setSelectedAC(c.ac_no); setGranularity("AC"); }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all ${
                    selectedAC === c.ac_no ? "bg-[#3B82F6]/10 text-[#3B82F6] ring-1 ring-[#3B82F6]/20" : "text-[#6B7280] hover:bg-[#F3F4F6] active:scale-[0.98]"
                  }`}
                >
                  <div className="text-left"><div className="text-sm font-semibold">{c.name}</div><div className="text-[11px] text-[#9CA3AF]">AC {c.ac_no}</div></div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${c.category === "SC" ? "bg-[#F59E0B]/20 text-[#D97706]" : c.category === "ST" ? "bg-[#10B981]/20 text-[#059669]" : "bg-[#3B82F6]/20 text-[#3B82F6]"}`}>{c.category || "GEN"}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="lg:col-span-9 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#3B82F6]" /><span className="text-sm font-semibold text-[#111827]">{viewLabel}</span></div>
            {!hasResults && (
              <div className="flex bg-[#F3F4F6] rounded-lg p-0.5 gap-0.5">
                {([["category", "Category"], ["prev_winner", "2021 Winner"]] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => setMapMode(mode)}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${mapMode === mode ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="h-[250px] sm:h-[350px] relative">
            <MapView mapMode={hasResults ? "results" : mapMode} />
            {/* Map Legend */}
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-[#E5E7EB] z-[400]">
              {(hasResults || mapMode === "prev_winner") && partyPerformance.length > 0 ? (
                <>
                  <div className="text-[9px] font-bold text-[#6B7280] uppercase mb-1">{hasResults ? "Winner" : "2021 Winner"}</div>
                  {["BJP", "INC", "AIUDF", "AGP", "BOPF", "UPPL"].map((p) => (
                    <div key={p} className="flex items-center gap-1.5 py-0.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PARTY_COLORS[p] || "#94A3B8" }} />
                      <span className="text-[10px] text-[#374151]">{p}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-[9px] font-bold text-[#6B7280] uppercase mb-1">Seat Category</div>
                  <div className="flex items-center gap-1.5 py-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#93C5FD]" /><span className="text-[10px] text-[#374151]">General (98)</span></div>
                  <div className="flex items-center gap-1.5 py-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FCD34D]" /><span className="text-[10px] text-[#374151]">SC (9)</span></div>
                  <div className="flex items-center gap-1.5 py-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6EE7B7]" /><span className="text-[10px] text-[#374151]">ST (19)</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Historical Wave + Demographic Mix + Gender Ratio + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Historical Wave */}
        <Card>
          <CardTitle icon={TrendingUp} title="Historical Wave" />
          {historicalWave?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={historicalWave.data}>
                <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                {historicalWave.parties?.slice(0, 4).map((p: string, i: number) => (
                  <Area key={p} type="monotone" dataKey={p} stroke={PARTY_COLORS[p] || ["#3B82F6","#EF4444","#10B981","#F59E0B"][i]} fill={PARTY_COLORS[p] || ["#3B82F6","#EF4444","#10B981","#F59E0B"][i]} fillOpacity={0.1} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[150px] flex items-center justify-center text-xs text-[#9CA3AF]">No data</div>}
          {historicalWave?.parties && (
            <div className="flex flex-wrap gap-2 mt-2">
              {historicalWave.parties.slice(0, 4).map((p: string, i: number) => (
                <div key={p} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[p] || ["#3B82F6","#EF4444","#10B981","#F59E0B"][i] }} /><span className="text-[10px] text-[#6B7280]">{p}</span></div>
              ))}
            </div>
          )}
        </Card>

        {/* Gender/Demographic */}
        <Card>
          <CardTitle icon={Users} title="Gender Demographics" />
          {genderDemo.length > 0 ? (
            <>
              <div className="text-center mb-2">
                <div className="text-2xl font-extrabold text-[#111827]">{genderDemo.reduce((s, g) => s + g.count, 0)}</div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Total Candidates</div>
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={genderDemo} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="count" paddingAngle={3}>
                    {genderDemo.map((g) => <Cell key={g.gender} fill={GENDER_COLORS[g.gender] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _: any, props: any) => [`${v} candidates`, props.payload.gender]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {genderDemo.map((g) => (
                  <div key={g.gender} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS[g.gender] || "#94A3B8" }} />
                    <span className="text-[11px] font-semibold" style={{ color: GENDER_COLORS[g.gender] || "#6B7280" }}>{g.gender} {g.pct}%</span>
                    <span className="text-[10px] text-[#9CA3AF]">({g.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-[150px] flex items-center justify-center text-xs text-[#9CA3AF]">No gender data</div>}
        </Card>

        {/* Category Mix */}
        <Card>
          <CardTitle icon={BarChart3} title="Constituency Category" />
          {categoryMix.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={categoryMix} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="count" paddingAngle={2}>
                    {categoryMix.map((c) => <Cell key={c.category} fill={CATEGORY_COLORS[c.category] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 mt-1">
                {categoryMix.map((c) => (
                  <div key={c.category} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.category] }} /><span className="text-[10px] text-[#6B7280]">{c.category} {c.percentage}%</span></div>
                ))}
              </div>
            </>
          ) : <div className="h-[150px] flex items-center justify-center text-xs text-[#9CA3AF]">No data</div>}
        </Card>

        {/* Education Breakdown */}
        <Card>
          <CardTitle icon={GraduationCap} title="Education Levels" />
          {educationData.length > 0 ? (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {educationData.slice(0, 8).map((e) => (
                <div key={e.education}>
                  <div className="flex justify-between text-[11px] mb-0.5"><span className="text-[#6B7280] truncate">{e.education}</span><span className="text-[#111827] font-medium">{e.count}</span></div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full"><div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${Math.min(e.pct, 100)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <div className="h-[150px] flex items-center justify-center text-xs text-[#9CA3AF]">No data</div>}
        </Card>
      </div>

      {/* Party Performance + District Turnout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={BarChart3} title="Election Results by Party" />
          {partyPerformance.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={partyPerformance.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="abbr" tick={{ fill: "#0F172A", fontSize: 11, fontWeight: 600 }} width={55} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="seats_won" name="Won" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="seats_contested" name="Contested" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
                {partyPerformance.slice(0, 6).map((p) => (
                  <div key={p.abbr} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: p.color || "#94A3B8" }} /><span className="font-medium text-[#111827]">{p.abbr}</span></div>
                    <span className="text-[#6B7280]">{p.seats_won} won / {p.seats_contested} &middot; {p.vote_share}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-[220px] flex items-center justify-center text-xs text-[#9CA3AF]">No results data</div>}
        </Card>

        <Card>
          <CardTitle icon={BarChart3} title="District-wise Voter Turnout %" />
          {turnoutByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={turnoutByDistrict.slice(0, 25)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="district" tick={{ fill: "#0F172A", fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Turnout"]} />
                <Bar dataKey="turnout" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[340px] flex items-center justify-center text-xs text-[#9CA3AF]">No turnout data</div>}
        </Card>
      </div>

      {/* Closest Contests + NOTA Impact */}
      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardTitle icon={AlertTriangle} title="Closest Contests" />
            {closestContests.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={closestContests.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#0F172A", fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [formatNum(v), "Margin"]} />
                  <Bar dataKey="margin" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-xs text-[#9CA3AF]">No data</div>}
          </Card>

          <Card>
            <CardTitle icon={BarChart3} title="NOTA Impact vs Winner Margin" />
            {notaImpact.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={notaImpact.filter(n => n.danger).slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#0F172A", fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="nota_votes" name="NOTA Votes" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="margin" name="Winner Margin" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-[#EF4444] mt-1">Showing constituencies where NOTA votes exceed winning margin</div>
              </>
            ) : <div className="h-[250px] flex items-center justify-center text-xs text-[#9CA3AF]">No NOTA data</div>}
          </Card>
        </div>
      )}

      {/* Crorepati Treemap + Criminal Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={TrendingUp} title="Crorepati Candidates" />
          {crorepati ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-extrabold text-[#111827]">{crorepati.crorepati_count}</div>
                <div><div className="text-xs text-[#6B7280]">of {crorepati.total_candidates} candidates</div><div className="text-sm font-bold text-[#059669]">{crorepati.crorepati_pct}% are crorepatis</div></div>
              </div>
              {crorepati.by_party?.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <Treemap data={crorepati.by_party.slice(0, 10).map((p: any) => ({ name: p.party, size: p.count, fill: PARTY_COLORS[p.party] || "#94A3B8" }))} dataKey="size" nameKey="name" stroke="#fff" fill="#3B82F6">
                    {crorepati.by_party.slice(0, 10).map((p: any, i: number) => (
                      <Cell key={i} fill={PARTY_COLORS[p.party] || ["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899"][i % 6]} />
                    ))}
                  </Treemap>
                </ResponsiveContainer>
              )}
            </>
          ) : <div className="h-[200px] flex items-center justify-center text-xs text-[#9CA3AF]">No asset data</div>}
        </Card>

        <Card>
          <CardTitle icon={Shield} title="Criminal Cases Overview" />
          {criminalData ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-extrabold text-[#EF4444]">{criminalData.with_criminal_cases}</div>
                <div><div className="text-xs text-[#6B7280]">of {criminalData.total_candidates} candidates</div><div className="text-sm font-bold text-[#EF4444]">{criminalData.pct}% have criminal cases</div></div>
              </div>
              {criminalData.by_party?.length > 0 && (
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {criminalData.by_party.slice(0, 8).map((p: any) => (
                    <div key={p.party} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[p.party] || "#94A3B8" }} /><span className="text-sm text-[#111827]">{p.party}</span></div>
                      <div className="text-xs text-[#6B7280]">{p.count} candidates &middot; {p.total_cases} cases</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <div className="h-[200px] flex items-center justify-center text-xs text-[#9CA3AF]">No data</div>}
        </Card>
      </div>

      {/* Margin vs Turnout */}
      {hasResults && marginTurnout.length > 0 && (
        <Card>
          <CardTitle icon={BarChart3} title="Margin Impact on Voter Turnout" />
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marginTurnout}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="range" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Avg Turnout"]} />
              <Bar dataKey="avg_turnout" fill="#10B981" radius={[4, 4, 0, 0]}>
                {marginTurnout.map((_, i) => <Cell key={i} fill={i < 2 ? "#EF4444" : "#10B981"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-[10px] text-[#6B7280]">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#EF4444] mr-1" />Contested (low margin)</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-1" />Safe (high margin)</span>
          </div>
        </Card>
      )}

      {/* Swing Analysis + Places to Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Swing Analysis */}
        {swingAnalysis.length > 0 && (
          <Card>
            <CardTitle icon={TrendingUp} title="Swing Analysis (2016 vs 2021)" />
            <div className="space-y-2">
              {swingAnalysis.map((p) => (
                <div key={p.party} className="flex items-center justify-between text-xs border-b border-[#F3F4F6] pb-2">
                  <div className="flex items-center gap-2 w-16">
                    <span className="font-bold text-[#111827]">{p.party}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center w-16"><div className="text-[#6B7280]">{p.seats_2016}</div><div className="text-[9px] text-[#9CA3AF]">2016</div></div>
                    <div className="text-center w-16"><div className="font-bold text-[#111827]">{p.seats_2021}</div><div className="text-[9px] text-[#9CA3AF]">2021</div></div>
                    <div className={`text-center w-16 font-bold ${p.seat_change > 0 ? "text-[#059669]" : p.seat_change < 0 ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
                      {p.seat_change > 0 ? "+" : ""}{p.seat_change}
                    </div>
                    <div className={`text-center w-20 ${p.vote_swing > 0 ? "text-[#059669]" : p.vote_swing < 0 ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
                      {p.vote_swing > 0 ? "+" : ""}{p.vote_swing}% vote
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Places to Watch */}
        {placesToWatch.length > 0 && (
          <Card>
            <CardTitle icon={AlertTriangle} title="Places to Watch (Thin Margins 2021)" />
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {placesToWatch.map((p) => (
                <div key={p.ac_no} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F9FAFB] text-xs">
                  <div className="flex-1">
                    <div className="font-semibold text-[#111827]">{p.name}</div>
                    <div className="text-[10px] text-[#6B7280]">{p.district} - {p.winner_party} won by {p.margin_2021.toLocaleString()} ({p.margin_pct}%)</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                    p.risk_level === "High" ? "bg-[#EF4444]/10 text-[#EF4444]" : p.risk_level === "Medium" ? "bg-[#F59E0B]/10 text-[#D97706]" : "bg-[#3B82F6]/10 text-[#3B82F6]"
                  }`}>{p.risk_level}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Candidate Dossier Table */}
      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-[#3B82F6]" /></div><h3 className="text-sm font-bold text-[#111827]">Candidate Dossier Overview</h3></div>
            <p className="text-[11px] text-[#6B7280] mt-1 ml-8">Verified financials and legal declarations from ECI affidavits</p>
          </div>
          <a href="/candidate-intel" className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-[#2563EB] font-medium border border-[#3B82F6]/30 rounded-lg px-3 py-1.5 transition-colors">View Full Database <ChevronRight className="w-3 h-3" /></a>
        </div>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-[10px] uppercase text-[#6B7280] border-b border-[#E5E7EB]">
              <th className="text-left py-2 px-3 font-medium">Candidate / Region</th>
              <th className="text-left py-2 px-3 font-medium">Party</th>
              <th className="text-left py-2 px-3 font-medium">Declared Assets</th>
              <th className="text-left py-2 px-3 font-medium">Criminal Cases</th>
              {hasResults && <th className="text-left py-2 px-3 font-medium">Votes</th>}
            </tr>
          </thead>
          <tbody>
            {dossier.map((c) => (
              <tr key={c.id} className="border-b border-[#E5E7EB]/50 hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-xs text-white font-bold shrink-0">{c.name.charAt(0)}</div>
                    )}
                    <div><div className="text-sm font-medium text-[#111827]">{c.name}</div><div className="text-[10px] text-[#6B7280]">{c.constituency_name}</div></div>
                  </div>
                </td>
                <td className="py-3 px-3"><span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${c.party_color || "#808080"}20`, color: c.party_color || "#808080" }}>{c.party_abbr}</span></td>
                <td className="py-3 px-3 text-sm text-[#059669] font-medium">{formatRupees(c.declared_assets)}</td>
                <td className="py-3 px-3">
                  {c.criminal_cases > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-[#EF4444]"><AlertTriangle className="w-3 h-3" />{c.criminal_cases} Active</span>
                  ) : (
                    <span className="text-xs text-[#9CA3AF]">No record found</span>
                  )}
                </td>
                {hasResults && <td className="py-3 px-3 text-sm font-medium text-[#111827]">{formatNum(c.votes_total)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function LiveCountdown({ electionDate }: { electionDate: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(electionDate + "T07:00:00").getTime();
  const diff = Math.max(target - now, 0);

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const units = [
    { value: days, label: "D" },
    { value: hours, label: "H" },
    { value: minutes, label: "M" },
    { value: seconds, label: "S" },
  ];

  return (
    <div className="flex items-baseline gap-0.5">
      {units.map((u, i) => (
        <span key={u.label} className="flex items-baseline">
          <span className={`text-xl font-extrabold tabular-nums ${i === 3 ? "text-[#4F46E5]" : "text-[#111827]"}`}>
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-bold text-[#9CA3AF] mr-1.5">{u.label}</span>
        </span>
      ))}
    </div>
  );
}
