// app/admin/research/page.tsx
// Researcher dashboard — Ngày 20.
//
// Purpose: one screen where the researcher sees at a glance who is close to
// dropping out and whether the study is running healthy. Gated behind admin
// role (middleware.ts already checks `token.role === "admin"` for /admin/*).
//
// Deliberately server-rendered so opening the page costs no client-side auth
// round-trip and doesn't need a loading skeleton on the researcher's screen.

import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface OverviewData {
  success: boolean;
  generatedAt: string;
  perArm: Array<{
    condition: string;
    enrolled: number;
    dropped: number;
    active7d: number;
    totalReviews: number;
    reviewsLast7d: number;
    activeLast7d: number;
    compliance7d: number;
  }>;
  stalled: Array<{
    participantCode: string;
    condition: string;
    lastActiveAt?: string;
    enrolledAt: string;
  }>;
  retrieval: {
    counts: Record<string, number>;
    total: number;
    shares: Record<string, number> | null;
    warning: string | null;
  };
  weights: Array<{ version: string; count: number }>;
}

async function fetchOverview(): Promise<OverviewData | null> {
  try {
    const h = headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const base = host ? `${proto}://${host}` : "";
    const res = await fetch(`${base}/api/admin/research/overview`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") ?? "" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function daysSince(iso?: string): string {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000);
  return d < 1 ? "<1" : d.toFixed(1);
}

export default async function ResearchDashboardPage() {
  const data = await fetchOverview();

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Nghiên cứu — Tổng quan</h1>
        <p className="text-red-600 mt-4">
          Không tải được dữ liệu. Kiểm tra MongoDB và middleware admin.
        </p>
      </div>
    );
  }

  const anyRetrievalWarn = data.retrieval.warning === "at_least_one_d_below_10pct";

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Nghiên cứu — Tổng quan</h1>
        <p className="text-sm text-gray-500">Cập nhật: {fmtDate(data.generatedAt)}</p>
      </header>

      {/* Per-arm table */}
      <section>
        <h2 className="text-lg font-medium mb-3">Theo nhánh</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">Nhánh</th>
                <th className="text-right p-2 border">Enrol</th>
                <th className="text-right p-2 border">Bỏ cuộc</th>
                <th className="text-right p-2 border">Active 7d</th>
                <th className="text-right p-2 border">Reviews 7d</th>
                <th className="text-right p-2 border">Tuân thủ 7d</th>
                <th className="text-right p-2 border">Tổng reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.perArm.map((a) => (
                <tr key={a.condition} className="border-t">
                  <td className="p-2 border font-mono">{a.condition}</td>
                  <td className="text-right p-2 border">{a.enrolled}</td>
                  <td className="text-right p-2 border">
                    {a.dropped}{" "}
                    {a.enrolled > 0 && (
                      <span className="text-xs text-gray-500">
                        ({((a.dropped / a.enrolled) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </td>
                  <td className="text-right p-2 border">{a.active7d}</td>
                  <td className="text-right p-2 border">{a.reviewsLast7d.toLocaleString()}</td>
                  <td
                    className={`text-right p-2 border ${
                      a.compliance7d < 0.7 ? "bg-yellow-50" : ""
                    }`}
                  >
                    {(a.compliance7d * 100).toFixed(0)}%
                  </td>
                  <td className="text-right p-2 border">{a.totalReviews.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Retrieval type balance */}
      <section>
        <h2 className="text-lg font-medium mb-3">
          Cân bằng loại truy hồi{" "}
          {anyRetrievalWarn && (
            <span className="ml-2 text-sm text-red-600">
              🚨 có ít nhất 1 mức &lt; 10% — α mất định danh
            </span>
          )}
        </h2>
        {data.retrieval.total === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((d) => {
              const share = data.retrieval.shares?.[d] ?? 0;
              const bad = share < 0.1;
              return (
                <div
                  key={d}
                  className={`p-3 border rounded ${bad ? "bg-red-50 border-red-300" : ""}`}
                >
                  <div className="text-xs text-gray-500">d = {d}</div>
                  <div className="text-lg font-semibold">
                    {(share * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs">
                    {(data.retrieval.counts[d] ?? 0).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Stalled */}
      <section>
        <h2 className="text-lg font-medium mb-3">
          Sắp bỏ cuộc — ≥5 ngày không hoạt động ({data.stalled.length})
        </h2>
        {data.stalled.length === 0 ? (
          <p className="text-gray-500 text-sm">Không có ai</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border">Mã</th>
                  <th className="text-left p-2 border">Nhánh</th>
                  <th className="text-left p-2 border">Enrol</th>
                  <th className="text-left p-2 border">Hoạt động cuối</th>
                  <th className="text-right p-2 border">Ngày im</th>
                </tr>
              </thead>
              <tbody>
                {data.stalled.map((s) => (
                  <tr key={s.participantCode} className="border-t">
                    <td className="p-2 border font-mono">{s.participantCode}</td>
                    <td className="p-2 border font-mono">{s.condition}</td>
                    <td className="p-2 border">{fmtDate(s.enrolledAt)}</td>
                    <td className="p-2 border">{fmtDate(s.lastActiveAt)}</td>
                    <td className="text-right p-2 border">{daysSince(s.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Weights coverage */}
      <section>
        <h2 className="text-lg font-medium mb-3">Phân bố weightsVersion</h2>
        <table className="text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border">Version</th>
              <th className="text-right p-2 border">Rows</th>
            </tr>
          </thead>
          <tbody>
            {data.weights.map((w) => (
              <tr key={w.version} className="border-t">
                <td className="p-2 border font-mono">{w.version}</td>
                <td className="text-right p-2 border">{w.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
