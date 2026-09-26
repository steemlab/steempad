// SteemPad Local-First Bookmarks Helper

export interface BookmarkedPost {
  author: string;
  permlink: string;
  title: string;
  preview: string;
  thumbnail?: string | null;
  created: string;
  net_votes: number;
  payout: string;
  savedAt: number;
}

const STORAGE_KEY = "steempad_bookmarks_v1";

export function getBookmarks(): BookmarkedPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(author: string, permlink: string): boolean {
  if (typeof window === "undefined") return false;
  const bookmarks = getBookmarks();
  return bookmarks.some(
    (b) => b.author.toLowerCase() === author.toLowerCase() && b.permlink === permlink
  );
}

export function toggleBookmark(post: {
  author: string;
  permlink: string;
  title: string;
  preview?: string;
  thumbnail?: string | null;
  created: string;
  net_votes?: number;
  payout?: string;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getBookmarks();
    const exists = current.some(
      (b) => b.author.toLowerCase() === post.author.toLowerCase() && b.permlink === post.permlink
    );

    let next: BookmarkedPost[];
    if (exists) {
      next = current.filter(
        (b) => !(b.author.toLowerCase() === post.author.toLowerCase() && b.permlink === post.permlink)
      );
    } else {
      const item: BookmarkedPost = {
        author: post.author,
        permlink: post.permlink,
        title: post.title || "(Untitled)",
        preview: post.preview || "",
        thumbnail: post.thumbnail ?? null,
        created: post.created,
        net_votes: post.net_votes || 0,
        payout: post.payout || "$0.00",
        savedAt: Date.now(),
      };
      next = [item, ...current];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("steempad_bookmarks_updated"));
    return !exists;
  } catch {
    return false;
  }
}

export function removeBookmark(author: string, permlink: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getBookmarks();
    const next = current.filter(
      (b) => !(b.author.toLowerCase() === author.toLowerCase() && b.permlink === permlink)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("steempad_bookmarks_updated"));
  } catch {}
}

export function clearAllBookmarks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("steempad_bookmarks_updated"));
  } catch {}
}
