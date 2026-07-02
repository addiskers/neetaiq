"use client";
import { useEffect, useState } from "react";
import { api, type CandidateBrief, type CandidateDetail } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import {
  Search, Users, Scale, Shield, AlertTriangle, GraduationCap,
  Briefcase, Trophy, TrendingUp, ChevronRight, Star,
} from "lucide-react";

function formatRupees(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n === 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function formatNum(n: number | null | undefined): string {
  if (!n) return "-";
  return n.toLocaleString("en-IN");
}

interface CandidateIntelClientProps {
  initialData?: { candidates: CandidateBrief[]; selected: CandidateDetail | null };
}

const RANK_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
function rankLabel(n: number) { return RANK_LABEL[n] ?? `#${n}`; }

function CandidateAvatar({
  url, name, color, size,
}: { url?: string | null; name: string; color?: string | null; size: "sm" | "lg" }) {
  const [errored, setErrored] = useState(false);
  const accent = color || "#4F46E5";
  const dim = size === "lg" ? "w-20 h-20" : "w-10 h-10";
  const rounded = size === "lg" ? "rounded-2xl" : "rounded-xl";

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={name}
        className={`${dim} ${rounded} object-cover${size === "lg" ? " border-2 border-white shadow-md" : ""}`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} ${rounded} flex items-center justify-center${size === "lg" ? " shadow-md" : ""}`}
      style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, border: `1px solid ${accent}33` }}
    >
      <svg viewBox="0 0 24 24" className={size === "lg" ? "w-11 h-11" : "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4.5" fill={accent} opacity="0.7" />
        <path d="M3 21c0-4.4 4-8 9-8s9 3.6 9 8" fill={accent} opacity="0.4" />
      </svg>
    </div>
  );
}

export default function CandidateIntelClient({ initialData }: CandidateIntelClientProps) {
  const { electionId, currentElection, stateSlug } = useFilters();
  const [candidates, setCandidates] = useState<CandidateBrief[]>(initialData?.candidates ?? []);
  const [selected, setSelected] = useState<CandidateDetail | null>(initialData?.selected ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(!initialData?.candidates?.length);
  const [sortBy, setSortBy] = useState<"name" | "assets" | "criminal">("name");

  const hasResults = !!(currentElection && currentElection.year !== 2026);

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    setSelected(null);
    api.getCandidates(electionId, "exclude_nota=true&limit=5000", stateSlug).then((data) => {
      setCandidates(data);
      setLoading(false);
      if (data.length > 0) api.getCandidate(data[0].id, stateSlug).then(setSelected);
    });
  }, [electionId, stateSlug]);

  const filteredCandidates = candidates
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.constituency_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "assets") return (b.declared_assets ?? 0) - (a.declared_assets ?? 0);
      if (sortBy === "criminal") return (b.criminal_cases ?? 0) - (a.criminal_cases ?? 0);
      return a.name.localeCompare(b.name);
    });

  const selectCandidate = (id: number) => api.getCandidate(id, stateSlug).then(setSelected);

  const partyAccent = selected?.party_color || "#3B82F6";
  const netWorth = selected?.declared_assets != null || selected?.liabilities != null
    ? (selected?.declared_assets ?? 0) - (selected?.liabilities ?? 0)
    : null;
  const assetPct = selected?.declared_assets
    ? Math.round(((selected.declared_assets - (selected.liabilities ?? 0)) / selected.declared_assets) * 100)
    : 100;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Candidate Database</h2>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            {currentElection ? `${currentElection.state} ${currentElection.year} — ${candidates.length} candidates` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Left Panel ── */}
        <div className="w-full lg:w-[360px] shrink-0">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            {/* Search + sort bar */}
            <div className="p-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 mb-3">
                <Search className="w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search candidate or constituency…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none flex-1"
                />
              </div>
              <div className="flex items-center gap-1.5">
                  {(["name", "assets", "criminal"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSortBy(s)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all capitalize ${
                      sortBy === s
                        ? s === "criminal" ? "bg-[#EF4444] text-white" : "bg-[#3B82F6] text-white"
                        : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {s === "criminal" ? "Cases" : s}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-[#9CA3AF] font-medium">{filteredCandidates.length}</span>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-[#F3F4F6] max-h-[calc(100vh-310px)] overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading…</div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF]">No candidates found</div>
              ) : (
                filteredCandidates.map((c) => {
                  const isActive = selected?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCandidate(c.id)}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                        isActive ? "bg-[#EFF6FF]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <CandidateAvatar url={c.image_url} name={c.name} color={c.party_color} size="sm" />
                        {c.position === 1 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F59E0B] rounded-full flex items-center justify-center">
                            <Star className="w-2.5 h-2.5 text-white fill-white" />
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm font-semibold truncate ${isActive ? "text-[#1D4ED8]" : "text-[#111827]"}`}>{c.name}</span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${c.party_color || "#808080"}18`, color: c.party_color || "#6B7280" }}
                          >
                            {c.party_abbr || "IND"}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] truncate">{c.constituency_name}{c.age ? ` · ${c.age} yrs` : ""}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {c.declared_assets ? (
                            <span className="text-[10px] text-[#059669] font-medium">{formatRupees(c.declared_assets)}</span>
                          ) : c.votes_total ? (
                            <span className="text-[10px] text-[#3B82F6] font-medium">{formatNum(c.votes_total)} votes</span>
                          ) : null}
                          {c.criminal_cases > 0 && (
                            <span className="text-[10px] text-[#EF4444] flex items-center gap-0.5 ml-auto">
                              <AlertTriangle className="w-3 h-3" />{c.criminal_cases}
                            </span>
                          )}
                          {c.position && c.position <= 3 && c.criminal_cases === 0 && (
                            <span className={`text-[10px] font-bold ml-auto ${c.position === 1 ? "text-[#F59E0B]" : "text-[#6B7280]"}`}>
                              {rankLabel(c.position)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#3B82F6] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="space-y-4">

              {/* ── Profile Card ── */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                {/* Accent strip */}
                <div className="h-2" style={{ background: partyAccent }} />
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    {/* Photo */}
                    <div className="relative shrink-0">
                      <CandidateAvatar url={selected.image_url} name={selected.name} color={selected.party_color} size="lg" />
                      {selected.position === 1 && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#F59E0B] border-2 border-white flex items-center justify-center shadow">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="text-2xl font-extrabold text-[#111827] tracking-tight leading-tight">{selected.name}</h3>
                        {selected.position === 1 && (
                          <span className="mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#D97706] border border-[#F59E0B]/30">WINNER</span>
                        )}
                        {selected.position && selected.position > 1 && (
                          <span className="mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">{rankLabel(selected.position)} Place</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6B7280] mb-3">
                        <span className="font-medium text-[#374151]">{selected.constituency_name} (AC {selected.constituency_ac_no})</span>
                        <span className="text-[#D1D5DB]">·</span>
                        <span>{selected.district_name}</span>
                        {selected.gender && <><span className="text-[#D1D5DB]">·</span><span>{selected.gender === "M" ? "Male" : selected.gender === "F" ? "Female" : selected.gender}</span></>}
                        {selected.age && <><span className="text-[#D1D5DB]">·</span><span>{selected.age} yrs</span></>}
                      </div>

                      {/* Party + background tags */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                          style={{ background: `${partyAccent}15`, color: partyAccent, borderColor: `${partyAccent}30` }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: partyAccent }} />
                          {selected.party_abbr || "IND"}{selected.party_name && selected.party_name !== selected.party_abbr ? ` — ${selected.party_name}` : ""}
                        </span>
                        {selected.education && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] bg-[#F3F4F6] px-3 py-1.5 rounded-full">
                            <GraduationCap className="w-3.5 h-3.5" />{selected.education}
                          </span>
                        )}
                        {selected.occupation && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] bg-[#F3F4F6] px-3 py-1.5 rounded-full">
                            <Briefcase className="w-3.5 h-3.5" />{selected.occupation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Stats Row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                  <div className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Assets</div>
                  <div className={`text-xl font-extrabold ${selected.declared_assets != null ? "text-[#059669]" : "text-[#9CA3AF]"}`}>{formatRupees(selected.declared_assets)}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5">{selected.declared_assets != null ? "Declared" : "Not reported"}</div>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                  <div className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Liabilities</div>
                  <div className={`text-xl font-extrabold ${selected.liabilities != null ? "text-[#EF4444]" : "text-[#9CA3AF]"}`}>{formatRupees(selected.liabilities)}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5">{selected.liabilities != null ? "Declared" : "Not reported"}</div>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                  <div className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Net Worth</div>
                  <div className={`text-xl font-extrabold ${netWorth != null ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>{formatRupees(netWorth)}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5">{netWorth != null ? "Assets − Liabilities" : "No data"}</div>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${selected.criminal_cases > 0 ? "bg-[#FEF2F2] border-[#FCA5A5]" : "bg-[#F0FDF4] border-[#86EFAC]"}`}>
                  <div className="text-[10px] uppercase font-bold mb-1 text-[#9CA3AF]">Legal</div>
                  <div className={`text-xl font-extrabold ${selected.criminal_cases > 0 ? "text-[#EF4444]" : "text-[#059669]"}`}>
                    {selected.criminal_cases > 0 ? selected.criminal_cases : "Clean"}
                  </div>
                  <div className="text-[10px] mt-0.5 font-medium text-[#9CA3AF]">{selected.criminal_cases > 0 ? "Active cases" : "No cases filed"}</div>
                </div>
              </div>

              {/* ── Detail Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* Election Performance */}
                {hasResults && (
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                      <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Election Performance</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-end justify-between mb-1">
                          <span className="text-[10px] text-[#9CA3AF] uppercase font-medium">Total Votes</span>
                          {selected.position && <span className="text-[10px] font-bold text-[#6B7280]">{rankLabel(selected.position)} place</span>}
                        </div>
                        <div className="text-2xl font-extrabold text-[#111827]">{formatNum(selected.votes_total)}</div>
                      </div>

                      {/* Vote share bar */}
                      {selected.vote_pct != null && (
                        <div>
                          <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1.5">
                            <span>Vote Share</span>
                            <span className="font-bold text-[#111827]">{selected.vote_pct}%</span>
                          </div>
                          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(selected.vote_pct ?? 0, 100)}%`, background: partyAccent }}
                            />
                          </div>
                        </div>
                      )}

                      {/* EVM / Postal breakdown */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-[#F9FAFB] rounded-lg p-2.5">
                          <div className="text-[9px] text-[#9CA3AF] uppercase font-bold mb-0.5">EVM Votes</div>
                          <div className="text-base font-bold text-[#111827]">{formatNum(selected.votes_general)}</div>
                        </div>
                        <div className="bg-[#F9FAFB] rounded-lg p-2.5">
                          <div className="text-[9px] text-[#9CA3AF] uppercase font-bold mb-0.5">Postal Votes</div>
                          <div className="text-base font-bold text-[#111827]">{formatNum(selected.votes_postal)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-4 h-4 text-[#059669]" />
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Financial Profile</span>
                  </div>
                  <div className="space-y-3">
                    {/* Net worth prominent */}
                    <div className="bg-gradient-to-r from-[#059669]/5 to-[#059669]/10 rounded-xl p-3 border border-[#059669]/15">
                      <div className="text-[9px] text-[#059669] uppercase font-bold mb-0.5">Net Worth</div>
                      <div className="text-xl font-extrabold text-[#059669]">{formatRupees(netWorth)}</div>
                    </div>

                    {/* Asset vs liability bar */}
                    {selected.declared_assets && (
                      <div>
                        <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1.5">
                          <span>Assets vs Liabilities</span>
                          <span className="font-medium text-[#059669]">{assetPct}% equity</span>
                        </div>
                        <div className="h-2.5 bg-[#FEE2E2] rounded-full overflow-hidden">
                          <div className="h-full bg-[#059669] rounded-full" style={{ width: `${Math.max(assetPct, 2)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-[#F0FDF4] rounded-lg p-2.5 border border-[#10B981]/20">
                        <div className="text-[9px] text-[#059669] uppercase font-bold mb-0.5">Assets</div>
                        <div className="text-sm font-bold text-[#059669]">{formatRupees(selected.declared_assets)}</div>
                      </div>
                      <div className={`rounded-lg p-2.5 border ${(selected.liabilities ?? 0) > 0 ? "bg-[#FEF2F2] border-[#FCA5A5]" : "bg-[#F9FAFB] border-[#E5E7EB]"}`}>
                        <div className={`text-[9px] uppercase font-bold mb-0.5 ${(selected.liabilities ?? 0) > 0 ? "text-[#EF4444]" : "text-[#9CA3AF]"}`}>Liabilities</div>
                        <div className={`text-sm font-bold ${(selected.liabilities ?? 0) > 0 ? "text-[#EF4444]" : "text-[#9CA3AF]"}`}>{formatRupees(selected.liabilities)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Legal Record</span>
                  </div>
                  {selected.criminal_cases > 0 ? (
                    <div className="space-y-3">
                      <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#EF4444]/15 rounded-xl flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                        </div>
                        <div>
                          <div className="text-3xl font-extrabold text-[#EF4444]">{selected.criminal_cases}</div>
                          <div className="text-xs text-[#EF4444]/80 font-medium">{selected.criminal_cases === 1 ? "Case" : "Cases"} Filed</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-14 h-14 bg-[#F0FDF4] rounded-2xl flex items-center justify-center mb-3">
                        <Shield className="w-7 h-7 text-[#059669]" />
                      </div>
                      <div className="text-sm font-semibold text-[#059669]">Clean Record</div>
                      <div className="text-[11px] text-[#9CA3AF] mt-1">No cases declared</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <div className="text-base font-semibold text-[#374151] mb-1">Select a candidate</div>
              <div className="text-sm text-[#9CA3AF]">Click any name from the list to view their full profile</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
