// __tests__/judgeQueue.test.ts
//
// Tests for lib/judgeQueue — the async LLM-Judge queue (Ngày 11 / D-008).
//
// We inject a fake in-memory "Model" and a fake judge function so the tests
// stay pure unit tests (no mongoose, no LLM). The fake model implements just
// the surface the queue uses: create, findOne, findOneAndUpdate, updateOne.
//
// SLA targets from PLAN_45_DAYS.md Ngày 11:
//   - POST enqueue: < 2s
//   - 50 jobs completed within 5 minutes
// These translate here to: enqueue is O(1) sync-ish, and 50 processOneJudgeJob
// calls with a mock judge complete in well under 1 second.

import {
  enqueueJudgeJob,
  getJudgeJob,
  processOneJudgeJob,
  type JudgeQueueDeps,
} from "@/lib/judgeQueue";

// ─── In-memory fake model ─────────────────────────────────────────────────────

interface JobDoc {
  jobId: string;
  userId: string;
  word: string;
  learnerSentence: string;
  targetContext?: string;
  reference?: string;
  reviewLogId?: string;
  status: "queued" | "processing" | "completed" | "failed";
  scores?: any;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

function makeFakeModel() {
  const store: JobDoc[] = [];
  const model: any = {
    _store: store,
    async create(doc: JobDoc) {
      store.push({ ...doc });
      return { ...doc };
    },
    findOne(query: any) {
      // supports { jobId }
      const found = store.find((d) => d.jobId === query.jobId) ?? null;
      return {
        lean: async () => (found ? { ...found } : null),
      };
    },
    findOneAndUpdate(query: any, update: any, opts?: any) {
      // supports claim: { status: 'queued' } sorted by createdAt asc
      const status = query.status;
      let candidates = store.filter((d) => d.status === status);
      if (opts?.sort?.createdAt === 1) {
        candidates = candidates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      const picked = candidates[0];
      const chain = {
        lean: async () => {
          if (!picked) return null;
          const set = update.$set ?? {};
          Object.assign(picked, set);
          return { ...picked };
        },
      };
      return chain;
    },
    async updateOne(query: any, update: any) {
      const doc = store.find((d) => d.jobId === query.jobId);
      if (!doc) return { matchedCount: 0 };
      if (update.$set) Object.assign(doc, update.$set);
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          (doc as any)[k] = ((doc as any)[k] ?? 0) + (v as number);
        }
      }
      return { matchedCount: 1 };
    },
  };
  return model;
}

const mockJudge = jest.fn(async (input: any) => ({
  accuracy: 8,
  fluency: 9,
  appropriateness: 7,
  creativity: 6,
  composite: 7.5,
  rationale: `mock score for ${input.word}`,
}));

function makeDeps(reviewLogUpdate?: jest.Mock): JudgeQueueDeps {
  return {
    model: makeFakeModel(),
    judge: mockJudge as any,
    reviewLogUpdate: reviewLogUpdate as any,
  };
}

beforeEach(() => {
  mockJudge.mockClear();
});

// ─── enqueue ──────────────────────────────────────────────────────────────────

describe("enqueueJudgeJob", () => {
  it("creates a queued job with a uuid jobId", async () => {
    const deps = makeDeps();
    const { jobId } = await enqueueJudgeJob(
      { word: "resilient", learnerSentence: "The bridge is resilient." },
      deps,
    );
    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
    const job = await getJudgeJob(jobId, deps);
    expect(job).toBeTruthy();
    expect(job!.status).toBe("queued");
    expect(job!.word).toBe("resilient");
  });

  it("rejects when word or learnerSentence is missing", async () => {
    const deps = makeDeps();
    await expect(enqueueJudgeJob({ word: "", learnerSentence: "x" }, deps)).rejects.toThrow();
    await expect(enqueueJudgeJob({ word: "x", learnerSentence: "" }, deps)).rejects.toThrow();
  });

  it("enqueue latency is well under the 2s POST SLA", async () => {
    const deps = makeDeps();
    const t0 = Date.now();
    await enqueueJudgeJob({ word: "x", learnerSentence: "y" }, deps);
    expect(Date.now() - t0).toBeLessThan(200);
  });
});

// ─── processOneJudgeJob ───────────────────────────────────────────────────────

