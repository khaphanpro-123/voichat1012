// lib/wordBank.ts
// Target word list for the DART-RCT (Ngày 23).
//
// 60 words: 30 B1 + 30 B2 — selected from the Academic Word List (AWL) and
// General Service List (GSL) for frequency and pedagogical value for Vietnamese
// learners at CEFR A2-B1 entry level.
//
// Each entry supplies everything the retrieval-task builders need:
//   MCQ      → definition + distractors (shuffled by mcq.ts)
//   Cloze    → sentences[0] (word blanked at blankIndex)
//   CGen     → word + collocations hint + maxWords
//   Paraphrase → sentences[1] (used as passage to rephrase)
//
// PRE-REGISTRATION note: this list is frozen at study start (H5 pilot testing
// removes words where ≥70% of pilot participants already know them). Any removal
// must be logged with a reason and date — do NOT silently delete entries.
//
// Vietnamese definitions (viDefinition) are for the UI gloss only — not used in
// scoring or task generation.

export interface WordEntry {
  id: string;             // "w_001" … "w_060"
  word: string;
  cefrBand: "B1" | "B2";
  partOfSpeech: "n" | "v" | "adj" | "adv";
  /** Infinitive/base form if different from `word` (for ConstrainedGen lemma check) */
  lemma?: string;
  /** Clear, single-sense definition — used as correct MCQ option. */
  definition: string;
  /** Vietnamese gloss shown in the app flashcard. Not used for scoring. */
  viDefinition: string;
  /** Exactly 3 wrong definitions — plausible but clearly incorrect. */
  distractors: [string, string, string];
  /**
   * 2–3 sentences. Must each contain `word` (or an inflected form).
   * sentences[0] → Cloze source.
   * sentences[1] → Paraphrase passage (≥15 words recommended).
   * sentences[2] → optional backup.
   */
  sentences: string[];
  /** Common collocations — hint shown in ConstrainedGen prompt. */
  collocations?: string[];
  /** Pilot status. Set to "removed" + reason if dropped after pilot testing. */
  pilotStatus?: "active" | "removed";
  pilotRemovalReason?: string;
}

// ── B1 words (w_001 – w_030) ─────────────────────────────────────────────────

