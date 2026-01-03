// // app/api/rag/ingest-all/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { MongoClient } from "mongodb";
// import { Pinecone } from "@pinecone-database/pinecone";
// import { CohereClient } from "cohere-ai";

// const MONGO_URI = process.env.MONGO_URI!;
// const MONGO_DB = process.env.MONGO_DB!; // ⚠️ phải là autism_app
// const PINECONE_KEY = process.env.PINECONE_API_KEY!;
// const PINECONE_INDEX = process.env.PINECONE_INDEX!;
// const COHERE_KEY = process.env.COHERE_API_KEY!;

// const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
// const index = pinecone.index(PINECONE_INDEX);
// const cohere = new CohereClient({ token: COHERE_KEY });

// // 🔹 Hàm loại bỏ null/undefined trong metadata
// function cleanMetadata(obj: Record<string, any>) {
//   const cleaned: Record<string, any> = {};
//   for (const key in obj) {
//     if (obj[key] !== null && obj[key] !== undefined) {
//       cleaned[key] = obj[key];
//     }
//   }
//   return cleaned;
// }

// // 🔹 Tạo embedding bằng Cohere
// async function embedText(text: string) {
//   const resp = await cohere.embed({
//     model: "embed-multilingual-v3.0",
//     texts: [text],
//     input_type: "search_document",
//   });
//   return resp.embeddings[0];
// }

// export async function POST(req: NextRequest) {
//     return NextResponse.json({ ok: true });
//   const mongo = new MongoClient(MONGO_URI);
//   await mongo.connect();
//   const db = mongo.db(MONGO_DB);

//   try {
//     const docs: Array<{ id: string; text: string; metadata: any }> = [];

//     // 1) Users
//     const users = await db.collection("users").find().toArray();
//     for (const u of users) {
//       docs.push({
//         id: `${u._id}_user`,
//         text: `User:\nName: ${u.fullName ?? ""}\nEmail: ${u.email ?? ""}`,
//         metadata: { type: "user", userId: u._id?.toString() },
//       });
//     }

//     // 2) Dailylogs
//     const logs = await db.collection("dailylogs").find().toArray();
//     for (const l of logs) {
//       docs.push({
//         id: `${l._id}_dailylog`,
//         text: `DailyLog:\nDate: ${l.date}\nSleep: ${l.sleepHours}\nMood: ${l.mood}\nNotes: ${l.notes}`,
//         metadata: {
//           type: "dailylog",
//           childId: l.childId,
//           userId: l.userId,
//         },
//       });
//     }

//     // 3) Posts
//     const posts = await db.collection("posts").find().toArray();
//     for (const p of posts) {
//       docs.push({
//         id: `${p._id}_post`,
//         text: `Post:\nTitle: ${p.title}\nContent: ${p.content}`,
//         metadata: { type: "post", userId: p.userId },
//       });
//     }

//     // 4) Comments
//     const comments = await db.collection("comments").find().toArray();
//     for (const c of comments) {
//       docs.push({
//         id: `${c._id}_comment`,
//         text: `Comment:\n${c.text ?? ""}`,
//         metadata: { type: "comment", userId: c.userId, postId: c.postId },
//       });
//     }

//     // 5) Notifications
//     const notifs = await db.collection("notifications").find().toArray();
//     for (const n of notifs) {
//       docs.push({
//         id: `${n._id}_notification`,
//         text: `Notification:\nTitle: ${n.title}\nMessage: ${n.message}`,
//         metadata: { type: "notification", userId: n.userId },
//       });
//     }

//     // 6) Medicaldocs
//     const medDocs = await db.collection("medicaldocs").find().toArray();
//     for (const m of medDocs) {
//       docs.push({
//         id: `${m._id}_medicaldoc`,
//         text: `MedicalDoc:\nDoctor: ${m.doctor}\nDiagnosis: ${m.diagnosis}\nNotes: ${m.notes}`,
//         metadata: { type: "medicaldoc", childId: m.childId, userId: m.userId },
//       });
//     }

