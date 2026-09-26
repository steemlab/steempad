"use client";

import Link from "next/link";
import { Flame, Sparkles, Clock } from "lucide-react";

const tabs = [
  { label: "Trending", href: "/", key: "trending", icon: Flame, color: "text-orange-400" },
  { label: "Hot", href: "/hot", key: "hot", icon: Sparkles, color: "text-amber-400" },
  { label: "Newest", href: "/new", key: "new", icon: Clock, color: "text-blue-400" },
];

export default function FeedTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Feed Mode"
      className="inline-flex p-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-xs font-medium"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            suppressHydrationWarning
            href={tab.href}
            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              isActive
                ? "bg-zinc-800 text-white font-semibold shadow-xs border border-white/[0.06]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : "text-zinc-400"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
