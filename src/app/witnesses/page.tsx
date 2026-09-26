"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getWitnessesByVote, SteemWitness, getAccount } from "@/lib/steem";
import { voteWitnessWithSteemKeychain } from "@/lib/keychain";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  Vote,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
  Server,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function WitnessesPage() {
  const { user, isLoggedIn } = useAuth();

  const [witnesses, setWitnesses] = useState<SteemWitness[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingWitness, setVotingWitness] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customWitness, setCustomWitness] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getWitnessesByVote(30);
      setWitnesses(list);

      if (user?.username) {
        const acc = (await getAccount(user.username)) as any;
        if (acc && Array.isArray(acc.witness_votes)) {
          setUserVotes(acc.witness_votes);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleVoteToggle = async (witnessName: string) => {
    if (!isLoggedIn || !user) {
      setStatusMsg({
        type: "error",
        msg: "Please sign in with Steem Keychain to vote for witnesses.",
      });
      return;
    }

    const currentlyVoted = userVotes.includes(witnessName);
    const newVoteState = !currentlyVoted;

    setVotingWitness(witnessName);
    setStatusMsg(null);

    try {
      const res = await voteWitnessWithSteemKeychain(
        user.username,
        witnessName,
        newVoteState
      );

      if (res.success) {
        setUserVotes((prev) =>
          newVoteState
            ? [...prev, witnessName]
            : prev.filter((w) => w !== witnessName)
        );
        setStatusMsg({
          type: "success",
          msg: newVoteState
            ? `Successfully cast vote for @${witnessName}!`
            : `Removed vote from @${witnessName}.`,
        });
      } else {
        setStatusMsg({
          type: "error",
          msg: res.message || "Witness vote was rejected in Keychain.",
        });
      }
    } catch {
      setStatusMsg({
        type: "error",
        msg: "Failed to broadcast witness vote transaction.",
      });
    } finally {
      setVotingWitness(null);
    }
  };

  const handleCustomVote = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customWitness.trim().toLowerCase().replace("@", "");
    if (!clean) return;
    await handleVoteToggle(clean);
    setCustomWitness("");
  };

  const filtered = witnesses.filter((w) =>
    w.owner.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <span>Witness Governance</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Steem witnesses validate transactions, produce blocks, and secure the blockchain.
          </p>
        </div>

        {isLoggedIn && user && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-2xl">
            <Vote className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-300">
              Votes Cast: <strong className="text-white">{userVotes.length}</strong> / 30
            </span>
          </div>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
            statusMsg.type === "success"
              ? "bg-emerald-950/60 border border-emerald-800/80 text-emerald-300"
              : "bg-red-950/60 border border-red-800/80 text-red-300"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{statusMsg.msg}</span>
        </div>
      )}

      {/* Search and Custom Vote Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter witnesses by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Vote for custom witness */}
        <form onSubmit={handleCustomVote} className="flex gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              @
            </span>
            <input
              type="text"
              placeholder="Other witness..."
              value={customWitness}
              onChange={(e) => setCustomWitness(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-2xl py-2.5 pl-7 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition w-36 sm:w-44"
            />
          </div>
          <button
            type="submit"
            disabled={!customWitness.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-2xl transition shadow-sm active:scale-95 cursor-pointer"
          >
            Vote
          </button>
        </form>
      </div>

      {/* Witnesses Table / List */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-sm flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading consensus witnesses from Steem blockchain…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center text-xs text-gray-500">
          No witnesses found matching &quot;{search}&quot;.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-950/60">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Witness</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Version</th>
                  <th className="py-3 px-4 hidden md:table-cell">Missed</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-xs">
                {filtered.map((w, index) => {
                  const rank = witnesses.findIndex((item) => item.owner === w.owner) + 1;
                  const hasVoted = userVotes.includes(w.owner);
                  const isVotingThis = votingWitness === w.owner;
                  const isSpecial = w.owner.toLowerCase() === "justyy";

                  return (
                    <tr
                      key={w.owner}
                      className={`hover:bg-gray-800/40 transition ${
                        isSpecial ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                        #{rank}
                      </td>

                      {/* Witness Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://steemitimages.com/u/${w.owner}/avatar`}
                            alt={w.owner}
                            className="w-7 h-7 rounded-full bg-gray-800 object-cover border border-gray-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${w.owner}&background=4f46e5&color=fff`;
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                suppressHydrationWarning
                                href={`/@${w.owner}`}
                                className="font-bold text-white hover:text-indigo-400 transition"
                              >
                                @{w.owner}
                              </Link>
                              {isSpecial && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded-full font-medium">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Helped create @steempad</span>
                                </span>
                              )}
                            </div>
                            {w.url && (
                              <a
                                href={w.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 mt-0.5"
                              >
                                <span>Witness statement</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-300 bg-gray-950 px-2 py-0.5 rounded-lg border border-gray-800">
                          <Server className="w-3 h-3 text-indigo-400" />
                          <span>v{w.running_version || "0.23.1"}</span>
                        </span>
                      </td>

                      {/* Missed Blocks */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-gray-400">
                        {w.total_missed === 0 ? (
                          <span className="text-emerald-400 font-semibold">0</span>
                        ) : (
                          <span className="text-amber-400">{w.total_missed}</span>
                        )}
                      </td>

                      {/* Vote Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={isVotingThis}
                          onClick={() => handleVoteToggle(w.owner)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                            hasVoted
                              ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-red-950/40 hover:border-red-800/80 hover:text-red-300"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          }`}
                        >
                          {isVotingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : hasVoted ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Voted</span>
                            </>
                          ) : (
                            <>
                              <Vote className="w-3 h-3" />
                              <span>Vote</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
