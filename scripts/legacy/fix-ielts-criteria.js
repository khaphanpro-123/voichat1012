const fs = require('fs')

let api = fs.readFileSync('app/api/writing-practice/route.ts', 'utf8')

const newIELTS = `const IELTS_CRITERIA = \`
IELTS WRITING BAND DESCRIPTORS (Official Public Version, Band 0-9)

=== TASK 1 ===
4 criteria, equal weight (25% each):

1. TASK ACHIEVEMENT (TA):
- Band 9: Fully satisfies all requirements; clearly presents a fully developed response
- Band 8: Covers all requirements sufficiently; presents/highlights/illustrates key features clearly
- Band 7: Covers requirements; presents clear overview of main trends/differences; highlights key features
- Band 6: Addresses requirements; presents overview with info appropriately selected; highlights key features but details may be irrelevant/inappropriate/inaccurate
- Band 5: Generally addresses task; recounts detail mechanically; no clear overview; inadequately covers key features
- Band 4: Attempts to address task but does not cover all key features; format may be inappropriate
- Band 3: Fails to address task; presents limited ideas which may be largely irrelevant

2. COHERENCE & COHESION (CC):
- Band 9: Uses cohesion so naturally it attracts no attention; skillfully manages paragraphing
- Band 8: Sequences information logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately
- Band 7: Logically organises information; clear progression throughout; uses cohesive devices appropriately (some under/over-use)
- Band 6: Arranges information coherently; clear overall progression; uses cohesive devices effectively but cohesion within/between sentences may be faulty or mechanical
- Band 5: Presents information with some organisation but may lack overall progression; makes inadequate/inaccurate/over-use of cohesive devices
- Band 4: Presents information incoherently; no clear progression; uses some basic cohesive devices but may be inaccurate or repetitive

3. LEXICAL RESOURCE (LR):
- Band 9: Wide range of vocabulary with very natural and sophisticated control; rare minor errors only as 'slips'
- Band 8: Wide range of vocabulary fluently and flexibly; skillfully uses uncommon lexical items; occasional inaccuracies in word choice/collocation; rare errors in spelling/word formation
- Band 7: Sufficient range to allow flexibility and precision; uses less common lexical items with awareness of style/collocation; may produce occasional errors in word choice/spelling/word formation
- Band 6: Adequate range for task; attempts to use less common vocabulary but with some inaccuracy; makes some errors in spelling/word formation but they do not impede communication
- Band 5: Limited range, minimally adequate; may make noticeable errors in spelling/word formation that cause difficulty for reader
- Band 4: Only basic vocabulary, may be used repetitively or inappropriately; limited control of word formation/spelling; errors may cause strain for reader

4. GRAMMATICAL RANGE & ACCURACY (GRA):
- Band 9: Wide range of structures with full flexibility and accuracy; rare minor errors only as 'slips'
- Band 8: Wide range of structures; majority of sentences are error-free; makes only very occasional errors or inappropriacies
- Band 7: Variety of complex structures; produces frequent error-free sentences; good control of grammar/punctuation but may make a few errors
- Band 6: Mix of simple and complex sentence forms; makes some errors in grammar/punctuation but they rarely reduce communication
- Band 5: Only limited range of structures; attempts complex sentences but tend to be less accurate than simple sentences; may make frequent grammatical errors/punctuation; errors can cause difficulty for reader
- Band 4: Very limited range of structures with only rare use of subordinate clauses; some structures are accurate but errors predominate; punctuation is often faulty

=== TASK 2 ===
4 criteria, equal weight (25% each):

1. TASK RESPONSE (TR):
- Band 9: Fully addresses all parts; presents fully developed position with relevant, fully extended and well supported ideas
- Band 8: Sufficiently addresses all parts; well-developed response with relevant, extended and supported ideas
- Band 7: Addresses all parts; presents clear position throughout; extends and supports main ideas but may tend to over-generalise; supporting ideas may lack focus
- Band 6: Addresses all parts although some may be more fully covered; presents relevant position although conclusions may become unclear or repetitive; presents relevant main ideas but some may be inadequately developed/unclear
- Band 5: Addresses task only partially; format may be inappropriate; expresses position but development is not always clear; presents some main ideas but limited and not sufficiently developed; may be irrelevant detail
- Band 4: Responds to task only in minimal way or answer is tangential; position is unclear; presents some main ideas but difficult to identify; may be repetitive, irrelevant or not well supported
- Band 3: Does not adequately address any part of task; does not express a clear position; presents few ideas, largely undeveloped or irrelevant

2. COHERENCE & COHESION (CC): [Same descriptors as Task 1]
- Band 9: Uses cohesion naturally; skillfully manages paragraphing
- Band 8: Sequences logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately
- Band 7: Logically organises; clear progression; uses cohesive devices appropriately; presents clear central topic in each paragraph
- Band 6: Arranges coherently; clear overall progression; cohesion within/between sentences may be faulty or mechanical; may not always use referencing clearly; uses paragraphing but not always logically
- Band 5: Some organisation but may lack overall progression; inadequate/inaccurate/over-use of cohesive devices; may not write in paragraphs or paragraphing may be inadequate
- Band 4: Information and ideas not arranged coherently; no clear progression; uses some basic cohesive devices but may be inaccurate or repetitive; may not write in paragraphs or use may be confusing

3. LEXICAL RESOURCE (LR): [Same as Task 1]
4. GRAMMATICAL RANGE & ACCURACY (GRA): [Same as Task 1]

OVERALL BAND SCORE = Average of 4 criteria (rounded to nearest 0.5)
\``

