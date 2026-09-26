"use client";

import { useState } from "react";
import Link from "next/link";
import VoteButton from "./VoteButton";
import TipModal from "./TipModal";
import { timeAgo, getReputation } from "@/lib/steem";
import { estimateReadTime } from "@/lib/currency";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { submitCommentWithSteemKeychain } from "@/lib/keychain";
import {
  Clock,
  Share2,
  Sparkles,
  MessageSquare,
  Check,
  ChevronRight,
  Send,
  RefreshCw,
  AlertCircle,
  Coins,
  Bookmark,
} from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { useEffect } from "react";
import { renderSteemMarkdown, cleanExcerpt } from "@/lib/renderMarkdown";
import VotersPanel from "./VotersPanel";
import TranslateButton from "./TranslateButton";


interface ActiveVote {
  percent: number;
  reputation: number | string;
  rshares: string | number;
  time: string;
  voter: string;
  weight: number;
}

interface PostData {
  title: string;
  author: string;
  permlink: string;
  body: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
  total_payout_value?: string;
  curator_payout_value?: string;
  author_reputation: number;
  json_metadata: string;
  active_votes: ActiveVote[];
}

interface CommentData {
  author: string;
  permlink?: string;
  body: string;
  created: string;
  net_votes?: number;
}

function extractSummaryBullets(raw: string): string[] {
  const cleanText = cleanExcerpt(raw || "", 3000);
  if (!cleanText || cleanText.length < 50) {
    return ["This post is too short for an AI summary."];
  }

  const allSentences = cleanText
    .split(/(?<=[.?!。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);

  if (allSentences.length === 0) {
    return ["Could not extract key points from this article."];
  }

  const scored = allSentences.map((sentence, idx) => {
    let score = 0;
    const positionRatio = idx / allSentences.length;
    if (positionRatio < 0.15) score += 4;
    else if (positionRatio < 0.3) score += 2;

    if (sentence.length >= 60 && sentence.length <= 180) score += 3;
    else if (sentence.length >= 40 && sentence.length <= 250) score += 1;

    if (/\d+[\.\,]?\d*\s*(%|STEEM|SBD|SP|USD|percent)/i.test(sentence)) score += 3;
    if (/\d{2,}/.test(sentence)) score += 1;

    if (/\b(should|must|need|important|recommend|suggest|propose|conclude|therefore|result|because|improve|change|add|create|implement)\b/i.test(sentence)) score += 2;

    if (/\b(thank|regards|hello|dear|welcome|subscribe|follow|upvote|resteem|share this|click here|join us)\b/i.test(sentence)) score -= 5;
    if (/^(CC:|cc:|Image source|Source:|Photo|Posted via|Originally published)/i.test(sentence)) score -= 5;

    if (/\b(I hope|I wish|I think|In my opinion)\b/i.test(sentence) && sentence.length < 60) score -= 1;

    return { sentence, score, idx };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  for (const item of scored) {
    if (selected.length >= 4) break;

    const isDuplicate = selected.some((existing) => {
      const shorter = Math.min(existing.length, item.sentence.length);
      const overlap = existing.toLowerCase().includes(item.sentence.toLowerCase().slice(0, shorter * 0.5));
      return overlap;
    });

    if (!isDuplicate && item.score > 0) {
      selected.push(item.sentence);
    }
  }

  const orderedBullets = selected
    .map((s) => ({ s, idx: allSentences.indexOf(s) }))
    .sort((a, b) => a.idx - b.idx)
    .map(({ s }) => s);

  return orderedBullets.length > 0
    ? orderedBullets
    : ["This article covers topics specific to the Steem community."];
}

export default function PostDetailView({
  post,
  comments: initialComments,
  bodyHtml,
}: {
  post: PostData;
  comments: CommentData[];
  bodyHtml: string;
}) {
  const { user, isLoggedIn } = useAuth();
  const { format } = useCurrency();

  const [comments, setComments] = useState<CommentData[]>(initialComments || []);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState<string[]>([]);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);

  // Micro-tipping modal state
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [tipTarget, setTipTarget] = useState(post.author);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(post.author, post.permlink));
  }, [post.author, post.permlink]);

  // When post is translated, automatically update summary if it was generated
  useEffect(() => {
    if (summaryBullets.length > 0 || showSummary) {
      const source = translatedBody || post.body || "";
      setSummaryBullets(extractSummaryBullets(source));
    }
  }, [translatedBody]);

  const pending = parseFloat(post.pending_payout_value || "0");
  const authorPaid = parseFloat(post.total_payout_value || "0");
  const curatorPaid = parseFloat(post.curator_payout_value || "0");
  const isPaidOut = pending === 0 && (authorPaid > 0 || curatorPaid > 0);
  const totalPayout = isPaidOut ? authorPaid + curatorPaid : pending;
  const curatorPayout = isPaidOut ? curatorPaid : pending * 0.5;
  const formattedPayout = format(totalPayout);

  const rep = getReputation(post.author_reputation);
  const readTime = estimateReadTime(post.body || "");

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGenerateSummary = () => {
    if (summaryBullets.length > 0) {
      setShowSummary(!showSummary);
      return;
    }

    const source = translatedBody || post.body || "";
    setSummaryBullets(extractSummaryBullets(source));
    setShowSummary(true);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      setCommentError("Please log in with Steem Keychain to reply.");
      return;
    }

    if (!newComment.trim()) {
      setCommentError("Please enter your reply.");
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const res = await submitCommentWithSteemKeychain(
        user.username,
        post.author,
        post.permlink,
        newComment.trim()
      );

      if (res.success) {
        const added: CommentData = {
          author: user.username,
          body: newComment.trim(),
          created: new Date().toISOString().replace(/\.\d+Z$/, ""),
          net_votes: 0,
        };
        setComments([added, ...comments]);
        setNewComment("");
      } else {
        setCommentError(res.message || res.error || "Failed to post comment.");
      }
    } catch {
      setCommentError("Failed to broadcast comment to Steem.");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      {/* Top Card: Post Title & Metadata */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Author row & action tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-800/80">
          <Link
            suppressHydrationWarning
            href={`/@${post.author}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition">
              {post.author.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-200 group-hover:text-blue-400 text-sm transition">
                @{post.author}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span>Rep: {rep}</span>
                <span>·</span>
                <span suppressHydrationWarning>{timeAgo(post.created)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span>{readTime}</span>
                </span>
              </div>
            </div>
          </Link>

          {/* Action buttons (Tip, AI Summary & Share) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Quick Tip Button */}
            <button
              onClick={() => {
                setTipTarget(post.author);
                setTipModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Tip author with STEEM or SBD"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Tip</span>
            </button>

            <button
              onClick={handleGenerateSummary}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showSummary
                  ? "bg-purple-950/60 border-purple-800 text-purple-300"
                  : "bg-gray-800/80 hover:bg-gray-800 border-gray-700/60 text-gray-300 hover:text-white"
              }`}
              title="Instant AI TL;DR summary"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI TL;DR</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white transition cursor-pointer"
              title="Copy share link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => {
                const next = toggleBookmark({
                  author: post.author,
                  permlink: post.permlink,
                  title: post.title,
                  preview: cleanExcerpt(post.body || "", 170),
                  created: post.created,
                  net_votes: post.net_votes,
                  payout: formattedPayout,
                });
                setSaved(next);
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                saved
                  ? "bg-purple-950/60 border-purple-800 text-purple-400"
                  : "bg-gray-800/80 hover:bg-gray-800 border-gray-700/60 text-gray-300 hover:text-white"
              }`}
              title={saved ? "Saved in Reading List" : "Bookmark Article"}
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-purple-400" : ""}`} />
            </button>
          </div>

        </div>

        {/* AI TL;DR Box (if toggled) */}
        {showSummary && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/30 border border-purple-800/60 text-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                Key Takeaways (AI Briefing)
                {translatedBody && " · English"}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-300">
              {summaryBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Article Body with Integrated Auto-Translate */}
        <TranslateButton
          originalMarkdown={post.body || ""}
          defaultBodyHtml={bodyHtml}
          jsonMetadata={post.json_metadata}
          onTranslatedTextChange={setTranslatedBody}
        />

        {/* Action bar / Upvote / Tip / Payout */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/80">
          <div className="flex items-center gap-2">
            <VoteButton
              author={post.author}
              permlink={post.permlink}
              initialVotes={post.net_votes}
            />

            {/* Tip Author in action bar */}
            <button
              onClick={() => {
                setTipTarget(post.author);
                setTipModalOpen(true);
              }}
              className="px-3 py-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Tip author with STEEM or SBD"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Tip Author</span>
            </button>

            <span className="text-xs text-gray-500 flex items-center gap-1.5 ml-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{comments.length} comments</span>
            </span>
          </div>

          <div className="text-right">
            <div className="text-emerald-400 font-extrabold text-lg">
              {formattedPayout}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              {isPaidOut ? "Past Rewards" : "Pending Payout"}
            </div>
          </div>
        </div>

        {/* Voters, Vote Weights & Curation Rewards Breakdown */}
        <VotersPanel
          activeVotes={post.active_votes || []}
          totalPayoutValue={totalPayout}
          curatorPayoutValue={curatorPayout}
        />
      </div>

      {/* Interactive Comments Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <span>Comments ({comments.length})</span>
        </h2>

        {/* New Reply Box */}
        {isLoggedIn && user ? (
          <form onSubmit={handlePostReply} className="space-y-3">
            {commentError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{commentError}</span>
              </div>
            )}
            <textarea
              rows={3}
              placeholder={`Write a thoughtful reply to @${post.author}...`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs sm:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                {submittingComment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting to Steem…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
            <span>Sign in with Steem Keychain to join the discussion.</span>
            <Link
              suppressHydrationWarning
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3.5 pt-2">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm italic py-4 text-center">
              No replies yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((c, i) => (
              <div
                key={i}
                className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link
                    suppressHydrationWarning
                    href={`/@${c.author}`}
                    className="font-semibold text-xs text-blue-400 hover:underline"
                  >
                    @{c.author}
                  </Link>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setTipTarget(c.author);
                        setTipModalOpen(true);
                      }}
                      className="text-gray-500 hover:text-amber-400 text-xs flex items-center gap-1 transition cursor-pointer"
                      title={`Tip @${c.author}`}
                    >
                      <Coins className="w-3 h-3 text-amber-400/80" />
                      <span>Tip</span>
                    </button>

                    <span
                      suppressHydrationWarning
                      className="text-gray-600 text-xs"
                    >
                      {timeAgo(c.created)}
                    </span>
                  </div>
                </div>
                <div
                  className="steem-content text-gray-300 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderSteemMarkdown(c.body || ""),
                  }}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Global Tip Modal */}
      <TipModal
        recipient={tipTarget}
        permlink={post.permlink}
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
      />
    </article>
  );
}
