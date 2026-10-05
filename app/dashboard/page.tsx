"use client";

import Link from "next/link";
import { Zap, Package, Scissors, TrendingUp, BarChart3, Upload, Calendar, MessageSquare, BookOpen, Search, ArrowRight } from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/script",
    icon: Zap,
    label: "Script + Hook Score",
    desc: "Write your script and score the hook before you film.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    badge: "Most Used",
  },
  {
    href: "/dashboard/package",
    icon: Package,
    label: "Title + Thumbnail",
    desc: "Generate paired title and thumbnail ideas. Linted for duplication.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    href: "/dashboard/edit",
    icon: Scissors,
    label: "Edit Decision List",
    desc: "Paste your transcript. Get dead air, filler cues, and retakes flagged with timecodes.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    href: "/dashboard/viral",
    icon: TrendingUp,
    label: "Viral Research",
    desc: "Find what's working in your niche ranked by channel multiple.",
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    href: "/dashboard/retention",
    icon: BarChart3,
    label: "Retention Analyzer",
    desc: "Upload your YouTube Studio retention export. Find where viewers leave.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    href: "/dashboard/comment",
    icon: MessageSquare,
    label: "Comment Manager",
    desc: "Triage comments into 4 piles, get replies written in your voice.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    href: "/dashboard/plan",
    icon: Calendar,
    label: "Weekly Planner",
    desc: "One anchor, one cheap video, three Shorts — built around your actual hours.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    href: "/dashboard/seo",
    icon: Search,
    label: "SEO + Description",
    desc: "Description, tags worth having, and the 3 queries this video should win.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    href: "/dashboard/chapters",
    icon: BookOpen,
    label: "Chapters",
    desc: "Validated chapters from your transcript. Guaranteed to render on YouTube.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    href: "/dashboard/publish",
    icon: Upload,
    label: "Publish to YouTube",
    desc: "Push titles, chapters, and comment replies to your live channel via YouTube API.",
    color: "text-brand-red",
    bg: "bg-brand-red/10",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-brand-muted">
          Pick a tool. Nothing publishes until you approve it.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TOOLS.map(({ href, icon: Icon, label, desc, color, bg, badge }) => (
          <Link
            key={href}
            href={href}
            className="card group hover:border-brand-red/50 transition-all duration-200 hover:shadow-lg hover:shadow-brand-red/5 flex flex-col"
          >
            <div className="flex items-start gap-4 mb-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{label}</span>
                  {badge && (
                    <span className="badge bg-brand-red/20 text-brand-red text-[10px]">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-brand-muted text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-1 text-brand-red text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Info banner */}
      <div className="mt-8 card bg-[#0a1a0a] border-green-800/50">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
          <div>
            <p className="text-sm font-medium text-green-400">Nothing publishes without your approval</p>
            <p className="text-xs text-brand-muted mt-1">
              Every tool generates content for you to review. Use the Publish page to push
              approved content to YouTube via the official API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
