"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import {
  getAccount,
  getGlobalProps,
  vestsToSP,
  getReputation,
  getAccountTransferContacts,
  CounterpartyInfo,
  timeAgo,
  getVestingDelegations,
  VestingDelegation,
} from "@/lib/steem";
import {
  powerUpWithSteemKeychain,
  powerDownWithSteemKeychain,
  transferWithSteemKeychain,
  delegateWithSteemKeychain,
} from "@/lib/keychain";
import {
  Wallet,
  Lock,
  Search,
  RefreshCw,
  Send,
  Zap,
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  History,
  Check,
  Share2,
  Trash2,
  Plus,
} from "lucide-react";

interface AccountData {
  name: string;
  reputation: number;
  balance: string;
  sbd_balance: string;
  savings_balance: string;
  savings_sbd_balance: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  vesting_withdraw_rate: string;
  to_withdraw: string;
  withdrawn: string;
  next_vesting_withdrawal: string;
  json_metadata?: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { format } = useCurrency();

  const [searchUser, setSearchUser] = useState("");
  const [activeAccount, setActiveAccount] = useState("steempad");
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [globalProps, setGlobalProps] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Transfer Contacts / Smart Address Book
  const [contacts, setContacts] = useState<CounterpartyInfo[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // SP Delegations
  const [delegations, setDelegations] = useState<VestingDelegation[]>([]);
  const [loadingDelegations, setLoadingDelegations] = useState(false);

  // Action Modal State
  const [actionModal, setActionModal] = useState<
    "powerup" | "powerdown" | "transfer" | "delegate" | null
  >(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionRecipient, setActionRecipient] = useState("");
  const [actionMemo, setActionMemo] = useState("");
  const [actionCurrency, setActionCurrency] = useState<"STEEM" | "SBD">("STEEM");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  // Sync active account with logged-in user on load
  useEffect(() => {
    if (user?.username) {
      setActiveAccount(user.username);
    }
  }, [user]);

  // Load account data & delegations from Steem blockchain
  const loadWallet = async (username: string) => {
    setLoading(true);
    setActionStatus(null);
    try {
      const [acc, props, dels] = await Promise.all([
        getAccount(username),
        getGlobalProps(),
        getVestingDelegations(username),
      ]);
      setAccountData(acc as AccountData);
      setGlobalProps(props);
      setDelegations(dels);
    } catch {
      setAccountData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet(activeAccount);
  }, [activeAccount]);

  // Load counterparties history when active account changes
  useEffect(() => {
    if (activeAccount) {
      setLoadingContacts(true);
      getAccountTransferContacts(activeAccount, 250).then((data) => {
        setContacts(data);
        setLoadingContacts(false);
      });
    }
  }, [activeAccount]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchUser.trim().toLowerCase().replace("@", "");
    if (clean) {
      setActiveAccount(clean);
    }
  };

  // Conversions
  const totalVests = globalProps
    ? parseFloat(globalProps.total_vesting_shares.replace(" VESTS", ""))
    : 1;
  const totalSteemFund = globalProps
    ? parseFloat(globalProps.total_vesting_fund_steem.replace(" STEEM", ""))
    : 1;

  const rawVests = accountData ? parseFloat(accountData.vesting_shares) : 0;
  const ownSP = vestsToSP(rawVests, totalVests, totalSteemFund);

  const receivedVests = accountData ? parseFloat(accountData.received_vesting_shares) : 0;
  const receivedSP = vestsToSP(receivedVests, totalVests, totalSteemFund);

  const delegatedVests = accountData ? parseFloat(accountData.delegated_vesting_shares) : 0;
  const delegatedSP = vestsToSP(delegatedVests, totalVests, totalSteemFund);

  const effectiveSP = ownSP + receivedSP - delegatedSP;

  const liquidSteem = accountData ? parseFloat(accountData.balance) : 0;
  const liquidSbd = accountData ? parseFloat(accountData.sbd_balance) : 0;
  const savingsSteem = accountData ? parseFloat(accountData.savings_balance) : 0;
  const savingsSbd = accountData ? parseFloat(accountData.savings_sbd_balance) : 0;

  // Approximate prices: STEEM ~$0.0636, SBD ~$1.20
  const estSteemUSD = (liquidSteem + ownSP + savingsSteem) * 0.0636;
  const estSbdUSD = (liquidSbd + savingsSbd) * 1.2;
  const totalEstUSD = estSteemUSD + estSbdUSD;

  // Power Down active check
  const isPoweringDown =
    accountData &&
    parseFloat(accountData.vesting_withdraw_rate) > 0 &&
    accountData.to_withdraw !== "0";
  const weeklyRateVests = isPoweringDown
    ? parseFloat(accountData.vesting_withdraw_rate)
    : 0;
  const weeklyPayoutSP = vestsToSP(weeklyRateVests, totalVests, totalSteemFund);

  // Active recipient counterparty match
  const selectedContact = contacts.find(
    (c) => c.username.toLowerCase() === actionRecipient.trim().toLowerCase().replace("@", "")
  );

  // Revoke an outgoing delegation
  const handleRevokeDelegation = async (delegatee: string) => {
    if (!user || user.authMethod !== "keychain") {
      alert("Please log in with Steem Keychain to revoke delegations.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to revoke your delegation to @${delegatee}? It will return to your SP pool after the standard 5-day cooldown.`
      )
    ) {
      return;
    }

    const res = await delegateWithSteemKeychain(user.username, delegatee, "0.000", "SP");
    if (res.success) {
      loadWallet(activeAccount);
    } else {
      alert(res.message || "Failed to revoke delegation in Keychain.");
    }
  };

  // Keychain Actions
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.authMethod !== "keychain") {
      setActionStatus({
        type: "error",
        msg: "Please sign in with Steem Keychain to execute wallet operations.",
      });
      return;
    }

