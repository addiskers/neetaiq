"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional right-hand hint, e.g. "2013–2023" or "7 ACs". */
  meta?: string;
}

interface FilterSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  searchPlaceholder?: string;
  /** Below this many options the search box is hidden as clutter. */
  searchThreshold?: number;
}

/**
 * The sidebar's dropdown.
 *
 * A native <select> renders its list with the operating system's own styling,
 * which ignores the dark sidebar entirely and gets unwieldy at length — and
 * these lists get long: twenty-one states, Madhya Pradesh's fifty-two
 * districts, Karnataka's 224 constituencies. This is a listbox instead:
 * themed, filterable, and keyboard-driven.
 */
export default function FilterSelect({
  options,
  value,
  onChange,
  ariaLabel,
  searchPlaceholder = "Search…",
  searchThreshold = 8,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showSearch = options.length >= searchThreshold;
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Prefer labels that start with the query — typing "ma" should put Madhya
    // Pradesh and Manipur above Karnataka.
    const starts = options.filter((o) => o.label.toLowerCase().startsWith(q));
    const contains = options.filter(
      (o) => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q)
    );
    return [...starts, ...contains];
  }, [options, query]);

  // Reset in the handler rather than an effect: deriving this from the click
  // keeps the menu's opening state out of a render-then-correct cycle.
  const openMenu = () => {
    setQuery("");
    const i = options.findIndex((o) => o.value === value);
    setActiveIndex(i >= 0 ? i : 0);
    setOpen(true);
  };

  // Every query change restarts the highlight at the top, so activeIndex can
  // never point past the filtered list.
  const onQueryChange = (q: string) => {
    setQuery(q);
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open || !showSearch) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) commit(filtered[activeIndex].value);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`w-full flex items-center gap-2 bg-[#111B33] text-white text-[13px] font-semibold rounded-xl pl-3.5 pr-3 py-2.5 border transition-colors cursor-pointer text-left ${
          open ? "border-[#3B82F6]" : "border-white/10 hover:border-white/20"
        }`}
      >
        <span className="flex-1 truncate">{selected?.label ?? ariaLabel}</span>
        {selected?.meta && (
          <span className="text-[10px] font-medium text-[#64748B] tabular-nums shrink-0">
            {selected.meta}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-white/10 bg-[#111B33] shadow-2xl shadow-black/50 overflow-hidden"
          onKeyDown={onKeyDown}
        >
          {showSearch && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <Search className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full bg-transparent text-[12.5px] text-white placeholder:text-[#64748B] outline-none"
              />
            </div>
          )}

          <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-[264px] overflow-y-auto py-1 filter-select-scroll"
          >
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-[#64748B]">No matches for “{query}”</div>
            )}
            {filtered.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value || "__all__"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(o.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                    isSelected ? "text-white font-semibold" : "text-[#CBD5E1]"
                  } ${i === activeIndex ? "bg-white/[0.07]" : ""}`}
                >
                  <span
                    className={`w-1 h-4 rounded-full shrink-0 ${isSelected ? "bg-[#3B82F6]" : "bg-transparent"}`}
                  />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.meta && (
                    <span className="text-[10px] text-[#64748B] tabular-nums shrink-0">{o.meta}</span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