const B1_WORDS: WordEntry[] = [
  {
    id: "w_001", word: "significant", cefrBand: "B1", partOfSpeech: "adj",
    definition: "important enough to have a noticeable effect or meaning",
    viDefinition: "đáng kể, quan trọng",
    distractors: ["extremely rare and hard to find", "physically large in size", "relating to past events only"],
    sentences: [
      "The study found a significant improvement in test scores after eight weeks.",
      "There was a significant difference between the two groups in terms of vocabulary retention.",
    ],
    collocations: ["significant improvement", "significant difference", "significant impact"],
  },
  {
    id: "w_002", word: "apparent", cefrBand: "B1", partOfSpeech: "adj",
    definition: "clearly seen or understood; obvious",
    viDefinition: "rõ ràng, hiển nhiên",
    distractors: ["hidden deep below the surface", "relating to appearance only, not reality", "moving very slowly"],
    sentences: [
      "It was apparent that the student had not studied the material before the test.",
      "The apparent cause of the failure was a lack of preparation, though deeper issues remained.",
    ],
    collocations: ["it is apparent that", "apparent reason", "apparent cause"],
  },
  {
    id: "w_003", word: "sufficient", cefrBand: "B1", partOfSpeech: "adj",
    definition: "enough for a particular purpose or need",
    viDefinition: "đủ, thích hợp",
    distractors: ["too small to be useful", "coming after something in time", "easily broken or damaged"],
    sentences: [
      "Ten minutes of daily practice is not sufficient to master a new language skill.",
      "The researchers did not have sufficient data to draw a firm conclusion at that stage.",
    ],
    collocations: ["sufficient evidence", "sufficient time", "sufficient resources"],
  },
  {
    id: "w_004", word: "accurate", cefrBand: "B1", partOfSpeech: "adj",
    definition: "correct in every detail; free from errors",
    viDefinition: "chính xác, đúng",
    distractors: ["happening very quickly", "relating to sound or hearing", "producing a large amount"],
    sentences: [
      "The machine produced an accurate measurement of the student's reading speed.",
      "It is important to give accurate information when completing a research questionnaire.",
    ],
    collocations: ["accurate description", "accurate measurement", "highly accurate"],
  },
  {
    id: "w_005", word: "consequence", cefrBand: "B1", partOfSpeech: "n",
    definition: "a result or effect of an action or condition",
    viDefinition: "hậu quả, kết quả",
    distractors: ["a reason for doing something", "a type of written agreement", "a method of teaching"],
    sentences: [
      "Missing too many study sessions can have serious consequences for exam performance.",
      "One consequence of poor vocabulary knowledge is difficulty understanding academic texts.",
    ],
    collocations: ["as a consequence", "negative consequences", "consequence of"],
  },
  {
    id: "w_006", word: "maintain", cefrBand: "B1", partOfSpeech: "v",
    definition: "to keep something in its current state or at the same level",
    viDefinition: "duy trì, giữ gìn",
    distractors: ["to discover something new", "to reduce the size of something", "to connect two objects together"],
    sentences: [
      "It is difficult to maintain motivation when learning a language over several months.",
      "The teacher tried to maintain a consistent pace throughout the eight-week course.",
    ],
    collocations: ["maintain focus", "maintain a level", "maintain records"],
  },
  {
    id: "w_007", word: "establish", cefrBand: "B1", partOfSpeech: "v",
    definition: "to set up or create something that is intended to last",
    viDefinition: "thành lập, thiết lập",
    distractors: ["to destroy something completely", "to move from one place to another", "to repeat an action several times"],
    sentences: [
      "The researchers established a clear set of criteria for selecting participants.",
      "It takes time to establish good study habits that become part of a daily routine.",
    ],
    collocations: ["establish a connection", "establish rules", "establish a routine"],
  },
  {
    id: "w_008", word: "identify", cefrBand: "B1", partOfSpeech: "v",
    definition: "to recognize and correctly name someone or something",
    viDefinition: "xác định, nhận dạng",
    distractors: ["to forget something important", "to produce a large number of items", "to agree with someone completely"],
    sentences: [
      "Students were asked to identify the main argument in each paragraph they read.",
      "The test was designed to identify gaps in learners' vocabulary knowledge.",
    ],
    collocations: ["identify a problem", "identify patterns", "correctly identify"],
  },
  {
    id: "w_009", word: "promote", cefrBand: "B1", partOfSpeech: "v",
    definition: "to support or encourage the growth or development of something",
    viDefinition: "thúc đẩy, khuyến khích",
    distractors: ["to prevent or stop an action", "to measure the weight of an object", "to translate from one language to another"],
    sentences: [
      "Spaced repetition is believed to promote long-term retention of vocabulary.",
      "The school implemented a reading programme to promote interest in English literature.",
    ],
    collocations: ["promote learning", "promote growth", "promote awareness"],
  },
  {
    id: "w_010", word: "achieve", cefrBand: "B1", partOfSpeech: "v",
    definition: "to successfully reach a goal through effort and skill",
    viDefinition: "đạt được, hoàn thành",
    distractors: ["to fail to complete a task", "to begin a new project", "to share information with others"],
    sentences: [
      "Hard work and regular practice can help learners achieve fluency in a new language.",
      "The group achieved a higher average score after using the new study method for four weeks.",
    ],
    collocations: ["achieve a goal", "achieve success", "achieve fluency"],
  },
  {
    id: "w_011", word: "indicate", cefrBand: "B1", partOfSpeech: "v",
    definition: "to show, point out, or make something clear",
    viDefinition: "chỉ ra, cho thấy",
    distractors: ["to remove from a list", "to repeat something many times", "to make something larger"],
    sentences: [
      "The results indicate that spaced practice is more effective than massed practice.",
      "High error rates on the test may indicate that the items were too difficult.",
    ],
    collocations: ["results indicate", "data indicate", "indicate a trend"],
  },
  {
    id: "w_012", word: "analyze", cefrBand: "B1", partOfSpeech: "v", lemma: "analyze",
    definition: "to examine something in detail in order to understand it",
    viDefinition: "phân tích",
    distractors: ["to create something new from raw materials", "to ignore unimportant information", "to copy someone else's work"],
    sentences: [
      "The researchers analyzed the data from all three groups before writing their report.",
      "Students were taught to analyze the structure of academic sentences more carefully.",
    ],
    collocations: ["analyze data", "analyze results", "statistically analyze"],
  },
  {
    id: "w_013", word: "evaluate", cefrBand: "B1", partOfSpeech: "v",
    definition: "to judge or assess the value, quality, or importance of something",
    viDefinition: "đánh giá",
    distractors: ["to list all the parts of something", "to follow instructions exactly", "to translate text into another language"],
    sentences: [
      "Teachers need to evaluate students' writing regularly to track progress.",
      "The study evaluated the effectiveness of three different scheduling algorithms.",
    ],
    collocations: ["evaluate performance", "evaluate evidence", "carefully evaluate"],
  },
  {
    id: "w_014", word: "demonstrate", cefrBand: "B1", partOfSpeech: "v",
    definition: "to show clearly through actions or evidence that something is true",
    viDefinition: "chứng minh, thể hiện",
    distractors: ["to disprove a claim using facts", "to ask a question politely", "to avoid doing something difficult"],
    sentences: [
      "The experiment demonstrated that retrieval practice improves long-term memory.",
      "She demonstrated her understanding of the grammar rule by using it correctly in her essay.",
    ],
    collocations: ["demonstrate understanding", "demonstrate ability", "demonstrate that"],
  },
  {
    id: "w_015", word: "interpret", cefrBand: "B1", partOfSpeech: "v",
    definition: "to explain the meaning of something or understand it in a particular way",
    viDefinition: "giải thích, diễn giải",
    distractors: ["to repeat something without understanding it", "to avoid giving an opinion", "to put objects into a specific order"],
    sentences: [
      "Students often find it difficult to interpret complex charts in academic texts.",
      "The way we interpret feedback from a teacher can affect how we study in the future.",
    ],
    collocations: ["interpret results", "interpret data", "correctly interpret"],
  },
  {
    id: "w_016", word: "require", cefrBand: "B1", partOfSpeech: "v",
    definition: "to need something or to make something necessary",
    viDefinition: "yêu cầu, đòi hỏi",
    distractors: ["to offer something freely", "to reduce the number of things needed", "to send a message to someone"],
    sentences: [
      "Academic writing requires students to use formal vocabulary and avoid contractions.",
      "The experiment required participants to study for at least thirty minutes each day.",
    ],
    collocations: ["require effort", "require attention", "require participants to"],
  },
  {
    id: "w_017", word: "assume", cefrBand: "B1", partOfSpeech: "v",
    definition: "to accept something as true without having proof",
    viDefinition: "giả định, cho rằng",
    distractors: ["to check all facts carefully before deciding", "to announce a decision publicly", "to disagree with a statement"],
    sentences: [
      "It is wrong to assume that learners will remember vocabulary simply by reading it once.",
      "Many people assume that grammar is more important than vocabulary when learning a language.",
    ],
    collocations: ["assume that", "incorrectly assume", "safe to assume"],
  },
  {
    id: "w_018", word: "consider", cefrBand: "B1", partOfSpeech: "v",
    definition: "to think carefully about something before making a decision",
    viDefinition: "xem xét, cân nhắc",
    distractors: ["to act immediately without thinking", "to avoid a difficult task", "to select from a list randomly"],
    sentences: [
      "The teacher asked students to consider several strategies before choosing one to use.",
      "Researchers must consider the ethical implications of their studies before collecting data.",
    ],
    collocations: ["consider options", "consider the evidence", "carefully consider"],
  },
  {
    id: "w_019", word: "generate", cefrBand: "B1", partOfSpeech: "v",
    definition: "to produce or create something",
    viDefinition: "tạo ra, sản sinh",
    distractors: ["to destroy or remove completely", "to organize into groups", "to translate from one language to another"],
    sentences: [
      "The software can generate practice exercises based on each learner's mistake patterns.",
      "Reading widely helps learners generate a richer vocabulary in their writing.",
    ],
    collocations: ["generate ideas", "generate results", "automatically generate"],
  },
  {
    id: "w_020", word: "impact", cefrBand: "B1", partOfSpeech: "n",
    definition: "a strong or noticeable effect that something has on a situation or person",
    viDefinition: "tác động, ảnh hưởng",
    distractors: ["a type of physical measurement", "the beginning of a process", "a written plan for the future"],
    sentences: [
      "Daily vocabulary practice can have a significant impact on overall language ability.",
      "The impact of technology on second language learning has been studied extensively.",
    ],
    collocations: ["have an impact on", "positive impact", "measure the impact"],
  },
  {
    id: "w_021", word: "contribute", cefrBand: "B1", partOfSpeech: "v",
    definition: "to give something such as time, effort, or ideas to help achieve something",
    viDefinition: "đóng góp",
    distractors: ["to take away from a total", "to change the direction of something", "to ignore something important"],
    sentences: [
      "Regular review sessions contribute to better long-term vocabulary retention.",
      "Every participant contributes data that makes the overall research more reliable.",
    ],
    collocations: ["contribute to", "contribute significantly", "contribute ideas"],
  },
  {
    id: "w_022", word: "resolve", cefrBand: "B1", partOfSpeech: "v",
    definition: "to find a satisfactory solution to a problem or disagreement",
    viDefinition: "giải quyết",
    distractors: ["to create a new problem deliberately", "to organize objects by color", "to translate a text completely"],
    sentences: [
      "The team worked together to resolve the technical issues before the study began.",
      "When learners encounter an unknown word, they should try to resolve its meaning from context.",
    ],
    collocations: ["resolve a conflict", "resolve an issue", "fully resolve"],
  },
  {
    id: "w_023", word: "obtain", cefrBand: "B1", partOfSpeech: "v",
    definition: "to get or acquire something, especially through effort",
    viDefinition: "thu được, đạt được",
    distractors: ["to give away something freely", "to hide something from others", "to break something into pieces"],
    sentences: [
      "Participants must obtain consent from their supervisor before joining the study.",
      "The researchers were able to obtain enough data to run a full statistical analysis.",
    ],
    collocations: ["obtain permission", "obtain results", "obtain information"],
  },
  {
    id: "w_024", word: "relevant", cefrBand: "B1", partOfSpeech: "adj",
    definition: "closely connected to or appropriate for a particular subject or situation",
    viDefinition: "liên quan, phù hợp",
    distractors: ["happening in a different country", "too difficult to understand", "only used in spoken language"],
    sentences: [
      "Students should choose relevant examples that directly support their main argument.",
      "The vocabulary items selected for the study were relevant to academic reading at B1 level.",
    ],
    collocations: ["highly relevant", "relevant to", "directly relevant"],
  },
  {
    id: "w_025", word: "valid", cefrBand: "B1", partOfSpeech: "adj",
    definition: "based on truth, logic, or sound reasoning; acceptable",
    viDefinition: "hợp lệ, có giá trị",
    distractors: ["impossible to understand or explain", "producing many results quickly", "limited to a specific time period"],
    sentences: [
      "A valid argument must be supported by clear evidence and logical reasoning.",
      "Researchers need to check that their test instruments are valid before using them.",
    ],
    collocations: ["valid reason", "statistically valid", "valid argument"],
  },
  {
    id: "w_026", word: "complex", cefrBand: "B1", partOfSpeech: "adj",
    definition: "consisting of many different and connected parts; not simple",
    viDefinition: "phức tạp",
    distractors: ["easy to do with very little practice", "relating to the natural environment", "very short and simple"],
    sentences: [
      "Academic texts often contain complex sentence structures that challenge learners.",
      "Language acquisition is a complex process that involves memory, practice, and motivation.",
    ],
    collocations: ["complex process", "highly complex", "complex relationship"],
  },
  {
    id: "w_027", word: "distribute", cefrBand: "B1", partOfSpeech: "v",
    definition: "to share something out among a number of people or places",
    viDefinition: "phân phát, phân bố",
    distractors: ["to collect items from many places", "to repeat an action several times", "to write a long document"],
    sentences: [
      "The teacher distributed the worksheets so that each student received one copy.",
      "Words are distributed unevenly across frequency bands in a natural language corpus.",
    ],
    collocations: ["distribute evenly", "distribute materials", "randomly distributed"],
  },
  {
    id: "w_028", word: "predict", cefrBand: "B1", partOfSpeech: "v",
    definition: "to say what you think will happen in the future based on evidence",
    viDefinition: "dự đoán",
    distractors: ["to change a past event", "to record what already happened", "to create a list of facts"],
    sentences: [
      "The model can predict which words a learner is likely to forget in the next few days.",
      "It is difficult to predict exactly how fast a student will progress without regular testing.",
    ],
    collocations: ["predict outcomes", "accurately predict", "predict that"],
  },
  {
    id: "w_029", word: "compare", cefrBand: "B1", partOfSpeech: "v",
    definition: "to examine two or more things to find similarities and differences",
    viDefinition: "so sánh",
    distractors: ["to separate into many small pieces", "to store something safely for later", "to create something entirely new"],
    sentences: [
      "The study compared the vocabulary growth of three groups over an eight-week period.",
      "It is useful to compare your own writing with a model text to spot areas for improvement.",
    ],
    collocations: ["compare groups", "directly compare", "compare results"],
  },
  {
    id: "w_030", word: "respond", cefrBand: "B1", partOfSpeech: "v",
    definition: "to say or do something as a reaction to something that has happened",
    viDefinition: "phản hồi, trả lời",
    distractors: ["to start an action before being asked", "to avoid making any decision", "to increase the speed of a process"],
    sentences: [
      "Participants were asked to respond to each vocabulary item as quickly as possible.",
      "The way learners respond to corrective feedback varies depending on their learning style.",
    ],
    collocations: ["respond to feedback", "respond correctly", "respond within"],
  },
];

