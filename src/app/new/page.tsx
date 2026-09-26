import { getNewPosts } from "@/lib/steem";
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

export default async function NewPage() {
  const posts = (await getNewPosts("", 20)) as Post[];
  return (
    <div>
      <FeedTabs active="new" />
      <div className="mt-4 space-y-4">
        {posts.map((post) => (
          <PostCard key={`${post.author}-${post.permlink}`} post={post} />
        ))}
      </div>
    </div>
  );
}
