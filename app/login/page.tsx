"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Youtube, Sparkles, Zap, BarChart3, Video } from "lucide-react";

const features = [
  { icon: Zap, label: "Hook Scorer", desc: "Score your first 15 seconds before you film" },
  { icon: Video, label: "Script Writer", desc: "21 hook formulas → full script in your voice" },
  { icon: BarChart3, label: "Retention Analyzer", desc: "Find exactly where viewers drop off" },
  { icon: Sparkles, label: "Viral Research", desc: "What's working in your niche right now" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-brand-dark flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#1a0000] via-brand-dark to-brand-dark border-r border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
            <Youtube size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold">YT Manager</span>
        </div>

        <div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Run your channel
            <br />
            <span className="text-brand-red">with AI.</span>
          </h1>
          <p className="text-brand-muted text-lg mb-10 max-w-md">
            Write scripts, score hooks, diagnose retention, research viral niches,
            and publish — all from one platform. Free models included.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-brand-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={16} className="text-brand-red" />
                </div>
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-brand-muted text-sm">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-brand-muted text-sm">
          MIT licensed · Free models included · Nothing publishes without your approval
        </div>
      </div>

      {/* Right Panel — Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
              <Youtube size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold">YT Manager</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-brand-muted">
              Sign in with Google to access your AI channel manager.
            </p>
          </div>

          <div className="card mb-6">
            <div className="flex items-start gap-3 mb-0">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">YouTube access included</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  Signing in with Google also connects your YouTube channel for publishing.
                  You approve every action before it goes live.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-center text-xs text-brand-muted">
            By signing in, you agree that nothing will be published to your
            channel without your explicit approval.
          </p>

          {/* Model info */}
          <div className="mt-8 pt-6 border-t border-brand-border">
            <p className="text-xs text-brand-muted text-center mb-3">AI models included</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Gemini 1.5 Flash (Free)", "Claude Sonnet", "Mistral 7B (Free)", "Llama 3 (Free)"].map((m) => (
                <span key={m} className="badge bg-brand-border text-brand-muted">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
