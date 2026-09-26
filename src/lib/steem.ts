// Steem blockchain API client
// Laser-focused on the Steem blockchain nodes

const STEEM_NODES = [
  "https://api.steemit.com",
  "https://api.steem.fans",
  "https://steemd.minnowsupportproject.org",
];

async function callAPI(
  nodes: string[],
  method: string,
  params: unknown[]
): Promise<unknown> {
  for (const node of nodes) {
    try {
      const res = await fetch(node, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        next: { revalidate: 30 },
      });
      const data = await res.json();
      if (data.result) return data.result;
    } catch {
      continue;
    }
  }
  throw new Error(`All Steem nodes failed for method: ${method}`);
}

// ─── Posts & Feeds ────────────────────────────────────────────

export async function getTrendingPosts(tag = "", limit = 20) {
  return callAPI(STEEM_NODES, "condenser_api.get_discussions_by_trending", [
    { tag, limit },
  ]);
}

export async function getNewPosts(tag = "", limit = 20) {
  return callAPI(STEEM_NODES, "condenser_api.get_discussions_by_created", [
    { tag, limit },
  ]);
}

export async function getHotPosts(tag = "", limit = 20) {
  return callAPI(STEEM_NODES, "condenser_api.get_discussions_by_hot", [
    { tag, limit },
  ]);
}

export async function getPost(author: string, permlink: string) {
  return callAPI(STEEM_NODES, "condenser_api.get_content", [author, permlink]);
}

export async function getPostComments(author: string, permlink: string) {
  return callAPI(STEEM_NODES, "condenser_api.get_content_replies", [
    author,
    permlink,
  ]);
}

export async function getAccountPosts(account: string, limit = 20) {
  return callAPI(STEEM_NODES, "condenser_api.get_discussions_by_blog", [
    { tag: account, limit },
  ]);
}

// ─── Accounts ─────────────────────────────────────────────────

export async function getAccount(username: string) {
  const result = (await callAPI(
    STEEM_NODES,
    "condenser_api.get_accounts",
    [[username]]
  )) as unknown[];
  return result?.[0] ?? null;
}

export async function getFollowers(account: string, limit = 100) {
  return callAPI(STEEM_NODES, "condenser_api.get_followers", [
    account,
    "",
    "blog",
    limit,
  ]);
}

export async function getFollowing(account: string, limit = 100) {
  return callAPI(STEEM_NODES, "condenser_api.get_following", [
    account,
    "",
    "blog",
    limit,
  ]);
}

// ─── Transfer History & Smart Counterparties ──────────────────

export interface CounterpartyInfo {
  username: string;
  totalTransfers: number;
  sentCount: number;
  receivedCount: number;
  lastDate: string;
  lastAmount: string;
}

/**
 * Fetch transfer history from Steem blockchain and aggregate counterparties
 * with transaction counts so users never have to memorize usernames.
 */
export async function getAccountTransferContacts(
  account: string,
  limit = 250
): Promise<CounterpartyInfo[]> {
  try {
    const rawHistory = (await callAPI(
      STEEM_NODES,
      "condenser_api.get_account_history",
      [account, -1, limit]
    )) as [number, { timestamp: string; op: [string, { from: string; to: string; amount: string; memo: string }] }][];

    if (!rawHistory || !Array.isArray(rawHistory)) return [];

    const map = new Map<string, CounterpartyInfo>();

    for (const [, item] of rawHistory) {
      if (item?.op?.[0] === "transfer") {
        const tx = item.op[1];
        const isSender = tx.from.toLowerCase() === account.toLowerCase();
        const otherParty = (isSender ? tx.to : tx.from).toLowerCase();

        if (!otherParty || otherParty === account.toLowerCase()) continue;

        const existing = map.get(otherParty) || {
          username: otherParty,
          totalTransfers: 0,
          sentCount: 0,
          receivedCount: 0,
          lastDate: item.timestamp,
          lastAmount: tx.amount,
        };

        existing.totalTransfers += 1;
        if (isSender) existing.sentCount += 1;
        else existing.receivedCount += 1;
        existing.lastDate = item.timestamp;
        existing.lastAmount = tx.amount;

        map.set(otherParty, existing);
      }
    }

    // Sort by most frequent counterparties first
    return Array.from(map.values()).sort(
      (a, b) => b.totalTransfers - a.totalTransfers
    );
  } catch {
    return [];
  }
}

// ─── Global Stats ─────────────────────────────────────────────

export async function getGlobalProps() {
  return callAPI(
    STEEM_NODES,
    "condenser_api.get_dynamic_global_properties",
    []
  );
}

export async function getRewardFund() {
  return callAPI(STEEM_NODES, "condenser_api.get_reward_fund", ["post"]);
}

// ─── Notifications ───────────────────────────────────────────

