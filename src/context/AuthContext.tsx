"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  isSteemKeychainInstalled,
  loginWithSteemKeychain,
  waitForSteemKeychain,
} from "@/lib/keychain";
import { getAccount } from "@/lib/steem";

export interface AuthUser {
  username: string;
  authMethod: "keychain" | "posting_key";
  avatarUrl?: string;
  reputation?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isKeychainAvailable: boolean;
  isLoading: boolean;
  loginKeychain: (
    username: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginPostingKey: (
    username: string,
    postingKey: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "steemfeed_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isKeychainAvailable, setIsKeychainAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check Keychain presence & load existing session
  useEffect(() => {
    // 1. Detect Keychain
    waitForSteemKeychain(1500).then((installed) => {
      setIsKeychainAvailable(installed);
    });

    // 2. Load stored session
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      }
    } catch {}

    setIsLoading(false);
  }, []);

  const loginKeychain = async (username: string) => {
    const cleanUser = username.trim().toLowerCase().replace("@", "");
    if (!cleanUser) {
      return { success: false, error: "Please enter a valid Steem username." };
    }

    // Verify account exists on-chain
    try {
      const acc = await getAccount(cleanUser);
      if (!acc) {
        return {
          success: false,
          error: `Account @${cleanUser} does not exist on Steem blockchain.`,
        };
      }
    } catch {
      // Continue even if RPC check fails
    }

    // Sign challenge via Keychain
    const res = await loginWithSteemKeychain(cleanUser);
    if (!res.success) {
      return { success: false, error: res.error || "Keychain login failed." };
    }

    const authData: AuthUser = {
      username: cleanUser,
      authMethod: "keychain",
      avatarUrl: `https://images.hive.blog/u/${cleanUser}/avatar`,
    };

    setUser(authData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    return { success: true };
  };

  const loginPostingKey = async (username: string, postingKey: string) => {
    const cleanUser = username.trim().toLowerCase().replace("@", "");
    const cleanKey = postingKey.trim();

    if (!cleanUser || !cleanKey) {
      return { success: false, error: "Username and Posting Key are required." };
    }

    // Check account exists
    const acc = (await getAccount(cleanUser)) as {
      posting?: { key_auths?: [string, number][] };
    } | null;

    if (!acc) {
      return {
        success: false,
        error: `Account @${cleanUser} does not exist on Steem.`,
      };
    }

    // Basic format check for WIF key (Steem private keys start with 5 and are 51 chars)
    if (!cleanKey.startsWith("5") || cleanKey.length < 50) {
      return {
        success: false,
        error: "Invalid private posting key format. Steem private keys start with '5'.",
      };
    }

    const authData: AuthUser = {
      username: cleanUser,
      authMethod: "posting_key",
      avatarUrl: `https://images.hive.blog/u/${cleanUser}/avatar`,
    };

    setUser(authData);
    // Note: In client-side only architecture, private key can be kept in sessionStorage or memory
    sessionStorage.setItem("steemfeed_pk", cleanKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("steemfeed_pk");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isKeychainAvailable,
        isLoading,
        loginKeychain,
        loginPostingKey,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
