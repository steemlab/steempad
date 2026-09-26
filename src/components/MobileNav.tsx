"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Compass, ShieldCheck, SquarePen, WalletCards, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";

export default function MobileNav() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isExploreActive = pathname === "/" || pathname === "/hot" || pathname === "/new";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800/80 px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Explore */}
        <Link
          suppressHydrationWarning
          href="/"
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
            isExploreActive ? "text-cyan-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {/* Witnesses */}
        <Link
          suppressHydrationWarning
          href="/witnesses"
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
            pathname === "/witnesses" ? "text-cyan-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Witnesses</span>
        </Link>

        {/* Create Post Action */}
        <Link
          suppressHydrationWarning
          href="/submit"
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition transform active:scale-95"
        >
          <SquarePen className="w-5 h-5" />
        </Link>

        {/* Saved Bookmarks */}
        <Link
          suppressHydrationWarning
          href="/bookmarks"
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
            pathname === "/bookmarks" ? "text-purple-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span>Saved</span>
        </Link>

        {/* Wallet */}
        <Link
          suppressHydrationWarning
          href="/wallet"
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
            pathname === "/wallet" ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <WalletCards className="w-5 h-5" />
          <span>Wallet</span>
        </Link>
      </div>
    </nav>
  );
}
