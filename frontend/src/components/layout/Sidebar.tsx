"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LogOut, MessageCircle, X } from "lucide-react";
import { useFilters } from "@/lib/filter-context";

const modules = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Candidate Intel", href: "/candidate-intel", icon: Users },
  { name: "Tweet Generator", href: "/tweets", icon: MessageCircle },
];

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const {
    elections, electionId, setElectionId,
    granularity, setGranularity,
    selectedDistrict, setSelectedDistrict,
    selectedAC, setSelectedAC,
    districts, filteredConstituencies,
  } = useFilters();

  const handleNavClick = () => {
    onCloseMobile?.();
  };

  return (
    <aside className="w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#0A1128] rounded-xl px-3 py-2 flex items-center gap-0.5">
            <span className="text-white font-extrabold text-[15px]">मतदान</span>
            <span className="text-[#3B82F6] font-extrabold text-[15px]">iQ</span>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onCloseMobile && (
          <button
            type="button"
            title="Close menu"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="h-px bg-[#F3F4F6] mx-4" />

      {/* Active Theatre */}
      <div className="px-5 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">Active Theatre</div>
        <select
          title="Select Election"
          value={electionId || ""}
          onChange={(e) => setElectionId(Number(e.target.value))}
          className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] font-semibold rounded-xl px-3.5 py-2.5 border border-[#E5E7EB] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
        >
          {elections.map((e) => (
            <option key={e.id} value={e.id}>
              {e.state} — {e.year}
            </option>
          ))}
        </select>
      </div>

      <div className="h-px bg-[#F3F4F6] mx-4" />

      {/* Granularity */}
      <div className="px-5 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">Granularity</div>
        <div className="flex bg-[#F3F4F6] rounded-xl p-1">
          {(["STATE", "DISTRICT", "AC"] as const).map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGranularity(g)}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
                granularity === g
                  ? "bg-white text-[#4F46E5] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {(granularity === "DISTRICT" || granularity === "AC") && (
          <select
            title="Select District"
            value={selectedDistrict || ""}
            onChange={(e) => {
              setSelectedDistrict(e.target.value || null);
              setSelectedAC(null);
            }}
            className="w-full mt-2.5 bg-[#F9FAFB] text-[#111827] text-[13px] font-medium rounded-xl px-3.5 py-2.5 border border-[#E5E7EB] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        )}

        {granularity === "AC" && (
          <select
            title="Select Constituency"
            value={selectedAC || ""}
            onChange={(e) => setSelectedAC(e.target.value ? Number(e.target.value) : null)}
            className="w-full mt-2.5 bg-[#F9FAFB] text-[#111827] text-[13px] font-medium rounded-xl px-3.5 py-2.5 border border-[#E5E7EB] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
          >
            <option value="">All Constituencies</option>
            {filteredConstituencies.map((c) => (
              <option key={c.id} value={c.ac_number}>
                {c.ac_number} — {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="h-px bg-[#F3F4F6] mx-4" />

      {/* Modules */}
      <div className="px-5 py-4 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">Modules</div>
        <nav className="space-y-1">
          {modules.map((mod) => {
            const isActive = pathname === mod.href || (mod.href !== "/" && pathname.startsWith(mod.href));
            return (
              <Link
                key={mod.name}
                href={mod.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-[#4F46E5]/8 text-[#4F46E5]"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
                }`}
              >
                <mod.icon className="w-[18px] h-[18px]" />
                {mod.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* End Session */}
      <div className="px-5 py-4 border-t border-[#F3F4F6]">
        <button type="button" className="flex items-center gap-2.5 text-[13px] font-medium text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
          <LogOut className="w-[16px] h-[16px]" />
          End Session
        </button>
      </div>
    </aside>
  );
}
