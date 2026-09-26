import { getTrendingPosts } from "@/lib/steem";
import PostCard from "@/components/PostCard";
import FeedTabs from "@/components/FeedTabs";

// Revalidate every 60 seconds - ISR (Incremental Static Regeneration)
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

export default async function HomePage() {
  const posts = (await getTrendingPosts("", 20)) as Post[];

  return (
    <div>
      <FeedTabs active="trending" />
      <div className="mt-4 space-y-4">
        {posts.map((post) => (
          <PostCard key={`${post.author}-${post.permlink}`} post={post} />
        ))}
      </div>
    </div>
  );
}
