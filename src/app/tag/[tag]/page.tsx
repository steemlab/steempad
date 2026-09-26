import { getTrendingPosts } from "@/lib/steem";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import { Hash, Sparkles } from "lucide-react";

export const revalidate = 60;

interface Post {
  id: number;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
  author_reputation: number;
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const cleanTag = decodeURIComponent(tag).toLowerCase().replace(/^#+/, "");

  const posts = (await getTrendingPosts(cleanTag, 25)) as Post[];

  return (
    <div className="space-y-6">
      {/* Tag Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl shadow-inner">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              #{cleanTag}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Trending discussions and articles on the Steem blockchain
            </p>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {!posts || posts.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-3xl text-gray-500 text-sm">
            <p className="font-semibold text-gray-300">No posts found for #{cleanTag}</p>
            <p className="text-xs text-gray-500 mt-1">Be the first to publish a post with this tag!</p>
            <Link
              suppressHydrationWarning
              href="/submit"
              className="mt-4 inline-block px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
            >
              Create Post with #{cleanTag}
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={`${post.author}-${post.permlink}`} post={post} />
          ))
        )}
      </div>
    </div>
  );
}
