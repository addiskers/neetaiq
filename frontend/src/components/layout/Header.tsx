"use client";
import { Search, Bell, Settings, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useFilters } from "@/lib/filter-context";

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { currentElection } = useFilters();
  const title = pathname === "/candidate-intel" ? "Candidate Intel" : pathname === "/tweets" ? "Tweet Generator" : "Overview";
  const label = currentElection ? `${currentElection.state} ${currentElection.year}` : "Assam";

  return (
    <header className="h-[60px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
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
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2.5 bg-[#F3F4F6] rounded-xl px-4 py-2.5 w-72 transition-all focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:bg-white focus-within:border-[#4F46E5]/30 border border-transparent">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search constituencies..."
            className="bg-transparent text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none flex-1 font-medium"
          />
          <div className="flex gap-1">
            <kbd className="text-[10px] bg-white text-[#9CA3AF] px-1.5 py-0.5 rounded-md border border-[#E5E7EB] font-mono">⌘</kbd>
            <kbd className="text-[10px] bg-white text-[#9CA3AF] px-1.5 py-0.5 rounded-md border border-[#E5E7EB] font-mono">K</kbd>
          </div>
        </div>
        <button type="button" title="Notifications" className="relative p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-white" />
        </button>
        <button type="button" title="Settings" className="hidden sm:block p-2 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all">
          <Settings className="w-[18px] h-[18px]" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold shadow-sm">
          AD
        </div>
      </div>
    </header>
  );
}
