# Pilot Go/No-Go Checklist — DART RCT

> Complete every item before contacting H7 participants.
> Run `python research/pilot_readiness.py` for automated checks.
> Date completed: ______________________________

---

## A. Ethics & Legal (H-series — researcher actions)

| # | Item | Who | Done |
|---|---|---|---|
| A1 | IRB / ethics approval letter received | Researcher | ☐ |
| A2 | DESIGN_FREEZE.md signed by PI + supervisor | Researcher + Supervisor | ☐ |
| A3 | Pre-registration submitted on OSF / AsPredicted — DOI obtained | Researcher | ☐ |
| A4 | `.env.research` created with MONGO_URI + RESEARCH_SALT (≥32 chars hex) | Researcher | ☐ |
| A5 | Consent text reviewed by ethics board (if required) | Researcher | ☐ |
| A6 | Parental consent form ready (for participants < 18) | Researcher | ☐ |

---

## B. Word Bank (H5)

| # | Item | How | Done |
|---|---|---|---|
| B1 | 20 screeners outside sample have completed /research/familiarity-screen | Share URL | ☐ |
| B2 | `python research/analyze_familiarity.py` run — results in familiarity_results.json | Terminal | ☐ |
| B3 | Words flagged (≥70% known) reviewed with supervisor | Manual | ☐ |
| B4 | Flagged words removed from wordBank.ts (pilotStatus="removed") OR decision documented to keep | Code | ☐ |
| B5 | validate_word_bank.py passes after any removals | `python research/validate_word_bank.py` | ☐ |

---

## C. Technical System

| # | Item | Command / Location | Done |
|---|---|---|---|
| C1 | `npm test` — all tests pass | `npm test` | ☐ |
| C2 | `npx tsc --noEmit` — no TypeScript errors | `npx tsc --noEmit` | ☐ |
| C3 | `npm run build` completes without errors | `npm run build` | ☐ |
| C4 | Production deployment live on Vercel | `vercel --prod` | ☐ |
| C5 | MongoDB Atlas connection confirmed from production | Vercel env | ☐ |
| C6 | At least one AI provider key (OPENAI_API_KEY or GROQ_API_KEY) set in production | Vercel env | ☐ |
| C7 | Redis (Upstash) connection confirmed | Vercel env | ☐ |
| C8 | `python research/pilot_readiness.py` exits 0 | Terminal | ☐ |

---

## D. End-to-End Manual Test

Test the full participant flow with a test account before inviting pilots.

| # | Step | Expected | Done |
|---|---|---|---|
| D1 | Open /research/consent — read, agree, advance | Redirects to /research/pretest | ☐ |
| D2 | Complete 20-item pretest | CEFR band assigned; redirects to enrolment | ☐ |
| D3 | Enrolment API called — check response | participantToken + armLabel returned; stored in localStorage | ☐ |
| D4 | Dashboard shows arm-appropriate review session | No arm name shown to participant | ☐ |
| D5 | Complete a full review session (≥5 items, all d-levels) | ReviewLog rows created in MongoDB | ☐ |
| D6 | Confirm ReviewLog documents look correct in Atlas | Check participantCode, wordId, d, elapsed_ms, correct | ☐ |
| D7 | Complete immediate posttest via /api/research/posttest/items?form=immediate | TestResult created; 409 on duplicate submit | ☐ |
| D8 | Admin: GET /api/admin/research/judge — shows pending CT items | ≥1 pending item for test | ☐ |
| D9 | Admin: POST /api/admin/research/judge {batch:true} — LLM grades items | JudgeScore created; judgeId populated | ☐ |
| D10 | Researcher dashboard — shows test participant enrolled, arm, ReviewLog count | Correct values displayed | ☐ |
| D11 | Delete test participant from MongoDB before pilot starts | Zero participants in production | ☐ |

---

## E. Human Rater Calibration (H6)

| # | Item | Who | Done |
|---|---|---|---|
| E1 | 2 human raters recruited | Researcher | ☐ |
| E2 | Raters have read CALIBRATION_GUIDE.md | Raters | ☐ |
| E3 | Calibration session completed (5 practice items from calibration_practice_items.json) | PI + Raters | ☐ |
| E4 | ≥80% agreement within 1 point on all practice items | Calibration session | ☐ |
| E5 | Raters briefed on scoring schedule (will score after pilot completes) | PI | ☐ |

---

## F. Pilot Recruitment Prep

| # | Item | Who | Done |
|---|---|---|---|
| F1 | 15–20 pilot participants recruited (outside main study sample) | Researcher | ☐ |
| F2 | Participant information sheet prepared and distributed | Researcher | ☐ |
| F3 | Unique screener IDs generated for pilot participants (e.g. P001–P020) | Researcher | ☐ |
| F4 | Communication plan: welcome email + weekly reminder + posttest reminder | Researcher | ☐ |
| F5 | Drop-out contact plan: 1 check-in if no activity after 3 days | Researcher | ☐ |
| F6 | Platform URL + onboarding instructions shared with pilot participants | Researcher | ☐ |

---

## G. Monitoring Plan

| # | Item | Frequency | Done |
|---|---|---|---|
| G1 | ReviewLog row count check (≥N expected reviews per arm) | Daily | ☐ |
| G2 | Run `python research/dq_check.py` to check data quality | Every 2 days | ☐ |
| G3 | Check d-level distribution (each d ≥10% — ε-exploration working) | Day 3 | ☐ |
| G4 | Check attrition count (participants with 0 reviews in last 3 days) | Daily | ☐ |
| G5 | Check server logs for API errors | Daily | ☐ |

---

## Automated Check

```bash
# Run from repo root with production env vars loaded
MONGO_URI="..." RESEARCH_SALT="..." python research/pilot_readiness.py
```

All 8 check categories must pass (exit code 0) before H7 recruitment begins.

---

## Sign-off

**PI (Phan Văn Kha)**
Date: ______________________________
Signature: ______________________________

**Supervisor**
Name: ______________________________
Date: ______________________________
Signature: ______________________________