// ── B2 words (w_031 – w_060) ─────────────────────────────────────────────────

const B2_WORDS: WordEntry[] = [
  {
    id: "w_031", word: "ambiguous", cefrBand: "B2", partOfSpeech: "adj",
    definition: "having more than one possible meaning; not clear or definite",
    viDefinition: "mơ hồ, không rõ ràng",
    distractors: ["extremely precise and detailed", "impossible to translate into another language", "relating to spoken communication only"],
    sentences: [
      "The instructions for the task were ambiguous, so many students answered incorrectly.",
      "An ambiguous sentence can be interpreted in two or more ways depending on context.",
    ],
    collocations: ["deliberately ambiguous", "remain ambiguous", "ambiguous meaning"],
  },
  {
    id: "w_032", word: "scrutinize", cefrBand: "B2", partOfSpeech: "v", lemma: "scrutinize",
    definition: "to examine something very carefully and critically",
    viDefinition: "xem xét kỹ lưỡng, kiểm tra chặt chẽ",
    distractors: ["to ignore something deliberately", "to move through space quickly", "to produce a large number of copies"],
    sentences: [
      "Researchers must scrutinize every step of their methodology to avoid bias.",
      "The committee will scrutinize the application before making a final decision.",
    ],
    collocations: ["carefully scrutinize", "scrutinize evidence", "closely scrutinize"],
  },
  {
    id: "w_033", word: "alleviate", cefrBand: "B2", partOfSpeech: "v",
    definition: "to make a problem, pain, or bad situation less severe",
    viDefinition: "giảm bớt, làm nhẹ",
    distractors: ["to increase the intensity of a problem", "to describe in precise detail", "to separate into two equal halves"],
    sentences: [
      "Regular practice can alleviate the anxiety that many learners feel before speaking in class.",
      "The new app was designed to alleviate the problem of vocabulary forgetting over time.",
    ],
    collocations: ["alleviate stress", "help to alleviate", "alleviate the problem"],
  },
  {
    id: "w_034", word: "coherent", cefrBand: "B2", partOfSpeech: "adj",
    definition: "logically consistent and easy to follow or understand",
    viDefinition: "mạch lạc, nhất quán",
    distractors: ["lacking any logical connection between parts", "very short and missing key details", "relating to color or visual design"],
    sentences: [
      "A coherent argument requires that each point connects logically to the next.",
      "Students were asked to write a coherent paragraph using five new vocabulary items.",
    ],
    collocations: ["coherent argument", "logically coherent", "present a coherent"],
  },
  {
    id: "w_035", word: "impede", cefrBand: "B2", partOfSpeech: "v",
    definition: "to delay or prevent the progress of something",
    viDefinition: "cản trở, gây khó khăn",
    distractors: ["to speed up a process", "to explain something in simple terms", "to arrange in a specific order"],
    sentences: [
      "A lack of vocabulary can significantly impede a learner's ability to read academic texts.",
      "Technical problems during the study impeded data collection for several days.",
    ],
    collocations: ["impede progress", "seriously impede", "impede learning"],
  },
  {
    id: "w_036", word: "prolific", cefrBand: "B2", partOfSpeech: "adj",
    definition: "producing a large amount of something, especially creative work",
    viDefinition: "đa năng, sản xuất nhiều",
    distractors: ["rarely seen or experienced", "relating to professional qualifications", "causing strong negative emotion"],
    sentences: [
      "She was a prolific writer who published more than twenty books during her career.",
      "Prolific readers tend to acquire vocabulary faster than those who read infrequently.",
    ],
    collocations: ["prolific writer", "prolific researcher", "extremely prolific"],
  },
  {
    id: "w_037", word: "meticulous", cefrBand: "B2", partOfSpeech: "adj",
    definition: "showing very careful and precise attention to every detail",
    viDefinition: "tỉ mỉ, cẩn thận",
    distractors: ["moving very quickly without planning", "relating to medical treatment", "happening suddenly without warning"],
    sentences: [
      "The researcher kept meticulous records of every participant's daily review sessions.",
      "Good academic writing requires meticulous attention to grammar, vocabulary, and structure.",
    ],
    collocations: ["meticulous attention", "meticulous records", "extremely meticulous"],
  },
  {
    id: "w_038", word: "profound", cefrBand: "B2", partOfSpeech: "adj",
    definition: "having a very great or deep effect; very serious",
    viDefinition: "sâu sắc, có tác động lớn",
    distractors: ["relating only to physical appearance", "easily reversed or corrected", "happening at a very fast rate"],
    sentences: [
      "Vocabulary knowledge has a profound effect on a learner's reading comprehension ability.",
      "The experience of living abroad can have a profound impact on how people see language.",
    ],
    collocations: ["profound impact", "profound effect", "profound understanding"],
  },
  {
    id: "w_039", word: "deteriorate", cefrBand: "B2", partOfSpeech: "v",
    definition: "to become progressively worse in quality, condition, or value",
    viDefinition: "xuống cấp, suy giảm",
    distractors: ["to improve steadily over time", "to remain exactly the same", "to divide into smaller parts"],
    sentences: [
      "Without regular review, vocabulary knowledge tends to deteriorate quickly.",
      "The relationship between the two groups began to deteriorate after the disagreement.",
    ],
    collocations: ["rapidly deteriorate", "deteriorate over time", "condition deteriorates"],
  },
  {
    id: "w_040", word: "facilitate", cefrBand: "B2", partOfSpeech: "v",
    definition: "to make a process or activity easier or more likely to happen",
    viDefinition: "tạo điều kiện, thúc đẩy",
    distractors: ["to make something more difficult deliberately", "to repeat an activity many times", "to translate written text"],
    sentences: [
      "Technology can facilitate vocabulary learning by providing immediate corrective feedback.",
      "The teacher's role is to facilitate discussion rather than simply deliver information.",
    ],
    collocations: ["facilitate learning", "facilitate communication", "help to facilitate"],
  },
  {
    id: "w_041", word: "inevitable", cefrBand: "B2", partOfSpeech: "adj",
    definition: "certain to happen and impossible to avoid",
    viDefinition: "không thể tránh khỏi, tất yếu",
    distractors: ["possible but unlikely to occur", "chosen on purpose from a list", "relating to the weather"],
    sentences: [
      "Some degree of forgetting is inevitable when learning a large number of new words.",
      "With increased screen time, it was inevitable that digital learning tools would become popular.",
    ],
    collocations: ["virtually inevitable", "seem inevitable", "inevitable result"],
  },
  {
    id: "w_042", word: "inherent", cefrBand: "B2", partOfSpeech: "adj",
    definition: "existing as a natural and permanent part of something",
    viDefinition: "vốn có, cố hữu",
    distractors: ["added from an outside source", "relating to inheritance of money", "requiring special equipment"],
    sentences: [
      "There is an inherent difficulty in testing vocabulary knowledge objectively.",
      "The inherent complexity of language makes it hard to design a single perfect teaching method.",
    ],
    collocations: ["inherent risk", "inherent difficulty", "inherent in"],
  },
  {
    id: "w_043", word: "integrate", cefrBand: "B2", partOfSpeech: "v",
    definition: "to combine two or more things so they work together as a whole",
    viDefinition: "tích hợp, kết hợp",
    distractors: ["to separate into completely different groups", "to remove the less important parts", "to repeat without changing anything"],
    sentences: [
      "The app was designed to integrate spaced repetition with reading practice seamlessly.",
      "Good teachers integrate new grammar and vocabulary within meaningful communicative tasks.",
    ],
    collocations: ["integrate into", "fully integrate", "integrate skills"],
  },
  {
    id: "w_044", word: "perceive", cefrBand: "B2", partOfSpeech: "v",
    definition: "to become aware of something through the senses or the mind",
    viDefinition: "nhận thức, cảm nhận",
    distractors: ["to ignore information from the environment", "to produce a physical object", "to remember something from long ago"],
    sentences: [
      "Learners who perceive vocabulary learning as meaningful tend to remember words better.",
      "Teachers should be aware of how students perceive their feedback on written work.",
    ],
    collocations: ["perceive as", "widely perceived", "perceive a difference"],
  },
  {
    id: "w_045", word: "perspective", cefrBand: "B2", partOfSpeech: "n",
    definition: "a particular way of thinking about or viewing something",
    viDefinition: "quan điểm, góc nhìn",
    distractors: ["a physical tool used for drawing", "a type of formal agreement", "the speed at which something moves"],
    sentences: [
      "From a learner's perspective, having control over study pace is highly motivating.",
      "The study examined the vocabulary problem from both a cognitive and pedagogical perspective.",
    ],
    collocations: ["from a perspective", "different perspectives", "learner perspective"],
  },
  {
    id: "w_046", word: "subsequent", cefrBand: "B2", partOfSpeech: "adj",
    definition: "coming after something else in time or order",
    viDefinition: "tiếp theo, sau đó",
    distractors: ["happening at the same time as something else", "coming before in time", "occurring only rarely"],
    sentences: [
      "Subsequent testing showed that participants retained the words over a longer period.",
      "The initial trial was successful, and subsequent studies confirmed the findings.",
    ],
    collocations: ["subsequent study", "subsequent analysis", "in subsequent weeks"],
  },
  {
    id: "w_047", word: "assess", cefrBand: "B2", partOfSpeech: "v",
    definition: "to evaluate or form a judgment about the quality of something",
    viDefinition: "đánh giá, nhận xét",
    distractors: ["to avoid forming any judgment", "to collect items from a wide area", "to reduce the difficulty of a task"],
    sentences: [
      "The researchers used a standardized test to assess participants' vocabulary size.",
      "Teachers need to assess both written and spoken production to get a complete picture.",
    ],
    collocations: ["assess performance", "accurately assess", "assess the impact"],
  },
  {
    id: "w_048", word: "constitute", cefrBand: "B2", partOfSpeech: "v",
    definition: "to be or make up a part of a larger whole",
    viDefinition: "cấu thành, bao gồm",
    distractors: ["to destroy a part of a structure", "to translate into simple terms", "to separate from a group"],
    sentences: [
      "Vocabulary knowledge constitutes a core component of overall language proficiency.",
      "The three arms of the study constitute a balanced experimental design.",
    ],
    collocations: ["constitute a majority", "constitute evidence", "constitute part of"],
  },
  {
    id: "w_049", word: "derive", cefrBand: "B2", partOfSpeech: "v",
    definition: "to obtain something from a source, or to have something as an origin",
    viDefinition: "bắt nguồn từ, thu được từ",
    distractors: ["to give something to another person", "to guess without any evidence", "to prevent something from spreading"],
    sentences: [
      "Many English academic words derive from Latin and Greek roots.",
      "Learners can derive the meaning of unknown words from the surrounding context.",
    ],
    collocations: ["derive from", "derive meaning", "originally derived"],
  },
  {
    id: "w_050", word: "enhance", cefrBand: "B2", partOfSpeech: "v",
    definition: "to improve the quality, value, or effectiveness of something",
    viDefinition: "nâng cao, tăng cường",
    distractors: ["to reduce the quality of something", "to divide into equal sections", "to remove an unwanted element"],
    sentences: [
      "Using images alongside word definitions can enhance vocabulary memory for visual learners.",
      "The new interface was designed to enhance the user experience during study sessions.",
    ],
    collocations: ["enhance performance", "significantly enhance", "enhance learning"],
  },
  {
    id: "w_051", word: "justify", cefrBand: "B2", partOfSpeech: "v",
    definition: "to show or explain why something is reasonable or necessary",
    viDefinition: "biện minh, chứng minh sự hợp lý",
    distractors: ["to agree without giving any reason", "to select one option from many", "to correct a grammatical error"],
    sentences: [
      "Researchers must justify their choice of methodology in the methods section.",
      "A single positive result is not enough to justify a strong claim about effectiveness.",
    ],
    collocations: ["justify a decision", "justify the use of", "fully justify"],
  },
  {
    id: "w_052", word: "modify", cefrBand: "B2", partOfSpeech: "v",
    definition: "to make small changes to something to improve it or make it fit",
    viDefinition: "sửa đổi, điều chỉnh",
    distractors: ["to destroy and rebuild from scratch", "to translate into a simpler form", "to leave unchanged for a long time"],
    sentences: [
      "The researchers modified the scoring rubric after the pilot test revealed ambiguities.",
      "Teachers may need to modify tasks to make them appropriate for different proficiency levels.",
    ],
    collocations: ["modify the design", "slightly modify", "modify to suit"],
  },
  {
    id: "w_053", word: "implicit", cefrBand: "B2", partOfSpeech: "adj",
    definition: "suggested or understood without being directly stated",
    viDefinition: "ẩn ý, ngầm hiểu",
    distractors: ["stated clearly and directly", "physically written on a surface", "relating to memory loss"],
    sentences: [
      "The implicit assumption in many studies is that all learners respond to feedback similarly.",
      "Good writing often relies on implicit meaning that readers are expected to infer.",
    ],
    collocations: ["implicit assumption", "remain implicit", "implicit knowledge"],
  },
  {
    id: "w_054", word: "contend", cefrBand: "B2", partOfSpeech: "v",
    definition: "to argue or state something strongly; or to deal with a difficult problem",
    viDefinition: "tranh luận; đối phó với",
    distractors: ["to agree quietly with others", "to search for something systematically", "to repeat a task several times"],
    sentences: [
      "Some researchers contend that vocabulary size alone does not predict reading success.",
      "Teachers often contend with large class sizes that make individualized feedback difficult.",
    ],
    collocations: ["contend that", "contend with", "scholars contend"],
  },
  {
    id: "w_055", word: "reinforce", cefrBand: "B2", partOfSpeech: "v",
    definition: "to strengthen or support something, especially an idea or behavior",
    viDefinition: "củng cố, tăng cường",
    distractors: ["to weaken something gradually", "to replace with something new", "to disagree with a conclusion"],
    sentences: [
      "Retrieval practice is known to reinforce memory more effectively than re-reading.",
      "Positive feedback can reinforce a learner's motivation to continue studying.",
    ],
    collocations: ["reinforce learning", "reinforce behavior", "further reinforce"],
  },
  {
    id: "w_056", word: "ambivalent", cefrBand: "B2", partOfSpeech: "adj",
    definition: "having mixed or contradictory feelings about something",
    viDefinition: "lưỡng lự, có cảm xúc trái chiều",
    distractors: ["completely certain about a decision", "relating to formal language use", "moving in more than one direction at once"],
    sentences: [
      "Many students feel ambivalent about using apps for language learning — helpful but distracting.",
      "The committee was ambivalent about the proposed change and asked for more evidence.",
    ],
    collocations: ["feel ambivalent", "remain ambivalent", "ambivalent attitude"],
  },
  {
    id: "w_057", word: "undermine", cefrBand: "B2", partOfSpeech: "v",
    definition: "to weaken or damage something gradually and indirectly",
    viDefinition: "làm suy yếu, phá hoại",
    distractors: ["to strengthen something consistently", "to explain something in detail", "to avoid a difficult situation"],
    sentences: [
      "Poor sleep can undermine the effectiveness of even the best study routine.",
      "Using translation as a crutch may undermine a learner's ability to think in the target language.",
    ],
    collocations: ["undermine confidence", "undermine the argument", "seriously undermine"],
  },
  {
    id: "w_058", word: "unprecedented", cefrBand: "B2", partOfSpeech: "adj",
    definition: "never having happened or existed before",
    viDefinition: "chưa từng có, tiền lệ chưa có",
    distractors: ["happening on a regular or predictable basis", "difficult to observe without equipment", "coming before another event in a sequence"],
    sentences: [
      "The pandemic created an unprecedented shift toward online language learning worldwide.",
      "The algorithm achieved unprecedented accuracy in predicting which words learners would forget.",
    ],
    collocations: ["unprecedented scale", "virtually unprecedented", "unprecedented growth"],
  },
  {
    id: "w_059", word: "hypothesis", cefrBand: "B2", partOfSpeech: "n",
    definition: "a proposed explanation for something, made as a starting point for further investigation",
    viDefinition: "giả thuyết",
    distractors: ["a conclusion drawn after completing research", "a type of question asked in a survey", "a method for organizing experimental data"],
    sentences: [
      "The study was designed to test the hypothesis that spaced retrieval improves retention.",
      "A hypothesis must be testable and falsifiable to be considered scientific.",
    ],
    collocations: ["test a hypothesis", "research hypothesis", "support the hypothesis"],
  },
  {
    id: "w_060", word: "implication", cefrBand: "B2", partOfSpeech: "n",
    definition: "a likely consequence or meaning that is not directly stated",
    viDefinition: "hàm ý, hệ quả",
    distractors: ["a direct instruction given in writing", "a physical measurement taken in a lab", "a method of organizing vocabulary"],
    sentences: [
      "The findings have important implications for how we design vocabulary learning apps.",
      "The implication of the data is that daily practice is more effective than weekly sessions.",
    ],
    collocations: ["implications for", "practical implications", "have implications"],
  },
];

