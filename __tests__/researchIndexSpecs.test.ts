const { INDEXES } = require("../research/index_specs");

function findIndex(collection: string, name: string) {
  return INDEXES[collection].find((spec: any) => spec.options.name === name);
}

describe("research index migration contract", () => {
  it("uses current Participant field names, not obsolete arm/user aliases", () => {
    expect(findIndex("participants", "userId_unique").keys).toEqual({ userId: 1 });
    expect(findIndex("participants", "condition_dropout").keys).toEqual({ condition: 1, dropoutAt: 1 });
    expect(findIndex("participants", "stratum_condition").keys).toEqual({ stratum: 1, condition: 1 });
    expect(JSON.stringify(INDEXES.participants)).not.toMatch(/hashedUserId|armLabel|cefrBand/);
  });

  it("indexes current test timing and the persisted DART exploration audit fields", () => {
    expect(findIndex("testresults", "administeredAt").keys).toEqual({ administeredAt: -1 });
    expect(findIndex("reviewlogs", "condition_exploration_time").keys)
      .toEqual({ condition: 1, explorationSelected: 1, createdAt: -1 });
    expect(JSON.stringify(INDEXES.testresults)).not.toMatch(/submittedAt/);
  });

  it("retains required receipt active-lease partial uniqueness", () => {
    expect(findIndex("researchdecisionreceipts", "one_active_task_per_word").options)
      .toMatchObject({ unique: true, partialFilterExpression: { isActive: true } });
  });
});

