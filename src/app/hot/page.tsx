import { getHotPosts } from "@/lib/steem";
import PostCard from "@/components/PostCard";
import FeedTabs from "@/components/FeedTabs";

export const revalidate = 30;

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

export default async function HotPage() {
  const posts = (await getHotPosts("", 20)) as Post[];

  return (
    <div>
      <FeedTabs active="hot" />
      <div className="mt-4 space-y-4">
        {(!posts || posts.length === 0) ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 text-sm">
            No hot posts found right now.
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
