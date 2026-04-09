"use client";
import { useEffect, useState } from "react";
import { api, type CandidateBrief, type CandidateDetail } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { Search, Users, Briefcase, Scale, Shield, AlertTriangle, GraduationCap, Building } from "lucide-react";

function formatRupees(n: number | null | undefined): string {
  if (!n) return "-";
  if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(0)} L`;
  return `\u20B9${n.toLocaleString("en-IN")}`;
}

function formatNum(n: number | null | undefined): string {
  if (!n) return "-";
  return n.toLocaleString("en-IN");
}

export default function CandidateIntelPage() {
  const { electionId, currentElection } = useFilters();
  const [candidates, setCandidates] = useState<CandidateBrief[]>([]);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const hasResults = currentElection && currentElection.year !== 2026;

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    setSelected(null);
    api.getCandidates(electionId, "exclude_nota=true&limit=2000").then((data) => {
      setCandidates(data);
      setLoading(false);
      if (data.length > 0) {
        api.getCandidate(data[0].id).then(setSelected);
      }
    });
  }, [electionId]);

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.constituency_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectCandidate = (id: number) => {
    api.getCandidate(id).then(setSelected);
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#3B82F6]" />
          <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Candidate Database</h2>
        </div>
        <p className="text-sm text-[#9CA3AF]">
          {currentElection ? `${currentElection.state} ${currentElection.year} — ${candidates.length} candidates` : "Loading..."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Panel */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#111827]">Candidates</span>
              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-2 py-1 rounded-md font-medium">{filteredCandidates.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 mb-3">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input type="text" placeholder="Search candidate or constituency..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-sm text-[#111827] placeholder-[#64748B] outline-none flex-1" />
            </div>
            <div className="space-y-1.5 max-h-[50vh] lg:max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8 text-[#6B7280] text-sm">Loading...</div>
              ) : (
                filteredCandidates.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => selectCandidate(c.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected?.id === c.id ? "bg-[#3B82F6]/5 border-[#3B82F6]/30" : "bg-white border-[#E5E7EB] hover:border-[#3B82F6]/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {c.image_url ? (
                        <img src={c.image_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-sm text-white font-bold shrink-0">{c.name.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#111827] truncate">{c.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: `${c.party_color || "#808080"}20`, color: c.party_color || "#808080" }}>{c.party_abbr}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280]">{c.constituency_name} {c.age ? `- ${c.age} yrs` : ""}</div>
                        <div className="flex items-center justify-between mt-1">
                          {c.declared_assets ? (
                            <span className="text-[10px] text-[#059669] font-medium">{formatRupees(c.declared_assets)}</span>
                          ) : c.votes_total ? (
                            <span className="text-[10px] text-[#3B82F6] font-medium">{formatNum(c.votes_total)} votes</span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF]">-</span>
                          )}
                          {c.criminal_cases > 0 ? (
                            <span className="text-[10px] text-[#EF4444] flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{c.criminal_cases}</span>
                          ) : c.position === 1 ? (
                            <span className="text-[10px] text-[#059669] font-bold">Winner</span>
                          ) : c.position ? (
                            <span className="text-[10px] text-[#9CA3AF]">#{c.position}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1">
          {selected ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  {selected.image_url ? (
                    <img src={selected.image_url} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-2xl text-white font-bold shrink-0">{selected.name.charAt(0)}</div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-[#111827]">{selected.name}</h3>
                      {selected.position === 1 && <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#10B981]/20 text-[#059669]">WINNER</span>}
                      {selected.position && selected.position > 1 && <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#F3F4F6] text-[#6B7280]">#{selected.position}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#6B7280]">
                      <span>{selected.constituency_name} (AC {selected.constituency_ac_no})</span>
                      <span>{selected.district_name}</span>
                      {selected.gender && <span>{selected.gender}</span>}
                      {selected.age && <span>{selected.age} yrs</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${selected.party_color || "#808080"}20`, color: selected.party_color || "#808080" }}>
                        {selected.party_abbr} - {selected.party_name}
                      </span>
                      {selected.education && (
                        <span className="text-xs text-[#6B7280] flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{selected.education}</span>
                      )}
                      {selected.occupation && (
                        <span className="text-xs text-[#6B7280] flex items-center gap-1"><Building className="w-3.5 h-3.5" />{selected.occupation}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selected.declared_assets != null && (
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#059669]">{formatRupees(selected.declared_assets)}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase font-bold">Assets</div>
                  </div>
                )}
                {selected.liabilities != null && (
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#EF4444]">{formatRupees(selected.liabilities)}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase font-bold">Liabilities</div>
                  </div>
                )}
                {selected.declared_assets != null && (
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#3B82F6]">{formatRupees((selected.declared_assets || 0) - (selected.liabilities || 0))}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase font-bold">Net Worth</div>
                  </div>
                )}
                {selected.votes_total != null && (
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
                    <div className="text-lg font-extrabold text-[#111827]">{selected.vote_pct}%</div>
                    <div className="text-[10px] text-[#6B7280] uppercase font-bold">Vote Share</div>
                  </div>
                )}
                {selected.criminal_cases > 0 && (
                  <div className="bg-white rounded-xl border border-[#EF4444]/30 p-3 text-center">
                    <div className="text-lg font-extrabold text-[#EF4444]">{selected.criminal_cases}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase font-bold">Criminal Cases</div>
                  </div>
                )}
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Votes */}
                {hasResults && (
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><Briefcase className="w-4 h-4 text-[#3B82F6]" /><span className="text-xs font-semibold text-[#6B7280] uppercase">Votes</span></div>
                    <div className="space-y-3">
                      <div><div className="text-[10px] text-[#6B7280] uppercase mb-1">Total Votes</div><div className="text-2xl font-bold text-[#111827]">{formatNum(selected.votes_total)}</div></div>
                      <div className="flex gap-4">
                        <div><div className="text-[10px] text-[#6B7280] uppercase mb-1">EVM</div><div className="text-lg font-semibold text-[#111827]">{formatNum(selected.votes_general)}</div></div>
                        <div><div className="text-[10px] text-[#6B7280] uppercase mb-1">Postal</div><div className="text-lg font-semibold text-[#111827]">{formatNum(selected.votes_postal)}</div></div>
                      </div>
                      <div><div className="text-[10px] text-[#6B7280] uppercase mb-1">Vote Share</div><div className="text-lg font-bold text-[#3B82F6]">{selected.vote_pct}%</div></div>
                    </div>
                  </div>
                )}

                {/* Financial */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-[#059669]" /><span className="text-xs font-semibold text-[#6B7280] uppercase">Financial</span></div>
                  <div className="space-y-4">
                    <div className="bg-[#10B981]/10 rounded-lg p-4 border border-[#10B981]/20">
                      <div className="text-[10px] text-[#059669] uppercase font-medium mb-1">Declared Assets</div>
                      <div className="text-2xl font-bold text-[#059669]">{formatRupees(selected.declared_assets)}</div>
                    </div>
                    <div className="bg-[#EF4444]/10 rounded-lg p-4 border border-[#EF4444]/20">
                      <div className="text-[10px] text-[#EF4444] uppercase font-medium mb-1">Liabilities</div>
                      <div className="text-2xl font-bold text-[#EF4444]">{formatRupees(selected.liabilities)}</div>
                    </div>
                  </div>
                </div>

                {/* Criminal */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-[#EF4444]" /><span className="text-xs font-semibold text-[#6B7280] uppercase">Legal</span></div>
                  {selected.criminal_cases > 0 ? (
                    <div className="bg-[#EF4444]/10 rounded-lg p-6 border border-[#EF4444]/20 text-center">
                      <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto mb-2" />
                      <div className="text-3xl font-extrabold text-[#EF4444]">{selected.criminal_cases}</div>
                      <div className="text-sm text-[#EF4444]/80">Active Criminal Cases</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <Shield className="w-10 h-10 text-[#059669] mb-2" />
                      <div className="text-sm font-medium text-[#6B7280]">No cases found</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
              <Users className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
              <div className="text-sm text-[#6B7280]">Select a candidate to view their profile</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
