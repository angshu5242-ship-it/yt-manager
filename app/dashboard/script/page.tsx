"use client";

import { useState, useCallback } from "react";
import { Zap, Send, RotateCcw, Copy, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

interface HookScore {
  hook: string;
  total: number;
  grade: string;
  verdict: string;
  breakdown: Record<string, { score: number; max: number; label: string }>;
  word_count: number;
  filler_words_found: number;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-yellow-400",
  C: "text-orange-400",
  D: "text-red-400",
};

const SCORE_BAR_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-yellow-500",
  C: "bg-orange-500",
  D: "bg-red-500",
};

export default function ScriptPage() {
  const [idea, setIdea] = useState("");
  const [hook, setHook] = useState("");
  const [script, setScript] = useState("");
  const [hookScore, setHookScore] = useState<HookScore | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const getModel = () => {
    const el = document.querySelector("[data-model]");
    return el?.getAttribute("data-model") || "gemini-1.5-flash";
  };

  const scoreHook = useCallback(async (hookText: string) => {
    if (!hookText.trim()) return;
    setLoadingScore(true);
    try {
      const res = await fetch("/api/tools/hookscore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook: hookText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHookScore(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to score hook");
    } finally {
      setLoadingScore(false);
    }
  }, []);

  const generateScript = async () => {
    if (!idea.trim()) {
      toast.error("Enter a video idea first");
      return;
    }
    setLoadingScript(true);
    setScript("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Video idea: ${idea}\n\nGenerate hooks and a full script.`,
          model: getModel(),
          skill: "yt-script",
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setScript(full);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Script generation failed");
    } finally {
      setLoadingScript(false);
    }
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center">
          <Zap size={18} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Script + Hook Score</h1>
          <p className="text-brand-muted text-sm">
            21 hook formulas → scored script in your voice
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="card">
            <label className="label">Video Idea</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="e.g. How I went from 0 to 10,000 subscribers in 90 days without posting every day"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <button
              onClick={generateScript}
              disabled={loadingScript || !idea.trim()}
              className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
            >
              {loadingScript ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Generate Script
                </>
              )}
            </button>
          </div>

          {/* Hook Scorer */}
          <div className="card">
            <label className="label">Test Your Hook (first 15 seconds)</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Paste or type your hook here to score it..."
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
            <button
              onClick={() => scoreHook(hook)}
              disabled={loadingScore || !hook.trim()}
              className="btn-secondary w-full mt-3 flex items-center justify-center gap-2"
            >
              {loadingScore ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Score Hook
            </button>

            {/* Score Results */}
            {hookScore && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold">{hookScore.total}</span>
                    <span className="text-brand-muted text-sm">/100</span>
                    <span className={`ml-2 text-2xl font-bold ${GRADE_COLORS[hookScore.grade]}`}>
                      {hookScore.grade}
                    </span>
                  </div>
                  <div className="text-right text-xs text-brand-muted">
                    {hookScore.word_count} words
                    {hookScore.filler_words_found > 0 && (
                      <span className="ml-2 text-orange-400">
                        {hookScore.filler_words_found} filler
                      </span>
                    )}
                  </div>
                </div>
                <p className={`text-sm font-medium ${GRADE_COLORS[hookScore.grade]}`}>
                  {hookScore.verdict}
                </p>
                <div className="space-y-2">
                  {Object.values(hookScore.breakdown).map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-brand-muted">{item.label}</span>
                        <span>{item.score}/{item.max}</span>
                      </div>
                      <div className="score-bar">
                        <div
                          className={`score-fill ${SCORE_BAR_COLORS[hookScore.grade]}`}
                          style={{ width: `${(item.score / item.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Script Output */}
        <div className="card flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-3">
            <span className="section-title mb-0">Generated Script</span>
            <div className="flex gap-2">
              {script && (
                <>
                  <button
                    onClick={() => setScript("")}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Clear
                  </button>
                  <button
                    onClick={copyScript}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    {copied ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {script ? (
              <pre
                className={`text-sm leading-relaxed whitespace-pre-wrap font-mono text-gray-200 ${
                  loadingScript ? "cursor-blink" : ""
                }`}
              >
                {script}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm text-center">
                {loadingScript ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
                    <span>Writing your script...</span>
                  </div>
                ) : (
                  <span>Enter a video idea and click Generate Script</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
