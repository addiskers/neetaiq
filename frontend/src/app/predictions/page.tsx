"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { Search, TrendingUp, Minus, Brain, Target, Zap, ChevronRight, BarChart3 } from "lucide-react";

const MapView = dynamic(() => import("@/components/overview/MapView"), { ssr: false });

const PARTY_COLORS: Record<string, string> = {
  AITC: "#00C853", BJP: "#FF9933", INC: "#00BFFF", "CPI(M)": "#E53935",
  AIFB: "#B71C1C", RSP: "#FF6D00", IND: "#78909C",
};

const PARTY_LABEL: Record<string, string> = {
  AITC: "TMC", BJP: "BJP", INC: "INC", "CPI(M)": "CPI(M)", AIFB: "AIFB", RSP: "RSP", IND: "IND",
};

function ConfidenceBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-16 ${h} bg-[#E2E8F0] rounded-full overflow-hidden`}>
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-semibold tabular-nums ${size === "sm" ? "text-[10px]" : "text-xs"} ${pct >= 60 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-500"}`}>{pct}%</span>
    </div>
  );
}

function PartyPill({ party, active }: { party: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${active ? "ring-2 ring-offset-1" : ""}`}
      style={{ borderColor: PARTY_COLORS[party] || "#94A3B8", color: PARTY_COLORS[party] || "#666", background: `${PARTY_COLORS[party] || "#94A3B8"}12` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[party] || "#94A3B8" }} />
      {PARTY_LABEL[party] || party}
    </span>
  );
}

export default function PredictionsPage() {
  const { currentElection } = useFilters();
  const [summary, setSummary] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [battlegrounds, setBattlegrounds] = useState<any[]>([]);
  const [filter, setFilter] = useState({ party: "", search: "", swingOnly: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPredictionSummary(),
      api.getConstituencyPredictions(),
      api.getBattlegrounds(12),
    ]).then(([sum, preds, bgs]) => {
      setSummary(sum);
      setPredictions(preds);
      setBattlegrounds(bgs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-[#94A3B8]">Loading predictions...</div>;

  if (!summary?.available) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
          <Brain className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-lg font-bold text-[#111827]">AI Predictions</h2>
        <p className="text-sm text-[#6B7280] max-w-md">
          Predictions are available for <strong>West Bengal 2026</strong>. Select it from the Active Theatre in the sidebar to view AI-powered constituency predictions.
        </p>
      </div>
    );
  }

  const filtered = predictions.filter((p) => {
    if (filter.party && p.predicted_winner !== filter.party) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.district.toLowerCase().includes(q) && !p.ac_no.toString().includes(q)) return false;
    }
    if (filter.swingOnly && !p.swing) return false;
    return true;
  });

  const seats = summary.predicted_seats || {};
  const topParties = Object.entries(seats).sort((a: any, b: any) => b[1] - a[1]);
  const totalSeats = topParties.reduce((s: number, [, v]: any) => s + v, 0);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#111827] tracking-tight">AI Predictions</h2>
          </div>
          <p className="text-sm text-[#9CA3AF] ml-12">
            {currentElection?.state} {currentElection?.year} &bull; GradientBoosting model &bull; {summary.features_used} features &bull; {Math.round(summary.validation_accuracy * 100)}% validation accuracy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid grid-cols-3 gap-2 bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3 shadow-sm">
            <div className="text-center"><div className="text-lg font-extrabold text-emerald-600">{summary.confidence_breakdown.high}</div><div className="text-[8px] font-bold text-[#9CA3AF] uppercase">High Conf.</div></div>
            <div className="text-center"><div className="text-lg font-extrabold text-amber-500">{summary.total_swings}</div><div className="text-[8px] font-bold text-[#9CA3AF] uppercase">Swings</div></div>
            <div className="text-center"><div className="text-lg font-extrabold text-purple-600">{summary.features_used}</div><div className="text-[8px] font-bold text-[#9CA3AF] uppercase">Features</div></div>
          </div>
        </div>
      </div>

      {/* Seat Prediction Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Predicted Seat Share</div>
        {/* Stacked bar */}
        <div className="flex rounded-xl overflow-hidden h-10 mb-4">
          {topParties.map(([party, count]: any) => (
            <div
              key={party}
              className="flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-90 cursor-default"
              style={{ width: `${(count / totalSeats) * 100}%`, background: PARTY_COLORS[party] || "#94A3B8", minWidth: count > 0 ? 40 : 0 }}
              title={`${PARTY_LABEL[party] || party}: ${count} seats`}
            >
              {count > 5 && <>{PARTY_LABEL[party] || party} {count}</>}
            </div>
          ))}
        </div>
        {/* Party cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topParties.map(([party, count]: any) => (
            <button
              type="button"
              key={party}
              onClick={() => setFilter((f) => ({ ...f, party: f.party === party ? "" : party }))}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                filter.party === party ? "border-[#3B82F6] bg-[#3B82F6]/5 ring-1 ring-[#3B82F6]/20" : "border-[#E5E7EB] hover:border-[#CBD5E1]"
              }`}
            >
              <div className="w-3 h-8 rounded-full" style={{ background: PARTY_COLORS[party] || "#94A3B8" }} />
              <div className="text-left">
                <div className="text-xl font-black text-[#111827]">{count}</div>
                <div className="text-[10px] font-bold text-[#6B7280] uppercase">{PARTY_LABEL[party] || party}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map + Battlegrounds Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-[#111827]">Prediction Map</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {topParties.slice(0, 4).map(([party]: any) => (
                <div key={party} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ background: PARTY_COLORS[party] || "#94A3B8" }} />
                  <span className="text-[#6B7280] font-semibold">{PARTY_LABEL[party] || party}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 ml-1 border-l border-[#E5E7EB] pl-1">
                <span className="w-2 h-2 rounded-sm border-2 border-amber-400" />
                <span className="text-[#6B7280] font-semibold">Swing</span>
              </div>
            </div>
          </div>
          <div className="h-[420px]">
            <MapView mapMode="prediction" />
          </div>
        </div>

        {/* Battlegrounds */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-[#111827]">Key Battlegrounds</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
            {battlegrounds.map((b) => (
              <div key={b.ac_no} className="px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-bold text-[#111827]">{b.ac_no}. {b.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] ml-1.5">{b.district}</span>
                  </div>
                  {b.swing && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">SWING</span>}
                </div>
                <div className="flex items-center gap-2">
                  {b.top2?.map((t: any, i: number) => (
                    <div key={t.party} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[t.party] || "#94A3B8" }} />
                      <span className="text-[10px] font-bold" style={{ color: PARTY_COLORS[t.party] || "#666" }}>{PARTY_LABEL[t.party] || t.party}</span>
                      <span className="text-[10px] text-[#94A3B8] font-semibold">{Math.round(t.prob * 100)}%</span>
                      {i === 0 && <span className="text-[10px] text-[#CBD5E1] mx-0.5">vs</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Constituency Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-[#111827]">All Predictions</h3>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search AC, district..."
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              className="pl-8 pr-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs text-[#111827] w-44 outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>
          <select
            title="Filter by party"
            value={filter.party}
            onChange={(e) => setFilter((f) => ({ ...f, party: e.target.value }))}
            className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs text-[#111827] px-2.5 py-1.5 outline-none"
          >
            <option value="">All Parties</option>
            {topParties.map(([p]: any) => <option key={p} value={p}>{PARTY_LABEL[p] || p}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filter.swingOnly}
              onChange={(e) => setFilter((f) => ({ ...f, swingOnly: e.target.checked }))}
              className="rounded border-[#CBD5E1]"
            />
            Swings only
          </label>
          <span className="text-[11px] text-[#9CA3AF] font-medium">{filtered.length} of {predictions.length}</span>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <tr className="text-[#6B7280] text-left uppercase text-[10px] tracking-wider">
                <th className="px-4 py-2.5 font-semibold">AC</th>
                <th className="px-4 py-2.5 font-semibold">Constituency</th>
                <th className="px-4 py-2.5 font-semibold">District</th>
                <th className="px-4 py-2.5 font-semibold">Predicted</th>
                <th className="px-4 py-2.5 font-semibold">Confidence</th>
                <th className="px-4 py-2.5 font-semibold">2021</th>
                <th className="px-4 py-2.5 font-semibold">Swing</th>
                <th className="px-4 py-2.5 font-semibold text-center">TMC</th>
                <th className="px-4 py-2.5 font-semibold text-center">BJP</th>
                <th className="px-4 py-2.5 font-semibold text-center">INC</th>
                <th className="px-4 py-2.5 font-semibold text-center">CPI(M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((p) => (
                <tr key={p.ac_no} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-2.5 text-[#9CA3AF] font-mono font-semibold">{p.ac_no}</td>
                  <td className="px-4 py-2.5 text-[#111827] font-semibold">{p.name}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{p.district}</td>
                  <td className="px-4 py-2.5"><PartyPill party={p.predicted_winner} /></td>
                  <td className="px-4 py-2.5"><ConfidenceBar value={p.confidence} size="sm" /></td>
                  <td className="px-4 py-2.5"><PartyPill party={p.incumbent_2021 || "?"} /></td>
                  <td className="px-4 py-2.5">
                    {p.swing ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <TrendingUp className="w-3 h-3" /> Swing
                      </span>
                    ) : (
                      <span className="text-[#CBD5E1]"><Minus className="w-3 h-3" /></span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold" style={{ color: PARTY_COLORS.AITC }}>{Math.round((p.party_probabilities?.AITC || 0) * 100)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold" style={{ color: PARTY_COLORS.BJP }}>{Math.round((p.party_probabilities?.BJP || 0) * 100)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold" style={{ color: PARTY_COLORS.INC }}>{Math.round((p.party_probabilities?.INC || 0) * 100)}%</td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold" style={{ color: PARTY_COLORS["CPI(M)"] }}>{Math.round((p.party_probabilities?.["CPI(M)"] || 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
