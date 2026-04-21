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
      { band: 9, description: "Fully addresses all parts of the task with well-developed ideas" },
      { band: 8, description: "Addresses all parts of the task with well-developed ideas" },
      { band: 7, description: "Addresses all parts of the task; main ideas are clear but could be better developed" },
      { band: 6, description: "Addresses the task adequately; some ideas are developed but others are unclear" },
      { band: 5, description: "Addresses the task but some parts are unclear or underdeveloped" },
      { band: 4, description: "Attempts to address the task but misses some key points" },
      { band: 0, description: "Does not address the task" },
    ],
  },
  {
    name: "Coherence & Cohesion",
    bands: [
      { band: 9, description: "Sequences ideas logically; uses a range of cohesive devices accurately" },
      { band: 8, description: "Sequences ideas logically; uses cohesive devices effectively" },
      { band: 7, description: "Sequences ideas logically; uses some cohesive devices" },
      { band: 6, description: "Arranges ideas with some logical progression; uses basic cohesive devices" },
      { band: 5, description: "Some logical organization; limited use of cohesive devices" },
      { band: 4, description: "Ideas are not clearly organized; minimal cohesion" },
      { band: 0, description: "No organization or cohesion" },
    ],
  },
  {
    name: "Lexical Resource",
    bands: [
      { band: 9, description: "Uses a wide range of vocabulary with precise and natural use" },
      { band: 8, description: "Uses a wide range of vocabulary; occasional imprecision" },
      { band: 7, description: "Uses a good range of vocabulary; some imprecision or repetition" },
      { band: 6, description: "Uses adequate vocabulary; some repetition or imprecision" },
      { band: 5, description: "Uses limited vocabulary; frequent repetition and imprecision" },
      { band: 4, description: "Uses very limited vocabulary; many errors" },
      { band: 0, description: "Insufficient vocabulary" },
    ],
  },
  {
    name: "Grammatical Range & Accuracy",
    bands: [
      { band: 9, description: "Uses a wide range of structures with high accuracy; rare errors" },
      { band: 8, description: "Uses a wide range of structures; mostly accurate with few errors" },
      { band: 7, description: "Uses a variety of structures; generally accurate with some errors" },
      { band: 6, description: "Uses a mix of simple and complex structures; some errors" },
      { band: 5, description: "Uses simple structures mostly; frequent errors in complex structures" },
      { band: 4, description: "Limited range of structures; many errors" },
      { band: 0, description: "Insufficient control of grammar" },
    ],
  },
]

const VSTEP_CRITERIA: Criterion[] = [
  {
    name: "Task Fulfillment",
    bands: [
      { band: 10, description: "Fully completes the task with all required elements" },
      { band: 9, description: "Completes the task with all required elements" },
      { band: 8, description: "Completes most of the task; minor elements missing" },
      { band: 7, description: "Completes the main task; some required elements missing" },
      { band: 6, description: "Partially completes the task; several elements missing" },
      { band: 5, description: "Attempts the task but misses key elements" },
      { band: 4, description: "Incomplete task completion" },
      { band: 0, description: "Does not attempt the task" },
    ],
  },
  {
    name: "Organization",
    bands: [
      { band: 10, description: "Excellent organization with clear structure and logical flow" },
      { band: 9, description: "Well-organized with clear structure and good flow" },
      { band: 8, description: "Good organization; ideas are generally well-arranged" },
      { band: 7, description: "Adequate organization; some logical progression" },
      { band: 6, description: "Basic organization; ideas are somewhat organized" },
      { band: 5, description: "Weak organization; ideas lack clear progression" },
      { band: 4, description: "Poor organization; ideas are disjointed" },
      { band: 0, description: "No organization" },
    ],
  },
  {
    name: "Grammar",
    bands: [
      { band: 10, description: "Excellent grammar with varied structures and rare errors" },
      { band: 9, description: "Very good grammar with varied structures and few errors" },
      { band: 8, description: "Good grammar with some variety; minor errors" },
      { band: 7, description: "Generally correct grammar; some errors in complex structures" },
      { band: 6, description: "Acceptable grammar; frequent errors in complex structures" },
      { band: 5, description: "Basic grammar; many errors" },
      { band: 4, description: "Poor grammar; frequent errors" },
      { band: 0, description: "Insufficient grammar control" },
    ],
  },
  {
    name: "Vocabulary",
    bands: [
      { band: 10, description: "Excellent vocabulary range with precise and natural use" },
      { band: 9, description: "Very good vocabulary range; mostly precise" },
      { band: 8, description: "Good vocabulary range; generally appropriate" },
      { band: 7, description: "Adequate vocabulary; some repetition" },
      { band: 6, description: "Limited vocabulary; noticeable repetition" },
      { band: 5, description: "Very limited vocabulary; frequent repetition" },
      { band: 4, description: "Poor vocabulary; many errors" },
      { band: 0, description: "Insufficient vocabulary" },
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
