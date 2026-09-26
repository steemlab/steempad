"use client";

import Link from "next/link";
import { timeAgo, getReputation } from "@/lib/steem";
import { estimateReadTime } from "@/lib/currency";
import { useCurrency } from "@/context/CurrencyContext";
import { useState, useEffect } from "react";
import VoteButton from "./VoteButton";
import TipModal from "./TipModal";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { MessageSquare, Clock, Coins, Bookmark } from "lucide-react";
import { cleanExcerpt } from "@/lib/renderMarkdown";

interface Post {
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
  author_reputation: number;
}

export default function PostCard({ post }: { post: Post }) {
  const [imgError, setImgError] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { format } = useCurrency();

  // Extract thumbnail and deduplicate tags from json_metadata
  let thumbnail: string | null = null;
  let tags: string[] = [];
  try {
    const meta = JSON.parse(post.json_metadata || "{}");
    thumbnail = meta?.image?.[0] ?? null;
    const rawTags = (meta?.tags || []) as unknown[];
    const cleaned = rawTags
      .map((t) => String(t || "").trim().replace(/^#+/, ""))
      .filter((t) => t.length > 0);
    tags = Array.from(new Set(cleaned)).slice(0, 3);
  } catch {}

  const rawPayout = parseFloat(post.pending_payout_value || "0");
  const formattedPayout = format(rawPayout);
  const rep = getReputation(post.author_reputation);
  const readTime = estimateReadTime(post.body || "");

  // Clean plain-text body snippet
  const preview = cleanExcerpt(post.body || "", 170);

  useEffect(() => {
    setSaved(isBookmarked(post.author, post.permlink));
  }, [post.author, post.permlink]);

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextSaved = toggleBookmark({
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      preview: preview,
      thumbnail: thumbnail,
      created: post.created,
      net_votes: post.net_votes,
      payout: formattedPayout,
    });
    setSaved(nextSaved);
  };

  return (
    <>
      <article className="bg-gray-900 border border-gray-800/80 hover:border-gray-700/80 rounded-2xl p-5 transition group shadow-xs">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Optional Thumbnail */}
          {thumbnail && !imgError && (
            <Link
              suppressHydrationWarning
              href={`/@${post.author}/${post.permlink}`}
              className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-gray-800 shrink-0 block relative order-last sm:order-first"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt={post.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
            </Link>
          )}

          <div className="flex-1 min-w-0 w-full">
            {/* Author info & timestamp */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link
                suppressHydrationWarning
                href={`/@${post.author}`}
                className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                  {post.author[0].toUpperCase()}
                </div>
                <span className="font-semibold text-gray-300">@{post.author}</span>
                <span className="text-gray-500 text-[10px]">({rep})</span>
              </Link>
              <span className="text-gray-600 text-xs">·</span>
              <span
                suppressHydrationWarning
                className="text-gray-500 text-xs"
              >
                {timeAgo(post.created)}
              </span>
              <span className="text-gray-600 text-xs hidden sm:inline">·</span>
              <span className="text-gray-500 text-[11px] hidden sm:flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span>{readTime}</span>
              </span>
            </div>

            {/* Title */}
            <Link
              suppressHydrationWarning
              href={`/@${post.author}/${post.permlink}`}
            >
              <h2 className="font-bold text-white text-base sm:text-lg leading-snug group-hover:text-blue-400 transition-colors line-clamp-2 mb-1.5">
                {post.title || "(Untitled)"}
              </h2>
            </Link>

            {/* Preview */}
            {preview && (
              <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-3 leading-relaxed">
                {preview}
              </p>
            )}

            {/* Tags & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, idx) => (
                    <Link
                      key={`${tag}-${idx}`}
                      suppressHydrationWarning
                      href={`/tag/${tag}`}
                      className="text-[11px] bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white px-2.5 py-0.5 rounded-full transition"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : <div />}

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <VoteButton
                  author={post.author}
                  permlink={post.permlink}
                  initialVotes={post.net_votes}
                  compact
                />

                {/* 1-Click Tip Trigger */}
                <button
                  type="button"
                  onClick={() => setTipModalOpen(true)}
                  className="flex items-center gap-1 text-gray-500 hover:text-amber-400 transition cursor-pointer"
                  title={`Tip @${post.author} with STEEM/SBD`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Tip</span>
                </button>

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`flex items-center gap-1 transition cursor-pointer ${
                    saved
                      ? "text-purple-400"
                      : "text-gray-500 hover:text-purple-400"
                  }`}
                  title={saved ? "Saved in Reading List" : "Bookmark Article"}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-purple-400" : ""}`} />
                </button>

                <Link
                  suppressHydrationWarning
                  href={`/@${post.author}/${post.permlink}`}
                  className="flex items-center gap-1.5 hover:text-gray-300 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{post.children}</span>
                </Link>

                <span className="text-emerald-400 font-semibold text-xs tracking-tight">
                  {formattedPayout}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Tip Modal */}
      <TipModal
        recipient={post.author}
        permlink={post.permlink}
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
      />
    </>
  );
}
