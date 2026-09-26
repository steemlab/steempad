"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getBookmarks,
  removeBookmark,
  clearAllBookmarks,
  BookmarkedPost,
} from "@/lib/bookmarks";
import { timeAgo } from "@/lib/steem";
import {
  Bookmark,
  Trash2,
  ExternalLink,
  BookOpen,
  Search,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  const load = () => {
    setBookmarks(getBookmarks());
  };

  useEffect(() => {
    setMounted(true);
    load();

    const handleUpdate = () => load();
    window.addEventListener("steempad_bookmarks_updated", handleUpdate);
    return () => window.removeEventListener("steempad_bookmarks_updated", handleUpdate);
  }, []);

  const handleRemove = (author: string, permlink: string) => {
    removeBookmark(author, permlink);
    load();
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear your saved reading list?")) {
      clearAllBookmarks();
      load();
    }
  };

  const filtered = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-purple-400 fill-purple-400/20" />
            <span>Saved Reading List</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Articles bookmarked for offline and distraction-free reading.
          </p>
        </div>

        {mounted && bookmarks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 hover:border-red-900/50 hover:bg-red-950/30 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear List</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Filter */}
      {mounted && bookmarks.length > 1 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search saved articles by title, author, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      )}

      {/* Bookmarks List */}
      {!mounted ? (
        <div className="p-12 text-center text-gray-500 text-sm">
          Loading saved reading list…
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Your reading list is empty</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              When exploring trending and new posts on SteemPad, click the bookmark ribbon icon on any post to save it here.
            </p>
          </div>
          <Link
            suppressHydrationWarning
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
          >
            <span>Explore Trending Articles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center text-xs text-gray-500">
          No saved articles match &quot;{search}&quot;.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((b) => (
            <div
              key={`${b.author}-${b.permlink}`}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700/80 rounded-2xl p-5 transition group shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                {/* Author and Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 flex-wrap">
                  <Link
                    suppressHydrationWarning
                    href={`/@${b.author}`}
                    className="font-semibold text-gray-300 hover:text-blue-400 transition"
                  >
                    @{b.author}
                  </Link>
                  <span>·</span>
                  <span suppressHydrationWarning>Published {timeAgo(b.created)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Saved {timeAgo(new Date(b.savedAt).toISOString())}</span>
                  </span>
                </div>

                {/* Title */}
                <Link
                  suppressHydrationWarning
                  href={`/@${b.author}/${b.permlink}`}
                >
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition leading-snug mb-2">
                    {b.title}
                  </h3>
                </Link>

                {/* Preview */}
                {b.preview && (
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                    {b.preview}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="text-emerald-400 font-semibold">{b.payout}</span>
                  <span>·</span>
                  <span>{b.net_votes} upvotes</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-2 self-stretch sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/80">
                <Link
                  suppressHydrationWarning
                  href={`/@${b.author}/${b.permlink}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Read</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleRemove(b.author, b.permlink)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-xl hover:bg-gray-800 transition cursor-pointer"
                  title="Remove from saved reading list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
