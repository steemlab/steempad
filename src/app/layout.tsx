import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SteemPad – Fast, Modern Editorial Platform for Steem",
  description:
    "An ultra-fast, minimalist editorial frontend and studio for the Steem blockchain with Keychain auth, 1-click micro-tipping, and zero gas fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen selection:bg-blue-600 selection:text-white pb-20 md:pb-6`}
      >
        <AuthProvider>
          <CurrencyProvider>
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
            <MobileNav />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
