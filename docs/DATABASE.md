# Database — Canonical Documentation

> **File này là nguồn duy nhất về database.** Thay đổi schema/index → cập nhật ở đây, không tạo file mới.

**Mục lục:**

- [Kiến trúc DB tổng](#overview)
- [Production DB (`viettalk`)](#production)
- [Research DB (`viettalk_research`)](#research)
- [Indexes & Constraints](#indexes)
- [Backup & Restore](#backup)
- [Changelog](#changelog)

---

<a id="overview"></a>
## Kiến trúc DB tổng

Trích từ ARCHITECTURE Part 3 — nội dung đầy đủ trong `docs/ARCHITECTURE.md` section "Part 3". Tóm tắt:

- **MongoDB Atlas M0** — free tier, cap 500 connections. Kết nối 2 kiểu song song: Mongoose (`lib/db.ts`) cho models và MongoClient thô (`lib/mongodb.ts`) cho collection access trực tiếp. Pool cố ý nhỏ (`maxPoolSize: 3–5`).
- **Upstash Redis** (`lib/redis-client.ts`) — async job queue + cache.
- **Cloudflare R2** (`lib/r2-client.ts`, S3-compat) — file uploads.
- **Pinecone** (`lib/ingest.ts`) — chỉ cho RAG document-chat (`app/api/rag/chat`), tách khỏi vocabulary pipeline.

---

<a id="production"></a>
## Production DB — `viettalk`

Collections chính (danh sách rút gọn, xem `app/models/*.ts` là nguồn thật):

- `User`, `Session`, `Account` — auth (NextAuth + JWT hand-rolled)
- `Document`, `Vocabulary`, `Flashcard` — pipeline output
- `ReviewLog` — SRS review events (có 11 field research extensions từ Ngày 4)
- `ChatMessage`, `ConversationSession` — AI chat / voice-chat
- `PronunciationAttempt`, `WritingSubmission` — practice features

Xem `docs/ARCHITECTURE.md` Part 3 đầy đủ.

---

<a id="research"></a>
## Research DB — `viettalk_research`

**Tách riêng khỏi production** từ Ngày 6. Không được lẫn dữ liệu người dùng thường vào phân tích.

- **Connection module:** `lib/researchDb.ts` — Mongoose connection riêng, refuse URI có `/viettalk` mà không có `viettalk_research`.
- **Env:** `.env.research` (`RESEARCH_MONGO_URI`, `RESEARCH_SALT`, Upstash config).
- **Pool nhỏ (3),** không share global với `lib/db.ts`.

**Collections:**

| Collection | Model | Mục đích |
|---|---|---|
| `reviewlogs` | `ReviewLog` (extended) | Log retrieval events có 11 field research |
| `participants` | `Participant` | Ai enrol, arm nào, stratum, participantCode, hashedUserId |
| `testresults` | `TestResult` | Pretest + posttest scores (immediate + delayed) |
| `judgescores` | `JudgeScore` | Rubric scores từ LLM và human rater |
| `familiarityresponses` | `FamiliarityResponse` | H5 screener |

**Pre-flight:**

```
node research/verify_env.js       # check env, ping DB, list collections
node research/create_indexes.js   # idempotent migration
```

---

<a id="indexes"></a>
## Indexes & Constraints

Từ `research/create_indexes.js`:

| Collection | Index | Ràng buộc |
|---|---|---|
| `reviewlogs` | `clientEventId` | sparse unique — idempotent replay |
| `participants` | `participantCode` | unique |
| `participants` | `hashedUserId` | unique |
| `testresults` | `(participantCode, testType)` | compound unique |
| `judgescores` | `(testResultId, itemId, judgeId)` | triple unique |
| `familiarityresponses` | `screenerId` | unique |

---

<a id="backup"></a>
## Backup & Restore

**Backup daily:** `research/backup_research_db.sh` → `research/backups/<db>-<timestamp>.tar.gz`, retention 30 ngày, refuse chạy trên production URI.

**Yêu cầu:** MongoDB Database Tools (`mongodump`, `mongorestore`).

**Windows Task Scheduler:** trigger daily 03:00, action = `bash D:\CODE\voichat1012\research\backup_research_db.sh`.

**Restore drill** (Ngày 6 exit criterion, **chưa chạy**):

```bash
TARBALL=$(ls -t research/backups/*.tar.gz | head -1)
mkdir -p /tmp/restore_test && tar xzf "$TARBALL" -C /tmp/restore_test
mongorestore --uri "$RESEARCH_MONGO_URI_TEST" /tmp/restore_test/
# Đếm document so khớp:
mongosh "$RESEARCH_MONGO_URI" --eval 'db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()))'
mongosh "$RESEARCH_MONGO_URI_TEST" --eval 'db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()))'
```

---

## Changelog

- **2026-08-09** — Tạo file canonical. Nội dung production trích từ ARCHITECTURE Part 3; research DB tổng hợp từ `lib/researchDb.ts`, `research/*`.
