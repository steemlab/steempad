"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ThumbsUp, ChevronDown, ChevronUp, Award } from "lucide-react";
import { timeAgo } from "@/lib/steem";
import { useCurrency } from "@/context/CurrencyContext";

interface ActiveVote {
  percent: number;
  reputation: number | string;
  rshares: string | number;
  time: string;
  voter: string;
  weight: number;
}

interface VotersPanelProps {
  activeVotes: ActiveVote[];
  totalPayoutValue: number;
  curatorPayoutValue: number;
}

export default function VotersPanel({
  activeVotes,
  totalPayoutValue,
  curatorPayoutValue,
}: VotersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { format } = useCurrency();

  const { sortedVotes, totalRshares } = useMemo(() => {
    if (!activeVotes || !Array.isArray(activeVotes)) {
      return { sortedVotes: [], totalRshares: BigInt(0) };
    }

    const votesWithParsedRshares = activeVotes.map((vote) => ({
      ...vote,
      parsedRshares: BigInt(vote.rshares || 0),
    }));

    // Sort biggest votes first (highest rshares)
    const sorted = votesWithParsedRshares.sort((a, b) =>
      a.parsedRshares < b.parsedRshares ? 1 : a.parsedRshares > b.parsedRshares ? -1 : 0
    );

    let total = BigInt(0);
    for (const v of sorted) {
      if (v.parsedRshares > BigInt(0)) {
        total += v.parsedRshares;
      }
    }

    return { sortedVotes: sorted, totalRshares: total };
  }, [activeVotes]);

  if (!activeVotes || activeVotes.length === 0) return null;

  const displayVotes = showAll ? sortedVotes : sortedVotes.slice(0, 20);

  return (
    <div className="mt-6 border border-gray-800 rounded-2xl bg-gray-950/80 overflow-hidden shadow-sm">
      {/* Header Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-900/60 transition-colors text-gray-200 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-bold text-sm text-gray-100">
              Votes & Curation ({activeVotes.length})
            </span>
            <span className="hidden sm:inline text-xs text-gray-500 ml-2">
              · Top voters & earned curation rewards
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-cyan-400 font-semibold">{format(totalPayoutValue)}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Voters List */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-gray-800/80 space-y-4">
          {/* Summary / Table Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 pb-2 border-b border-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <div className="col-span-5">Curator / Voter</div>
            <div className="col-span-2 text-center">Vote Weight</div>
            <div className="col-span-2 text-right">Vote Value</div>
            <div className="col-span-3 text-right flex items-center justify-end gap-1 text-emerald-400">
              <Award className="w-3 h-3" />
              <span>Curation Reward</span>
            </div>
          </div>

          <div className="space-y-2">
            {displayVotes.map((vote) => {
              let voteVal = 0;
              let curationVal = 0;

              if (totalRshares > BigInt(0) && vote.parsedRshares > BigInt(0)) {
                const fraction = Number(vote.parsedRshares) / Number(totalRshares);
                voteVal = fraction * totalPayoutValue;
                curationVal = fraction * curatorPayoutValue;
              }

              const isPositive = vote.percent >= 0;
              const percentDisplay = (Math.abs(vote.percent) / 100).toFixed(0);

              return (
                <div
                  key={vote.voter}
                  className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 p-2.5 rounded-xl hover:bg-gray-900/50 transition-colors text-xs border border-transparent hover:border-gray-800/50"
                >
                  {/* Voter Info */}
                  <div className="col-span-5 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://steemitimages.com/u/${vote.voter}/avatar/small`}
                      alt={vote.voter}
                      className="w-6 h-6 rounded-full bg-gray-800 shrink-0 border border-gray-700/50"
                      loading="lazy"
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        href={`/@${vote.voter}`}
                        className="font-bold text-gray-200 hover:text-cyan-400 transition-colors truncate"
                      >
                        @{vote.voter}
                      </Link>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        · {timeAgo(vote.time)}
                      </span>
                    </div>
                  </div>

                  {/* Vote Weight */}
                  <div className="col-span-2 flex items-center sm:justify-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${
                        isPositive
                          ? "bg-cyan-950/60 border border-cyan-800/40 text-cyan-300"
                          : "bg-red-950/60 border border-red-800/40 text-red-300"
                      }`}
                      title={`Vote weight: ${vote.percent / 100}%`}
                    >
                      {isPositive ? "+" : "-"}
                      {percentDisplay}%
                    </span>
                  </div>

                  {/* Vote Contribution */}
                  <div className="col-span-2 text-left sm:text-right font-semibold text-gray-300 tabular-nums">
                    <span className="sm:hidden text-gray-500 mr-1">Vote Value:</span>
                    {format(voteVal)}
                  </div>

                  {/* Curation Reward */}
                  <div className="col-span-3 text-left sm:text-right font-bold text-emerald-400 tabular-nums flex items-center sm:justify-end gap-1">
                    <span className="sm:hidden text-gray-500 font-normal mr-1">Reward:</span>
                    <span className="bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-md">
                      +{format(curationVal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show All Toggle */}
          {!showAll && sortedVotes.length > 20 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full py-2.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-900/50 rounded-xl transition cursor-pointer"
            >
              Show all {sortedVotes.length} voters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