describe("processOneJudgeJob", () => {
  it("returns processed:false when queue is empty", async () => {
    const deps = makeDeps();
    const r = await processOneJudgeJob(deps);
    expect(r).toEqual({ processed: false });
  });

  it("claims oldest job first (FIFO)", async () => {
    const deps = makeDeps();
    const { jobId: a } = await enqueueJudgeJob({ word: "a", learnerSentence: "sa" }, deps);
    await new Promise((r) => setTimeout(r, 5));
    const { jobId: b } = await enqueueJudgeJob({ word: "b", learnerSentence: "sb" }, deps);
    const r1 = await processOneJudgeJob(deps);
    expect(r1.jobId).toBe(a);
    const r2 = await processOneJudgeJob(deps);
    expect(r2.jobId).toBe(b);
  });

  it("marks job completed with judge scores", async () => {
    const deps = makeDeps();
    const { jobId } = await enqueueJudgeJob({ word: "acknowledge", learnerSentence: "s" }, deps);
    const r = await processOneJudgeJob(deps);
    expect(r.status).toBe("completed");
    const job = await getJudgeJob(jobId, deps);
    expect(job!.status).toBe("completed");
    expect(job!.scores?.composite).toBe(7.5);
    expect(job!.completedAt).toBeTruthy();
  });

  it("catches judge errors and marks job failed", async () => {
    const deps: JudgeQueueDeps = {
      model: makeFakeModel(),
      judge: (async () => { throw new Error("LLM boom"); }) as any,
    };
    const { jobId } = await enqueueJudgeJob({ word: "x", learnerSentence: "y" }, deps);
    const r = await processOneJudgeJob(deps);
    expect(r.status).toBe("failed");
    const job = await getJudgeJob(jobId, deps);
    expect(job!.error).toContain("LLM boom");
    expect(job!.retryCount).toBe(1);
  });

  it("mirrors scores into ReviewLog when reviewLogId is provided", async () => {
    const mirror = jest.fn(async () => { /* ok */ });
    const deps = makeDeps(mirror);
    await enqueueJudgeJob(
      { word: "x", learnerSentence: "y", reviewLogId: "rl-123" },
      deps,
    );
    await processOneJudgeJob(deps);
    expect(mirror).toHaveBeenCalledTimes(1);
    expect(mirror).toHaveBeenCalledWith("rl-123", expect.objectContaining({ composite: 7.5 }));
  });

  it("survives a failing ReviewLog mirror without failing the job", async () => {
    const mirror = jest.fn(async () => { throw new Error("mongo down"); });
    const deps = makeDeps(mirror);
    const { jobId } = await enqueueJudgeJob(
      { word: "x", learnerSentence: "y", reviewLogId: "rl-999" },
      deps,
    );
    await processOneJudgeJob(deps);
    const job = await getJudgeJob(jobId, deps);
    expect(job!.status).toBe("completed"); // ReviewLog failure doesn't fail the job
  });
});

// ─── SLA: 50 jobs end-to-end ──────────────────────────────────────────────────

describe("Ngày 11 SLA — 50 jobs", () => {
  it("enqueues 50 jobs and processes all within budget (mocked judge)", async () => {
    const deps = makeDeps();
    const t0 = Date.now();

    // Simulate 50 concurrent POSTs
    const enqueues = Array.from({ length: 50 }, (_, i) =>
      enqueueJudgeJob({ word: `w${i}`, learnerSentence: `sentence ${i}` }, deps),
    );
    const jobs = await Promise.all(enqueues);
    const enqueueMs = Date.now() - t0;

    // All 50 POSTs together should take a small fraction of the per-request 2s SLA
    expect(enqueueMs).toBeLessThan(1000);
    expect(jobs).toHaveLength(50);

    // Drain queue
    const t1 = Date.now();
    let processed = 0;
    for (let i = 0; i < 60; i++) {
      const r = await processOneJudgeJob(deps);
      if (!r.processed) break;
      processed++;
    }
    const drainMs = Date.now() - t1;

    expect(processed).toBe(50);
    // With mocked LLM this must be far under the real 5-minute budget
    expect(drainMs).toBeLessThan(5000);

    // Every job should be completed
    const completed = await Promise.all(jobs.map((j) => getJudgeJob(j.jobId, deps)));
    expect(completed.every((j) => j!.status === "completed")).toBe(true);
    expect(completed.every((j) => typeof j!.scores?.composite === "number")).toBe(true);
  });
});
