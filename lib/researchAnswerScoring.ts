// Server-side scoring for the RCT write path.  The browser may render a task,
// but it must never decide the analytic recall outcome or receive the answer
// key before submitting its response.

export type ResearchRetrievalType = 0 | 1 | 2 | 3;

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]$/g, "");
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const before = previous[j];
      previous[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : 1 + Math.min(diagonal, previous[j], previous[j - 1]);
      diagonal = before;
    }
  }
  return previous[b.length];
}

/**
 * Return only a deterministic, pre-registered auto-score.  d=2/3 are a
 * mechanical eligibility screen (target lemma present); semantic validation
 * remains a separate, unimplemented judge protocol and must not be claimed
 * as a study result.
 */
export function scoreResearchAnswer(input: {
  retrievalType: ResearchRetrievalType;
  expectedAnswer: string;
  word: string;
  answerText: string;
}): 0 | 1 {
  const answer = normalise(input.answerText);
  if (!answer) return 0;

  if (input.retrievalType === 0) {
    return answer === normalise(input.expectedAnswer) ? 1 : 0;
  }
  if (input.retrievalType === 1) {
    const expected = normalise(input.expectedAnswer);
    if (answer === expected) return 1;
    return expected.length >= 5 && levenshtein(answer, expected) <= 1 ? 1 : 0;
  }

  const target = normalise(input.word);
  return answer.split(/\W+/).some((token) => token === target || token.startsWith(target)) ? 1 : 0;
}

