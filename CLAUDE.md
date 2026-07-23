# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An English-learning web app for Vietnamese speakers ("EnglishPal" / viettalk). Users upload documents (PDF/DOCX/images) or chat with AI, and the system extracts vocabulary, generates bilingual (EN/VI) flashcards (definitions, examples, collocations, synonyms), clusters vocabulary into topics, and offers voice/text AI chat, pronunciation practice, listening, and writing practice, plus a RAG document-chat feature.

The repo is two separately deployed services:
- **`/` (this Next.js 15 app)** — App Router frontend + `app/api/*` route handlers (Node/TS). Deployed to Vercel.
- **`python-api/`** — a separate FastAPI service deployed on Railway, doing the heavy NLP vocabulary-extraction pipeline (NLTK, sentence-transformers, sklearn). Next.js API routes call it over plain HTTP (`NEXT_PUBLIC_PYTHON_API_URL`). Treat it as a different codebase/runtime — Python conventions, own `requirements.txt`, own deploy.
- `_archived_python-api/` is dead — contains one leftover test file, not a live service. Ignore it.

## Commands

```bash
npm run dev              # next dev
npm run build             # next build (also: build:prod runs scripts/setup-env.js production first)
npm run lint               # next lint
npm test                   # jest (runs everything under __tests__/)
npm test -- extractor.test.ts     # run a single test file
npm run test:watch
npm run test:coverage
npm run create-admin       # ts-node script: scripts/createAdmin.ts
```

`next.config.js` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` — **`npm run build` will not catch type or lint errors.** Run `npx tsc --noEmit` and `npm run lint` explicitly when you need those checks.

Python API (separate service, run from `python-api/`):
```bash
python main.py                                    # local dev, serves http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port $PORT       # production start (Railway/Render)
```

## Environment

Config comes from `.env` / `.env.local` (dev) and `.env.production`, generated via `scripts/setup-env.js`. See `env.example` for the full list of required variables (MongoDB, Cloudinary, JWT/NextAuth secrets, at least one AI provider key, optional Cohere/Pinecone/Groq). Never print or commit real values from `.env*` files.

## Architecture

**Data layer**
- MongoDB Atlas is the primary datastore, accessed two ways that coexist: `lib/db.ts` (Mongoose, used by `app/models/*` schemas) and `lib/mongodb.ts` (raw `MongoClient`, used for direct collection access). Both read `MONGO_URI`; connection pools are kept intentionally small (`maxPoolSize: 3–5`) because Mongo is on the M0 free tier's 500-connection cap — don't raise these casually.
- Upstash Redis (`lib/redis-client.ts`) backs the async job queue and caching.
- Cloudflare R2 (`lib/r2-client.ts`, S3-compatible) stores uploaded documents/images.
- Pinecone (`lib/ingest.ts`) is used only for the RAG document-chat feature (`app/api/rag/chat`), separate from the vocabulary pipeline. `app/api/rag/ingest-all` currently has its Pinecone integration disabled — treat as WIP.

**AI provider abstraction** — `lib/aiProvider.ts` (`callAI`) fans out across Groq → OpenAI → Cohere (configurable order via `preferProvider`), trying each provider's model list in turn and falling through on quota/auth/HTTP errors. Most AI-backed routes should go through this rather than calling a single provider's SDK directly. User-supplied API keys (per-user, stored via `lib/getUserApiKey.ts`) take priority over server-wide keys where applicable.

**Async document processing** — large document uploads (`app/api/async-upload`, `app/api/upload-document-complete`) go through a queue (`lib/queue.ts`, `lib/async-queue-db.ts`, config in `lib/async-queue-config.ts`) rather than being processed synchronously: upload → enqueue → background worker (Node or proxied to python-api) → poll `app/api/task-status` for progress. Frontend polling defaults to 2s intervals, 5 min max (see `asyncQueueConfig.polling`).

**Vocabulary/document pipeline** — the core value-add. There are two implementations:
- `python-api/complete_pipeline.py` — the full 8-step pipeline (text preprocessing → heading detection → context intelligence → phrase extraction → single-word extraction → score normalization/merge → topic modeling (KMeans) → flashcard generation). This is the "real" pipeline; see `PIPELINE_8STEP_COMPLETE_GUIDE.md` for the detailed spec per step (`STEP1_*.md`–`STEP8_*.md` at repo root cover each stage individually). Some docs/README text still reference an older "11-step" version — the 8-step guide is current.
- `lib/phraseExtractor/` — a lighter, in-process TypeScript phrase extractor (PDF/DOCX → text → normalize → sentence split → phrase extraction) used by `app/api/extract-phrases`. It's independent of the Python pipeline and has its own test suite (`__tests__/phraseExtractor/`) and scoring model documented in `lib/phraseExtractor/README.md`. Don't conflate the two — they solve overlapping but different problems (quick client-triggerable extraction vs. the full offline-quality pipeline).

**Auth** — NextAuth (`lib/authOptions.ts`) plus a parallel hand-rolled JWT layer (`lib/auth.ts`: `signToken`/`verifyToken`/`getAuthUser`, bcrypt password hashing). `middleware.ts` gates `/dashboard-new`, `/dashboard`, `/assessment`, `/profile`, `/admin` behind a valid NextAuth token and further restricts `/admin/*` to `token.role === "admin"`; it also bounces authenticated users away from `/auth/login` and `/auth/register`. Some `app/api/*` routes additionally check bearer JWTs via `getAuthUser` for non-page (fetch-based) auth — check which pattern an existing neighboring route uses before adding a new protected endpoint.

**Route surface** — `app/api/` is flat and route-per-feature (~90 route handlers), not grouped by resource; before adding a new endpoint, grep for an existing route with similar naming (e.g. several `vocabulary-*`, `image-*`, `voice-chat*` variants already exist) rather than assuming a canonical one. Frontend pages live under `app/dashboard-new/*` (the current dashboard) — `app/dashboard-new` supersedes any older top-level dashboard references you may see in docs.

## Testing

Jest + ts-jest, tests live only in `__tests__/` (`jest.config.js` `roots`). Coverage is currently scoped to `lib/phraseExtractor/**` and `lib/vocabularyFlashcardExtractor.ts` (see `collectCoverageFrom`) — that's what `npm run test:coverage` measures, not the whole repo. `@/*` path alias maps to repo root, matching `tsconfig.json`.

## Repo hygiene notes

- The repo root has a large number of one-off `write-*.js`, `fix-*.js`, and `debug-*.html`/`.py` scripts and dozens of `*_SUMMARY.md`/`STEP*.md`/`ARCHITECTURE_PART*.md` docs from prior implementation sessions. They're historical artifacts, not part of the build — don't assume they reflect current code without checking, and don't add new ones for routine work.
- `uploads/` contains real uploaded user files checked into the working tree (not gitignored per-file) — be careful not to treat its contents as fixtures.
