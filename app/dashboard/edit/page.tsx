"use client";

import { useState } from "react";
import { Scissors, Upload, Send } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

interface EDLItem {
  timecode: string;
  type: "DEAD_AIR" | "FILLER" | "RETAKE";
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface EDLResult {
  summary: { total_flags: number; dead_air: number; filler_words: number; retakes: number };
  edl: EDLItem[];
}

const TYPE_COLORS = {
  DEAD_AIR: "text-red-400 bg-red-400/10",
  FILLER: "text-yellow-400 bg-yellow-400/10",
  RETAKE: "text-orange-400 bg-orange-400/10",
};

export default function EditPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<EDLResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const getModel = () =>
    document.querySelector("[data-model]")?.getAttribute("data-model") || "gemini-1.5-flash";

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setTranscript(e.target?.result as string || "");
        reader.readAsText(file);
      }
    },
    accept: { "text/plain": [".txt", ".srt", ".vtt"] },
    maxFiles: 1,
    noClick: transcript.length > 0,
  });

  const analyze = async () => {
    if (!transcript.trim()) { toast.error("Paste or upload a transcript"); return; }
    setLoading(true);
    setResult(null);
    setAiAnalysis("");
    try {
      const res = await fetch("/api/tools/deadair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      // AI suggestions
      const aiRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Based on this transcript, provide edit suggestions and pacing notes.",
          model: getModel(),
          skill: "yt-edit",
          context: transcript.slice(0, 3000),
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
    }
  };

  const filteredEDL = result?.edl.filter(
    (item) => !activeFilter || item.type === activeFilter
  ) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-purple-400/10 flex items-center justify-center">
          <Scissors size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Edit Decision List</h1>
          <p className="text-brand-muted text-sm">
            Paste or upload your transcript. Dead air, filler, retakes flagged with timecodes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="card">
            <label className="label">Transcript (SRT, VTT, or plain text)</label>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <textarea
                className="textarea"
                rows={12}
                placeholder={isDragActive ? "Drop it here..." : "Paste your transcript or SRT file here, or drag & drop a file..."}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={analyze}
              disabled={loading || !transcript.trim()}
              className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
              Generate Edit List
            </button>
          </div>

          {aiAnalysis && (
            <div className="card">
              <div className="section-title">AI Edit Notes</div>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap text-gray-200">
                {aiAnalysis}
              </pre>
            </div>
          )}
        </div>

        {/* EDL Output */}
        <div>
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Dead Air", count: result.summary.dead_air, type: "DEAD_AIR", color: "text-red-400" },
                  { label: "Filler", count: result.summary.filler_words, type: "FILLER", color: "text-yellow-400" },
                  { label: "Retakes", count: result.summary.retakes, type: "RETAKE", color: "text-orange-400" },
                ].map(({ label, count, type, color }) => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                    className={`card text-center cursor-pointer transition-all ${activeFilter === type ? "border-brand-red" : "hover:border-brand-border/80"}`}
                  >
                    <div className={`text-2xl font-bold ${color}`}>{count}</div>
                    <div className="text-xs text-brand-muted">{label}</div>
                  </button>
                ))}
              </div>

              {/* EDL */}
              <div className="card">
                <div className="section-title">
                  Edit Decision List
                  {activeFilter && (
                    <button onClick={() => setActiveFilter(null)} className="ml-2 text-xs text-brand-muted hover:text-white">
                      (clear filter)
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredEDL.length === 0 && (
                    <div className="text-brand-muted text-sm text-center py-4">
                      No flags in this category
                    </div>
                  )}
                  {filteredEDL.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-brand-border last:border-0">
                      <div className="font-mono text-xs text-brand-red w-20 flex-shrink-0">
                        {item.timecode}
                      </div>
                      <span className={`badge ${TYPE_COLORS[item.type]} flex-shrink-0`}>
                        {item.type.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-300">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="card flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-brand-muted">
                <div className="w-8 h-8 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
                Scanning transcript...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