//     // 🔹 Nhúng + upsert vào Pinecone
//     const batch: any[] = [];
//     for (const d of docs) {
//       const emb = await embedText(d.text);
//       batch.push({
//         id: d.id,
//         values: emb,
//         metadata: cleanMetadata({ ...d.metadata, text: d.text }),
//       });
//     }

//     if (batch.length) {
//       await index.upsert(batch);
//     }

//     return NextResponse.json({
//       success: true,
//       docs: docs.length,
//       vectorsUpserted: batch.length,
//     });
//   } catch (err: any) {
//     console.error("❌ Ingest-all error:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   } finally {
//     await mongo.close();
//   }
// }


// app/api/rag/ingest-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import getClientPromise from "@/lib/mongodb";
import { ingestDoc } from "@/lib/ingest";

export async function POST(req: NextRequest) {
  const { userId, childId } = await req.json();

  const client = await getClientPromise();
  const db = client.db(process.env.MONGO_DB);

  let totalVectors = 0;
  let totalDocs = 0;

  try {
    // 1) Users
    const users = await db.collection("users").find(userId ? { _id: userId } : {}).toArray();
    for (const u of users) {
      const metadata: Record<string, any> = { type: "user", userId: u._id.toString() };

      const res = await ingestDoc({
        id: `${u._id}_user`,
        text: `FullName: ${u.fullName ?? ""}\nEmail: ${u.email ?? ""}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    // 2) DailyLogs
    const dailyLogs = await db.collection("dailylogs").find(childId ? { childId } : {}).toArray();
    for (const d of dailyLogs) {
      const metadata: Record<string, any> = { type: "dailylog" };
      if (d.childId) metadata.childId = d.childId;
      if (d.userId) metadata.userId = d.userId;

      const res = await ingestDoc({
        id: `${d._id}_dailylog`,
        text: `Date: ${d.date}\nSleep: ${d.sleepHours}\nMood: ${d.mood}\nNotes: ${d.notes}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    // 3) Posts
    const posts = await db.collection("posts").find(userId ? { userId } : {}).toArray();
    for (const p of posts) {
      const metadata: Record<string, any> = { type: "post" };
      if (p.userId) metadata.userId = p.userId;

      const res = await ingestDoc({
        id: `${p._id}_post`,
        text: `Title: ${p.title}\nContent: ${p.content}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    // 4) Comments
    const comments = await db.collection("comments").find(userId ? { userId } : {}).toArray();
    for (const c of comments) {
      const metadata: Record<string, any> = { type: "comment" };
      if (c.userId) metadata.userId = c.userId;
      if (c.postId) metadata.postId = c.postId;

      const res = await ingestDoc({
        id: `${c._id}_comment`,
        text: `Comment: ${c.text ?? ""}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    // 5) Notifications
    const notifs = await db.collection("notifications").find(userId ? { userId } : {}).toArray();
    for (const n of notifs) {
      const metadata: Record<string, any> = { type: "notification" };
      if (n.userId) metadata.userId = n.userId;

      const res = await ingestDoc({
        id: `${n._id}_notification`,
        text: `Title: ${n.title}\nMessage: ${n.message}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    // 6) MedicalDocs
    const medDocs = await db.collection("medicaldocs").find(childId ? { childId } : {}).toArray();
    for (const m of medDocs) {
      const metadata: Record<string, any> = { type: "medicaldoc" };
      if (m.childId) metadata.childId = m.childId;
      if (m.userId) metadata.userId = m.userId;

      const res = await ingestDoc({
        id: `${m._id}_medicaldoc`,
        text: `Doctor: ${m.doctor}\nDiagnosis: ${m.diagnosis}\nNotes: ${m.notes}`,
        metadata,
      });
      totalVectors += res.vectors;
      totalDocs++;
    }

    return NextResponse.json({
      success: true,
      docs: totalDocs,
      vectorsUpserted: totalVectors,
    });
  } catch (err: any) {
    console.error("❌ Ingest-all error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
