"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { Search, TrendingUp, TrendingDown, Minus, Brain, Target, Zap } from "lucide-react";

const MapView = dynamic(() => import("@/components/overview/MapView"), { ssr: false });

const PARTY_COLORS: Record<string, string> = {
  AITC: "#00FF00", BJP: "#FF9933", INC: "#00BFFF", "CPI(M)": "#FF0000",
  AIFB: "#CC0000", RSP: "#FF6600", IND: "#808080",
};

const PARTY_BG: Record<string, string> = {
  AITC: "bg-green-500/20 text-green-400 border-green-500/30",
  BJP: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  INC: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "CPI(M)": "bg-red-500/20 text-red-400 border-red-500/30",
  AIFB: "bg-red-800/20 text-red-300 border-red-800/30",
  RSP: "bg-orange-600/20 text-orange-300 border-orange-600/30",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#94A3B8]">{pct}%</span>
    </div>
  );
}

function PartyBadge({ party }: { party: string }) {
  const cls = PARTY_BG[party] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{party}</span>
  );
}

export default function PredictionsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [battlegrounds, setBattlegrounds] = useState<any[]>([]);
  const [filter, setFilter] = useState({ party: "", search: "", swingOnly: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPredictionSummary(),
      api.getConstituencyPredictions(),
      api.getBattlegrounds(15),
    ]).then(([sum, preds, bgs]) => {
      setSummary(sum);
      setPredictions(preds);
      setBattlegrounds(bgs);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-[#94A3B8]">Loading predictions...</div>;
  if (!summary?.available) return <div className="flex items-center justify-center h-full text-[#94A3B8]">No predictions available</div>;

  const filtered = predictions.filter((p) => {
    if (filter.party && p.predicted_winner !== filter.party) return false;
    if (filter.search && !p.name.toLowerCase().includes(filter.search.toLowerCase()) && !p.district.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.swingOnly && !p.swing) return false;
    return true;
  });

  const seats = summary.predicted_seats || {};
  const topParties = Object.entries(seats).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-xl">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">West Bengal 2026 — AI Predictions</h1>
          <p className="text-sm text-[#64748B]">
            ML model trained on 2011-2021 data &bull; {summary.features_used} features &bull; {Math.round(summary.validation_accuracy * 100)}% validation accuracy (2021)
          </p>
        </div>
      </div>

      {/* Seat Prediction Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topParties.map(([party, seats]: any) => (
          <div key={party} className="bg-[#111B33] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <PartyBadge party={party} />
              <span className="text-2xl font-black text-white">{seats}</span>
            </div>
            <div className="text-xs text-[#64748B]">predicted seats</div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111B33] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Target className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-lg font-bold text-white">{summary.confidence_breakdown.high}</div>
            <div className="text-xs text-[#64748B]">High confidence (&gt;60%)</div>
          </div>
        </div>
        <div className="bg-[#111B33] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-lg font-bold text-white">{summary.total_swings}</div>
            <div className="text-xs text-[#64748B]">Predicted swings from 2021</div>
          </div>
        </div>
        <div className="bg-[#111B33] rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-lg font-bold text-white">{summary.features_used}</div>
            <div className="text-xs text-[#64748B]">Features per prediction</div>
          </div>
        </div>
      </div>

      {/* Prediction Map */}
      <div className="bg-[#111B33] rounded-xl border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" /> CONSTITUENCY-WISE PREDICTION MAP
          </h2>
          <div className="flex items-center gap-3 text-[10px]">
            {topParties.map(([party]: any) => (
              <div key={party} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PARTY_COLORS[party] || "#94A3B8" }} />
                <span className="text-[#94A3B8]">{party}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-yellow-400" />
              <span className="text-[#94A3B8]">Swing</span>
            </div>
          </div>
        </div>
        <div className="h-[450px]">
          <MapView mapMode="prediction" />
        </div>
      </div>

      {/* Battleground Constituencies */}
      <div className="bg-[#111B33] rounded-xl border border-white/5">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> KEY BATTLEGROUNDS — Closest Contests
          </h2>
        </div>
        <div className="divide-y divide-white/5">
          {battlegrounds.map((b) => (
            <div key={b.ac_no} className="px-5 py-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{b.ac_no}. {b.name}</div>
                <div className="text-xs text-[#64748B]">{b.district} &bull; {b.category}</div>
              </div>
              <div className="flex items-center gap-3">
                {b.top2?.map((t: any) => (
                  <div key={t.party} className="text-center">
                    <PartyBadge party={t.party} />
                    <div className="text-xs text-[#94A3B8] mt-1">{Math.round(t.prob * 100)}%</div>
                  </div>
                ))}
                {b.swing && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-semibold">SWING</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Constituency Predictions */}
      <div className="bg-[#111B33] rounded-xl border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-white">ALL CONSTITUENCY PREDICTIONS</h2>
          <div className="flex-1" />
          {/* Filters */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search..."
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white w-40 outline-none"
            />
          </div>
          <select
            title="Filter by party"
            value={filter.party}
            onChange={(e) => setFilter((f) => ({ ...f, party: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 outline-none"
          >
            <option value="">All Parties</option>
            {topParties.map(([p]: any) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] cursor-pointer">
            <input
              type="checkbox"
              checked={filter.swingOnly}
              onChange={(e) => setFilter((f) => ({ ...f, swingOnly: e.target.checked }))}
              className="rounded"
            />
            Swings only
          </label>
          <span className="text-xs text-[#64748B]">{filtered.length} results</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0D1526]">
              <tr className="text-[#64748B] text-left">
                <th className="px-4 py-2">AC</th>
                <th className="px-4 py-2">Constituency</th>
                <th className="px-4 py-2">District</th>
                <th className="px-4 py-2">Predicted</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">2021 Winner</th>
                <th className="px-4 py-2">Swing</th>
                <th className="px-4 py-2">AITC</th>
                <th className="px-4 py-2">BJP</th>
                <th className="px-4 py-2">INC</th>
                <th className="px-4 py-2">CPI(M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => (
                <tr key={p.ac_no} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 text-[#94A3B8] font-mono">{p.ac_no}</td>
                  <td className="px-4 py-2 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-[#94A3B8]">{p.district}</td>
                  <td className="px-4 py-2"><PartyBadge party={p.predicted_winner} /></td>
                  <td className="px-4 py-2"><ConfidenceBar value={p.confidence} /></td>
                  <td className="px-4 py-2"><PartyBadge party={p.incumbent_2021 || "?"} /></td>
                  <td className="px-4 py-2">
                    {p.swing ? (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-[#475569] flex items-center gap-1">
                        <Minus className="w-3 h-3" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#94A3B8] font-mono">{Math.round((p.party_probabilities?.AITC || 0) * 100)}%</td>
                  <td className="px-4 py-2 text-[#94A3B8] font-mono">{Math.round((p.party_probabilities?.BJP || 0) * 100)}%</td>
                  <td className="px-4 py-2 text-[#94A3B8] font-mono">{Math.round((p.party_probabilities?.INC || 0) * 100)}%</td>
                  <td className="px-4 py-2 text-[#94A3B8] font-mono">{Math.round((p.party_probabilities?.["CPI(M)"] || 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
