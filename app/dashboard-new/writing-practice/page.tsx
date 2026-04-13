"use client"

import { useState, useRef, useCallback } from "react"
import DashboardLayout from "@/components/DashboardLayout"

type ExamType = "VSTEP" | "IELTS"
type TaskType = "VSTEP Email" | "VSTEP Essay" | "IELTS Task 1" | "IELTS Task 2"

const TASK_TYPES: Record<ExamType, TaskType[]> = {
  VSTEP: ["VSTEP Email", "VSTEP Essay"],
  IELTS: ["IELTS Task 1", "IELTS Task 2"],
}

const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  "VSTEP Email": "Write a formal/informal email (150-180 words). Focus on correct format, appropriate tone, and clear purpose.",
  "VSTEP Essay": "Write an argumentative essay (250-300 words). Present a clear viewpoint with supporting arguments.",
  "IELTS Task 1": "Describe a graph/chart/diagram (150+ words). Summarize key features and make comparisons.",
  "IELTS Task 2": "Write a discursive essay (250+ words). Respond to a point of view, argument, or problem.",
}

const MIN_WORDS: Record<TaskType, number> = {
  "VSTEP Email": 150, "VSTEP Essay": 250, "IELTS Task 1": 150, "IELTS Task 2": 250,
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function ScoreSection({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        if (line.startsWith("## Overall Score")) {
          return <div key={i} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-4 text-center">
            <p className="text-sm opacity-80">Overall Score</p>
            <p className="text-3xl font-bold">{line.replace("## Overall Score:", "").trim()}</p>
          </div>
        }
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold text-gray-800 mt-4 border-b border-gray-200 pb-1">{line.replace("## ", "")}</h3>
        }
        if (line.startsWith("- ")) {
          return <li key={i} className="text-sm text-gray-700 ml-4 list-disc">{line.replace("- ", "")}</li>
        }
        if (line.trim()) {
          return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
        }
        return null
      })}
    </div>
  )
}