    setActionLoading(true);
    setActionStatus(null);

    try {
      if (actionModal === "powerup") {
        const res = await powerUpWithSteemKeychain(
          user.username,
          parseFloat(actionAmount).toFixed(3),
          actionRecipient || user.username
        );
        if (res.success) {
          setActionStatus({ type: "success", msg: "Power Up successful!" });
          setTimeout(() => {
            setActionModal(null);
            loadWallet(activeAccount);
          }, 1500);
        } else {
          setActionStatus({ type: "error", msg: res.message || "Power Up rejected." });
        }
      } else if (actionModal === "powerdown") {
        const res = await powerDownWithSteemKeychain(
          user.username,
          parseFloat(actionAmount).toFixed(3)
        );
        if (res.success) {
          setActionStatus({ type: "success", msg: "Power Down transaction broadcasted!" });
          setTimeout(() => {
            setActionModal(null);
            loadWallet(activeAccount);
          }, 1500);
        } else {
          setActionStatus({ type: "error", msg: res.message || "Power Down rejected." });
        }
      } else if (actionModal === "delegate") {
        const target = actionRecipient.trim().toLowerCase().replace("@", "");
        if (!target) {
          setActionStatus({ type: "error", msg: "Please enter a valid delegatee username." });
          setActionLoading(false);
          return;
        }

        const res = await delegateWithSteemKeychain(
          user.username,
          target,
          parseFloat(actionAmount).toFixed(3),
          "SP"
        );

        if (res.success) {
          setActionStatus({ type: "success", msg: `Successfully delegated SP to @${target}!` });
          setTimeout(() => {
            setActionModal(null);
            loadWallet(activeAccount);
          }, 1500);
        } else {
          setActionStatus({ type: "error", msg: res.message || "Delegation rejected in Keychain." });
        }
      } else if (actionModal === "transfer") {
        const target = actionRecipient.trim().toLowerCase().replace("@", "");
        if (!target) {
          setActionStatus({ type: "error", msg: "Please enter a valid recipient username." });
          setActionLoading(false);
          return;
        }

        const res = await transferWithSteemKeychain(
          user.username,
          target,
          parseFloat(actionAmount).toFixed(3),
          actionMemo,
          actionCurrency
        );

        if (res.success) {
          setActionStatus({
            type: "success",
            msg: `Transferred ${parseFloat(actionAmount).toFixed(3)} ${actionCurrency} to @${target}!`,
          });
          setTimeout(() => {
            setActionModal(null);
            loadWallet(activeAccount);
          }, 1500);
        } else {
          setActionStatus({ type: "error", msg: res.message || "Transfer rejected." });
        }
      }
    } catch {
      setActionStatus({ type: "error", msg: "Failed to broadcast transaction to Steem blockchain." });
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = user?.username.toLowerCase() === activeAccount.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-400" />
            <span>SteemPad Wallet</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time on-chain balances, staking rewards, and delegation governance.
          </p>
        </div>

        {/* Account Lookup Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">
              @
            </span>
            <input
              type="text"
              placeholder="Search account..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl py-2 pl-7 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition w-44 sm:w-52"
            />
          </div>
          <button
            type="submit"
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition border border-gray-700/60"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-sm flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Querying Steem blockchain nodes…</span>
        </div>
      ) : !accountData ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-sm">
          Account <strong className="text-white">@{activeAccount}</strong> not found on the Steem blockchain.
        </div>
      ) : (
        <>
          {/* Main Account Header & Total Net Worth */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {accountData.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">@{accountData.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/80 font-semibold">
                      Rep: {getReputation(accountData.reputation)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isOwner ? "Your active account" : "Viewing public on-chain wallet"}
                  </p>
                </div>
              </div>

              {/* Total Estimated Fiat Value */}
              <div className="sm:text-right">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-0.5">
                  Estimated Net Worth
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  {format(totalEstUSD)}
                </div>
                <div className="text-[11px] text-gray-500">
                  Based on live market rates
                </div>
              </div>
            </div>

            {/* Quick Actions (only if logged-in user owns this wallet) */}
            {isOwner && (
              <div className="flex flex-wrap items-center gap-2.5 pt-5">
                <button
                  onClick={() => {
                    setActionModal("powerup");
                    setActionAmount("");
                    setActionRecipient("");
                    setActionStatus(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Power Up</span>
                </button>
                <button
                  onClick={() => {
                    setActionModal("delegate");
                    setActionAmount("");
                    setActionRecipient("");
                    setActionStatus(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Delegate SP</span>
                </button>
                <button
                  onClick={() => {
                    setActionModal("powerdown");
                    setActionAmount("");
                    setActionStatus(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition border border-gray-700/60 flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Power Down</span>
                </button>
                <button
                  onClick={() => {
                    setActionModal("transfer");
                    setActionAmount("");
                    setActionRecipient("");
                    setActionMemo("");
                    setActionStatus(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Smart Transfer</span>
                </button>
              </div>
            )}
          </div>

          {/* Asset Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* STEEM (Liquid) */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                      ST
                    </div>
                    <span className="font-bold text-white text-sm">STEEM</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                    Liquid
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {liquidSteem.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Liquid Steem balance. Transfer to friends, delegate, or power up for staking rewards.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                <span>Value:</span>
                <span className="font-bold text-white">{format(liquidSteem * 0.0636)}</span>
              </div>
            </div>

            {/* STEEM POWER (Staked) */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                      SP
                    </div>
                    <span className="font-bold text-white text-sm">STEEM POWER (SP)</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 font-semibold">
                    ~3.1% APR
                  </span>
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {effectiveSP.toLocaleString(undefined, { minimumFractionDigits: 3 })} SP
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Influence token on Steem. Governs voting weight and Resource Credits.
                  {receivedSP > 0 && ` (+${receivedSP.toFixed(2)} delegated to you)`}
                  {delegatedSP > 0 && ` (-${delegatedSP.toFixed(2)} delegated out)`}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                <span>Staked SP Value:</span>
                <span className="font-bold text-white">{format(ownSP * 0.0636)}</span>
              </div>
            </div>

            {/* STEEM DOLLARS (SBD) */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      $
                    </div>
                    <span className="font-bold text-white text-sm">STEEM DOLLARS (SBD)</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                    Stable
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {liquidSbd.toLocaleString(undefined, { minimumFractionDigits: 3 })} SBD
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Stable-value token tied to USD value. Earned via author rewards.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                <span>Value:</span>
                <span className="font-bold text-white">{format(liquidSbd * 1.2)}</span>
              </div>
            </div>

            {/* SAVINGS */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-white text-sm">SAVINGS</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">3-day security lock</span>
                </div>
                <div className="text-2xl font-black text-amber-300">
                  {savingsSteem.toFixed(3)} STEEM
                </div>
                <div className="text-sm font-semibold text-gray-400 mt-0.5">
                  {savingsSbd.toFixed(3)} SBD
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                <span>Total in Savings:</span>
                <span className="font-bold text-white">
                  {format(savingsSteem * 0.0636 + savingsSbd * 1.2)}
                </span>
              </div>
            </div>
          </div>

          {/* SP Delegation Manager Hub */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-purple-400" />
                  <span>Steem Power Delegation Hub</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lend or receive SP voting power and bandwidth without transferring token ownership.
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={() => {
                    setActionModal("delegate");
                    setActionAmount("");
                    setActionRecipient("");
                    setActionStatus(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Delegation</span>
                </button>
              )}
            </div>

            {/* Delegation Stat Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-2xl">
                <span className="text-[11px] text-gray-500 font-semibold block">Direct Staked SP</span>
                <span className="text-base font-bold text-white mt-1 block">{ownSP.toFixed(3)} SP</span>
              </div>
              <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-2xl">
                <span className="text-[11px] text-gray-500 font-semibold block">Received from Others</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">+{receivedSP.toFixed(3)} SP</span>
              </div>
              <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-2xl">
                <span className="text-[11px] text-gray-500 font-semibold block">Outgoing Delegations</span>
                <span className="text-base font-bold text-amber-400 mt-1 block">-{delegatedSP.toFixed(3)} SP</span>
              </div>
            </div>

            {/* Outgoing Delegations List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Outgoing Delegations ({delegations.length})
              </h4>

              {delegations.length === 0 ? (
                <div className="p-5 text-center bg-gray-950/50 rounded-2xl border border-gray-800 text-xs text-gray-500">
                  No active outgoing delegations. Your SP is 100% available in your wallet.
                </div>
              ) : (
                <div className="space-y-2">
                  {delegations.map((d) => {
                    const spAmount = vestsToSP(
                      parseFloat(d.vesting_shares),
                      totalVests,
                      totalSteemFund
                    );
                    return (
                      <div
                        key={d.id}
                        className="p-3.5 bg-gray-950/70 border border-gray-800 hover:border-gray-700 rounded-2xl flex items-center justify-between gap-4 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 font-bold flex items-center justify-center text-xs">
                            {d.delegatee[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">
                              @{d.delegatee}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Active since: {d.min_delegation_time.replace("T", " ")} UTC
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-bold text-purple-300">
                              {spAmount.toFixed(3)} SP
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {parseFloat(d.vesting_shares).toFixed(0)} VESTS
                            </div>
                          </div>

                          {isOwner && (
                            <button
                              onClick={() => handleRevokeDelegation(d.delegatee)}
                              className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-gray-800 transition"
                              title="Revoke delegation (5-day cooldown)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Power Down Schedule */}
          {isPoweringDown && (
            <div className="bg-gradient-to-r from-amber-950/40 via-gray-900 to-amber-950/20 border border-amber-800/60 rounded-3xl p-6 shadow-md">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-2">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Active 13-Week Power Down in Progress</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                This account is converting Steem Power into liquid STEEM. Every 7 days, 1/13th is
                credited to your liquid balance automatically.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-gray-950/60 rounded-2xl border border-gray-800/80">
                  <div className="text-xs text-gray-500">Weekly Payout</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">
                    ~{weeklyPayoutSP.toFixed(3)} STEEM
                  </div>
                </div>
                <div className="p-3 bg-gray-950/60 rounded-2xl border border-gray-800/80">
                  <div className="text-xs text-gray-500">Weekly Fiat Value</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {format(weeklyPayoutSP * 0.0636)}
                  </div>
                </div>
                <div className="p-3 bg-gray-950/60 rounded-2xl border border-gray-800/80 col-span-2 sm:col-span-1">
                  <div className="text-xs text-gray-500">Next Payout</div>
                  <div className="text-xs font-semibold text-gray-300 mt-1">
                    {new Date(accountData.next_vesting_withdrawal + "Z").toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Modal (Power Up / Power Down / Smart Transfer / Delegate) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              {actionModal === "powerup" && <Zap className="w-5 h-5 text-blue-400" />}
              {actionModal === "powerdown" && <ArrowDownRight className="w-5 h-5 text-amber-400" />}
              {actionModal === "transfer" && <Send className="w-5 h-5 text-emerald-400" />}
              {actionModal === "delegate" && <Share2 className="w-5 h-5 text-purple-400" />}
              <span>
                {actionModal === "powerup" && "Power Up STEEM"}
                {actionModal === "powerdown" && "Initiate 13-Week Power Down"}
                {actionModal === "transfer" && "Smart Steem Transfer"}
                {actionModal === "delegate" && "Delegate Steem Power (SP)"}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              {actionModal === "delegate"
                ? "Lend SP to another account. You retain token ownership and can revoke anytime."
                : "Broadcasted securely through Steem Keychain."}
            </p>

            {actionStatus && (
              <div
                className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  actionStatus.type === "success"
                    ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    : "bg-red-950 border border-red-800 text-red-300"
                }`}
              >
                {actionStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{actionStatus.msg}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4">
              {/* Currency selector for transfer */}
              {actionModal === "transfer" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Select Token
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionCurrency("STEEM")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                        actionCurrency === "STEEM"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>STEEM</span>
                      <span className="text-[11px] font-normal">{liquidSteem.toFixed(3)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionCurrency("SBD")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                        actionCurrency === "SBD"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>SBD</span>
                      <span className="text-[11px] font-normal">{liquidSbd.toFixed(3)}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Counterparty Address Book / Quick Selection */}
              {(actionModal === "transfer" || actionModal === "delegate") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-blue-400" />
                      <span>Frequent Counterparties</span>
                    </span>
                    {contacts.length > 0 && (
                      <span className="text-[10px] text-gray-500">
                        {contacts.length} saved on-chain
                      </span>
                    )}
                  </div>

                  {contacts.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {contacts.slice(0, 6).map((c) => {
                        const isSelected =
                          actionRecipient.toLowerCase().replace("@", "") === c.username;
                        return (
                          <button
                            key={c.username}
                            type="button"
                            onClick={() => {
                              setActionRecipient(c.username);
                            }}
                            className={`shrink-0 p-2 rounded-2xl border text-left transition flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? "bg-blue-950/70 border-blue-500 text-white shadow-sm"
                                : "bg-gray-950 hover:bg-gray-800/80 border-gray-800 text-gray-300 hover:text-white"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {c.username[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold">@{c.username}</div>
                              <div className="text-[10px] text-emerald-400 font-semibold">
                                {c.totalTransfers} transfers
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : !loadingContacts ? (
                    <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-[11px] text-gray-500">
                      No transfer history found on-chain. Enter a username below.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Recipient / Delegatee Input */}
              {(actionModal === "transfer" || actionModal === "powerup" || actionModal === "delegate") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {actionModal === "delegate"
                      ? "Delegatee Username"
                      : actionModal === "powerup"
                      ? "Recipient Username (optional, default: yourself)"
                      : "Recipient Username"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder={actionModal === "powerup" ? (user?.username || "username") : "username"}
                      value={actionRecipient}
                      onChange={(e) => setActionRecipient(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-7 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Transaction Counterparty History Badge */}
                  {actionModal === "transfer" && actionRecipient.trim() && (
                    <div className="mt-2">
                      {selectedContact ? (
                        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-300 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="font-bold">
                                {selectedContact.totalTransfers} transactions together
                              </span>
                              <span className="text-[11px] text-emerald-400/80 block">
                                ({selectedContact.sentCount} sent, {selectedContact.receivedCount} received)
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400/70">
                            Last: {timeAgo(selectedContact.lastDate)}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/70 text-amber-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            First time transferring to <strong>@{actionRecipient.trim().replace("@", "")}</strong>.
                            Double-check the spelling.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-300 mb-1">
                  <span>Amount {actionModal === "delegate" ? "(in SP)" : ""}</span>
                  <span className="text-[11px] text-gray-500">
                    Max:{" "}
                    {actionModal === "powerup"
                      ? `${liquidSteem.toFixed(3)} STEEM`
                      : actionModal === "powerdown" || actionModal === "delegate"
                      ? `${ownSP.toFixed(3)} SP`
                      : actionCurrency === "STEEM"
                      ? `${liquidSteem.toFixed(3)} STEEM`
                      : `${liquidSbd.toFixed(3)} SBD`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-3 pr-14 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (actionModal === "powerup") setActionAmount(liquidSteem.toFixed(3));
                      else if (actionModal === "powerdown" || actionModal === "delegate") setActionAmount(ownSP.toFixed(3));
                      else if (actionCurrency === "STEEM") setActionAmount(liquidSteem.toFixed(3));
                      else setActionAmount(liquidSbd.toFixed(3));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-gray-800 hover:bg-gray-700 text-[10px] font-bold text-blue-400 cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Memo for transfer */}
              {actionModal === "transfer" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Memo (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Message or deposit memo..."
                    value={actionMemo}
                    onChange={(e) => setActionMemo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Confirm in Keychain</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
