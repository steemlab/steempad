"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { voteWithSteemKeychain } from "@/lib/keychain";
import Link from "next/link";

interface VoteButtonProps {
  author: string;
  permlink: string;
  initialVotes: number;
  compact?: boolean;
}

export default function VoteButton({
  author,
  permlink,
  initialVotes,
  compact = false,
}: VoteButtonProps) {
  const { user, isLoggedIn } = useAuth();
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn || !user) {
      setErrorMessage("Please log in with Keychain to upvote.");
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    if (hasVoted) return;

    setIsVoting(true);
    setErrorMessage(null);

    try {
      if (user.authMethod === "keychain") {
        const res = await voteWithSteemKeychain(
          user.username,
          author,
          permlink,
          10000 // 100% upvote weight
        );

        if (res.success) {
          setHasVoted(true);
          setVotes((v) => v + 1);
        } else {
          setErrorMessage(res.message || "Vote was rejected by Keychain.");
          setTimeout(() => setErrorMessage(null), 4000);
        }
      } else {
        setErrorMessage("Upvoting with direct key is not enabled. Use Keychain.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch {
      setErrorMessage("An error occurred while voting.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleVote}
        disabled={isVoting || hasVoted}
        className={`inline-flex items-center gap-1.5 transition rounded-lg font-medium ${
          compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
        } ${
          hasVoted
            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
            : "hover:bg-gray-800 text-gray-400 hover:text-emerald-400 border border-transparent"
        }`}
        title={mounted && isLoggedIn ? `Upvote as @${user?.username}` : "Log in to upvote"}
      >
        <span
          className={`transition-transform ${
            hasVoted ? "text-emerald-400 scale-110" : ""
          } ${isVoting ? "animate-pulse" : ""}`}
        >
          ▲
        </span>
        <span>{votes}</span>
        {isVoting && <span className="text-[10px] animate-pulse">…</span>}
      </button>

      {/* Floating error tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full left-0 mb-2 z-50 whitespace-nowrap bg-red-950 border border-red-800 text-red-300 text-xs px-2.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5">
          <span>⚠️</span>
          <span>{errorMessage}</span>
          {!isLoggedIn && (
            <Link href="/login" className="underline font-bold ml-1 text-white">
              Login
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