export default function WritingPracticePage() {
  const [examType, setExamType] = useState<ExamType>("IELTS")
  const [taskType, setTaskType] = useState<TaskType>("IELTS Task 2")
  const [keyword, setKeyword] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState("")
  const [essay, setEssay] = useState("")
  const [feedback, setFeedback] = useState("")
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [grading, setGrading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordCount = countWords(essay)
  const minWords = MIN_WORDS[taskType]
  const wordProgress = Math.min((wordCount / minWords) * 100, 100)

  const searchTopics = useCallback(async (kw: string, tt: TaskType) => {
    if (!kw.trim()) { setTopics([]); return }
    setLoadingTopics(true)
    try {
      const res = await fetch(`/api/writing-practice?keyword=${encodeURIComponent(kw)}&taskType=${encodeURIComponent(tt)}`)
      const data = await res.json()
      setTopics(data.topics || [])
    } catch { setTopics([]) }
    finally { setLoadingTopics(false) }
  }, [])

  const handleKeywordChange = (val: string) => {
    setKeyword(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchTopics(val, taskType), 600)
  }

  const handleExamChange = (et: ExamType) => {
    setExamType(et)
    const firstTask = TASK_TYPES[et][0]
    setTaskType(firstTask)
    setTopics([])
    setKeyword("")
    setSelectedTopic("")
    setEssay("")
    setFeedback("")
    setSubmitted(false)
  }

  const handleTaskChange = (tt: TaskType) => {
    setTaskType(tt)
    setTopics([])
    setKeyword("")
    setSelectedTopic("")
    setEssay("")
    setFeedback("")
    setSubmitted(false)
    if (keyword) searchTopics(keyword, tt)
  }

  const submitEssay = async () => {
    if (!essay.trim() || wordCount < minWords * 0.8) return
    setGrading(true); setFeedback(""); setSubmitted(true)
    try {
      const res = await fetch("/api/writing-practice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, prompt: selectedTopic, taskType, examType }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); setFeedback("Error: " + (err.error || "Failed")); return }
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let out = ""
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue
          const d = line.slice(6).trim(); if (d === "[DONE]") break
          try { out += JSON.parse(d).choices?.[0]?.delta?.content ?? ""; setFeedback(out) } catch {}
        }
      }
    } catch { setFeedback("Connection error. Please try again.") }
    finally { setGrading(false) }
  }

  const reset = () => { setEssay(""); setFeedback(""); setSubmitted(false); setSelectedTopic("") }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Writing Practice</h1>
            <p className="text-gray-500 text-sm mt-1">Practice VSTEP & IELTS writing with AI scoring</p>
          </div>

          {/* Exam + Task selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2">
                {(["VSTEP", "IELTS"] as ExamType[]).map(et => (
                  <button key={et} onClick={() => handleExamChange(et)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${examType === et ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {et}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {TASK_TYPES[examType].map(tt => (
                  <button key={tt} onClick={() => handleTaskChange(tt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${taskType === tt ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {tt}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">{TASK_DESCRIPTIONS[taskType]}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Topic search + Writing area */}
            <div className="space-y-4">
              {/* Topic search */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Search for a topic</label>
                <div className="relative">
                  <input
                    type="text" value={keyword} onChange={e => handleKeywordChange(e.target.value)}
                    placeholder="e.g. environment, technology, education..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-10"
                  />
                  {loadingTopics && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                    <p className="text-xs text-gray-500 font-medium">{topics.length} suggested prompts:</p>
                    {topics.map((t, i) => (
                      <button key={i} onClick={() => setSelectedTopic(t)}
                        className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${selectedTopic === t ? "border-indigo-400 bg-indigo-50 text-indigo-800" : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {selectedTopic && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Selected prompt:</p>
                    <p className="text-sm text-indigo-900">{selectedTopic}</p>
                  </div>
                )}

                {!selectedTopic && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Or enter your own prompt:</label>
                    <textarea
                      value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}
                      placeholder="Paste or type your writing prompt here..."
                      rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Writing area */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Your Essay</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${wordCount >= minWords ? "text-green-600" : wordCount >= minWords * 0.8 ? "text-yellow-600" : "text-gray-400"}`}>
                      {wordCount} / {minWords}+ words
                    </span>
                  </div>
                </div>

                {/* Word count progress */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${wordCount >= minWords ? "bg-green-500" : "bg-indigo-400"}`}
                    style={{ width: `${wordProgress}%` }} />
                </div>

                <textarea
                  value={essay} onChange={e => setEssay(e.target.value)}
                  placeholder={`Write your ${taskType} response here...\n\nTip: Aim for at least ${minWords} words.`}
                  rows={16}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none leading-relaxed"
                  disabled={submitted && !feedback}
                />

                <div className="flex gap-2 mt-3">
                  {!submitted ? (
                    <button onClick={submitEssay}
                      disabled={wordCount < minWords * 0.8 || !essay.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity shadow-md">
                      Submit for Grading
                    </button>
                  ) : (
                    <button onClick={reset} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors">
                      Write New Essay
                    </button>
                  )}
                </div>
                {wordCount < minWords * 0.8 && essay.trim() && (
                  <p className="text-xs text-amber-600 mt-2 text-center">Need at least {Math.round(minWords * 0.8)} words to submit</p>
                )}
              </div>
            </div>

            {/* Right: Feedback */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-h-[400px]">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                AI Feedback & Score
              </h2>

              {!submitted && !feedback && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Write your essay and submit to get detailed feedback</p>
                  <p className="text-gray-400 text-xs mt-1">Scored based on {examType} criteria</p>
                </div>
              )}

              {grading && !feedback && (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Analyzing your essay...</p>
                  <p className="text-xs text-gray-400">This may take 10-20 seconds</p>
                </div>
              )}

              {feedback && (
                <div className="overflow-y-auto max-h-[600px] pr-1">
                  <ScoreSection content={feedback} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
