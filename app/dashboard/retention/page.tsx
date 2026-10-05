"use client";

import { useState, useCallback } from "react";
import { BarChart3, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

interface RetentionResult {
  summary: { total_data_points: number; video_length: string; average_retention: number; final_retention: number };
  hook_analysis: { grade: string; loss_in_30s: number; start_retention: number; end_retention: number };
  cliffs: { timecode: string; drop_percent: number; retention_before: number; retention_after: number }[];
  slide: { grade: string; loss_percent: number };
  fixes: string[];
}

const HOOK_GRADE_COLORS: Record<string, string> = {
  Strong: "text-green-400",
  OK: "text-yellow-400",
  Weak: "text-orange-400",
  Critical: "text-red-400",
};

export default function RetentionPage() {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<RetentionResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const getModel = () =>
    document.querySelector("[data-model]")?.getAttribute("data-model") || "gemini-1.5-flash";

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setCsvContent(e.target?.result as string);
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const analyze = async () => {
    if (!csvContent) { toast.error("Upload a retention CSV first"); return; }
    setLoading(true);
    setResult(null);
    setAiAnalysis("");
    try {
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: "text/csv" });
      formData.append("file", blob, fileName || "retention.csv");

      const res = await fetch("/api/tools/retention", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      // Get AI analysis
      setLoadingAI(true);
      const aiRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze this retention data and provide specific actionable advice.",
          model: getModel(),
          skill: "yt-retention",
          context: JSON.stringify(data),
        }),
      });
      const reader = aiRes.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setAiAnalysis(full);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setLoadingAI(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-orange-400/10 flex items-center justify-center">
          <BarChart3 size={18} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Retention Analyzer</h1>
          <p className="text-brand-muted text-sm">
            Upload your YouTube Studio retention export. Find exactly where viewers leave.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="card mb-6">
        <label className="label">
          YouTube Studio Retention CSV
          <span className="text-brand-muted ml-2 font-normal">
            (Analytics → Audience Retention → Export)
          </span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-brand-red bg-brand-red/5"
              : "border-brand-border hover:border-brand-red/50"
          }`}
        >
          <input {...getInputProps()} />
          {csvContent ? (
            <div className="flex items-center justify-center gap-3">
              <div className="text-green-400 font-medium text-sm">{fileName}</div>
              <button
                onClick={(e) => { e.stopPropagation(); setCsvContent(null); setFileName(""); setResult(null); }}
                className="text-brand-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto mb-2 text-brand-muted" />
              <p className="text-sm text-brand-muted">
                {isDragActive ? "Drop the CSV here" : "Drag & drop your retention CSV, or click to browse"}
              </p>
            </>
          )}
        </div>
        <button
          onClick={analyze}
          disabled={!csvContent || loading}
          className="btn-primary mt-3 w-full"
        >
          {loading ? "Analyzing..." : "Analyze Retention"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Retention", value: `${result.summary.average_retention}%` },
              { label: "Final Retention", value: `${result.summary.final_retention}%` },
              { label: "Hook Loss (30s)", value: `${result.hook_analysis.loss_in_30s}%`, color: result.hook_analysis.loss_in_30s > 15 ? "text-red-400" : "text-green-400" },
              { label: "Hook Grade", value: result.hook_analysis.grade, color: HOOK_GRADE_COLORS[result.hook_analysis.grade] },
            ].map(({ label, value, color }) => (
              <div key={label} className="card text-center">
                <div className={`text-2xl font-bold ${color || ""}`}>{value}</div>
                <div className="text-xs text-brand-muted mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Cliffs */}
          {result.cliffs.length > 0 && (
            <div className="card">
              <div className="section-title">Major Drop-Off Points</div>
              <div className="space-y-2">
                {result.cliffs.map((cliff, i) => (
                  <div key={i} className="flex items-center gap-4 py-2 border-b border-brand-border last:border-0">
                    <div className="font-mono text-sm text-brand-red w-16">{cliff.timecode}</div>
                    <div className="font-medium text-red-400">{cliff.drop_percent}% drop</div>
                    <div className="text-xs text-brand-muted">
                      {cliff.retention_before}% → {cliff.retention_after}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixes */}
          <div className="card">
            <div className="section-title">Fixes for Next Video</div>
            <div className="space-y-3">
              {result.fixes.map((fix, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-red/20 text-brand-red text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm">{fix}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          {(aiAnalysis || loadingAI) && (
            <div className="card">
              <div className="section-title">AI Analysis</div>
              <pre className={`text-sm leading-relaxed whitespace-pre-wrap text-gray-200 ${loadingAI && !aiAnalysis ? "" : loadingAI ? "cursor-blink" : ""}`}>
                {aiAnalysis || "Analyzing..."}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
