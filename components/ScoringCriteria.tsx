"use client"

import { useState } from "react"

type ExamType = "VSTEP" | "IELTS"

interface CriterionBand {
  band: string | number
  description: string
}

interface Criterion {
  name: string
  bands: CriterionBand[]
}

const IELTS_CRITERIA: Criterion[] = [
  {
    name: "Task Response",
    bands: [
  {
    band: 9,
    description: "Fully addresses all parts of the task with a clear and fully developed position throughout the response. All ideas are highly relevant, extended, and well-supported with specific explanations and examples. There is no irrelevant information."
  },
  {
    band: 8,
    description: "Addresses all parts of the task with a clear position throughout the response. Ideas are well-developed, relevant, and supported, though some points may be less fully extended or slightly lack precision."
  },
  {
    band: 7,
    description: "Addresses all parts of the task with a clear position, although this may be inconsistently maintained. Main ideas are relevant and clear, but some may be insufficiently developed or lack depth in explanation or examples."
  },
  {
    band: 6,
    description: "Addresses the task adequately with an identifiable position, though it may be unclear or not consistently maintained. Some ideas are developed, but others are underdeveloped, lack support, or may be partially irrelevant."
  },
  {
    band: 5,
    description: "Addresses the task only partially. The position may be unclear or inconsistent. Ideas are limited, underdeveloped, or lack relevance. Supporting details are minimal or not clearly explained."
  },
  {
    band: 4,
    description: "Attempts to address the task but does not cover all parts. The position is unclear or absent. Ideas are poorly developed, mostly irrelevant, or repetitive, with little or no supporting evidence."
  },
  {
    band: 3,
    description: "Does not adequately address the task. Very limited ideas which are largely irrelevant or unclear. No clear position is presented."
  },
  {
    band: 2,
    description: "Barely addresses the task. Response is extremely limited with almost no relevant ideas or development."
  },
  {
    band: 1,
    description: "Response is minimal and does not communicate any meaningful information related to the task."
  },
  {
    band: 0,
    description: "Does not address the task at all or is completely irrelevant."
  }
    ],
  },
  {
    name: "Coherence & Cohesion",
bands: [
  {
    band: 9,
    description: "Uses cohesion in such a way that it attracts no attention. Skillfully manages paragraphing with a clear central topic in each paragraph. Ideas are logically sequenced with seamless progression. A wide range of cohesive devices and referencing is used naturally and accurately without overuse."
  },
  {
    band: 8,
    description: "Sequences information and ideas logically with clear overall progression. Paragraphing is used effectively with clear central topics. A wide range of cohesive devices is used appropriately, though there may be minor inaccuracies or slight overuse."
  },
  {
    band: 7,
    description: "Logically organizes information and ideas with clear progression throughout. Paragraphing is generally appropriate. Uses a range of cohesive devices, although there may be some overuse, underuse, or minor errors. Referencing is generally clear but not always flexible."
  },
  {
    band: 6,
    description: "Arranges information and ideas with some logical progression, though it may not be consistent. Paragraphing is evident but may be faulty. Uses cohesive devices effectively but with limitations, including repetition, overuse, or mechanical linking. Referencing may be unclear or repetitive."
  },
  {
    band: 5,
    description: "Presents information with some organization but lacks overall progression. Paragraphing may be inadequate or inconsistent. Uses a limited range of cohesive devices, often inaccurately or repetitively. Connections between ideas may be unclear."
  },
  {
    band: 4,
    description: "Presents information and ideas but they are not arranged coherently. Paragraphing is weak or absent. Cohesive devices are very limited, inaccurate, or rarely used. There is little logical connection between ideas."
  },
  {
    band: 3,
    description: "Does not organize ideas logically. Very limited or unclear progression. Minimal use of cohesive devices, which are often incorrect. Paragraphing is not evident."
  },
  {
    band: 2,
    description: "Has very little control of organization. Ideas are extremely difficult to follow. Almost no use of cohesive devices."
  },
  {
    band: 1,
    description: "No meaningful organization or cohesion. Response is extremely fragmented."
  },
  {
    band: 0,
    description: "Does not address the task or cannot be assessed."
  }
    ],
  },
  {
    name: "Lexical Resource",
bands: [
  {
    band: 9,
    description: "Uses a wide range of vocabulary with full flexibility and precise meaning. Skillfully uses less common and idiomatic vocabulary naturally. Shows accurate and natural collocation throughout. Rare minor errors in spelling or word formation."
  },
  {
    band: 8,
    description: "Uses a wide range of vocabulary fluently and flexibly to convey precise meanings. Skillfully uses less common vocabulary, though there may be occasional inaccuracies. Collocation is generally strong. Occasional errors in spelling or word formation."
  },
  {
    band: 7,
    description: "Uses a sufficient range of vocabulary to allow some flexibility and precision. Attempts to use less common vocabulary, with some awareness of style and collocation, though errors may occur. Some errors in spelling and word formation."
  },
  {
    band: 6,
    description: "Uses an adequate range of vocabulary for the task. Attempts paraphrasing but not always successfully. Vocabulary may be repetitive or lack precision. Errors in spelling and word formation are noticeable but do not severely impede communication."
  },
  {
    band: 5,
    description: "Uses a limited range of vocabulary, often repetitive or lacking flexibility. Attempts paraphrasing are limited or unsuccessful. Frequent errors in spelling and word formation may cause some difficulty for the reader."
  },
  {
    band: 4,
    description: "Uses very limited vocabulary with frequent repetition. Rarely attempts paraphrasing. Errors in word choice, spelling, and word formation are frequent and may impede understanding."
  },
  {
    band: 3,
    description: "Uses extremely limited vocabulary. Meaning is often unclear due to inappropriate word choice. Very frequent errors in spelling and word formation."
  },
  {
    band: 2,
    description: "Has very little vocabulary. Cannot convey basic meaning effectively."
  },
  {
    band: 1,
    description: "Uses only isolated words or memorized expressions with no meaningful communication."
  },
  {
    band: 0,
    description: "Does not use any assessable language."
  }
    ],
  },
  {
   name: "Grammatical Range & Accuracy",
bands: [
  {
    band: 9,
    description: "Uses a wide range of complex structures with full flexibility and accuracy. Produces consistently error-free sentences. Grammar and punctuation are used naturally and accurately throughout, with only rare minor slips."
  },
  {
    band: 8,
    description: "Uses a wide range of structures flexibly. The majority of sentences are error-free. Makes only occasional errors or minor inaccuracies. Demonstrates good control of grammar and punctuation."
  },
  {
    band: 7,
    description: "Uses a variety of complex structures with generally good control. Produces frequent error-free sentences, though some grammatical mistakes persist. Errors do not significantly reduce clarity."
  },
  {
    band: 6,
    description: "Uses a mix of simple and complex sentence forms. Makes some errors in grammar and punctuation, but they rarely reduce communication. Complex structures are attempted but with limited accuracy."
  },
  {
    band: 5,
    description: "Uses mainly simple sentence forms. Attempts complex structures but often inaccurately. Frequent grammatical errors may cause some difficulty for the reader."
  },
  {
    band: 4,
    description: "Uses a limited range of structures. Errors in grammar and punctuation are frequent and may cause difficulty in understanding."
  },
  {
    band: 3,
    description: "Attempts sentence forms but with very limited success. Errors are frequent and communication is often unclear."
  },
  {
    band: 2,
    description: "Cannot use sentence forms effectively. Errors dominate and meaning is difficult to understand."
  },
  {
    band: 1,
    description: "Uses only isolated words or memorized structures with no control of grammar."
  },
  {
    band: 0,
    description: "Does not use any assessable grammar."
  }
    ],
  },
]

