"use client";

import { useState } from "react";
import { Package, Send, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface LintResult {
  overall: { pass: boolean; grade: string; total_issues: number; total_warnings: number };
  title: { text: string; char_count: number; issues: string[]; warnings: string[]; pass: boolean };
  thumbnail: { text: string; issues: string[]; warnings: string[]; pass: boolean };
  duplication: { overlap_keywords: string[]; issues: string[]; pass: boolean };
  all_issues: string[];
  all_warnings: string[];
}

interface Pairing {
  title: string;
  thumbText: string;
  thumbConcept: string;
  lint?: LintResult;
  linting?: boolean;
}

export default function PackagePage() {
  const [idea, setIdea] = useState("");
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(false);

  const getModel = () =>
    document.querySelector("[data-model]")?.getAttribute("data-model") || "gemini-1.5-flash";

  const generate = async () => {
    if (!idea.trim()) { toast.error("Enter a video idea"); return; }
    setLoading(true);
    setPairings([]);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Video idea: ${idea}\n\nGenerate 3 title + thumbnail pairings.`,
          model: getModel(),
          skill: "yt-package",
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
      }

      // Parse pairings from AI output
      const parsed = parsePairings(full);
      setPairings(parsed);

      // Auto-lint each pairing
      parsed.forEach((p, i) => lintPairing(p, i));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const parsePairings = (text: string): Pairing[] => {
    const blocks = text.split("---").filter((b) => b.trim());
    return blocks
      .map((block) => {
        const titleMatch = block.match(/TITLE:\s*(.+)/);
        const thumbMatch = block.match(/THUMBNAIL TEXT:\s*(.+)/);
        const conceptMatch = block.match(/THUMBNAIL CONCEPT:\s*(.+)/);
        if (!titleMatch) return null;
        return {
          title: titleMatch[1].trim().replace(/\(\d+ chars?\)/i, "").trim(),
          thumbText: thumbMatch ? thumbMatch[1].trim() : "",
          thumbConcept: conceptMatch ? conceptMatch[1].trim() : "",
        };
      })
      .filter(Boolean) as Pairing[];
  };

  const lintPairing = async (pairing: Pairing, index: number) => {
    setPairings((prev) => prev.map((p, i) => i === index ? { ...p, linting: true } : p));
    try {
      const res = await fetch("/api/tools/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pairing.title,
          thumb: pairing.thumbText,
          concept: pairing.thumbConcept,
        }),
      });
      const data = await res.json();
      setPairings((prev) =>
        prev.map((p, i) => i === index ? { ...p, lint: data, linting: false } : p)
      );
    } catch {
      setPairings((prev) => prev.map((p, i) => i === index ? { ...p, linting: false } : p));
    }
  };

  const LintBadge = ({ pass, issues, warnings }: { pass: boolean; issues: string[]; warnings: string[] }) => (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${pass ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {pass ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {pass ? "Passes lint" : `${issues.length} issue${issues.length !== 1 ? "s" : ""}`}
      {warnings.length > 0 && <span className="text-yellow-400">· {warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center">
          <Package size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Title + Thumbnail Packager</h1>
          <p className="text-brand-muted text-sm">
            Generate paired combos, auto-linted for truncation and duplication.
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <label className="label">Video Idea</label>
        <input
          className="input"
          placeholder="e.g. I tracked every minute of my day for 30 days"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />
        <button
          onClick={generate}
          disabled={loading || !idea.trim()}
          className="btn-primary mt-3 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : <Send size={15} />}
          Generate 3 Pairings
        </button>
      </div>

      {loading && (
        <div className="text-center text-brand-muted py-12">
          <div className="w-8 h-8 border-2 border-brand-border border-t-brand-red rounded-full animate-spin mx-auto mb-3" />
          Generating pairings...
        </div>
      )}

      <div className="space-y-4">
        {pairings.map((p, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">
                Pairing {i + 1}
              </span>
              {p.linting && <div className="w-4 h-4 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />}
              {p.lint && <LintBadge pass={p.lint.overall.pass} issues={p.lint.all_issues} warnings={p.lint.all_warnings} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="label">Title</div>
                <div className="bg-[#111] rounded-lg p-3 text-sm font-medium">
                  {p.title}
                  <div className="text-xs text-brand-muted mt-1">{p.title.length} chars</div>
                </div>
              </div>
              <div>
                <div className="label">Thumbnail</div>
                <div className="bg-[#111] rounded-lg p-3 text-sm">
                  <div className="font-mono font-bold text-brand-red mb-1">{p.thumbText || "(visual only)"}</div>
                  <div className="text-brand-muted text-xs">{p.thumbConcept}</div>
                </div>
              </div>
            </div>

            {p.lint && (p.lint.all_issues.length > 0 || p.lint.all_warnings.length > 0) && (
              <div className="space-y-1 pt-3 border-t border-brand-border">
                {p.lint.all_issues.map((issue, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-red-400">
                    <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                    {issue}
                  </div>
                ))}
                {p.lint.all_warnings.map((warn, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-yellow-400">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                    {warn}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
