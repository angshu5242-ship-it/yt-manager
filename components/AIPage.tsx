"use client";

import { useState } from "react";
import { Send, Copy, CheckCheck, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { LucideIcon } from "lucide-react";

interface AIPageProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  skill: string;
  inputLabel: string;
  inputPlaceholder: string;
  multiline?: boolean;
  rows?: number;
  buttonText?: string;
  extraInputs?: React.ReactNode;
  buildPrompt?: (input: string) => string;
}

export function AIPage({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  skill,
  inputLabel,
  inputPlaceholder,
  multiline = false,
  rows = 4,
  buttonText = "Generate",
  extraInputs,
  buildPrompt,
}: AIPageProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getModel = () =>
    document.querySelector("[data-model]")?.getAttribute("data-model") || "gemini-1.5-flash";

  const generate = async () => {
    if (!input.trim()) { toast.error("Enter some input first"); return; }
    setLoading(true);
    setOutput("");
    try {
      const prompt = buildPrompt ? buildPrompt(input) : input;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: getModel(), skill }),
      });
      if (!res.ok) throw new Error("Request failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setOutput(full);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-brand-muted text-sm">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div>
            <label className="label">{inputLabel}</label>
            {multiline ? (
              <textarea
                className="textarea"
                rows={rows}
                placeholder={inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            ) : (
              <input
                className="input"
                placeholder={inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
            )}
          </div>
          {extraInputs}
          <button
            onClick={generate}
            disabled={loading || !input.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Send size={15} />}
            {loading ? "Generating..." : buttonText}
          </button>
        </div>

        <div className="card flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Output</span>
            {output && (
              <div className="flex gap-2">
                <button onClick={() => setOutput("")} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                  <RotateCcw size={11} /> Clear
                </button>
                <button onClick={copy} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                  {copied ? <CheckCheck size={11} className="text-green-400" /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {output ? (
              <pre className={`text-sm leading-relaxed whitespace-pre-wrap text-gray-200 ${loading ? "cursor-blink" : ""}`}>
                {output}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
                    Working...
                  </div>
                ) : "Your output will appear here"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
