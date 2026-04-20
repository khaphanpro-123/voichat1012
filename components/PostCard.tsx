"use client";
import { useState } from "react";
import CommentList from "@/components/CommentList";
import Link from "next/link";
export default function PostCard({ post, onMutateFeed }: { post: any; onMutateFeed?: () => void }) {
  const [open, setOpen] = useState(false);

  const createdAt = post.createdAt ? new Date(post.createdAt) : null;

  async function toggleLike() {
    const token = sessionStorage
      .getItem("token") || "";
    await fetch(`/api/posts/${post._id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    onMutateFeed?.();
  }

  async function share() {
    const token = sessionStorage
      .getItem("token") || "";
    const res = await fetch(`/api/posts/${post._id}/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) onMutateFeed?.();
  }

  return (
    <article className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 p-3 shadow-sm">
      <header className="flex items-center gap-3">
        <Link href={`/profile/${post.author?._id}`} className="flex items-center gap-2">
          <img
            src={post.author?.avatar || "/avatar-placeholder.png"}
            alt="avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="font-medium">{post.author?.fullName || "Ẩn danh"}</span>
        </Link>
        <time className="text-xs text-neutral-500">{createdAt ? createdAt.toLocaleString() : ""}</time>
      </header>

      {post.sharedFrom && (
        <div className="mt-3 rounded-xl border p-3">
          <div className="text-sm text-neutral-500 mb-2">Đã chia sẻ</div>
          <div className="flex items-center gap-2 mb-2">
            <img
              className="w-6 h-6 rounded-full"
              src={post.sharedFrom?.author?.avatar || "/avatar-placeholder.png"}
            />
            <div className="text-sm">{post.sharedFrom?.author?.fullName}</div>
          </div>
          <div className="whitespace-pre-wrap text-sm">{post.sharedFrom?.content}</div>
        </div>
      )}

      {post.content && <p className="mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>}

      {post.media?.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {post.media.map((m: any, i: number) =>
            m.kind === "video" ? (
              <video key={i} controls className="w-full rounded-xl">
                <source src={m.url} />
              </video>
            ) : (
              <img key={i} src={m.url} alt="media" className="w-full rounded-xl" />
            )
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-sm">
        <button className="px-3 py-2 rounded-lg hover:bg-black/5" onClick={toggleLike}>
           Thích {post.likesCount ? `(${post.likesCount})` : ""}
        </button>
        <button className="px-3 py-2 rounded-lg hover:bg-black/5" onClick={() => setOpen((s) => !s)}>
           Bình luận {post.commentsCount ? `(${post.commentsCount})` : ""}
        </button>
        <button className="px-3 py-2 rounded-lg hover:bg-black/5" onClick={share}>
           Chia sẻ {post.sharesCount ? `(${post.sharesCount})` : ""}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <CommentList postId={post._id} onAnyChange={onMutateFeed} />
        </div>
      )}
    </article>
  );
}
