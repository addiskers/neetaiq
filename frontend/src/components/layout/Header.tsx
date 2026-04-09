"use client";
import { useState } from "react";
import { Search, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useFilters } from "@/lib/filter-context";
import { api } from "@/lib/api";

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentElection, electionId } = useFilters();
  const title = pathname === "/candidate-intel" ? "Candidate Intel" : "Overview";
  const label = currentElection ? `${currentElection.state} ${currentElection.year}` : "Assam";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }
    try {
      const data = await api.search(q);
      setResults(data);
      setShowResults(true);
    } catch {
      setResults(null);
    }
  };

  return (
    <header className="h-[60px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          title="Open menu"
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-bold text-[#111827] tracking-tight truncate">{title}</h1>
        <div className="hidden sm:flex items-center gap-1.5 bg-[#059669]/8 text-[#059669] text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wide shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
          LIVE: {label.toUpperCase()}
        </div>
      </div>
      <div className="relative hidden md:block">
        <div className="flex items-center gap-2.5 bg-[#F3F4F6] rounded-xl px-4 py-2.5 w-72 transition-all focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:bg-white focus-within:border-[#4F46E5]/30 border border-transparent">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search candidates, constituencies..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="bg-transparent text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none flex-1 font-medium"
          />
        </div>
        {showResults && results && (
          <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-50 max-h-[400px] overflow-y-auto">
            {results.candidates?.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase px-2 mb-1">Candidates</div>
                {results.candidates.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { router.push("/candidate-intel"); setShowResults(false); setQuery(""); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                  >
                    <div className="text-sm font-medium text-[#111827]">{c.name}</div>
                    <div className="text-[11px] text-[#6B7280]">{c.party} - {c.constituency}</div>
                  </button>
                ))}
              </div>
            )}
            {results.constituencies?.length > 0 && (
              <div className="p-2 border-t border-[#E5E7EB]">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase px-2 mb-1">Constituencies</div>
                {results.constituencies.map((c: any) => (
                  <div key={c.id} className="px-3 py-2 rounded-lg hover:bg-[#F3F4F6] text-sm">
                    <span className="font-medium text-[#111827]">{c.name}</span>
                    <span className="text-[#6B7280] text-xs ml-2">AC {c.ac_no} - {c.district}</span>
                  </div>
                ))}
              </div>
            )}
            {(!results.candidates?.length && !results.constituencies?.length) && (
              <div className="p-4 text-center text-sm text-[#9CA3AF]">No results found</div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
