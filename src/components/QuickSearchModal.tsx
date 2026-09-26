"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Hash,
  ArrowRight,
  Flame,
  Sparkles,
  Clock,
  Wallet,
  Bookmark,
  ShieldCheck,
  PenSquare,
  X,
  CornerDownLeft,
} from "lucide-react";

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Handle escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  const handleSelect = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanQuery) return;

    if (cleanQuery.startsWith("@")) {
      handleSelect(`/@${cleanQuery.replace("@", "")}`);
    } else if (cleanQuery.startsWith("#")) {
      handleSelect(`/tag/${cleanQuery.replace("#", "")}`);
    } else {
      // If it looks like a single tag/topic, go to tag feed
      handleSelect(`/tag/${cleanQuery}`);
    }
  };

  const navigationShortcuts = [
    { label: "Trending Feed", path: "/", icon: Flame, color: "text-orange-400" },
    { label: "Hot Feed", path: "/hot", icon: Sparkles, color: "text-amber-400" },
    { label: "Newest Posts", path: "/new", icon: Clock, color: "text-blue-400" },
    { label: "Saved Reading List", path: "/bookmarks", icon: Bookmark, color: "text-purple-400" },
    { label: "Witness Governance", path: "/witnesses", icon: ShieldCheck, color: "text-indigo-400" },
    { label: "SteemPad Wallet", path: "/wallet", icon: Wallet, color: "text-emerald-400" },
    { label: "Create New Post", path: "/submit", icon: PenSquare, color: "text-cyan-400" },
  ];

  const filteredShortcuts = navigationShortcuts.filter((s) =>
    s.label.toLowerCase().includes(cleanQuery)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-100">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <form
          onSubmit={handleFormSubmit}
          className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 bg-zinc-950/60"
        >
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tags, authors (@username), or pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              ESC
            </kbd>
          )}
        </form>

        {/* Dynamic Action Suggestions */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {cleanQuery && (
            <div className="space-y-1 pb-2 border-b border-zinc-800/80 mb-2">
              {/* Go to user profile */}
              <button
                onClick={() =>
                  handleSelect(`/@${cleanQuery.replace(/^[@#]/, "")}`)
                }
                className="w-full p-2.5 rounded-xl hover:bg-zinc-800/70 text-left flex items-center justify-between text-xs text-zinc-200 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <span>
                    View Author Profile:{" "}
                    <strong className="text-white">
                      @{cleanQuery.replace(/^[@#]/, "")}
                    </strong>
                  </span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition" />
              </button>

              {/* Go to tag */}
              <button
                onClick={() =>
                  handleSelect(`/tag/${cleanQuery.replace(/^[@#]/, "")}`)
                }
                className="w-full p-2.5 rounded-xl hover:bg-zinc-800/70 text-left flex items-center justify-between text-xs text-zinc-200 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <span>
                    Explore Tag Feed:{" "}
                    <strong className="text-white">
                      #{cleanQuery.replace(/^[@#]/, "")}
                    </strong>
                  </span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition" />
              </button>
            </div>
          )}

          {/* Quick Navigation Items */}
          <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Quick Navigation
          </div>
          {filteredShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleSelect(item.path)}
                className="w-full p-2.5 rounded-xl hover:bg-zinc-800/70 text-left flex items-center justify-between text-xs text-zinc-300 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition" />
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="px-5 py-2.5 bg-zinc-950/80 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Tip: Prefix with @ for users or # for tags</span>
          <span className="flex items-center gap-1">
            <span>Press</span>
            <kbd className="font-mono bg-zinc-800 px-1 rounded text-zinc-400">↵</kbd>
            <span>to select</span>
          </span>
        </div>
      </div>
    </div>
  );
}
