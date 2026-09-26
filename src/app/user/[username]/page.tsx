import { getAccount, getAccountPosts, getReputation } from "@/lib/steem";
import PostCard from "@/components/PostCard";
import { notFound } from "next/navigation";

export const revalidate = 60;

interface Post {
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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const name = username.replace("@", "");

  const [account, posts] = await Promise.all([
    getAccount(name),
    getAccountPosts(name, 15),
  ]);

  if (!account) notFound();

  const acc = account as {
    name: string;
    reputation: number;
    post_count: number;
    balance: string;
    vesting_shares: string;
    json_metadata?: string;
  };

  let profileMeta = { profile_image: "", about: "", location: "", website: "" };
  try {
    if (acc.json_metadata) {
      const meta = JSON.parse(acc.json_metadata);
      profileMeta = { ...profileMeta, ...(meta?.profile || {}) };
    }
  } catch {}

  const rep = getReputation(acc.reputation);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {profileMeta.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileMeta.profile_image}
              alt={name}
              className="w-24 h-24 rounded-full object-cover bg-gray-800 border-2 border-blue-500/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-inner">
              {name[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-white">@{name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 font-semibold border border-blue-800">
                Rep: {rep}
              </span>
            </div>
            {profileMeta.about && (
              <p className="text-gray-300 text-sm mt-2 max-w-xl leading-relaxed">
                {profileMeta.about}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-gray-400">
              {profileMeta.location && <span>📍 {profileMeta.location}</span>}
              {profileMeta.website && (
                <a
                  href={profileMeta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  🔗 {profileMeta.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-800/80 text-center">
          <div className="p-2 rounded-xl bg-gray-950/40">
            <div className="text-lg font-bold text-white">{acc.post_count}</div>
            <div className="text-xs text-gray-500 font-medium">Posts</div>
          </div>
          <div className="p-2 rounded-xl bg-gray-950/40">
            <div className="text-lg font-bold text-emerald-400">{acc.balance}</div>
            <div className="text-xs text-gray-500 font-medium">STEEM</div>
          </div>
          <div className="p-2 rounded-xl bg-gray-950/40">
            <div className="text-lg font-bold text-blue-400">
              {parseFloat(acc.vesting_shares).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs text-gray-500 font-medium">VESTS (SP)</div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div>
        <h2 className="text-lg font-bold mb-4 text-gray-200 flex items-center gap-2">
          <span>📝</span>
          <span>Recent Posts</span>
        </h2>
        <div className="space-y-4">
          {(!posts || (posts as Post[]).length === 0) ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 text-sm">
              No posts found for this user.
            </div>
          ) : (
            (posts as Post[]).map((post) => (
              <PostCard key={`${post.author}-${post.permlink}`} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
