import {
  getAccount,
  getAccountPosts,
  getAccountComments,
  getFollowCount,
  getGlobalProps,
} from "@/lib/steem";
import UserProfileView from "@/components/UserProfileView";
import { notFound } from "next/navigation";

export const revalidate = 30;

interface PostItem {
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

interface CommentItem {
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  created: string;
  net_votes: number;
  author_reputation: number;
  children: number;
  pending_payout_value: string;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const name = username.replace("@", "");

  const [account, posts, comments, followCount, globalProps] = await Promise.all([
    getAccount(name),
    getAccountPosts(name, 25),
    getAccountComments(name, 25),
    getFollowCount(name),
    getGlobalProps(),
  ]);

  if (!account) notFound();

  return (
    <UserProfileView
      account={account as any}
      posts={((posts as unknown as PostItem[]) || [])}
      comments={((comments as unknown as CommentItem[]) || [])}
      followCount={followCount}
      globalProps={globalProps as any}
    />
  );
}
