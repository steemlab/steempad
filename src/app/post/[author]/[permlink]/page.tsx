import { getPost, getPostComments } from "@/lib/steem";
import { notFound } from "next/navigation";
import PostDetailView from "@/components/PostDetailView";
import { renderSteemMarkdown } from "@/lib/renderMarkdown";

export const revalidate = 60;

interface PostResponse {
  title: string;
  author: string;
  permlink: string;
  body: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
  total_payout_value?: string;
  curator_payout_value?: string;
  author_reputation: number;
  json_metadata: string;
  active_votes: {
    percent: number;
    reputation: number | string;
    rshares: string | number;
    time: string;
    voter: string;
    weight: number;
  }[];
}

interface CommentResponse {
  author: string;
  body: string;
  created: string;
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ author: string; permlink: string }>;
}) {
  const { author, permlink } = await params;
  const cleanAuthor = author.replace("@", "");

  const [post, comments] = await Promise.all([
    getPost(cleanAuthor, permlink),
    getPostComments(cleanAuthor, permlink),
  ]);

  const p = post as PostResponse;

  if (!p?.title) notFound();

  const bodyHtml = renderSteemMarkdown(p.body || "");

  return (
    <PostDetailView
      post={p}
      comments={(comments || []) as CommentResponse[]}
      bodyHtml={bodyHtml}
    />
  );
}
