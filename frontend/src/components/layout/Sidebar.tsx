"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Users, X } from "lucide-react";
import { useFilters } from "@/lib/filter-context";
import FilterSelect from "./FilterSelect";

const baseModules = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Election Tracker", href: "/election-tracker", icon: LayoutGrid },
  { name: "Candidate Intel", href: "/candidate-intel", icon: Users },
];

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const {
    elections, setElection, currentElection,
    granularity, setGranularity,
    selectedDistrict, setSelectedDistrict,
    selectedAC, setSelectedAC,
    districts, filteredConstituencies,
  } = useFilters();

  const handleNavClick = () => {
    onCloseMobile?.();
  };

  // Derive unique states and years for the theatre picker
  const uniqueStates = [...new Set(elections.map((e) => e.state))].sort();
  const selectedState = currentElection?.state || uniqueStates[0] || "";
  const yearsForState = elections
    .filter((e) => e.state === selectedState)
    .sort((a, b) => b.year - a.year);

  // Year span shown beside each state, so the list says what data exists
  // without having to open the state first.
  const stateMeta = elections.reduce<Record<string, string>>((acc, e) => {
    const years = elections.filter((x) => x.state === e.state).map((x) => x.year);
    const lo = Math.min(...years);
    const hi = Math.max(...years);
    acc[e.state] = lo === hi ? `${lo}` : `${lo}–${hi}`;
    return acc;
  }, {});

  const handleStateChange = (state: string) => {
    const latest = elections
      .filter((e) => e.state === state)
      .sort((a, b) => b.year - a.year)[0];
    if (latest) setElection(latest);
  };

  const handleYearChange = (year: number) => {
    const match = elections.find((e) => e.state === selectedState && e.year === year);
    if (match) setElection(match);
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
          <span className="text-[9px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded-md border border-[#EF4444]/40 text-[#EF4444] bg-[#EF4444]/10 leading-tight">
            BETA
          </span>
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
        <FilterSelect
          ariaLabel="Select state"
          searchPlaceholder="Search states…"
          options={uniqueStates.map((s) => ({ value: s, label: s, meta: stateMeta[s] }))}
          value={selectedState}
          onChange={handleStateChange}
        />

        {/* Years are few enough per state to show outright, which saves a
            second dropdown and makes the available data visible at a glance.
            Segmented rather than free-floating pills: with flex-1 the row fills
            evenly whether a state has two, three or four elections, instead of
            leaving dead space on the right, and it lines up with the
            Granularity switch below. */}
        {yearsForState.length > 0 && (
          <div className="flex bg-[#111B33] rounded-xl p-1 mt-2">
            {yearsForState.map((e) => {
              const active = currentElection?.year === e.year;
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleYearChange(e.year)}
                  className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg tabular-nums transition-all ${
                    active
                      ? "bg-[#3B82F6] text-white shadow-sm"
                      : "text-[#64748B] hover:text-white"
                  }`}
                >
                  {e.year}
                </button>
              );
            })}
          </div>
        )}
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

        <div className="mt-2.5">
          <FilterSelect
            ariaLabel="All Districts"
            searchPlaceholder="Search districts…"
            options={[
              { value: "", label: "All Districts" },
              ...districts.map((d) => ({
                value: d.name,
                label: d.name,
                meta: `${d.constituency_count} ACs`,
              })),
            ]}
            value={selectedDistrict || ""}
            onChange={(v) => {
              setSelectedDistrict(v || null);
              setSelectedAC(null);
            }}
          />
        </div>

        {granularity === "AC" && (
          <div className="mt-2.5">
            <FilterSelect
              ariaLabel="All Constituencies"
              searchPlaceholder="Search constituencies…"
              options={[
                { value: "", label: "All Constituencies" },
                ...filteredConstituencies.map((c) => ({
                  value: String(c.ac_no),
                  label: `${c.ac_no} — ${c.name}`,
                  meta: c.category ?? undefined,
                })),
              ]}
              value={selectedAC ? String(selectedAC) : ""}
              onChange={(v) => setSelectedAC(v ? Number(v) : null)}
            />
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 mx-4" />

      {/* Modules */}
      <div className="px-5 py-4 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B] mb-2">Modules</div>
        <nav className="space-y-1">
          {baseModules.map((mod) => {
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
      <div className="px-5 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-start gap-1.5 bg-[#111B33] rounded-lg px-3 py-2">
          <span className="text-[#F59E0B] text-[10px] mt-px">⚠</span>
          <p className="text-[11px] text-white leading-relaxed">
            All information is subject to verification.
          </p>
        </div>
        <div className="text-[10px] text-[#475569]">
          Powered by <span className="text-[#64748B] font-semibold">MatdaanIQ</span>
        </div>
      </div>
    </aside>
  );
}
