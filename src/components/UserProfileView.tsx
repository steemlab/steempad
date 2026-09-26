"use client";

import { useState } from "react";
import Link from "next/link";
import PostCard from "./PostCard";
import TipModal from "./TipModal";
import { timeAgo, getReputation, vestsToSP } from "@/lib/steem";
import { useAuth } from "@/context/AuthContext";
import { followUserWithSteemKeychain } from "@/lib/keychain";
import {
  Globe,
  MapPin,
  Calendar,
  Clock,
  Coins,
  Share2,
  Check,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  MessageSquare,
  FileText,
  Wallet,
  Sparkles,
} from "lucide-react";
import { renderSteemMarkdown } from "@/lib/renderMarkdown";

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

interface CommentItem {
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  created: string;
  net_votes: number;
  author_reputation: number;
  children: number;
  pending_payout_value: string;
}

interface UserProfileViewProps {
  account: {
    name: string;
    reputation: number;
    post_count: number;
    created: string;
    last_post?: string;
    last_root_post?: string;
    balance: string;
    sbd_balance: string;
    savings_balance?: string;
    savings_sbd_balance?: string;
    vesting_shares: string;
    delegated_vesting_shares: string;
    received_vesting_shares: string;
    voting_power: number;
    last_vote_time: string;
    json_metadata?: string;
    posting_json_metadata?: string;
  };
  posts: Post[];
  comments: CommentItem[];
  followCount: {
    follower_count: number;
    following_count: number;
  };
  globalProps: {
    total_vesting_fund_steem: string;
    total_vesting_shares: string;
  } | null;
}

function formatJoinedDate(createdStr: string): string {
  if (!createdStr) return "";
  try {
    const d = new Date(createdStr + "Z");
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return createdStr;
  }
}

