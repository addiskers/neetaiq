import Link from "next/link";
import { Compass, LayoutDashboard, LayoutGrid, Users } from "lucide-react";

/**
 * 404 page.
 *
 * The root not-found file catches every URL that matches no route in the app,
 * not just explicit notFound() calls, so a mistyped slug like /candidate-intell
 * lands here instead of on Next's bare default page.
 *
 * It renders inside the root layout, which means the sidebar and header stay
 * put and the state and year the visitor had selected survive the detour — the
 * filter context lives above this in the tree. A dead end that keeps its
 * navigation is a much shorter way back than one that throws it away.
 *
 * Deliberately a Server Component with no metadata export: metadata on
 * not-found.js is not supported in this version of Next (only on the
 * experimental global-not-found.js), so the tab keeps the root layout's title.
 * Next injects `noindex` on 404 responses by itself.
 *
 * The destinations below mirror the sidebar's own module list rather than every
 * route that exists — /predictions and /live-election are real pages the
 * product does not currently advertise, and a 404 is the wrong place to start.
 */

const DESTINATIONS = [
  {
    href: "/",
    icon: LayoutDashboard,
    name: "Overview",
    blurb: "Results, turnout and the constituency map",
  },
  {
    href: "/election-tracker",
    icon: LayoutGrid,
    name: "Election Tracker",
    blurb: "Seat-by-seat results and margins",
  },
  {
    href: "/candidate-intel",
    icon: Users,
    name: "Candidate Intel",
    blurb: "Affidavit financials, cases and education",
  },
];

export default function NotFound() {
  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm px-5 py-8 sm:px-10 sm:py-12">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
              404
            </div>
          </div>

          <h1 className="mt-5 text-xl sm:text-2xl font-bold text-[#111827]">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
            The address you opened doesn&apos;t match any page here. It may have
            been mistyped, or it may have moved. Your selected state and year are
            still active, so any of the modules below will pick up where you left
            off.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
          >
            Back to Overview
          </Link>
        </div>

        <div className="mt-9 border-t border-[#E5E7EB] pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            Or jump to a module
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex items-start gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3 transition-colors hover:border-[#3B82F6]/40 hover:bg-[#F8FAFC]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#3B82F6]/10">
                  <d.icon className="w-4 h-4 text-[#6B7280] transition-colors group-hover:text-[#3B82F6]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#111827]">{d.name}</div>
                  <div className="text-[11px] text-[#6B7280] leading-snug">{d.blurb}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
