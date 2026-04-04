"use client";
import { useEffect, useState, useMemo } from "react";
import { api, type ElectionStats, type GenderDemographics, type DossierRow, type Countdown, type ConstituencyDetail } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { MapPin, Clock, AlertTriangle, TrendingUp, Users, PieChart as PieChartIcon, ChevronRight, Search, Vote, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/overview/MapView"), { ssr: false });

function formatNum(n: number | null | undefined): string {
  if (!n) return "-";
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  return n.toLocaleString("en-IN");
}

export default function OverviewPage() {
  const { electionId, currentElection, granularity, selectedDistrict, selectedAC, districts, filteredConstituencies, constituencies } = useFilters();
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [demographics, setDemographics] = useState<GenderDemographics | null>(null);
  const [dossier, setDossier] = useState<DossierRow[]>([]);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [searchDistrict, setSearchDistrict] = useState("");
  const [selectedConstituencyDetail, setSelectedConstituencyDetail] = useState<ConstituencyDetail | null>(null);
  const [partyPerformance, setPartyPerformance] = useState<any[]>([]);
  const [turnoutByDistrict, setTurnoutByDistrict] = useState<any[]>([]);
  const [marginDistribution, setMarginDistribution] = useState<any[]>([]);
  const [categoryMix, setCategoryMix] = useState<any[]>([]);

  // Build filter params string from current selection
  const filterParams = useMemo(() => {
    const parts: string[] = [];
    if (selectedDistrict) parts.push(`district=${encodeURIComponent(selectedDistrict)}`);
    if (selectedAC) parts.push(`ac_number=${selectedAC}`);
    return parts.join("&");
  }, [selectedDistrict, selectedAC]);

  // Reload ALL dashboard data when election, district, or AC changes
  useEffect(() => {
    if (!electionId) return;
    api.getStats(electionId, filterParams).then(setStats);
    api.getDemographics(electionId, filterParams).then(setDemographics);
    api.getDossierTable(electionId, 20, 0, filterParams).then(setDossier);
    api.getCountdown(electionId).then(setCountdown);
    api.getPartyPerformance(electionId, filterParams).then(setPartyPerformance);
    api.getTurnoutByDistrict(electionId, filterParams).then(setTurnoutByDistrict);
    api.getMarginDistribution(electionId, filterParams).then(setMarginDistribution);
    api.getCategoryMix(electionId, filterParams).then(setCategoryMix);
  }, [electionId, filterParams]);

  // Fetch constituency detail when AC is selected
  useEffect(() => {
    if (selectedAC) {
      api.getConstituency(selectedAC, electionId).then(setSelectedConstituencyDetail);
    } else {
      setSelectedConstituencyDetail(null);
    }
  }, [selectedAC, electionId]);

  // API now returns filtered data directly — no client-side computation needed

  const filteredDistrictsList = districts.filter((d) =>
    d.name.toLowerCase().includes(searchDistrict.toLowerCase())
  );

  const genderData = demographics
    ? [
        { name: "Male", value: demographics.male_pct, color: "#3B82F6" },
        { name: "Female", value: demographics.female_pct, color: "#EC4899" },
        { name: "Other", value: demographics.third_gender_pct, color: "#F59E0B" },
      ]
    : [];

  const viewLabel = selectedAC
    ? filteredConstituencies.find((c) => c.ac_number === selectedAC)?.name || "Constituency"
    : selectedDistrict || "Assam";

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-[#D97706]" />
            <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Overview</h2>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            Comprehensive election countdown, geospatial mapping & candidate intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {countdown && (
            <div className="bg-white rounded-2xl px-4 sm:px-5 py-3 border border-[#E5E7EB] shadow-sm w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4 sm:gap-6 mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#9CA3AF] tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
                  {countdown.days > 0 ? "T-MINUS" : "ELAPSED"} {currentElection?.state.toUpperCase() || "ASSAM"} {currentElection?.year || ""}
                </div>
                <span className="text-[10px] font-semibold text-[#6B7280]">{countdown.election_date}</span>
              </div>
              <LiveCountdown electionDate={countdown.election_date} />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: District List + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* District/Constituency List */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="bg-transparent text-sm text-[#111827] placeholder-[#64748B] outline-none flex-1"
            />
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {granularity === "STATE" || !selectedDistrict ? (
              <>
                {filteredDistrictsList.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-[#9CA3AF] hover:bg-[#F8FAFC]"
                  >
                    <div>
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-[11px] text-[#6B7280]">{d.constituency_count} CONSTITUENCIES</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      d.total_electors > 1000000 ? "bg-[#F59E0B]/20 text-[#D97706]" : "bg-[#10B981]/20 text-[#059669]"
                    }`}>
                      {d.total_electors > 1000000 ? "Volatile" : "Stable"}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <>
                {filteredConstituencies
                  .filter((c) => c.name.toLowerCase().includes(searchDistrict.toLowerCase()))
                  .map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedAC === c.ac_number ? "bg-[#3B82F6]/10 text-[#3B82F6]" : "text-[#9CA3AF] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-[11px] text-[#6B7280]">AC {c.ac_number} • {formatNum(c.total_electors)} electors</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      c.swing_status === "Safe" ? "bg-[#10B981]/20 text-[#059669]" : "bg-[#3B82F6]/20 text-[#3B82F6]"
                    }`}>{c.swing_status}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-[#E5E7EB] gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#D97706] shrink-0" />
              <span className="text-sm font-semibold text-[#111827] truncate">{viewLabel}</span>
              <span className="text-[11px] text-[#6B7280] hidden sm:inline whitespace-nowrap">
                {selectedAC ? "CONSTITUENCY VIEW" : selectedDistrict ? "DISTRICT • CONSTITUENCIES" : "STATE • DISTRICT OVERVIEW"}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              {["ALL", "BJP", "INC", "TMC", "AGP"].map((p, i) => (
                <button
                  type="button"
                  key={p}
                  className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                    i === 0 ? "bg-[#3B82F6] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] sm:h-[380px]">
            <MapView />
          </div>
        </div>
      </div>

      {/* Stats + Demographics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stats */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#059669]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">{viewLabel} Stats</span>
          </div>
          {stats && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Constituencies</span><span className="text-sm font-bold text-[#111827]">{stats.total_constituencies}</span></div>
              {stats.total_polling_stations > 0 && (
                <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Polling Stations</span><span className="text-sm font-bold text-[#111827]">{formatNum(stats.total_polling_stations)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Total Electors</span><span className="text-sm font-bold text-[#059669]">{formatNum(stats.total_electors)}</span></div>
              {stats.total_candidates > 0 && (
                <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Candidates</span><span className="text-sm font-bold text-[#111827]">{stats.total_candidates}</span></div>
              )}
              {stats.total_contesting > 0 && (
                <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Contesting</span><span className="text-sm font-bold text-[#D97706]">{stats.total_contesting}</span></div>
              )}
              {stats.total_parties > 0 && (
                <div className="flex justify-between"><span className="text-xs text-[#6B7280]">Parties</span><span className="text-sm font-bold text-[#111827]">{stats.total_parties}</span></div>
              )}
            </div>
          )}
        </div>

        {/* Category Mix (GEN/SC/ST) */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon className="w-4 h-4 text-[#D97706]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Constituency Category</span>
          </div>
          {categoryMix.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={categoryMix.map((c) => ({
                      name: c.category,
                      value: c.percentage,
                      fill: c.category === "GENERAL" ? "#3B82F6" : c.category === "SC" ? "#F59E0B" : "#10B981",
                    }))}
                    cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}
                  >
                    {categoryMix.map((c, i) => (
                      <Cell key={i} fill={c.category === "GENERAL" ? "#3B82F6" : c.category === "SC" ? "#F59E0B" : "#10B981"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {categoryMix.map((c) => (
                  <div key={c.category} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${c.category === "GENERAL" ? "bg-[#3B82F6]" : c.category === "SC" ? "bg-[#F59E0B]" : "bg-[#10B981]"}`} />
                    <span className="text-[10px] text-[#6B7280]">{c.category} {c.percentage}% ({c.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-[#9CA3AF]">No category data</div>
          )}
        </div>

        {/* Gender Bars */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#EC4899]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Gender Demographics</span>
          </div>
          {demographics && (
            <div className="space-y-4 mt-4">
              {[
                { label: "Male", pct: demographics.male_pct, count: demographics.male_electors, color: "#3B82F6" },
                { label: "Female", pct: demographics.female_pct, count: demographics.female_electors, color: "#EC4899" },
                { label: "Other", pct: demographics.third_gender_pct, count: demographics.third_gender_electors, color: "#F59E0B" },
              ].map((g) => (
                <div key={g.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: g.color }}>{g.label} {g.pct}%</span>
                    <span className="text-[#6B7280]">{formatNum(g.count)}</span>
                  </div>
                  <div className="h-2 bg-[#F3F4F6] rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(g.pct, 0.5)}%`, background: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Winning Margin Distribution */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Margin Distribution</span>
          </div>
          {marginDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={marginDistribution}>
                <XAxis dataKey="range" tick={{ fill: "#64748B", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Seats" radius={[4, 4, 0, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-xs text-[#9CA3AF]">No margin data</div>
          )}
        </div>
      </div>

      {/* Party Performance + District Turnout Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Party Performance */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Election Results by Party</span>
          </div>
          {partyPerformance.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={partyPerformance.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="short_name" tick={{ fill: "#0F172A", fontSize: 11, fontWeight: 600 }} width={50} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="seats_won" name="Seats Won" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
                {partyPerformance.slice(0, 8).map((p, i) => (
                  <div key={`${p.short_name}-${i}`} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.color || "#94A3B8" }} />
                      <span className="font-medium text-[#111827]">{p.short_name}</span>
                    </div>
                    <div className="flex gap-4 text-[#6B7280]">
                      <span>{p.seats_won} won / {p.seats_contested}</span>
                      <span className="font-semibold text-[#111827]">{p.vote_share}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-[#9CA3AF]">No vote data for this election</div>
          )}
        </div>

        {/* District Turnout */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#059669]" />
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">District-wise Voter Turnout %</span>
          </div>
          {turnoutByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={turnoutByDistrict.slice(0, 25)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="district" tick={{ fill: "#0F172A", fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "Turnout"]}
                />
                <Bar dataKey="turnout" name="Turnout %" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-xs text-[#9CA3AF]">No turnout data for this election</div>
          )}
        </div>
      </div>

      {/* Dossier Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-bold text-[#111827]">Candidate Dossier Overview</h3>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">Consolidated view of key contenders, verified financials, and legal declarations.</p>
          </div>
          <a href="/candidate-intel" className="flex items-center gap-1 text-xs text-[#059669] hover:text-[#34D399] font-medium border border-[#10B981]/30 rounded-lg px-3 py-1.5 transition-colors">
            View Full Database <ChevronRight className="w-3 h-3" />
          </a>
        </div>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase text-[#6B7280] border-b border-[#E5E7EB]">
              <th className="text-left py-2 px-3 font-medium">Candidate / Region</th>
              <th className="text-left py-2 px-3 font-medium">Party</th>
              <th className="text-left py-2 px-3 font-medium">Declared Assets</th>
              <th className="text-left py-2 px-3 font-medium">Liabilities</th>
              <th className="text-left py-2 px-3 font-medium">Criminal Cases</th>
            </tr>
          </thead>
          <tbody>
            {dossier.map((c) => (
              <tr key={c.id} className="border-b border-[#E5E7EB]/50 hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-xs text-white font-bold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#111827]">{c.name}</div>
                      <div className="text-[10px] text-[#6B7280]">{c.constituency_name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${c.party_color || "#808080"}20`, color: c.party_color || "#808080" }}>
                    {c.party_short_name}
                  </span>
                </td>
                <td className="py-3 px-3 text-sm text-[#059669] font-medium">{c.declared_assets ? `₹${formatNum(c.declared_assets)}` : "-"}</td>
                <td className="py-3 px-3 text-sm text-[#EF4444]">{c.liabilities ? `₹${formatNum(c.liabilities)}` : "-"}</td>
                <td className="py-3 px-3">
                  {c.criminal_cases > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-[#EF4444]"><AlertTriangle className="w-3 h-3" />{c.criminal_cases} Active</span>
                  ) : (
                    <span className="text-xs text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded">None Declared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiveCountdown({ electionDate }: { electionDate: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(electionDate).getTime();
  const diff = Math.max(target - now, 0);
  const isPast = target < now;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (isPast) {
    const elapsed = now - target;
    const eDays = Math.floor(elapsed / 86400000);
    return (
      <div className="text-[13px] font-bold text-[#6B7280]">
        Election held {eDays} days ago
      </div>
    );
  }

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
