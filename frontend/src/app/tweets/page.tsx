"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useFilters } from "@/lib/filter-context";
import { MessageCircle, Copy, Check, RefreshCw, Filter, Sparkles, ExternalLink } from "lucide-react";

const CATEGORIES = [
  { id: "", label: "All", emoji: "✨" },
  { id: "overview", label: "Overview", emoji: "🗳️" },
  { id: "demographics", label: "Demographics", emoji: "👥" },
  { id: "party", label: "Party", emoji: "🏛️" },
  { id: "results", label: "Results", emoji: "🏆" },
  { id: "turnout", label: "Turnout", emoji: "📊" },
  { id: "trivia", label: "Trivia", emoji: "🎯" },
];

export default function TweetsPage() {
  const { electionId, currentElection } = useFilters();
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const loadTweets = () => {
    if (!electionId) return;
    setLoading(true);
    api.generateTweets(electionId, category || undefined).then((data) => {
      setTweets(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTweets();
  }, [electionId, category]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openInTwitter = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
  };

  const startEdit = (index: number, text: string) => {
    setEditingId(index);
    setEditText(text);
  };

  const charCount = (text: string) => text.length;
  const label = currentElection ? `${currentElection.state} ${currentElection.year}` : "Election";

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1DA1F2]/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#1DA1F2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Tweet Generator</h2>
            <p className="text-[13px] text-[#6B7280]">
              AI-generated election tweets from {label} data. Edit, copy, and post.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <div className="flex bg-[#F3F4F6] rounded-xl p-1 gap-0.5">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  category === c.id
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={loadTweets}
          className="flex items-center gap-2 text-[12px] font-bold text-[#4F46E5] hover:text-[#4338CA] px-3 py-2 rounded-xl hover:bg-[#4F46E5]/5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Regenerate
        </button>
      </div>

      {/* Tweet Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-[#9CA3AF]">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-[14px] font-medium">Generating tweets from election data...</span>
          </div>
        </div>
      ) : tweets.length === 0 ? (
        <div className="text-center py-20 text-[#9CA3AF]">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No tweets generated for this category. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tweets.map((tweet, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-all group"
            >
              {/* Tweet header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded-lg">
                    {tweet.emoji} {tweet.category}
                  </span>
                  <span className={`text-[10px] font-bold ${charCount(editingId === i ? editText : tweet.text) > 280 ? "text-[#DC2626]" : "text-[#9CA3AF]"}`}>
                    {charCount(editingId === i ? editText : tweet.text)}/280
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId !== i && (
                    <button
                      type="button"
                      onClick={() => startEdit(i, tweet.text)}
                      className="text-[11px] font-semibold text-[#6B7280] hover:text-[#111827] px-2 py-1 rounded-lg hover:bg-[#F3F4F6] transition-all"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Tweet body */}
              {editingId === i ? (
                <div>
                  <textarea
                    title="Edit tweet"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3 text-[13px] text-[#111827] leading-relaxed outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 resize-none"
                    rows={6}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        tweets[i].text = editText;
                        setEditingId(null);
                      }}
                      className="text-[11px] font-bold text-white bg-[#4F46E5] px-3 py-1.5 rounded-lg hover:bg-[#4338CA] transition-all"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-[11px] font-bold text-[#6B7280] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-line mb-4">
                  {tweet.text}
                </p>
              )}

              {/* Actions */}
              {editingId !== i && (
                <div className="flex items-center gap-2 pt-3 border-t border-[#F3F4F6]">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tweet.text, i)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl transition-all ${
                      copiedId === i
                        ? "bg-[#059669]/10 text-[#059669]"
                        : "bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {copiedId === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === i ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openInTwitter(tweet.text)}
                    className="flex items-center gap-1.5 text-[11px] font-bold bg-[#1DA1F2] text-white px-3 py-2 rounded-xl hover:bg-[#1A8CD8] transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Post on X
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
