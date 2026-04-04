"use client";
import { useEffect, useState } from "react";
import { api, type CandidateBrief, type CandidateDetail } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { Search, Users, Briefcase, Scale, Shield, AlertTriangle, GraduationCap, Building } from "lucide-react";

function formatRupees(n: number | null): string {
  if (!n) return "-";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)} Lacs`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function CandidateIntelPage() {
  const { electionId } = useFilters();
  const [candidates, setCandidates] = useState<CandidateBrief[]>([]);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    setSelected(null);
    api.getCandidates(electionId, "contesting_only=true&limit=100").then((data) => {
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
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#3B82F6]" />
          <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Dossier Database</h2>
        </div>
        <p className="text-sm text-[#9CA3AF]">
          Cross-referencing ECI Affidavits, local news, and ground survey intent.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Panel - Candidate List */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-sm font-semibold text-[#111827]">Candidate List</span>
              </div>
              <span className="text-xs bg-[#F3F4F6] text-[#9CA3AF] px-2 py-1 rounded-md font-medium">
                {filteredCandidates.length} Found
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] mb-3">Active theatre tracked profiles</p>

            {/* Search */}
            <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 mb-3">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search candidate or constituency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-[#111827] placeholder-[#64748B] outline-none flex-1"
              />
            </div>

            {/* Candidate Cards */}
            <div className="space-y-2 max-h-[50vh] lg:max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8 text-[#6B7280] text-sm">Loading candidates...</div>
              ) : (
                filteredCandidates.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => selectCandidate(c.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selected?.id === c.id
                        ? "bg-[#F3F4F6] border-[#3B82F6]/50"
                        : "bg-[#F3F4F6]/50 border-[#E5E7EB] hover:border-[#3B82F6]/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F46E5]/80 to-[#7C3AED]/80 flex items-center justify-center text-sm text-[#9CA3AF] font-medium shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#111827] truncate">{c.name}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                            style={{
                              background: `${c.party_color || "#808080"}20`,
                              color: c.party_color || "#808080",
                            }}
                          >
                            {c.party_short_name}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {c.constituency_name} {c.age ? `• ${c.age} yrs` : ""}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-[#059669] font-medium">
                            {formatRupees(c.declared_assets)}
                          </span>
                          {c.criminal_cases > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] text-[#EF4444]">
                              <AlertTriangle className="w-3 h-3" /> {c.criminal_cases} Cases
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#059669]">Clean</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Candidate Detail */}
        <div className="flex-1">
          {selected ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-xl sm:text-2xl text-[#9CA3AF] font-bold shrink-0">
                    {selected.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-[#111827]">{selected.name}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                        selected.is_incumbent
                          ? "bg-[#F59E0B]/20 text-[#D97706]"
                          : "bg-[#94A3B8]/20 text-[#9CA3AF]"
                      }`}>
                        {selected.is_incumbent ? "INCUMBENT" : "CHALLENGER"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-[#9CA3AF]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {selected.constituency_name}
                      </span>
                      {selected.education && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" /> {selected.education}
                        </span>
                      )}
                      {selected.occupation && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> {selected.occupation}
                        </span>
                      )}
                    </div>

                    {/* Approval Rating Bar */}
                    {selected.approval_rating !== null && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#9CA3AF]">GROUND APPROVAL RATING</span>
                          <span className="text-[#059669] font-bold">{selected.approval_rating}%</span>
                        </div>
                        <div className="h-2.5 bg-[#F3F4F6] rounded-full">
                          <div
                            className="h-full bg-gradient-to-r from-[#10B981] to-[#10B981]/60 rounded-full"
                            style={{ width: `${selected.approval_rating}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Party Badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{
                          background: `${selected.party_color || "#808080"}30`,
                          color: selected.party_color || "#808080",
                        }}
                      >
                        {selected.party_short_name} - {selected.party_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Column Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Career History */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase">Career History</span>
                  </div>
                  <div className="mb-4">
                    <div className="text-[10px] text-[#6B7280] uppercase mb-2">Political Affiliations</div>
                    {selected.political_affiliations.length > 0 ? (
                      <div className="space-y-3">
                        {selected.political_affiliations.map((a) => (
                          <div key={a.id} className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-[#111827]">{a.party_name}</div>
                              <div className="text-[11px] text-[#6B7280]">
                                {a.start_year} - {a.end_year || "Present"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-[#111827]">{selected.party_name}</div>
                          <div className="text-[11px] text-[#6B7280]">Current</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Intelligence */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-4 h-4 text-[#059669]" />
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase">Financial Intelligence</span>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#10B981]/10 rounded-lg p-4 border border-[#10B981]/20">
                      <div className="text-[10px] text-[#059669] uppercase font-medium mb-1 flex items-center gap-1">
                        <TrendingUpIcon /> Declared Assets
                      </div>
                      <div className="text-2xl font-bold text-[#059669]">
                        {formatRupees(selected.declared_assets)}
                      </div>
                      <div className="text-[10px] text-[#059669]/60 mt-0.5">Movable & Immovable combined</div>
                    </div>
                    <div className="bg-[#EF4444]/10 rounded-lg p-4 border border-[#EF4444]/20">
                      <div className="text-[10px] text-[#EF4444] uppercase font-medium mb-1">Total Liabilities</div>
                      <div className="text-2xl font-bold text-[#EF4444]">
                        {formatRupees(selected.liabilities)}
                      </div>
                      <div className="text-[10px] text-[#EF4444]/60 mt-0.5">Bank loans and reported dues</div>
                    </div>
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-xs font-semibold text-[#9CA3AF] uppercase">Legal & Compliance</span>
                  </div>
                  {selected.criminal_cases > 0 ? (
                    <div>
                      <div className="bg-[#EF4444]/10 rounded-lg p-4 border border-[#EF4444]/20 mb-4">
                        <div className="flex items-center gap-2 text-[#EF4444] mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-bold">Active Cases</span>
                        </div>
                        <div className="text-sm text-[#EF4444]/80">
                          {selected.criminal_cases} pending cases declared
                        </div>
                      </div>
                      {selected.criminal_records.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[#6B7280] uppercase mb-2">IPC Sections Listed</div>
                          <div className="space-y-2">
                            {selected.criminal_records.map((r) => (
                              <div key={r.id} className="flex items-center gap-2 bg-[#F3F4F6] rounded-lg px-3 py-2 border border-[#E5E7EB]">
                                <Shield className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                                <span className="text-xs text-[#9CA3AF]">
                                  {r.ipc_section} {r.description ? `(${r.description})` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-3">
                        <Shield className="w-8 h-8 text-[#059669]" />
                      </div>
                      <div className="text-sm font-bold text-[#059669]">Clean Record</div>
                      <div className="text-[11px] text-[#6B7280] text-center mt-1">
                        No pending criminal cases declared in ECI affidavit
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
              <Users className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
              <div className="text-sm text-[#6B7280]">Select a candidate to view their dossier</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
