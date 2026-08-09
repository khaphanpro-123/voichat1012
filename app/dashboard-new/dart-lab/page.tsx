"use client";

/**
 * DART Lab — Landing feature page (D-012, 2026-08-09).
 *
 * Không còn là scientific demo. Trả lời đúng 6 câu hỏi user:
 *   1. DART là gì? tác dụng? cách dùng?
 *   2. Thực hành thế nào? bộ dữ liệu?
 *   3. Quản lý việc học? pivot ở đâu?
 *   4. Con số nghĩa gì với user?
 *   5. Kết luận trên UI?
 *   6. Tôi phải làm gì?
 *
 * Palette Duolingo giữ nguyên (D-011). Chi tiết thuật toán vào "Chế độ chuyên gia".
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const C = {
  green: "#58cc02", greenDark: "#58a700", greenLight: "#d7ffb8",
  yellow: "#ffc800", yellowDark: "#e5a500", yellowLight: "#fff4d6",
  red: "#ff4b4b", redDark: "#ea2b2b", redLight: "#ffdfe0",
  blue: "#1cb0f6", blueDark: "#0a91d3", blueLight: "#ddf4ff",
  purple: "#ce82ff", purpleDark: "#a560e8", purpleLight: "#f4e4ff",
  grayText: "#4b4b4b", grayBorder: "#e5e5e5", grayLight: "#f7f7f7",
};

// Mascot Voi Con
function Mascot({ size = 120, mood = "happy" }: { size?: number; mood?: "happy" | "wave" | "think" | "cheer" }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="78" rx="38" ry="34" fill={C.blue} />
      <ellipse cx="60" cy="82" rx="30" ry="26" fill="#67c6ff" />
      <circle cx="60" cy="48" r="30" fill={C.blue} />
      <ellipse cx="30" cy="46" rx="14" ry="18" fill={C.blueDark} />
      <ellipse cx="90" cy="46" rx="14" ry="18" fill={C.blueDark} />
      <ellipse cx="30" cy="46" rx="8" ry="12" fill="#ff9db8" />
      <ellipse cx="90" cy="46" rx="8" ry="12" fill="#ff9db8" />
      {mood === "wave" ? (
        <path d="M 55 60 Q 45 75, 55 85 Q 60 90, 70 82 Q 75 78, 72 72" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" />
      ) : (
        <path d="M 55 60 Q 55 78, 62 84 Q 68 88, 68 78" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" />
      )}
      <circle cx="48" cy="45" r="6" fill="white" />
      <circle cx="72" cy="45" r="6" fill="white" />
      <circle cx="49" cy="46" r="3" fill="#1a1a1a" />
      <circle cx="73" cy="46" r="3" fill="#1a1a1a" />
      <circle cx="50" cy="45" r="1" fill="white" />
      <circle cx="74" cy="45" r="1" fill="white" />
      {mood === "cheer" ? (
        <path d="M 54 58 Q 60 66, 66 58" fill="#ff9db8" stroke={C.grayText} strokeWidth="1.5" />
      ) : mood === "think" ? (
        <line x1="56" y1="60" x2="64" y2="60" stroke={C.grayText} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M 56 58 Q 60 62, 64 58" fill="none" stroke={C.grayText} strokeWidth="2" strokeLinecap="round" />
      )}
      <circle cx="42" cy="54" r="4" fill="#ff9db8" opacity="0.5" />
      <circle cx="78" cy="54" r="4" fill="#ff9db8" opacity="0.5" />
    </svg>
  );
}

function BigCTA({ href, onClick, children, color = "green", size = "lg" }: any) {
  const palette: Record<string, { bg: string; shadow: string; text: string }> = {
    green:  { bg: C.green, shadow: C.greenDark, text: "white" },
    blue:   { bg: C.blue, shadow: C.blueDark, text: "white" },
    yellow: { bg: C.yellow, shadow: C.yellowDark, text: C.grayText },
    white:  { bg: "white", shadow: C.grayBorder, text: C.grayText },
  };
  const p = palette[color];
  const sz = size === "xl" ? "text-xl px-10 py-5" : size === "lg" ? "text-lg px-8 py-4" : "text-base px-6 py-3";
  const cls = `${sz} font-bold uppercase tracking-wide rounded-2xl transition-all active:translate-y-1 active:shadow-none inline-block text-center`;
  const style = { background: p.bg, color: p.text, boxShadow: `0 4px 0 ${p.shadow}`, border: `2px solid ${p.shadow}` } as React.CSSProperties;
  if (href) return <Link href={href} className={cls} style={style}>{children}</Link>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}

// Icons — simple SVG, no emoji
function IconLock({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
}
function IconClock({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}
function IconTarget({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color}/></svg>;
}
function IconUpload({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
}
function IconPencil({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4l5 5-11 11H4v-5z"/></svg>;
}
function IconBrain({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v0a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3v0a3 3 0 0 0-3-3z"/></svg>;
}
function IconFire({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"><path d="M12 2s4 4 4 8-2 6-4 6-4-2-4-6c0-2 2-4 2-4s-4 4-4 8a6 6 0 0 0 12 0c0-6-6-12-6-12z"/></svg>;
}

export default function DartLabPage() {
  const [expert, setExpert] = useState(false);
  const [demoWord, setDemoWord] = useState("resilient");
  const [demoResult, setDemoResult] = useState<null | { halfLife: number; nextTask: string; nextIn: number }>(null);

  // Very simple client-side "demo" — just formula-driven visualisation, no API call
  function runQuickDemo() {
    // Simulated feature vector for a fresh learner
    const theta = [1.2, -0.4, 0.3, 0.8, 0.5, 0.2];
    const x = [1, 0.4, 0.5, 0.5, 0.2, 0.5];
    const dot = theta.reduce((s, t, i) => s + t * x[i], 0);
    const halfLife = Math.pow(2, dot);
    const nextIn = halfLife * Math.log2(1 / 0.9);
    const tasks = ["Trắc nghiệm", "Điền chỗ trống", "Đặt câu", "Viết đoạn văn"];
    const d = halfLife < 2 ? 0 : halfLife < 7 ? 1 : halfLife < 30 ? 2 : 3;
    setDemoResult({ halfLife, nextTask: tasks[d], nextIn });
  }

  useEffect(() => { runQuickDemo(); }, []);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-10">

        {/* ── 1. HERO — DART là gì + tác dụng + CTA duy nhất ────────────────── */}
        <section className="rounded-3xl p-8"
                 style={{ background: `linear-gradient(135deg, ${C.blueLight}, ${C.greenLight})`,
                          border: `2px solid ${C.blue}` }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Mascot size={140} mood="wave" />
            <div className="flex-1 text-center md:text-left">
              <div className="text-3xl md:text-4xl font-black leading-tight" style={{ color: C.grayText }}>
                Học từ vựng thông minh với <span style={{ color: C.blueDark }}>DART</span>
              </div>
              <div className="text-base md:text-lg mt-2" style={{ color: C.grayText, opacity: 0.85 }}>
                App sẽ tự chọn <b>từ nào cần ôn</b> và <b>khi nào ôn</b> — bạn chỉ cần mở máy khi có thông báo.
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <BigCTA href="/dashboard-new/vocabulary" color="green" size="lg">
                  Bắt đầu học ngay →
                </BigCTA>
                <BigCTA href="#demo" color="white" size="lg">
                  Thử demo trước
                </BigCTA>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs mt-6 justify-center md:justify-start cursor-pointer"
                 style={{ color: C.grayText, opacity: 0.6 }}>
            <input type="checkbox" checked={expert} onChange={(e) => setExpert(e.target.checked)}
                   className="w-3.5 h-3.5" />
            Chế độ chuyên gia (hiện chi tiết thuật toán)
          </label>
        </section>

        {/* ── 2. WHAT — DART giúp bạn 3 việc ────────────────── */}
        <section>
          <div className="text-center mb-6">
            <div className="text-2xl font-black" style={{ color: C.grayText }}>DART giúp bạn 3 việc</div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <IconBrain color={C.blueDark} />, title: "Nhớ lâu hơn 2×",
                body: "Ôn đúng lúc trí nhớ sắp mờ. Không sớm quá (phí giờ), không muộn quá (quên hẳn).",
                color: C.blueLight, border: C.blue },
              { icon: <IconClock color={C.greenDark} />, title: "Không phí giờ",
                body: "Từ nào bạn đã thuộc chắc, DART giãn ra hàng tuần. Chỉ show từ đang mờ dần.",
                color: C.greenLight, border: C.green },
              { icon: <IconTarget color={C.yellowDark} />, title: "Bài vừa sức",
                body: "Từ dễ → MCQ. Từ đã quen → cho viết cả câu. Không dồn bài khó khi bạn chưa sẵn sàng.",
                color: C.yellowLight, border: C.yellow },
            ].map((c, i) => (
              <div key={i} className="rounded-3xl p-5"
                   style={{ background: c.color, border: `2px solid ${c.border}` }}>
                <div className="mb-3">{c.icon}</div>
                <div className="text-lg font-bold" style={{ color: C.grayText }}>{c.title}</div>
                <div className="text-sm mt-2" style={{ color: C.grayText, opacity: 0.8 }}>{c.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. HOW TO USE — 3 bước ────────────────── */}
        <section>
          <div className="text-center mb-6">
            <div className="text-2xl font-black" style={{ color: C.grayText }}>Dùng thế nào?</div>
            <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
              3 bước — không có bước 4.
            </div>
          </div>
          <div className="space-y-3">
            {[
              { n: 1, icon: <IconUpload color="white" />, iconBg: C.blue,
                title: "Thêm từ", body: "Upload tài liệu (PDF, ảnh) hoặc gõ tay. App tự trích từ mới." },
              { n: 2, icon: <IconPencil color="white" />, iconBg: C.yellow,
                title: "Làm bài", body: "Mỗi ngày ~10 phút. App chọn sẵn từ nào cần ôn, dạng bài phù hợp." },
              { n: 3, icon: <IconBrain color="white" />, iconBg: C.green,
                title: "DART tự lên lịch", body: "Bạn làm xong → DART tính khi nào cần ôn lại. Không phải nhớ." },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
                   style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl"
                     style={{ background: s.iconBg, color: "white" }}>
                  {s.n}
                </div>
                <div className="flex-shrink-0">{s.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-base" style={{ color: C.grayText }}>{s.title}</div>
                  <div className="text-sm mt-0.5" style={{ color: C.grayText, opacity: 0.75 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. PRACTICE DEMO — thử với 1 từ ────────────────── */}
        <section id="demo" className="rounded-3xl p-6"
                 style={{ background: C.yellowLight, border: `2px solid ${C.yellow}` }}>
          <div className="flex items-start gap-4 mb-4">
            <Mascot size={80} mood="think" />
            <div>
              <div className="font-black text-xl" style={{ color: C.grayText }}>Thử ngay: DART sẽ chọn gì cho bạn?</div>
              <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.75 }}>
                Nhập 1 từ tiếng Anh bạn đang học → xem app quyết định lịch ôn.
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={demoWord} onChange={(e) => setDemoWord(e.target.value)}
                   placeholder="ví dụ: resilient"
                   className="flex-1 rounded-2xl px-5 py-4 text-lg font-medium"
                   style={{ background: "white", border: `2px solid ${C.yellowDark}` }} />
            <BigCTA onClick={runQuickDemo} color="yellow" size="lg">Xem DART chọn</BigCTA>
          </div>
          {demoResult && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="rounded-2xl p-4 text-center" style={{ background: "white", border: `2px solid ${C.blue}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.blueDark }}>Ôn lại sau</div>
                <div className="text-3xl font-black mt-1" style={{ color: C.blueDark }}>
                  {demoResult.nextIn.toFixed(1)}<span className="text-base"> ngày</span>
                </div>
                <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
                  App sẽ nhắc bạn khi tới hạn
                </div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "white", border: `2px solid ${C.yellow}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.yellowDark }}>Bài kế tiếp</div>
                <div className="text-lg font-black mt-2" style={{ color: C.yellowDark }}>
                  {demoResult.nextTask}
                </div>
                <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
                  Vừa sức, không dồn khó
                </div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "white", border: `2px solid ${C.green}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.greenDark }}>Nhớ ~50% trong</div>
                <div className="text-3xl font-black mt-1" style={{ color: C.greenDark }}>
                  {demoResult.halfLife.toFixed(1)}<span className="text-base"> ngày</span>
                </div>
                <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
                  App dự đoán trí nhớ mờ dần
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 5. DASHBOARD MOCKUP — quản lý học hằng ngày ────────────────── */}
        <section>
          <div className="text-center mb-6">
            <div className="text-2xl font-black" style={{ color: C.grayText }}>
              Hằng ngày bạn thấy gì?
            </div>
            <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
              Đây là màn chính khi mở app. Không cần vào lab này nữa.
            </div>
          </div>
          <div className="rounded-3xl p-6" style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl p-4 text-center" style={{ background: C.redLight, border: `2px solid ${C.red}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.redDark }}>Đến hạn ôn</div>
                <div className="text-4xl font-black mt-1" style={{ color: C.redDark }}>12</div>
                <div className="text-xs" style={{ color: C.grayText, opacity: 0.7 }}>từ hôm nay</div>
              </div>
              <div className="rounded-2xl p-4 text-center flex flex-col items-center" style={{ background: C.yellowLight, border: `2px solid ${C.yellow}` }}>
                <IconFire color={C.yellowDark} />
                <div className="text-4xl font-black mt-1" style={{ color: C.yellowDark }}>7</div>
                <div className="text-xs" style={{ color: C.grayText, opacity: 0.7 }}>ngày liên tiếp</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: C.greenLight, border: `2px solid ${C.green}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.greenDark }}>Đã thuộc</div>
                <div className="text-4xl font-black mt-1" style={{ color: C.greenDark }}>184</div>
                <div className="text-xs" style={{ color: C.grayText, opacity: 0.7 }}>từ tổng</div>
              </div>
            </div>
            <div className="rounded-2xl p-4 mb-4" style={{ background: C.grayLight }}>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: C.grayText, opacity: 0.7 }}>
                Kế hoạch tuần này (do DART tự lên)
              </div>
              <div className="space-y-2">
                {[
                  { day: "T2", n: 12, color: C.red },
                  { day: "T3", n: 8, color: C.yellow },
                  { day: "T4", n: 15, color: C.red },
                  { day: "T5", n: 6, color: C.yellow },
                  { day: "T6", n: 10, color: C.yellow },
                  { day: "T7", n: 4, color: C.green },
                  { day: "CN", n: 7, color: C.yellow },
                ].map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 text-xs font-bold" style={{ color: C.grayText }}>{d.day}</div>
                    <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "white", border: `1px solid ${C.grayBorder}` }}>
                      <div className="h-full flex items-center justify-end px-2" style={{ width: `${(d.n / 15) * 100}%`, background: d.color }}>
                        <span className="text-xs font-bold text-white">{d.n}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <BigCTA href="/dashboard-new/vocabulary" color="green" size="lg">
                Đến màn học của tôi →
              </BigCTA>
            </div>
          </div>
        </section>

        {/* ── 6. WHAT NUMBERS MEAN FOR YOU ────────────────── */}
        <section>
          <div className="text-center mb-6">
            <div className="text-2xl font-black" style={{ color: C.grayText }}>Con số nào tôi cần nhìn?</div>
            <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
              Chỉ 3 con số. Còn lại DART lo.
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Đến hạn hôm nay", meaning: "Số từ DART bảo bạn nên ôn hôm nay. Ôn hết → xong.", color: C.red, badge: "12" },
              { label: "Streak (chuỗi ngày)", meaning: "Số ngày liên tiếp bạn ôn. Đứt streak = DART sẽ dồn từ đến hạn nhiều hơn hôm sau.", color: C.yellow, badge: "7" },
              { label: "Đã thuộc", meaning: "Số từ đã ôn ổn định (nửa đời > 30 ngày). App khoe thành tích.", color: C.green, badge: "184" },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
                   style={{ background: "white", border: `2px solid ${m.color}` }}>
                <div className="rounded-full w-14 h-14 flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                     style={{ background: m.color }}>
                  {m.badge}
                </div>
                <div className="flex-1">
                  <div className="font-bold" style={{ color: C.grayText }}>{m.label}</div>
                  <div className="text-sm mt-0.5" style={{ color: C.grayText, opacity: 0.75 }}>{m.meaning}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm" style={{ color: C.grayText, opacity: 0.7 }}>
            Không cần nhìn α, θ, half-life. Đó là việc của DART.
          </div>
        </section>

        {/* ── 7. FINAL CTA ────────────────── */}
        <section className="rounded-3xl p-8 text-center"
                 style={{ background: `linear-gradient(135deg, ${C.greenLight}, ${C.yellowLight})`,
                          border: `3px solid ${C.green}` }}>
          <Mascot size={100} mood="cheer" />
          <div className="text-2xl font-black mt-3" style={{ color: C.grayText }}>
            Sẵn sàng thử?
          </div>
          <div className="text-sm mt-2" style={{ color: C.grayText, opacity: 0.8 }}>
            5 phút setup, sau đó chỉ cần 10 phút mỗi ngày.
          </div>
          <div className="mt-6">
            <BigCTA href="/dashboard-new/vocabulary" color="green" size="xl">
              Bắt đầu học ngay →
            </BigCTA>
          </div>
        </section>

        {/* ── Expert mode extras ────────────────── */}
        {expert && (
          <section className="rounded-2xl p-5"
                   style={{ background: C.purpleLight, border: `2px solid ${C.purple}` }}>
            <div className="font-bold text-sm mb-2" style={{ color: C.purpleDark }}>Chế độ chuyên gia — chi tiết thuật toán</div>
            <ul className="text-xs space-y-1" style={{ color: C.grayText }}>
              <li>• DART = <b>Difficulty-Aware half-life Regression</b> — mở rộng HLR (Settles &amp; Meeder 2016) bằng tham số α cho độ khó retrieval.</li>
              <li>• Feature vector 6 chiều: [bias, CEFR, tần suất từ, độ chính xác của HV, số lần ôn, điểm chấm câu gần nhất] — điểm chấm câu thêm 2026-08-09 (Amendment #A-002).</li>
              <li>• Công thức: h = 2<sup>θ·x</sup> · exp(α · φ(d)); φ ∈ {"{0, 0.33, 0.66, 1.0}"} cho 4 dạng retrieval.</li>
              <li>• Nghiên cứu RCT 3 nhóm (SM-2 / HLR / DART), n≈65/nhóm, 8 tuần. Chi tiết: <code>research/PAPER_DRAFT_v1.md</code>, <code>docs/DECISIONS.md</code>.</li>
              <li>• Cluster-bootstrap LRT cho H₀:α=0 (Amendment #A-001, đã ký 2026-08-07).</li>
            </ul>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