export default function UserProfileView({
  account,
  posts,
  comments,
  followCount,
  globalProps,
}: UserProfileViewProps) {
  const { user, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "wallet">("posts");
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followMsg, setFollowMsg] = useState<string | null>(null);

  // Parse metadata from both posting_json_metadata and json_metadata
  let profileMeta = {
    name: "",
    about: "",
    profile_image: "",
    cover_image: "",
    location: "",
    website: "",
  };

  try {
    if (account.posting_json_metadata) {
      const meta = JSON.parse(account.posting_json_metadata);
      profileMeta = { ...profileMeta, ...(meta?.profile || {}) };
    }
  } catch {}

  try {
    if (account.json_metadata) {
      const meta = JSON.parse(account.json_metadata);
      profileMeta = { ...profileMeta, ...(meta?.profile || {}) };
    }
  } catch {}

  // Clean website link
  let websiteUrl = profileMeta.website?.trim() || "";
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    websiteUrl = `https://${websiteUrl}`;
  }

  // Calculate Steem Power from Dynamic Global Properties
  const ownVests = parseFloat(account.vesting_shares || "0");
  const delegatedVests = parseFloat(account.delegated_vesting_shares || "0");
  const receivedVests = parseFloat(account.received_vesting_shares || "0");
  const effectiveVests = ownVests + receivedVests - delegatedVests;

  const totalSteem = parseFloat(globalProps?.total_vesting_fund_steem || "200000000");
  const totalVests = parseFloat(globalProps?.total_vesting_shares || "320000000000");

  const totalSP = vestsToSP(effectiveVests, totalVests, totalSteem);
  const ownSP = vestsToSP(ownVests, totalVests, totalSteem);
  const delegatedSP = vestsToSP(delegatedVests, totalVests, totalSteem);
  const receivedSP = vestsToSP(receivedVests, totalVests, totalSteem);

  const rep = getReputation(account.reputation);
  const joinedDate = formatJoinedDate(account.created);
  const lastActive = timeAgo(account.last_post || account.last_root_post || account.created);

  // Voting power regeneration formula (100% in 5 days = 432,000s)
  const elapsedSec = (Date.now() - new Date(account.last_vote_time + "Z").getTime()) / 1000;
  const regeneratedVP = (elapsedSec * 10000) / 432000;
  const currentVP = Math.min(100, Math.max(0, (account.voting_power + regeneratedVP) / 100)).toFixed(1);

  const isOwnProfile = Boolean(
    isLoggedIn &&
      user?.username &&
      account?.name &&
      user.username.toLowerCase() === account.name.toLowerCase()
  );

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFollowToggle = async () => {
    if (!isLoggedIn || !user) {
      setFollowMsg("Sign in with Steem Keychain to follow");
      setTimeout(() => setFollowMsg(null), 3500);
      return;
    }

    setFollowLoading(true);
    setFollowMsg(null);
    try {
      const res = await followUserWithSteemKeychain(user.username, account.name, isFollowing);
      if (res.success) {
        setIsFollowing(!isFollowing);
        setFollowMsg(isFollowing ? `Unfollowed @${account.name}` : `Following @${account.name}!`);
      } else {
        setFollowMsg(res.message || res.error || "Failed to update follow status");
      }
    } catch {
      setFollowMsg("Follow request failed");
    } finally {
      setFollowLoading(false);
      setTimeout(() => setFollowMsg(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Header & Cover Image ─────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl relative">
        {/* Cover Image or Gradient */}
        <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-gray-950 overflow-hidden">
          {profileMeta.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileMeta.cover_image}
              alt={`${account.name} cover`}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                // If cover fails to load, gracefully hide it and let gradient show
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent opacity-80" />
          )}

          {/* Gradient overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

          {/* Quick Action Overlay Buttons (Top Right) */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {!isOwnProfile && (
              <>
                <button
                  onClick={() => setTipModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer backdrop-blur-sm"
                  title="Tip author with STEEM or SBD"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Tip</span>
                </button>

                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer backdrop-blur-sm ${
                    isFollowing
                      ? "bg-gray-800/90 hover:bg-red-950/80 text-gray-200 hover:text-red-300 border border-gray-700/80 hover:border-red-800"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {followLoading ? (
                    <span>…</span>
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-700/60 shadow-lg transition cursor-pointer backdrop-blur-sm"
              title="Copy Profile Link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Profile Identity Bar (Overlapping Banner) */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-4 text-center sm:text-left">
            {/* Avatar with Neon Circular Voting Power Ring */}
            <div
              className="relative group shrink-0"
              title={`Voting Power: ${currentVP}%`}
            >
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                {/* SVG Neon Circular Progress Ring */}
                <svg
                  className="w-full h-full -rotate-90 pointer-events-none transform"
                  viewBox="0 0 120 120"
                >
                  <defs>
                    <linearGradient id="vpNeonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f2fe" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background Track Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="3.5"
                    strokeOpacity="0.8"
                  />

                  {/* Active Neon Progress Ring (Drains as VP decreases) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#vpNeonGradient)"
                    strokeWidth="3.5"
                    strokeDasharray={339.29}
                    strokeDashoffset={
                      339.29 * (1 - Math.min(100, Math.max(0, parseFloat(currentVP) || 0)) / 100)
                    }
                    strokeLinecap="round"
                    filter="url(#neonGlow)"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Avatar Image nested within the neon ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[84px] h-[84px] sm:w-[98px] sm:h-[98px] rounded-full overflow-hidden bg-gray-900 border-2 border-gray-950 shadow-2xl">
                    {profileMeta.profile_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileMeta.profile_image}
                        alt={account.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl font-extrabold text-white">
                        {account.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover Badge showing exact VP % */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gray-950/95 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.6)] text-[10px] font-mono font-bold text-cyan-300 whitespace-nowrap pointer-events-none z-20">
                {currentVP}% VP
              </div>
            </div>

            {/* Display Name, Handle & Reputation */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {profileMeta.name || account.name}
                </h1>

                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-400 font-bold border border-blue-800/80 shadow-xs">
                  ({rep})
                </span>

                <span className="text-xs text-gray-500 font-medium">
                  @{account.name}
                </span>
              </div>

              {/* Bio / About */}
              {profileMeta.about && (
                <p className="text-gray-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
                  {profileMeta.about}
                </p>
              )}
            </div>
          </div>

          {followMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-blue-950/70 border border-blue-800 text-blue-300 text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{followMsg}</span>
            </div>
          )}

          {/* Social Stats Strip (Followers, Posts, Following) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 py-3 border-y border-gray-800/80 text-xs text-gray-300">
            <span className="font-semibold text-white">
              <span suppressHydrationWarning>{followCount.follower_count.toLocaleString()}</span>{" "}
              <span className="text-gray-400 font-normal">followers</span>
            </span>
            <span className="text-gray-600">·</span>

            <span className="font-semibold text-white">
              <span suppressHydrationWarning>{account.post_count.toLocaleString()}</span>{" "}
              <span className="text-gray-400 font-normal">posts</span>
            </span>
            <span className="text-gray-600">·</span>

            <span className="font-semibold text-white">
              {followCount.following_count === 0 ? (
                <span className="text-gray-400 font-normal">Not following anybody</span>
              ) : (
                <>
                  <span suppressHydrationWarning>{followCount.following_count.toLocaleString()}</span>{" "}
                  <span className="text-gray-400 font-normal">following</span>
                </>
              )}
            </span>
          </div>

          {/* Metadata Row: Website, Location, Joined Date & Activity */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 pt-3 text-xs text-gray-400">
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{websiteUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
              </a>
            )}

            {profileMeta.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>{profileMeta.location}</span>
              </span>
            )}

            {joinedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>Joined {joinedDate}</span>
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Active {lastActive}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs (Posts, Comments, Wallet) ──────────── */}
      <div className="flex border-b border-gray-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("posts")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "posts"
              ? "border-blue-500 text-white font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Posts ({account.post_count.toLocaleString()})</span>
        </button>

        <button
          onClick={() => setActiveTab("comments")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "comments"
              ? "border-blue-500 text-white font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span>Replies & Comments ({comments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("wallet")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "wallet"
              ? "border-blue-500 text-white font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>Balances & Delegations</span>
        </button>
      </div>

      {/* ─── Tab Content ────────────────────────────────────────── */}

      {/* Tab 1: Posts Feed */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-3xl text-gray-500 text-sm">
              No recent blog posts found for @{account.name}.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={`${post.author}-${post.permlink}`} post={post} />
            ))
          )}
        </div>
      )}

      {/* Tab 2: Comments & Replies */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-3xl text-gray-500 text-sm">
              No recent comments or replies found for @{account.name}.
            </div>
          ) : (
            comments.map((c, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-semibold">Replying on</span>
                    <Link
                      href={`/@${c.parent_author}/${c.parent_permlink}`}
                      className="text-gray-300 hover:text-blue-400 font-mono transition underline"
                    >
                      @{c.parent_author}/{c.parent_permlink.slice(0, 30)}…
                    </Link>
                  </div>
                  <span suppressHydrationWarning>{timeAgo(c.created)}</span>
                </div>

                <div
                  className="steem-content text-gray-200 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderSteemMarkdown(c.body || ""),
                  }}
                />

                <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-xs text-gray-500">
                  <span>▲ {c.net_votes} upvotes</span>
                  <Link
                    href={`/@${c.parent_author}/${c.parent_permlink}`}
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>View in discussion</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Detailed Wallet & Delegations */}
      {activeTab === "wallet" && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span>Asset & Delegation Details for @{account.name}</span>
            </h2>
            <Link
              href="/wallet"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Global Wallet & Transfers</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Liquid Balance */}
            <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                STEEM (Liquid)
              </span>
              <div className="text-xl font-bold text-emerald-400">
                {account.balance}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Available liquid tokens that can be transferred, traded, or powered up.
              </p>
            </div>

            {/* Steem Dollars */}
            <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Steem Dollars (SBD)
              </span>
              <div className="text-xl font-bold text-amber-400">
                {account.sbd_balance}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tokens pegged to 1 USD worth of STEEM.
              </p>
            </div>

            {/* Steem Power Details */}
            <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Own Steem Power
              </span>
              <div className="text-xl font-bold text-blue-400">
                {Math.round(ownSP).toLocaleString()} SP
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {Math.round(ownVests).toLocaleString()} VESTS
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Influence on the Steem network, voting reward weight, and curation stake.
              </p>
            </div>

            {/* Delegations Received / Sent */}
            <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Delegated Influence
              </span>
              <div className="text-xl font-bold text-purple-400">
                +{Math.round(receivedSP).toLocaleString()} SP
              </div>
              <div className="text-xs text-gray-500 font-mono">
                -{Math.round(delegatedSP).toLocaleString()} SP outgoing
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Total Effective SP powering votes:{" "}
                <strong className="text-blue-300">
                  {Math.round(totalSP).toLocaleString()} SP
                </strong>
              </p>
            </div>

            {/* Savings */}
            {(parseFloat(account.savings_balance || "0") > 0 ||
              parseFloat(account.savings_sbd_balance || "0") > 0) && (
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-1 md:col-span-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Savings Balance (3-day security delay)
                </span>
                <div className="text-lg font-bold text-white">
                  {account.savings_balance || "0.000 STEEM"} ·{" "}
                  {account.savings_sbd_balance || "0.000 SBD"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Tip Modal */}
      <TipModal
        recipient={account.name}
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
      />
    </div>
  );
}