export interface SteemNotification {
  id: string;
  type: "reply" | "mention" | "transfer" | "vote" | "delegation";
  actor: string;
  target?: string;
  permlink?: string;
  message: string;
  amount?: string;
  timestamp: string;
}

export async function getAccountNotifications(
  username: string
): Promise<SteemNotification[]> {
  try {
    const raw = (await callAPI(
      STEEM_NODES,
      "condenser_api.get_account_history",
      [username, -1, 50]
    )) as Array<[number, { op: [string, Record<string, unknown>]; timestamp: string }]>;

    if (!Array.isArray(raw)) return [];

    const notifications: SteemNotification[] = [];

    for (let i = raw.length - 1; i >= 0; i--) {
      const [seq, item] = raw[i];
      if (!item || !item.op) continue;
      const [opName, opData] = item.op;

      if (opName === "comment") {
        const parentAuthor = String(opData.parent_author || "");
        const author = String(opData.author || "");
        const body = String(opData.body || "");
        const permlink = String(opData.permlink || "");
        const parentPermlink = String(opData.parent_permlink || "");

        if (parentAuthor.toLowerCase() === username.toLowerCase() && author.toLowerCase() !== username.toLowerCase()) {
          notifications.push({
            id: `reply-${seq}`,
            type: "reply",
            actor: author,
            target: parentPermlink,
            permlink: permlink,
            message: body.slice(0, 100),
            timestamp: item.timestamp,
          });
        } else if (author.toLowerCase() !== username.toLowerCase() && body.includes(`@${username}`)) {
          notifications.push({
            id: `mention-${seq}`,
            type: "mention",
            actor: author,
            target: permlink,
            permlink: permlink,
            message: String(opData.title || body.slice(0, 90)),
            timestamp: item.timestamp,
          });
        }
      } else if (opName === "transfer") {
        const to = String(opData.to || "");
        const from = String(opData.from || "");
        if (to.toLowerCase() === username.toLowerCase() && from.toLowerCase() !== username.toLowerCase()) {
          notifications.push({
            id: `transfer-${seq}`,
            type: "transfer",
            actor: from,
            amount: String(opData.amount || ""),
            message: String(opData.memo || "Transferred funds"),
            timestamp: item.timestamp,
          });
        }
      } else if (opName === "vote") {
        const author = String(opData.author || "");
        const voter = String(opData.voter || "");
        const weight = Number(opData.weight || 0);
        const permlink = String(opData.permlink || "");
        if (author.toLowerCase() === username.toLowerCase() && voter.toLowerCase() !== username.toLowerCase()) {
          notifications.push({
            id: `vote-${seq}`,
            type: "vote",
            actor: voter,
            target: permlink,
            permlink: permlink,
            message: `Upvoted with ${(weight / 100).toFixed(0)}% weight`,
            timestamp: item.timestamp,
          });
        }
      } else if (opName === "delegate_vesting_shares") {
        const delegatee = String(opData.delegatee || "");
        const delegator = String(opData.delegator || "");
        if (delegatee.toLowerCase() === username.toLowerCase() && delegator.toLowerCase() !== username.toLowerCase()) {
          notifications.push({
            id: `delegation-${seq}`,
            type: "delegation",
            actor: delegator,
            amount: String(opData.vesting_shares || ""),
            message: "Delegated SP to you",
            timestamp: item.timestamp,
          });
        }
      }
    }

    return notifications;
  } catch {
    return [];
  }
}

// ─── Delegations & Witnesses ─────────────────────────────────

export interface VestingDelegation {
  id: number;
  delegator: string;
  delegatee: string;
  vesting_shares: string;
  min_delegation_time: string;
}

export async function getVestingDelegations(
  username: string
): Promise<VestingDelegation[]> {
  try {
    const raw = (await callAPI(
      STEEM_NODES,
      "condenser_api.get_vesting_delegations",
      [username, "", 50]
    )) as VestingDelegation[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export interface SteemWitness {
  owner: string;
  total_missed: number;
  last_aslot: number;
  votes: string;
  running_version: string;
  url: string;
}

export async function getWitnessesByVote(limit = 30): Promise<SteemWitness[]> {
  try {
    const raw = (await callAPI(
      STEEM_NODES,
      "condenser_api.get_witnesses_by_vote",
      ["", limit]
    )) as SteemWitness[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}


// ─── Helpers ──────────────────────────────────────────────────

export function vestsToSP(vests: number, totalVests: number, totalSteem: number) {
  if (!totalVests || totalVests === 0) return 0;
  return (vests / totalVests) * totalSteem;
}

export function getReputation(rawRep: number): number {
  if (!rawRep) return 25;
  const neg = rawRep < 0;
  const rep = Math.log10(Math.abs(rawRep));
  const result = Math.max((rep - 9) * 9 + 25, 0);
  return parseFloat((neg ? -result : result).toFixed(0));
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
