"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { api, LiveElectionResults } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { RefreshCw, Pause, Play, ExternalLink, Trophy, TrendingUp, Users, Award } from "lucide-react";

const MapView = dynamic(() => import("@/components/overview/MapView"), { ssr: false });

const STATES = [
  { code: "S25", name: "West Bengal", total_ac: 294 },
  { code: "S03", name: "Assam", total_ac: 126 },
  { code: "S22", name: "Tamil Nadu", total_ac: 234 },
  { code: "S11", name: "Kerala", total_ac: 140 },
  { code: "U07", name: "Puducherry", total_ac: 30 },
];

export default function LiveElectionClient() {
  const { currentElection } = useFilters();
  const [stateCode, setStateCode] = useState("S25");
  const [data, setData] = useState<LiveElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const result = await api.getLiveResults(stateCode, forceRefresh);
      setData(result);
      setLastRefreshed(new Date());
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, [stateCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(false), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const declared = data ? data.parties.reduce((s, p) => s + p.won, 0) : 0;
  const totalWonLeading = data ? data.parties.reduce((s, p) => s + p.total, 0) : 0;
  const partiesInRace = data ? data.parties.filter(p => p.total > 0).length : 0;
  const leadingParty = data?.parties?.[0];
  const totalAc = data?.total_ac ?? STATES.find(s => s.code === stateCode)?.total_ac ?? 0;
  const majorityMark = Math.floor(totalAc / 2) + 1;
  const stateName = data?.state ?? STATES.find(s => s.code === stateCode)?.name ?? stateCode;

  // Map data for MapView
  const liveMapResults = data?.constituencies?.map(c => ({
    ac_no: c.const_no ?? 0,
    party: c.leading_party_short,
    status: c.status?.toLowerCase().includes("result declared") ? "won" : "leading",
    candidate: c.leading_candidate,
    margin: c.margin,
  })).filter(c => c.ac_no > 0) || [];

  const timeAgo = lastRefreshed ? formatTimeAgo(lastRefreshed) : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#111827]">Live Vote Count</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Live &middot; ECI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280]">Updated: {timeAgo}</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 transition-colors"
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoRefresh ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh now
          </button>
        </div>
      </div>

      {/* State tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STATES.map(s => (
          <button
            key={s.code}
            onClick={() => setStateCode(s.code)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              stateCode === s.code
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#3B82F6] hover:text-[#3B82F6]"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label="SEATS DECLARED" value={declared} />
        <StatCard icon={TrendingUp} label="TOTAL WON+LEADING" value={totalWonLeading} />
        <StatCard icon={Users} label="PARTIES IN RACE" value={partiesInRace} />
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="text-lg font-bold" style={{ color: leadingParty?.color || "#111827" }}>
            {leadingParty?.short || "—"}
          </div>
          <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">LEADING PARTY</div>
        </div>
      </div>

      {/* Election info banner */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xl font-bold text-[#111827]">{stateName} Assembly Elections 2026</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded">{stateName}</span>
              <span className="text-xs text-[#6B7280]">Source: Election Commission of India &middot;
                <a href="https://results.eci.gov.in/ResultAcGenMay2026/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-0.5 inline-flex items-center gap-0.5">
                  results.eci.gov.in <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </div>
            {data?.last_updated && (
              <div className="text-[11px] text-[#9CA3AF] mt-1">{data.last_updated}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#3B82F6]">
              <span className="text-3xl">{declared}</span>
              <span className="text-lg text-[#9CA3AF]">/{totalAc}</span>
            </div>
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Constituencies</div>
            <div className="text-xs text-[#6B7280]">Majority: <span className="font-bold text-emerald-600">{majorityMark}</span></div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7280] whitespace-nowrap">Results declared</span>
          <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3B82F6] rounded-full transition-all duration-500"
              style={{ width: totalAc ? `${(declared / totalAc) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs font-semibold text-[#3B82F6] whitespace-nowrap">{declared} / {totalAc}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Party results */}
        <div className="lg:col-span-7 space-y-4">
          {/* Seat share bar */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Party-wise Seat Share</h3>
              <span className="text-[11px] text-[#9CA3AF]">Majority mark: {majorityMark} / {totalAc}</span>
            </div>
            {data?.parties && data.parties.length > 0 ? (
              <div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {data.parties.filter(p => p.total > 0).map(p => (
                    <div
                      key={p.short}
                      className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                      style={{
                        width: `${(p.total / (totalAc || 1)) * 100}%`,
                        backgroundColor: p.color,
                        minWidth: p.total > 0 ? "20px" : 0,
                      }}
                      title={`${p.short}: ${p.total}`}
                    >
                      {(p.total / (totalAc || 1)) > 0.05 ? p.short : ""}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {data.parties.filter(p => p.total > 0).slice(0, 10).map(p => (
                    <div key={p.short} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-[#374151]">{p.short}</span>
                      <span className="text-[#9CA3AF]">{p.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-xs text-[#9CA3AF]">Waiting for data...</div>
            )}
          </div>

          {/* Party-wise results table */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Party-wise Results</h3>
              {loading && <span className="text-xs text-blue-500 animate-pulse">Loading...</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Party</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Won</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Leading</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider w-32">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.parties && data.parties.length > 0 ? data.parties.map((p, i) => (
                    <tr key={p.short} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"} hover:bg-blue-50/30 transition-colors`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold text-[#111827] text-[13px]">{p.short}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-2.5 font-bold text-[#111827] tabular-nums">{p.won}</td>
                      <td className="text-center px-3 py-2.5 text-[#6B7280] tabular-nums">{p.leading}</td>
                      <td className="text-center px-3 py-2.5 font-bold tabular-nums" style={{ color: p.color }}>{p.total}</td>
                      <td className="px-3 py-2.5">
                        <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(p.total / (totalAc || 1)) * 100}%`, backgroundColor: p.color }}
                          />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-[#9CA3AF]">
                        {loading ? "Fetching live data..." : "No results available yet. Check back when counting begins."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Map + Feed */}
        <div className="lg:col-span-5 space-y-4">
          {/* Map */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Live Map</h3>
            </div>
            <div className="h-[340px]">
              <MapView mapMode="live" liveResults={liveMapResults} />
            </div>
          </div>

          {/* Constituency feed */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Constituency Results Feed</h3>
              {data?.constituencies && (
                <span className="text-[10px] text-[#9CA3AF]">{data.constituencies.length} results</span>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {data?.constituencies && data.constituencies.length > 0 ? (
                <div className="divide-y divide-[#F3F4F6]">
                  {data.constituencies.map((c, i) => {
                    const isWon = c.status?.toLowerCase().includes("result declared");
                    return (
                      <div key={`${c.const_no}-${i}`} className="px-4 py-2.5 hover:bg-[#FAFBFC] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[#111827] truncate">
                              {c.const_no != null && <span className="text-[#9CA3AF] mr-1">{c.const_no}.</span>}
                              {c.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: c.party_color }} />
                              <span className="text-[11px] font-semibold" style={{ color: c.party_color }}>
                                {c.leading_party_short}
                              </span>
                              {c.leading_candidate && (
                                <span className="text-[11px] text-[#6B7280] truncate">&middot; {c.leading_candidate}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isWon ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {isWon ? "Won" : "Leading"}
                            </span>
                            {c.margin != null && (
                              <div className="text-[10px] text-[#9CA3AF] mt-0.5 tabular-nums">+{c.margin.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-[#9CA3AF]">
                  {loading ? "Loading..." : "Waiting for data..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {data?.error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {data.error}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-[#6B7280]" />
      </div>
      <div className="text-xl font-bold text-[#111827] tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString();
}
