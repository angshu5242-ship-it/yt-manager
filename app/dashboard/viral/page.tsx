"use client";

import { useState } from "react";
import { TrendingUp, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function ViralPage() {
  const [niche, setNiche] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const getModel = () =>
    document.querySelector("[data-model]")?.getAttribute("data-model") || "gemini-1.5-flash";

  const research = async () => {
    if (!niche.trim()) { toast.error("Enter a niche or channel URL"); return; }
    setLoading(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Research what's currently working in this niche: "${niche}". 
          
          Identify viral content patterns, successful hook formulas, and top-performing content types.
          Focus on what beats the channel's own median views, not just raw view count.
          Provide 3 specific content ideas based on your analysis.`,
          model: getModel(),
          skill: "yt-viral",
        }),
      });
      if (!res.ok) throw new Error("Research failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setAnalysis(full);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLE_NICHES = [
    "Personal finance for millennials",
    "AI tools for creators",
    "Fitness for busy parents",
    "Solo travel on a budget",
    "Learn to code in 2025",
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-green-400/10 flex items-center justify-center">
          <TrendingUp size={18} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Viral Niche Research</h1>
          <p className="text-brand-muted text-sm">
            What&apos;s working right now, ranked by channel multiple — not raw views.
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <label className="label">Your Niche or Topic</label>
        <div className="flex gap-3">
          <input
            className="input"
            placeholder='e.g. "personal finance", "productivity", "cooking"'
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && research()}
          />
          <button
            onClick={research}
            disabled={loading || !niche.trim()}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Search size={15} />}
            Research
          </button>
        </div>

        <div className="mt-3">
          <div className="text-xs text-brand-muted mb-2">Try one of these:</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_NICHES.map((n) => (
              <button
                key={n}
                onClick={() => setNiche(n)}
                className="text-xs px-3 py-1 rounded-full bg-brand-border hover:bg-[#333] transition-colors"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {(analysis || loading) && (
        <div className="card">
          <div className="section-title">Research Results</div>
          {loading && !analysis && (
            <div className="flex items-center gap-3 text-brand-muted">
              <div className="w-5 h-5 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
              Researching your niche...
            </div>
          )}
          <pre className={`text-sm leading-relaxed whitespace-pre-wrap text-gray-200 ${loading && analysis ? "cursor-blink" : ""}`}>
            {analysis}
          </pre>
        </div>
      )}
    </div>
  );
}
