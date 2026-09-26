"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { transferWithSteemKeychain } from "@/lib/keychain";
import { Coins, Heart, Check, X, Sparkles, Send } from "lucide-react";
import Link from "next/link";

interface TipModalProps {
  recipient: string;
  permlink?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: string, currency: string) => void;
}

const PRESET_AMOUNTS = ["0.5", "1.0", "5.0", "10.0"];

const MEMO_PRESETS = [
  "☕ Loved your article on SteemPad!",
  "👏 Outstanding quality, keep writing!",
  "🚀 To the moon!",
  "💡 Great insights, thanks for sharing!",
];

export default function TipModal({
  recipient,
  permlink,
  isOpen,
  onClose,
  onSuccess,
}: TipModalProps) {
  const { user, isLoggedIn } = useAuth();

  const [amount, setAmount] = useState<string>("1.0");
  const [currency, setCurrency] = useState<"STEEM" | "SBD">("STEEM");
  const [memo, setMemo] = useState<string>(
    permlink
      ? `☕ Tip for your post: @${recipient}/${permlink}`
      : `☕ Tip for your work on SteemPad!`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePresetSelect = (val: string) => {
    setAmount(val);
  };

  const handleSendTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      setError("Please sign in with Steem Keychain to send tips.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please specify a valid amount greater than 0.");
      return;
    }

    if (user.username.toLowerCase() === recipient.toLowerCase()) {
      setError("You cannot tip your own account.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formattedAmount = numAmount.toFixed(3);
      const res = await transferWithSteemKeychain(
        user.username,
        recipient,
        formattedAmount,
        memo.trim(),
        currency
      );

      if (res.success) {
        setSuccess(true);
        if (onSuccess) onSuccess(formattedAmount, currency);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2200);
      } else {
        setError(res.message || res.error || "Tip transaction canceled.");
      }
    } catch {
      setError("Failed to broadcast tip transaction to Steem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-xl hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>Tip Author</span>
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
            </h3>
            <p className="text-xs text-gray-400">
              Direct peer-to-peer micro-tip to{" "}
              <strong className="text-blue-400">@{recipient}</strong>
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl animate-bounce">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-white">Tip Sent Successfully!</h4>
            <p className="text-xs text-gray-400">
              Transferred {parseFloat(amount).toFixed(3)} {currency} directly to @{recipient} via Steem Keychain.
            </p>
          </div>
        ) : !isLoggedIn ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-gray-300">
              Please sign in with Steem Keychain to send instant zero-gas tips.
            </p>
            <Link
              suppressHydrationWarning
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
            >
              Sign In with Keychain
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSendTip} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Currency Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Token
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setCurrency("STEEM")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    currency === "STEEM"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  STEEM
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("SBD")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    currency === "SBD"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  SBD
                </button>
              </div>
            </div>

            {/* Amount Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Amount
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetSelect(val)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      amount === val
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-gray-800/60 border-gray-800 text-gray-300 hover:border-gray-700"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Memo Note */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Cheer Memo (Optional)
              </label>
              <input
                type="text"
                maxLength={100}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Add a friendly note..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-blue-500 transition"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {MEMO_PRESETS.slice(0, 2).map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMemo(m)}
                    className="text-[10px] text-gray-400 bg-gray-800/80 hover:bg-gray-700 px-2 py-0.5 rounded-lg transition"
                  >
                    {m.slice(0, 24)}…
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Broadcasting Tip…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tip {amount || "0"} {currency}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                <span>⚡ Instant settlement with zero gas fees on Steem</span>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
