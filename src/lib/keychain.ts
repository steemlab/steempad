// Steem Keychain TypeScript interface & helpers

export interface KeychainResponse {
  success: boolean;
  error?: string;
  message?: string;
  result?: string;
  data?: unknown;
}

declare global {
  interface Window {
    steem_keychain?: {
      requestHandshake: (callback: () => void) => void;
      requestSignBuffer: (
        account: string,
        message: string,
        keyType: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestVote: (
        account: string,
        permlink: string,
        author: string,
        weight: number,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestPost: (
        account: string,
        title: string,
        body: string,
        parent_perm: string,
        parent_author: string,
        json_metadata: string,
        permlink: string,
        comment_options: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestTransfer: (
        account: string,
        to: string,
        amount: string,
        memo: string,
        currency: string,
        callback: (response: KeychainResponse) => void,
        enforce?: boolean,
        rpc?: string
      ) => void;
      requestPowerUp: (
        account: string,
        recipient: string,
        steem: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestPowerDown: (
        account: string,
        steemPower: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestDelegation: (
        account: string,
        delegatee: string,
        amount: string,
        unit: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestWitnessVote: (
        account: string,
        witness: string,
        vote: boolean,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
      requestCustomJson: (
        account: string,
        id: string,
        keyType: string,
        json: string,
        display_name: string,
        callback: (response: KeychainResponse) => void,
        rpc?: string
      ) => void;
    };
  }
}

/**
 * Check if Steem Keychain is installed in the user's browser
 */
export function isSteemKeychainInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.steem_keychain;
}

/**
 * Wait up to 1 second for Keychain extension injection if page just loaded
 */
export async function waitForSteemKeychain(timeoutMs = 1000): Promise<boolean> {
  if (isSteemKeychainInstalled()) return true;
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (isSteemKeychainInstalled()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Authenticate via Steem Keychain by signing a login challenge buffer
 */
export async function loginWithSteemKeychain(
  username: string
): Promise<{ success: boolean; error?: string; signature?: string }> {
  const ready = await waitForSteemKeychain(800);
  if (!ready || !window.steem_keychain) {
    return {
      success: false,
      error: "Steem Keychain extension not found. Please install it from Chrome Web Store or Firefox Add-ons.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const challenge = `SteemFeed Login: ${username} at ${timestamp}`;

  return new Promise((resolve) => {
    window.steem_keychain!.requestSignBuffer(
      username,
      challenge,
      "Posting",
      (res: KeychainResponse) => {
        if (res.success) {
          resolve({ success: true, signature: res.result });
        } else {
          resolve({
            success: false,
            error: res.message || res.error || "Login canceled or rejected.",
          });
        }
      }
    );
  });
}

/**
 * Upvote a post or comment via Steem Keychain
 * @param weight 0 to 10000 (10000 = 100% upvote)
 */
export async function voteWithSteemKeychain(
  username: string,
  author: string,
  permlink: string,
  weight = 10000
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return {
      success: false,
      error: "Steem Keychain is not installed.",
    };
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestVote(
      username,
      permlink,
      author,
      weight,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

export type PostRewardOption = "50" | "100" | "0";

/**
 * Broadcast a new post via Steem Keychain
 */
export async function submitPostWithSteemKeychain(
  username: string,
  title: string,
  body: string,
  tags: string[],
  parentAuthor = "",
  parentPermlink = "",
  rewardOption: PostRewardOption = "50"
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  const primaryTag = tags[0] || "general";
  const parent_perm = parentPermlink || primaryTag;
  const parent_author = parentAuthor;

  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const permlink = `${cleanTitle}-${Date.now().toString(36)}`;

  const json_metadata = JSON.stringify({
    app: "steempad/1.0",
    format: "markdown",
    tags: tags,
  });

  let comment_options = "";
  if (rewardOption === "100") {
    comment_options = JSON.stringify({
      author: username,
      permlink: permlink,
      max_accepted_payout: "1000000.000 SBD",
      percent_steem_dollars: 0,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [],
    });
  } else if (rewardOption === "0") {
    comment_options = JSON.stringify({
      author: username,
      permlink: permlink,
      max_accepted_payout: "0.000 SBD",
      percent_steem_dollars: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [],
    });
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestPost(
      username,
      title,
      body,
      parent_perm,
      parent_author,
      json_metadata,
      permlink,
      comment_options,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Broadcast a comment or reply to an existing post via Steem Keychain
 */
export async function submitCommentWithSteemKeychain(
  username: string,
  parentAuthor: string,
  parentPermlink: string,
  body: string
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  const permlink = `re-${parentPermlink.slice(0, 30)}-${Date.now().toString(36)}`;
  const json_metadata = JSON.stringify({
    app: "steemfeed/1.0",
    format: "markdown",
  });

  return new Promise((resolve) => {
    window.steem_keychain!.requestPost(
      username,
      "",
      body,
      parentPermlink,
      parentAuthor,
      json_metadata,
      permlink,
      "",
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Power Up liquid STEEM to Steem Power (SP)
 */
export async function powerUpWithSteemKeychain(
  username: string,
  amount: string,
  recipient = ""
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  const target = recipient.trim() || username;
  return new Promise((resolve) => {
    window.steem_keychain!.requestPowerUp(
      username,
      target,
      amount,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Start a 13-week Power Down of Steem Power
 */
export async function powerDownWithSteemKeychain(
  username: string,
  steemPower: string
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestPowerDown(
      username,
      steemPower,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Transfer liquid STEEM or SBD to another account
 */
export async function transferWithSteemKeychain(
  username: string,
  to: string,
  amount: string,
  memo: string,
  currency: "STEEM" | "SBD"
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestTransfer(
      username,
      to,
      amount,
      memo,
      currency,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Delegate Steem Power to another account via Steem Keychain
 */
export async function delegateWithSteemKeychain(
  username: string,
  delegatee: string,
  amount: string,
  unit: "SP" | "VESTS" = "SP"
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestDelegation(
      username,
      delegatee,
      amount,
      unit,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Vote or unvote for a Steem witness via Steem Keychain
 */
export async function voteWitnessWithSteemKeychain(
  username: string,
  witness: string,
  vote = true
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  return new Promise((resolve) => {
    window.steem_keychain!.requestWitnessVote(
      username,
      witness,
      vote,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}

/**
 * Detect if the client is running on a mobile device (Android, iOS, iPadOS)
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || navigator.vendor || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * App store and website links for Steem Keychain Mobile & Extensions
 */
export const STEEM_KEYCHAIN_MOBILE_LINKS = {
  android: "https://play.google.com/store/apps/details?id=com.steemkeychain.mobile",
  ios: "https://apps.apple.com/app/steem-keychain/id1527786483",
  website: "https://steem-keychain.com/",
  extensionChrome: "https://chromewebstore.google.com/detail/steem-keychain/lkcjlnjfpbikmcmbachjpdbijejflpcm",
  extensionFirefox: "https://addons.mozilla.org/en-US/firefox/addon/steem-keychain/",
};

/**
 * Generates a deep link to open any URL directly inside the Steem Keychain Mobile App's Web3 browser.
 * Inside Keychain Mobile's browser, window.steem_keychain is natively injected!
 */
export function getSteemKeychainMobileBrowseUrl(targetUrl?: string): string {
  const current = targetUrl || (typeof window !== "undefined" ? window.location.href : "https://steempad.com");
  return `steem-keychain://browse?url=${encodeURIComponent(current)}`;
}

/**
 * Broadcast follow or unfollow operation via Steem Keychain
 */
export async function followUserWithSteemKeychain(
  follower: string,
  following: string,
  unfollow = false
): Promise<KeychainResponse> {
  const ready = await waitForSteemKeychain(500);
  if (!ready || !window.steem_keychain) {
    return { success: false, error: "Steem Keychain not installed." };
  }

  const json = JSON.stringify([
    "follow",
    {
      follower,
      following,
      what: unfollow ? [] : ["blog"],
    },
  ]);

  return new Promise((resolve) => {
    window.steem_keychain!.requestCustomJson(
      follower,
      "follow",
      "Posting",
      json,
      unfollow ? `Unfollow @${following}` : `Follow @${following}`,
      (res: KeychainResponse) => {
        resolve(res);
      }
    );
  });
}


