"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAccountNotifications, SteemNotification, timeAgo } from "@/lib/steem";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  Coins,
  Rocket,
  AtSign,
  Share2,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export default function NotificationCenter() {
  const { user, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<SteemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "replies" | "transfers" | "votes">("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTime, setLastReadTime] = useState<number>(0);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [justMarkedRead, setJustMarkedRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = user ? `steempad_last_read_${user.username}` : "";

  // Close dropdown on outside click (mouse or touch) or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Fetch notifications
  useEffect(() => {
    if (!isLoggedIn || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isSubscribed = true;

    async function loadNotifications() {
      if (!user) return;
      setLoading(true);
      try {
        const notifs = await getAccountNotifications(user.username);
        if (!isSubscribed) return;
        setNotifications(notifs);

        // Calculate unread
        const storedLastRead = parseInt(
          localStorage.getItem(`steempad_last_read_${user.username}`) || "0",
          10
        );
        setLastReadTime(storedLastRead);
        const unread = notifs.filter(
          (n) => new Date(n.timestamp + "Z").getTime() > storedLastRead
        ).length;
        setUnreadCount(unread);
      } catch {
        // silent fail
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 45000); // Poll every 45s

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [user, isLoggedIn]);

  const handleMarkAllRead = () => {
    if (!user || isMarkingRead) return;
    setIsMarkingRead(true);

    // Smooth sweep animation before persisting read status
    setTimeout(() => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
      setLastReadTime(now);
      setUnreadCount(0);
      setIsMarkingRead(false);
      setJustMarkedRead(true);
      setTimeout(() => setJustMarkedRead(false), 2200);
    }, 550);
  };

  const handleOpenDropdown = () => {
    setIsOpen(!isOpen);
  };

  if (!isLoggedIn || !user) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "replies") return n.type === "reply" || n.type === "mention";
    if (filter === "transfers") return n.type === "transfer" || n.type === "delegation";
    if (filter === "votes") return n.type === "vote";
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Modernized Tactile Bell Button */}
      <button
        type="button"
        onClick={handleOpenDropdown}
        aria-expanded={isOpen}
        aria-label="Activity Notifications"
        className="relative p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-cyan-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center tabular-nums animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Activity Notifications Panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Activity Radar</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingRead || (unreadCount === 0 && !justMarkedRead)}
                className={`text-[11px] flex items-center gap-1.5 transition-all duration-300 px-2.5 py-1 rounded-xl cursor-pointer ${
                  justMarkedRead
                    ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 font-semibold"
                    : isMarkingRead
                    ? "text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 font-semibold cursor-wait"
                    : unreadCount > 0
                    ? "text-zinc-300 hover:text-cyan-300 hover:bg-zinc-800 border border-zinc-700/60 active:scale-95"
                    : "text-zinc-500 cursor-default opacity-60"
                }`}
                title="Mark all as read"
              >
                <Check
                  className={`w-3.5 h-3.5 transition-all duration-500 ${
                    isMarkingRead
                      ? "animate-spin text-cyan-400 scale-125"
                      : justMarkedRead
                      ? "text-emerald-400 scale-110"
                      : "text-zinc-400"
                  }`}
                />
                <span>
                  {isMarkingRead ? "Marking read…" : justMarkedRead ? "All caught up ✓" : "Mark read"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
                aria-label="Close Notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-zinc-950/80 border-b border-zinc-800/80 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filter === "all"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("replies")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filter === "replies"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Replies
            </button>
            <button
              type="button"
              onClick={() => setFilter("transfers")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filter === "transfers"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Tips & Funds
            </button>
            <button
              type="button"
              onClick={() => setFilter("votes")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filter === "votes"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Upvotes
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Checking Steem blockchain activity…
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No recent activity matching filter.
              </div>
            ) : (
              filteredNotifs.map((n) => {
                const isUnread = new Date(n.timestamp + "Z").getTime() > lastReadTime;
                let icon = <MessageSquare className="w-4 h-4 text-cyan-400" />;
                let link = `/@${n.actor}`;
                if (n.type === "reply") {
                  icon = <MessageSquare className="w-4 h-4 text-cyan-400" />;
                  link = `/@${user.username}/${n.target}`;
                } else if (n.type === "transfer") {
                  icon = <Coins className="w-4 h-4 text-amber-400" />;
                  link = `/wallet`;
                } else if (n.type === "vote") {
                  icon = <Rocket className="w-4 h-4 text-emerald-400" />;
                  link = `/@${user.username}/${n.target}`;
                } else if (n.type === "mention") {
                  icon = <AtSign className="w-4 h-4 text-purple-400" />;
                  link = `/@${n.actor}/${n.permlink}`;
                } else if (n.type === "delegation") {
                  icon = <Share2 className="w-4 h-4 text-indigo-400" />;
                  link = `/wallet`;
                }

                return (
                  <Link
                    key={n.id}
                    href={link}
                    onClick={() => setIsOpen(false)}
                    className={`p-3.5 transition-all duration-500 flex items-start gap-3 block group ${
                      isMarkingRead && isUnread
                        ? "bg-cyan-500/15 scale-[0.98] opacity-75 border-l-2 border-cyan-400"
                        : isUnread
                        ? "bg-zinc-850/60 hover:bg-zinc-800/80 border-l-2 border-cyan-500"
                        : "hover:bg-zinc-800/60 border-l-2 border-transparent"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-zinc-800 group-hover:bg-zinc-700/80 transition shrink-0 mt-0.5 relative">
                      {icon}
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-zinc-900 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-white truncate">
                            @{n.actor}
                          </span>
                          {isUnread && (
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-400 bg-cyan-950/80 px-1 rounded border border-cyan-800/60">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0 tabular-nums ml-2">
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.amount ? (
                          <strong className="text-amber-400 mr-1 tabular-nums font-mono">{n.amount}</strong>
                        ) : null}
                        {n.message}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
