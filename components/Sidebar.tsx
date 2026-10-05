"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  Youtube, LayoutDashboard, Zap, Package, Scissors,
  TrendingUp, BarChart3, Upload, Calendar, LogOut,
  Settings, ChevronRight, Sparkles, MessageSquare,
  BookOpen, Search
} from "lucide-react";
import { useState } from "react";
import { MODELS, ModelId } from "@/lib/ai/router";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/script", icon: Zap, label: "Script + Hook Score", badge: "AI" },
  { href: "/dashboard/package", icon: Package, label: "Title + Thumbnail", badge: "AI" },
  { href: "/dashboard/edit", icon: Scissors, label: "Edit Decision List", badge: "AI" },
  { href: "/dashboard/viral", icon: TrendingUp, label: "Viral Research", badge: "AI" },
  { href: "/dashboard/retention", icon: BarChart3, label: "Retention Analyzer" },
  { href: "/dashboard/comment", icon: MessageSquare, label: "Comment Manager", badge: "AI" },
  { href: "/dashboard/plan", icon: Calendar, label: "Content Planner", badge: "AI" },
  { href: "/dashboard/seo", icon: Search, label: "SEO + Description", badge: "AI" },
  { href: "/dashboard/chapters", icon: BookOpen, label: "Chapters", badge: "AI" },
  { href: "/dashboard/publish", icon: Upload, label: "Publish to YouTube" },
];

export function Sidebar({
  selectedModel,
  onModelChange,
}: {
  selectedModel: ModelId;
  onModelChange: (m: ModelId) => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 bg-brand-card border-r border-brand-border transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      } flex-shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-brand-border">
        <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
          <Youtube size={16} className="text-white" />
        </div>
        {!collapsed && <span className="font-bold text-sm">YT Manager</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-brand-muted hover:text-white transition-colors"
        >
          <ChevronRight
            size={16}
            className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* Model Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-brand-border">
          <label className="label">AI Model</label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value as ModelId)}
            className="input text-xs py-1.5"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.free ? "✓ Free" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-all duration-150 group ${
                active
                  ? "bg-brand-red/10 text-brand-red"
                  : "text-brand-muted hover:text-white hover:bg-brand-border"
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {badge && (
                    <span className="badge bg-brand-red/20 text-brand-red text-[10px]">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-brand-border p-3">
        {session?.user && (
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={32}
                height={32}
                className="rounded-full flex-shrink-0"
              />
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{session.user.name}</div>
                <div className="text-[10px] text-brand-muted truncate">{session.user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-brand-muted hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