api = api.replace(/const IELTS_CRITERIA = `[\s\S]*?`/, newIELTS)

// Also update the system prompt to be more specific per task
api = api.replace(
  `const systemPrompt = \`You are an expert English writing examiner for \${examType} certification.
\${criteria}

Your task: Grade the student's essay and provide detailed, constructive feedback.

FORMAT YOUR RESPONSE EXACTLY AS:
## Overall Score: [X/10 or Band X]

## Task Fulfillment: [X/10 or Band X]
[2-3 sentences of specific feedback]

## Organization: [X/10 or Band X]  
[2-3 sentences of specific feedback]

## Vocabulary: [X/10 or Band X]
[2-3 sentences with examples from the essay]

## Grammar: [X/10 or Band X]
[2-3 sentences with specific error examples and corrections]

## Strengths
- [specific strength 1]
- [specific strength 2]

## Areas for Improvement
- [specific suggestion 1 with example]
- [specific suggestion 2 with example]

## Sample Improved Sentence
Original: "[quote a weak sentence from the essay]"
Improved: "[your improved version]"

Be specific, cite actual sentences from the essay, and be encouraging but honest.\``,
  `const isIELTS = examType === "IELTS"
    const criterion1 = isIELTS ? (taskType === "IELTS Task 1" ? "Task Achievement" : "Task Response") : "Task Fulfillment"
    const criterion2 = isIELTS ? "Coherence & Cohesion" : "Organization"
    const criterion3 = isIELTS ? "Lexical Resource" : "Vocabulary"
    const criterion4 = isIELTS ? "Grammatical Range & Accuracy" : "Grammar"
    const scoreUnit = isIELTS ? "Band" : "/10"

    const systemPrompt = \`You are an expert IELTS/VSTEP examiner. Grade this essay strictly according to official band descriptors.

\${criteria}

INSTRUCTIONS:
- Score each criterion separately using the band descriptors above
- Be specific: quote actual sentences from the essay as evidence
- For IELTS: each criterion is Band 0-9, overall = average of 4 criteria
- Be honest but constructive

FORMAT YOUR RESPONSE EXACTLY AS:

## Overall Score: [Band X.X or X/10]

## \${criterion1}: [Band X or X/10]
[2-3 sentences citing specific evidence from the essay]

## \${criterion2}: [Band X or X/10]
[2-3 sentences citing specific evidence]

## \${criterion3}: [Band X or X/10]
[2-3 sentences with vocabulary examples from the essay]

## \${criterion4}: [Band X or X/10]
[2-3 sentences with grammar examples and corrections]

## Strengths
- [specific strength with quote from essay]
- [specific strength with quote from essay]

## Key Improvements Needed
- [specific issue with example and correction]
- [specific issue with example and correction]

## Improved Version of One Weak Sentence
Original: "[exact quote from essay]"
Improved: "[your rewritten version]"
Why: [brief explanation]\``
)

fs.writeFileSync('app/api/writing-practice/route.ts', api, 'utf8')
console.log('Done:', fs.statSync('app/api/writing-practice/route.ts').size)
