"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { CurrencyCode } from "@/lib/currency";
import { getBookmarks } from "@/lib/bookmarks";
import NotificationCenter from "./NotificationCenter";
import QuickSearchModal from "./QuickSearchModal";
import SteemPadLogo from "./SteemPadLogo";
import {
  Compass,
  PenSquare,
  Wallet,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Globe,
  Menu,
  X,
  Bookmark,
  ShieldCheck,
  Search,
  Check,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [currencyDropdown, setCurrencyDropdown] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSavedCount(getBookmarks().length);

    const updateSaved = () => setSavedCount(getBookmarks().length);
    window.addEventListener("steempad_bookmarks_updated", updateSaved);

    // Global Cmd+K / Ctrl+K shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setUserDropdown(false);
        setCurrencyDropdown(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("steempad_bookmarks_updated", updateSaved);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: "USD", label: "US Dollar", symbol: "$" },
    { code: "INR", label: "Indian Rupee", symbol: "₹" },
    { code: "KRW", label: "Korean Won", symbol: "₩" },
    { code: "EUR", label: "Euro", symbol: "€" },
  ];

  const currentCurrencyMeta =
    currencies.find((c) => c.code === currency) || currencies[0];

  const navItems = [
    {
      label: "Explore",
      href: "/",
      icon: Compass,
      match: (p: string) => p === "/" || p === "/hot" || p === "/new",
    },
    {
      label: "Saved",
      href: "/bookmarks",
      icon: Bookmark,
      match: (p: string) => p === "/bookmarks",
      count: savedCount,
    },
    {
      label: "Witnesses",
      href: "/witnesses",
      icon: ShieldCheck,
      match: (p: string) => p === "/witnesses",
    },
    {
      label: "Wallet",
      href: "/wallet",
      icon: Wallet,
      match: (p: string) => p === "/wallet",
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-white/[0.08] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Horizontal Brand Logo Only */}
        <div className="flex items-center shrink-0">
          <Link
            suppressHydrationWarning
            href="/"
            className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-0.5"
            aria-label="SteemPad Home"
          >
            <SteemPadLogo height={30} />
          </Link>
        </div>

        {/* Center: Tactile Pill Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center bg-zinc-900/70 border border-white/[0.06] rounded-full p-1 text-xs font-medium"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                suppressHydrationWarning
                href={item.href}
                className={`relative px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  isActive
                    ? "bg-white/[0.1] text-white shadow-xs font-semibold border border-white/[0.08]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="ml-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded-full font-bold tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Currency, Notifications & Auth CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Search Palette Trigger */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search articles, tags, and authors"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-855 border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-white text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline text-zinc-400 text-[11px]">Search...</span>
            <kbd className="hidden sm:inline font-mono text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/[0.06]">
              ⌘K
            </kbd>
          </button>

          {/* Currency Switcher (Icon only) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setCurrencyDropdown(!currencyDropdown);
                setUserDropdown(false);
              }}
              aria-expanded={currencyDropdown}
              aria-label={`Change Display Currency (Current: ${currentCurrencyMeta.code})`}
              title={`Display Currency: ${currentCurrencyMeta.code} (${currentCurrencyMeta.symbol})`}
              className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
            </button>

            {currencyDropdown && (
              <div
                className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setCurrencyDropdown(false)}
                role="menu"
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Display Currency
                </div>
                {currencies.map((c) => (
                  <button
                    key={c.code}
                    role="menuitem"
                    onClick={() => setCurrency(c.code)}
                    className={`w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between transition cursor-pointer ${
                      currency === c.code ? "text-cyan-400 font-bold bg-cyan-950/20" : "text-zinc-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs w-4 text-center">{c.symbol}</span>
                      <span>{c.label}</span>
                    </span>
                    {currency === c.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Notifications */}
          <NotificationCenter />

          {/* Primary Action: Write / Studio (Icon only) */}
          <Link
            suppressHydrationWarning
            href="/submit"
            className="p-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition font-bold shadow-sm shadow-cyan-500/25 flex items-center justify-center active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="Create New Article"
            title="Write New Article"
          >
            <PenSquare className="w-4 h-4" />
          </Link>


          {/* User Auth Profile Capsule */}
          {!mounted ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : isLoggedIn && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserDropdown(!userDropdown);
                  setCurrencyDropdown(false);
                }}
                aria-expanded={userDropdown}
                aria-label={`User menu for @${user.username}`}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatarUrl || `https://steemitimages.com/u/${user.username}/avatar`}
                  alt={user.username}
                  className="w-6 h-6 rounded-full bg-zinc-800 object-cover border border-cyan-500/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=06b6d4&color=000`;
                  }}
                />
                <span className="hidden md:inline text-xs font-semibold text-zinc-200">
                  @{user.username}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {userDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100 divide-y divide-zinc-800/80"
                  onClick={() => setUserDropdown(false)}
                  role="menu"
                >
                  {/* Account Header */}
                  <div className="px-4 py-2.5">
                    <div className="font-bold text-white text-sm">@{user.username}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Authenticated via Keychain</span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      suppressHydrationWarning
                      href={`/@${user.username}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                      role="menuitem"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      suppressHydrationWarning
                      href="/wallet"
                      className="flex items-center gap-2.5 px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                      role="menuitem"
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Wallet & Delegations</span>
                    </Link>
                    <Link
                      suppressHydrationWarning
                      href="/bookmarks"
                      className="flex items-center gap-2.5 px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                      role="menuitem"
                    >
                      <Bookmark className="w-4 h-4 text-purple-400" />
                      <span>Saved Reading List</span>
                    </Link>
                    <Link
                      suppressHydrationWarning
                      href="/witnesses"
                      className="flex items-center gap-2.5 px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                      role="menuitem"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Witness Governance</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-800/80 transition font-semibold flex items-center gap-2.5 cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              suppressHydrationWarning
              href="/login"
              className="text-xs font-semibold text-zinc-200 hover:text-white px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/[0.08] hover:border-white/[0.18] transition flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Toggle Mobile Menu"
            className="md:hidden text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="md:hidden bg-zinc-950 border-t border-white/[0.08] px-4 py-3 space-y-1.5 text-xs font-medium animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                suppressHydrationWarning
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition ${
                  isActive
                    ? "bg-white/[0.08] text-white font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-zinc-800/80">
            {mounted && !isLoggedIn && (
              <Link
                suppressHydrationWarning
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block text-center text-cyan-400 hover:text-cyan-300 font-bold py-2 bg-zinc-900 rounded-xl"
              >
                Sign In with Steem Keychain
              </Link>
            )}
            {mounted && isLoggedIn && user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="block text-red-400 hover:text-red-300 font-bold py-2 w-full text-center bg-red-950/20 rounded-xl"
              >
                Sign Out (@{user.username})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Quick Search Palette Modal */}
      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </header>
  );
}
