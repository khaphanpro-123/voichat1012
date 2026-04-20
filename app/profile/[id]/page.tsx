"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import PostCard from "@/components/PostCard";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  //  Bắt buộc unwrap Promise bằng use()
  const { id } = use(params);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingName, setEditingName] = useState("");
  const [editingBio, setEditingBio] = useState("");

  const me =
    typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem("user") || "null")
      : null;

  async function load() {
    const res = await fetch(`/api/users/${id}`);
    const data = await res.json();
    setUser(data.user);
    setPosts(data.posts || []);
    setEditingName(data.user?.fullName || "");
    setEditingBio(data.user?.bio || "");
  }

  async function updateProfile() {
    const token = sessionStorage.getItem("token") || "";
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName: editingName, bio: editingBio }),
    });
    await load();
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!user) return <main className="max-w-4xl mx-auto p-6">Đang tải...</main>;

  const isOwner = me?.id === user.id;

  return (
    <main className="mx-auto max-w-4xl px-2 sm:px-4 lg:px-6 py-6 space-y-4">
      <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 p-4 flex items-center gap-4">
        <img
          src={user.avatar || "/avatar-placeholder.png"}
          className="w-20 h-20 rounded-full object-cover"
        />
        <div className="flex-1">
          {isOwner ? (
            <div className="space-y-2">
              <input
                className="w-full px-3 py-2 rounded border bg-transparent"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
              <textarea
                className="w-full px-3 py-2 rounded border bg-transparent"
                rows={3}
                value={editingBio}
                onChange={(e) => setEditingBio(e.target.value)}
                placeholder="Giới thiệu về bạn..."
              />
              <button
                onClick={updateProfile}
                className="px-3 py-2 rounded bg-emerald-600 text-white"
              >
                Lưu
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{user.fullName}</h1>
              <p className="text-sm text-neutral-500">{user.email}</p>
              <p className="text-sm mt-2">{user.bio}</p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p._id} post={p} onMutateFeed={load} />
        ))}
      </div>
    </main>
  );
}