// ── Exports ──────────────────────────────────────────────────────────────────

export const WORD_BANK: WordEntry[] = [...B1_WORDS, ...B2_WORDS];

/** Lookup by id. Returns undefined if not found. */
export function getWordById(id: string): WordEntry | undefined {
  return WORD_BANK.find((w) => w.id === id);
}

/** Lookup by word string (case-insensitive). Returns first match. */
export function getWordByString(word: string): WordEntry | undefined {
  const lower = word.toLowerCase();
  return WORD_BANK.find((w) => w.word.toLowerCase() === lower);
}

/** Filter by CEFR band. */
export function getWordsByBand(band: "B1" | "B2"): WordEntry[] {
  return WORD_BANK.filter((w) => w.cefrBand === band);
}

/** Active words only (pilotStatus !== "removed"). */
export function getActiveWords(): WordEntry[] {
  return WORD_BANK.filter((w) => w.pilotStatus !== "removed");
}

/**
 * Public-safe projection — strips nothing (the word bank is not secret),
 * but kept as a separate type for clarity in API responses.
 */
export type PublicWordEntry = Omit<WordEntry, "pilotRemovalReason">;

export function toPublicWordEntry(w: WordEntry): PublicWordEntry {
  const { pilotRemovalReason: _r, ...rest } = w;
  return rest;
}
