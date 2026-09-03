"use client";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import CandidateAvatar from "@/components/CandidateAvatar";
import { guard } from "@/lib/guard";
import { Search, ChevronDown, ChevronUp, MapPin, AlertTriangle, GraduationCap } from "lucide-react";

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF9933", INC: "#00BFFF", AIUDF: "#006400", AGP: "#C8A2C8",
  BOPF: "#FF7F50", UPPL: "#FFD700", "CPI(M)": "#FF0000", IND: "#808080",
  AINRC: "#800080", DMK: "#FF0000", AIADMK: "#228B22", PMK: "#FFFF00",
};
const CAT_COLORS: Record<string, string> = { GEN: "#3B82F6", SC: "#F59E0B", ST: "#10B981" };

function formatNum(n: number | null | undefined): string {
  if (!n) return "-";
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

export default function ElectionTrackerClient({ initialData }: { initialData?: { data: any[] } }) {
  const { electionId, currentElection, stateSlug, districts } = useFilters();
  const [data, setData] = useState<any[]>(initialData?.data ?? []);
  const [loading, setLoading] = useState(!initialData?.data?.length);
  const [searchQ, setSearchQ] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedAC, setExpandedAC] = useState<number | null>(null);

  const hasResults = useMemo(
    () => data.some(ac => ac.candidates?.some((c: any) => c.position === 1)),
    [data],
  );

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    setExpandedAC(null);
    const parts: string[] = [];
    if (districtFilter) parts.push(`district=${encodeURIComponent(districtFilter)}`);
    if (categoryFilter) parts.push(`category=${categoryFilter}`);
    if (searchQ.length >= 2) parts.push(`search=${encodeURIComponent(searchQ)}`);
    guard(
      api.getConstituencyTracker(electionId, parts.join("&"), stateSlug).then(setData),
      "constituency tracker",
    ).finally(() => setLoading(false));
  }, [electionId, districtFilter, categoryFilter, searchQ]);

  // Party tally from data
  const partyTally = useMemo(() => {
    if (!hasResults) {
      // For 2026: count candidates per party
      const counts: Record<string, number> = {};
      for (const ac of data) {
        for (const c of ac.candidates || []) {
          if (c.party) counts[c.party] = (counts[c.party] || 0) + 1;
        }
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([party, count]) => ({ party, count, label: `${count} candidates` }));
    }
    // For past elections: count seats won
    const seats: Record<string, number> = {};
    for (const ac of data) {
      const winner = ac.candidates?.[0];
      if (winner?.position === 1 && winner.party) {
        seats[winner.party] = (seats[winner.party] || 0) + 1;
      }
    }
    return Object.entries(seats).sort((a, b) => b[1] - a[1]).map(([party, count]) => ({ party, count, label: `${count} seats` }));
  }, [data, hasResults]);

  const totalSeats = hasResults ? partyTally.reduce((s, p) => s + p.count, 0) : data.length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-5 h-5 text-[#3B82F6]" />
        <h2 className="text-xl font-extrabold text-[#111827]">Election Tracker</h2>
        <span className="text-sm text-[#6B7280] ml-2">{currentElection?.state} {currentElection?.year} - {data.length} Constituencies</span>
      </div>

      {/* Party Tally Bar */}
      {partyTally.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden mb-3">
            {partyTally.map((p) => (
              <div key={p.party} className="h-full flex items-center justify-center text-[10px] font-bold text-white px-1" style={{ background: PARTY_COLORS[p.party] || "#94A3B8", width: `${Math.max((p.count / totalSeats) * 100, 3)}%` }}>
                {p.count > 3 ? `${p.party} ${p.count}` : ""}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {partyTally.map((p) => (
              <div key={p.party} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded" style={{ background: PARTY_COLORS[p.party] || "#94A3B8" }} />
                <span className="font-semibold text-[#111827]">{p.party}</span>
                <span className="text-[#6B7280]">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E5E7EB] px-3 py-2 flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input type="text" placeholder="Search constituency..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none flex-1" />
        </div>
        <select title="Filter by district" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="bg-white rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827] outline-none">
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select title="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827] outline-none">
          <option value="">All Categories</option>
          <option value="GEN">General</option>
          <option value="SC">SC</option>
          <option value="ST">ST</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#6B7280]">Loading constituencies...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.map((ac) => {
            const isExpanded = expandedAC === ac.ac_no;
            const winner = ac.candidates?.find((c: any) => c.position === 1);
            const runner = ac.candidates?.find((c: any) => c.position === 2);
            const partyColor = winner?.party_color || PARTY_COLORS[winner?.party] || CAT_COLORS[ac.category] || "#E5E7EB";

            return (
              <div key={ac.ac_no} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftWidth: 4, borderLeftColor: partyColor }}>
                {/* Card Header */}
                <button type="button" onClick={() => setExpandedAC(isExpanded ? null : ac.ac_no)} className="w-full text-left p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#9CA3AF]">#{ac.ac_no}</span>
                      <span className="text-sm font-bold text-[#111827]">{ac.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ac.category === "SC" ? "bg-[#F59E0B]/20 text-[#D97706]" : ac.category === "ST" ? "bg-[#10B981]/20 text-[#059669]" : "bg-[#3B82F6]/20 text-[#3B82F6]"}`}>{ac.category || "GEN"}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
                  </div>
                  <div className="text-[11px] text-[#6B7280] mb-2">{ac.district} {ac.total_electors ? `- ${formatNum(ac.total_electors)} electors` : ""}</div>

                  {/* Winner/Top Candidates */}
                  {hasResults && winner ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CandidateAvatar url={winner.image_url} name={winner.name || ""} color={winner.party_color} size="8" />
                        <div>
                          <div className="text-xs font-semibold text-[#111827]">{winner.name}</div>
                          <div className="text-[10px]"><span className="font-bold" style={{ color: PARTY_COLORS[winner.party] || "#6B7280" }}>{winner.party}</span> - {formatNum(winner.votes_total)} votes</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#059669]">+{formatNum(ac.winning_margin)}</div>
                        {ac.turnout_pct && <div className="text-[10px] text-[#6B7280]">{ac.turnout_pct}% turnout</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#6B7280]">{ac.candidate_count} candidates contesting</div>
                      {ac.winner_prev && (
                        <div className="text-[10px] text-[#9CA3AF]">{ac.winner_prev.year}: <span className="font-bold" style={{ color: PARTY_COLORS[ac.winner_prev.party] || "#6B7280" }}>{ac.winner_prev.party}</span></div>
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded: All Candidates */}
                {isExpanded && (
                  <div className="border-t border-[#E5E7EB] px-4 py-3 bg-[#F9FAFB] space-y-2">
                    {ac.candidates?.map((c: any, i: number) => (
                      <div key={c.id || i} className="flex items-center justify-between py-1.5 border-b border-[#E5E7EB]/50 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <CandidateAvatar url={c.image_url} name={c.name || ""} color={c.party_color} size="7" />
                          <div>
                            <div className="text-xs font-medium text-[#111827]">
                              {c.position && <span className="text-[#9CA3AF] mr-1">#{c.position}</span>}
                              {c.name}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">
                              <span className="font-semibold" style={{ color: PARTY_COLORS[c.party] || "#6B7280" }}>{c.party}</span>
                              {c.age && ` - ${c.age} yrs`}
                              {c.education && ` - ${c.education}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[10px] space-y-0.5">
                          {c.votes_total && <div className="font-semibold text-[#111827]">{formatNum(c.votes_total)} ({c.vote_pct}%)</div>}
                          {c.declared_assets && <div className="text-[#059669]">{formatRupees(c.declared_assets)}</div>}
                          {c.criminal_cases > 0 && <div className="text-[#EF4444] flex items-center gap-0.5 justify-end"><AlertTriangle className="w-3 h-3" />{c.criminal_cases} cases</div>}
                        </div>
                      </div>
                    ))}
                    {ac.winner_prev && !hasResults && (
                      <div className="pt-2 text-[10px] text-[#9CA3AF] border-t border-[#E5E7EB]">
                        {ac.winner_prev.year} winner: <span className="font-bold" style={{ color: PARTY_COLORS[ac.winner_prev.party] || "#6B7280" }}>{ac.winner_prev.party}</span> - {ac.winner_prev.name} (margin: {formatNum(ac.winner_prev.margin)})
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
