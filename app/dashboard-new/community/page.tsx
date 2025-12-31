"use client";
import { useEffect, useState } from "react";
import StoryBar from "@/components/StoryBar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";

type Author = { _id: string; fullName: string; avatar?: string };
export type FeedPost = {
  _id: string;
  author: Author;
  content: string;
  media?: { url: string; kind: "image" | "video" }[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  sharedFrom?: any;
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-2 sm:px-4 lg:px-6 py-6">
      <div className="space-y-4">
        <StoryBar />
        <PostComposer onPosted={load} />
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p._id} post={p} onMutateFeed={load} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
