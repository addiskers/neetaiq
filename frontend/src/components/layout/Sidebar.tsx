"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Users, Brain, Radio, X, ChevronDown } from "lucide-react";
import { useFilters } from "@/lib/filter-context";

const baseModules = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Election Tracker", href: "/election-tracker", icon: LayoutGrid },
  { name: "Candidate Intel", href: "/candidate-intel", icon: Users },
];

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const {
    elections, setElectionId, currentElection,
    granularity, setGranularity,
    selectedDistrict, setSelectedDistrict,
    selectedAC, setSelectedAC,
    districts, filteredConstituencies,
  } = useFilters();

  const handleNavClick = () => {
    onCloseMobile?.();
  };

  // Derive unique states and years for split dropdowns
  const uniqueStates = [...new Set(elections.map((e) => e.state))];
  const selectedState = currentElection?.state || uniqueStates[0] || "";
  const yearsForState = elections
    .filter((e) => e.state === selectedState)
    .sort((a, b) => b.year - a.year);

  const handleStateChange = (state: string) => {
    const latest = elections
      .filter((e) => e.state === state)
      .sort((a, b) => b.year - a.year)[0];
    if (latest) setElectionId(latest.id);
  };

  const handleYearChange = (year: number) => {
    const match = elections.find((e) => e.state === selectedState && e.year === year);
    if (match) setElectionId(match.id);
  };

  return (
    <aside className="w-[260px] bg-[#0A1128] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#111B33] rounded-xl px-3 py-2 flex items-center gap-0.5">
            <span className="text-white font-extrabold text-[15px]">मतदान</span>
            <span className="text-[#3B82F6] font-extrabold text-[15px]">iQ</span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            title="Close menu"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#475569] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="h-px bg-white/10 mx-4" />

      {/* Active Theatre — State + Year */}
      <div className="px-5 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B] mb-2">Active Theatre</div>
        <div className="relative">
          <select
            title="Select State"
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full bg-[#111B33] text-white text-[13px] font-semibold rounded-xl px-3.5 py-2.5 border border-white/10 outline-none focus:border-[#3B82F6] transition-all appearance-none cursor-pointer"
          >
            {uniqueStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
        </div>
        <div className="relative mt-2">
          <select
            title="Select Year"
            value={currentElection?.year || ""}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="w-full bg-[#111B33] text-white text-[13px] font-semibold rounded-xl px-3.5 py-2.5 border border-white/10 outline-none focus:border-[#3B82F6] transition-all appearance-none cursor-pointer"
          >
            {yearsForState.map((e) => (
              <option key={e.id} value={e.year}>{e.year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
        </div>
      </div>

      <div className="h-px bg-white/10 mx-4" />

      {/* Granularity */}
      <div className="px-5 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B] mb-2">Granularity</div>
        <div className="flex bg-[#111B33] rounded-xl p-1">
          {(["DISTRICT", "AC"] as const).map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGranularity(g)}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
                granularity === g
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-[#64748B] hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="relative mt-2.5">
            <select
              title="Select District"
              value={selectedDistrict || ""}
              onChange={(e) => {
                setSelectedDistrict(e.target.value || null);
                setSelectedAC(null);
              }}
              className="w-full bg-[#111B33] text-white text-[13px] font-medium rounded-xl px-3.5 py-2.5 border border-white/10 outline-none focus:border-[#3B82F6] transition-all appearance-none"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
          </div>

        {granularity === "AC" && (
          <div className="relative mt-2.5">
            <select
              title="Select Constituency"
              value={selectedAC || ""}
              onChange={(e) => setSelectedAC(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[#111B33] text-white text-[13px] font-medium rounded-xl px-3.5 py-2.5 border border-white/10 outline-none focus:border-[#3B82F6] transition-all appearance-none"
            >
              <option value="">All Constituencies</option>
              {filteredConstituencies.map((c) => (
                <option key={c.id} value={c.ac_no}>
                  {c.ac_no} — {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 mx-4" />

      {/* Modules */}
      <div className="px-5 py-4 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B] mb-2">Modules</div>
        <nav className="space-y-1">
          {[
            ...baseModules,
            ...(currentElection?.year === 2026
              ? [{ name: "Live Election", href: "/live-election", icon: Radio }]
              : []),
            ...(currentElection?.state === "West Bengal" && currentElection?.year === 2026
              ? [{ name: "AI Predictions", href: "/predictions", icon: Brain }]
              : []),
          ].map((mod) => {
            const isActive = pathname === mod.href || (mod.href !== "/" && pathname.startsWith(mod.href));
            return (
              <Link
                key={mod.name}
                href={mod.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-[#3B82F6]/15 text-[#3B82F6]"
                    : "text-[#64748B] hover:text-white hover:bg-white/5"
                }`}
              >
                <mod.icon className="w-[18px] h-[18px]" />
                {mod.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-[10px] text-[#475569]">
          Powered by <span className="text-[#64748B] font-semibold">MatdaanIQ</span>
        </div>
      </div>
    </aside>
  );
}