const VSTEP_CRITERIA: Criterion[] = [
  {
   name: "Task Fulfillment",
bands: [
  {
    band: 10,
    description: "Fully completes all parts of the task with a clear and appropriate response to the task type. All required elements are fully addressed and well-developed with relevant explanations and examples. The response is entirely relevant and meets or exceeds the expected length."
  },
  {
    band: 9,
    description: "Completes all parts of the task appropriately. All required elements are addressed with clear development, though some points may be less fully extended. The response is relevant and meets the expected length."
  },
  {
    band: 8,
    description: "Completes most parts of the task. Minor elements may be missing or insufficiently developed. Ideas are generally relevant, though some lack detail or clarity."
  },
  {
    band: 7,
    description: "Addresses the main task but some required elements are missing or inadequately developed. The response may show uneven development or partial relevance."
  },
  {
    band: 6,
    description: "Partially completes the task. Several required elements are missing, unclear, or underdeveloped. Ideas may lack relevance or sufficient support."
  },
  {
    band: 5,
    description: "Attempts the task but misses key elements. The response is limited in content and development. Ideas are often unclear or not relevant to the task."
  },
  {
    band: 4,
    description: "Incomplete response with very limited coverage of the task. Most required elements are missing or poorly addressed."
  },
  {
    band: 3,
    description: "Very limited attempt at the task. Response is largely irrelevant or lacks meaningful content."
  },
  {
    band: 2,
    description: "Barely addresses the task with minimal content. Ideas are extremely limited or unclear."
  },
  {
    band: 1,
    description: "Produces only isolated or memorized content with no meaningful response to the task."
  },
  {
    band: 0,
    description: "Does not attempt the task or response is completely irrelevant."
  }
    ],
  },
  {
   name: "Organization",
bands: [
  {
    band: 10,
    description: "Presents a clear and well-structured response appropriate to the task type. Information is logically organized with smooth progression throughout. Paragraphing is skillfully managed, with each paragraph having a clear central idea. A wide range of cohesive devices is used naturally and effectively."
  },
  {
    band: 9,
    description: "Well-organized with a clear overall structure. Ideas are logically arranged with good progression. Paragraphing is clear and appropriate. Cohesive devices are used effectively, with only minor issues."
  },
  {
    band: 8,
    description: "Generally well-organized with clear structure. Ideas are mostly logically arranged, though some transitions may be less smooth. Paragraphing is evident. Cohesive devices are used appropriately but may lack variety."
  },
  {
    band: 7,
    description: "Adequate organization with a recognizable structure. Some logical progression is present, though not always consistent. Paragraphing is used but may be uneven. Cohesive devices are used but may be repetitive or mechanical."
  },
  {
    band: 6,
    description: "Basic organization with some attempt at structure. Ideas are somewhat organized but progression is unclear in places. Paragraphing may be inconsistent or limited. Use of cohesive devices is basic and repetitive."
  },
  {
    band: 5,
    description: "Weak organization with limited structure. Ideas lack clear progression and may be loosely connected. Paragraphing is inadequate or poorly managed. Cohesive devices are limited or used inaccurately."
  },
  {
    band: 4,
    description: "Poor organization with little sense of structure. Ideas are disjointed and difficult to follow. Paragraphing is absent or ineffective. Very limited or incorrect use of cohesive devices."
  },
  {
    band: 3,
    description: "Very little organization. Ideas are unclear and lack logical connection. No effective paragraphing."
  },
  {
    band: 2,
    description: "Extremely poor organization. Response is very difficult to follow."
  },
  {
    band: 1,
    description: "No meaningful organization. Response is fragmented."
  },
  {
    band: 0,
    description: "Does not attempt the task or cannot be assessed."
  }
    ],
  },
  {
    name: "Grammar",
bands: [
  {
    band: 10,
    description: "Uses a wide range of grammatical structures with a high level of accuracy and flexibility. Complex sentences are handled confidently and accurately. Errors are rare and do not affect communication."
  },
  {
    band: 9,
    description: "Demonstrates very good control of a range of grammatical structures. Complex sentences are used effectively with only occasional errors. Most sentences are accurate."
  },
  {
    band: 8,
    description: "Uses a good range of grammatical structures with some variety. Complex structures are attempted with generally good control, though minor errors occur. Errors rarely affect understanding."
  },
  {
    band: 7,
    description: "Uses a mix of simple and complex structures. Grammar is generally correct, but there are noticeable errors in more complex sentences. Errors do not significantly reduce clarity."
  },
  {
    band: 6,
    description: "Uses mainly simple structures with some attempts at complex sentences. Errors are frequent in complex structures and sometimes occur in basic grammar, but meaning is generally understandable."
  },
  {
    band: 5,
    description: "Uses basic grammatical structures with limited range. Frequent errors occur, including in basic forms, which may cause some difficulty for the reader."
  },
  {
    band: 4,
    description: "Uses a very limited range of structures. Errors are frequent and often affect understanding. Control of basic grammar is weak."
  },
  {
    band: 3,
    description: "Shows very limited control of grammar. Errors are very frequent and communication is often unclear."
  },
  {
    band: 2,
    description: "Has very little control of grammatical structures. Meaning is difficult to understand."
  },
  {
    band: 1,
    description: "Produces only isolated words or memorized structures with almost no grammatical control."
  },
  {
    band: 0,
    description: "Does not use any assessable grammar."
  }
    ],
  },
  {
   name: "Vocabulary",
bands: [
  {
    band: 10,
    description: "Uses a wide and flexible range of vocabulary with precise and natural expression. Word choice is accurate and appropriate throughout. Demonstrates strong control of collocation and word forms. Errors are rare and do not affect communication."
  },
  {
    band: 9,
    description: "Uses a very good range of vocabulary with mostly precise meaning. Word choice is generally appropriate, with occasional minor inaccuracies. Collocation is mostly natural. Few errors in spelling or word formation."
  },
  {
    band: 8,
    description: "Uses a good range of vocabulary to express ideas clearly. Word choice is generally appropriate, though some imprecision occurs. Some awareness of collocation and paraphrasing. Occasional errors in word form or spelling."
  },
  {
    band: 7,
    description: "Uses an adequate range of vocabulary for the task. Some repetition or limited flexibility may be evident. Attempts paraphrasing but not always successfully. Errors in word choice or form occur but do not seriously affect understanding."
  },
  {
    band: 6,
    description: "Uses a limited range of vocabulary with noticeable repetition. Word choice is sometimes inappropriate or imprecise. Limited ability to paraphrase. Errors in word form and spelling are evident but meaning is generally understandable."
  },
  {
    band: 5,
    description: "Uses a very limited range of vocabulary. Frequent repetition and inappropriate word choice. Limited control of word forms. Errors may cause difficulty for the reader."
  },
  {
    band: 4,
    description: "Uses poor vocabulary with frequent errors in word choice, spelling, and word formation. Communication is often unclear."
  },
  {
    band: 3,
    description: "Uses extremely limited vocabulary. Meaning is often unclear due to incorrect word choice."
  },
  {
    band: 2,
    description: "Has very little usable vocabulary. Cannot express basic ideas clearly."
  },
  {
    band: 1,
    description: "Uses only isolated words or memorized expressions with no meaningful communication."
  },
  {
    band: 0,
    description: "Does not use any assessable vocabulary."
  }
    ],
  },
]

interface ScoringCriteriaProps {
  examType: ExamType
}

export default function ScoringCriteria({ examType }: ScoringCriteriaProps) {
  const criteria = examType === "IELTS" ? IELTS_CRITERIA : VSTEP_CRITERIA
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null)

  const toggleCriteria = (name: string) => {
    setExpandedCriteria(expandedCriteria === name ? null : name)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {examType} Scoring Criteria
      </h2>

      <div className="space-y-2">
        {criteria.map((criterion) => (
          <div key={criterion.name} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCriteria(criterion.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">{criterion.name}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedCriteria === criterion.name ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {expandedCriteria === criterion.name && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 space-y-2">
                {criterion.bands.map((band, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {band.band}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed pt-1">{band.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Tip:</span> Your essay will be scored on these criteria. Focus on addressing all parts of the task, organizing your ideas clearly, using varied vocabulary, and maintaining grammatical accuracy.
        </p>
      </div>
    </div>
  )
}
