// Research MongoDB index contract. Kept separate from the migration runner so
// it can be regression-tested without loading secrets or opening a connection.

const INDEXES = {
  reviewlogs: [
    { keys: { userId: 1, vocabularyId: 1, createdAt: -1 }, options: { name: "user_word_time" } },
    { keys: { clientEventId: 1 }, options: { name: "clientEventId_unique", unique: true, sparse: true } },
    { keys: { sessionId: 1 }, options: { name: "sessionId" } },
    { keys: { condition: 1, createdAt: -1 }, options: { name: "condition_time" } },
    { keys: { weightsVersion: 1 }, options: { name: "weightsVersion" } },
    { keys: { condition: 1, explorationSelected: 1, createdAt: -1 }, options: { name: "condition_exploration_time" } },
  ],
  participants: [
    { keys: { participantCode: 1 }, options: { name: "participantCode_unique", unique: true } },
    { keys: { userId: 1 }, options: { name: "userId_unique", unique: true, sparse: true } },
    { keys: { condition: 1, dropoutAt: 1 }, options: { name: "condition_dropout" } },
    { keys: { stratum: 1, condition: 1 }, options: { name: "stratum_condition" } },
    { keys: { enrolledAt: -1 }, options: { name: "enrolledAt" } },
  ],
  testresults: [
    { keys: { participantCode: 1, testType: 1 }, options: { name: "participant_test_unique", unique: true } },
    { keys: { administeredAt: -1 }, options: { name: "administeredAt" } },
  ],
  judgescores: [
    { keys: { testResultId: 1, itemId: 1, judgeId: 1 }, options: { name: "score_unique", unique: true } },
    { keys: { judgeId: 1, createdAt: -1 }, options: { name: "judge_time" } },
  ],
  familiarityresponses: [
    { keys: { screenerId: 1 }, options: { name: "screenerId_unique", unique: true } },
  ],
  researchsm2states: [
    { keys: { participantCode: 1, vocabularyId: 1 }, options: { name: "participant_word_unique", unique: true } },
    { keys: { participantCode: 1, nextReviewDate: 1 }, options: { name: "participant_due" } },
  ],
  researchtimingstates: [
    { keys: { participantCode: 1, vocabularyId: 1, condition: 1 }, options: { name: "participant_word_condition_unique", unique: true } },
    { keys: { participantCode: 1, condition: 1, nextReviewDate: 1 }, options: { name: "participant_condition_due" } },
  ],
  researchdecisionreceipts: [
    { keys: { receiptId: 1 }, options: { name: "receiptId_unique", unique: true } },
    { keys: { participantCode: 1, vocabularyId: 1, consumedAt: 1 }, options: { name: "participant_word_consumed" } },
    { keys: { expiresAt: 1, consumedAt: 1 }, options: { name: "expiry_consumed" } },
    {
      keys: { participantCode: 1, vocabularyId: 1, isActive: 1 },
      options: { name: "one_active_task_per_word", unique: true, partialFilterExpression: { isActive: true } },
    },
  ],
};

module.exports = { INDEXES };

