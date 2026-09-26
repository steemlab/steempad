"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Smartphone,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  isMobileDevice,
  getSteemKeychainMobileBrowseUrl,
  STEEM_KEYCHAIN_MOBILE_LINKS,
} from "@/lib/keychain";

export default function LoginPage() {
  const { user, isLoggedIn, isKeychainAvailable, loginKeychain, loginPostingKey, logout } =
    useAuth();
  const router = useRouter();

  const [method, setMethod] = useState<"keychain" | "postingKey">("keychain");
  const [username, setUsername] = useState("");
  const [postingKey, setPostingKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const handleKeychainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginKeychain(username);
      if (res.success) {
        setSuccess(`Successfully signed in as @${username.replace("@", "")}!`);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1000);
      } else {
        setError(res.error || "Failed to sign in via Steem Keychain.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostingKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginPostingKey(username, postingKey);
      if (res.success) {
        setSuccess(`Successfully signed in as @${username.replace("@", "")}!`);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1000);
      } else {
        setError(res.error || "Failed to authenticate with posting key.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn && user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
          ✓
        </div>
        <h1 className="text-xl font-bold text-white mb-2">You are already signed in</h1>
        <p className="text-gray-400 text-sm mb-6">
          Logged in as <strong className="text-blue-400">@{user.username}</strong> using{" "}
          <span className="capitalize">{user.authMethod.replace("_", " ")}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/@${user.username}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
          >
            View Profile
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8">
      {/* Card Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-2xl mb-3 shadow-inner">
          ⚡
        </div>
        <h1 className="text-2xl font-extrabold text-white">Sign in to SteemFeed</h1>
        <p className="text-gray-400 text-sm mt-1">
          Connect your Steem account to vote, comment, and post
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Method Switcher */}
        <div className="flex bg-gray-950 p-1 rounded-xl mb-6 border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setMethod("keychain");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer ${
              method === "keychain"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Steem Keychain 🛡️
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("postingKey");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer ${
              method === "postingKey"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Posting Key 🔑
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Keychain */}
        {method === "keychain" && (
          <div className="space-y-4">
            {/* Keychain Status Indicator */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isKeychainAvailable
                  ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                  : "bg-amber-950/30 border-amber-800/50 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>
                  {isKeychainAvailable
                    ? "Steem Keychain Detected"
                    : isMobile
                    ? "Mobile Browser Detected"
                    : "Steem Keychain Not Detected"}
                </span>
              </div>
              {!isKeychainAvailable && !isMobile && (
                <a
                  href={STEEM_KEYCHAIN_MOBILE_LINKS.extensionChrome}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-white hover:text-amber-200"
                >
                  Get Extension ↗
                </a>
              )}
            </div>

            {/* Mobile App Deep-linking Banner if visiting from mobile without extension */}
            {isMobile && !isKeychainAvailable && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/50 via-indigo-950/40 to-gray-950 border border-blue-800/60 space-y-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Steem Keychain Mobile
                    </h3>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                      On phones and tablets, open SteemPad directly in the official Keychain app for 1-tap voting and signing.
                    </p>
                  </div>
                </div>

                <a
                  href={getSteemKeychainMobileBrowseUrl()}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-xs shadow-md flex items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open in Keychain Mobile App</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {/* Download links */}
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="text-gray-400">Don&apos;t have the app?</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={STEEM_KEYCHAIN_MOBILE_LINKS.android}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3 h-3 text-blue-400" />
                      <span>Android</span>
                    </a>
                    <a
                      href={STEEM_KEYCHAIN_MOBILE_LINKS.ios}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3 h-3 text-blue-400" />
                      <span>iOS</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleKeychainSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Steem Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Signing challenge in Keychain…</span>
                  </>
                ) : (
                  <span>Sign In with Steem Keychain</span>
                )}
              </button>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed mt-4">
                🔒 Safe & non-custodial: Your private keys are securely kept in the
                Keychain app or browser extension and never exposed to the web application.
              </p>
            </form>
          </div>
        )}

        {/* Tab 2: Posting Key */}
        {method === "postingKey" && (
          <form onSubmit={handlePostingKeySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Steem Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Private Posting Key
              </label>
              <input
                type="password"
                required
                placeholder="5J..."
                value={postingKey}
                onChange={(e) => setPostingKey(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verifying account…</span>
                </>
              ) : (
                <span>Sign In with Posting Key</span>
              )}
            </button>

            <div className="p-3 bg-gray-950 rounded-xl border border-gray-800/80 text-[11px] text-gray-400 leading-relaxed mt-4">
              💡 <strong>Security tip:</strong> Only use your{" "}
              <strong className="text-white">Posting Key</strong> (used for voting and
              posting). Never enter your Active Key, Owner Key, or Master Password.
            </div>
          </form>
        )}
      </div>

      {/* Footer support */}
      <div className="mt-8 text-center text-xs text-gray-500">
        Don&apos;t have a Steem account?{" "}
        <a
          href="https://steemit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Create one on Steemit
        </a>
      </div>
    </div>
  );
}
