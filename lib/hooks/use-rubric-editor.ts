"use client"

import { useState, useEffect, useCallback } from "react"
import type { RubricCriterion, Document, Rubric, Corpus } from "@/lib/types"
import { scoreResult } from "@/app/actions/score-results"

interface ScoredExample {
  document: Document
  totalScore: number
  questionScores: Array<{ label: string; score: number }>
  isScoring: boolean
}

interface UseRubricEditorProps {
  activeCorpusId: string | null
  corpora: Corpus[]
  rubrics: Rubric[]
  onSaveRubric: (rubric: Rubric) => Promise<void>
}

export function useRubricEditor({ activeCorpusId, corpora, rubrics, onSaveRubric }: UseRubricEditorProps) {
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { label: "Relevance", question: "Is the result relevant to the query?" },
  ])
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null)
  const [examples, setExamples] = useState<ScoredExample[]>([])
  const [isLoadingExamples, setIsLoadingExamples] = useState(false)

  useEffect(() => {
    const loadExamples = () => {
      if (!activeCorpusId) return

      const corpus = corpora.find((c) => c.id === activeCorpusId)
      if (!corpus || !corpus.isReady || corpus.documents.length === 0) return

      setIsLoadingExamples(true)

      const shuffled = [...corpus.documents].sort(() => Math.random() - 0.5)
      const sampled = shuffled.slice(0, 5)

      setExamples(
        sampled.map((doc) => ({
          document: doc,
          totalScore: 0,
          questionScores: [],
          isScoring: false,
        })),
      )

      setIsLoadingExamples(false)
    }

    loadExamples()
  }, [activeCorpusId, corpora])

  const scoreExamples = useCallback(async () => {
    if (criteria.length === 0 || criteria.some((c) => !c.label.trim() || !c.question.trim())) {
      return
    }

    setExamples((prev) => prev.map((ex) => ({ ...ex, isScoring: true })))

    const scoredExamples = await Promise.all(
      examples.map(async (example) => {
        try {
          const response = await scoreResult({
            query: "example query",
            text: example.document.text,
            criteria: criteria,
          })

          return {
            ...example,
            totalScore: response.error ? 0 : (response.total_score ?? 0),
            questionScores: response.question_scores || [],
            isScoring: false,
          }
        } catch (error) {
          return {
            ...example,
            totalScore: 0,
            questionScores: [],
            isScoring: false,
          }
        }
      }),
    )

    const sortedExamples = scoredExamples.sort((a, b) => b.totalScore - a.totalScore)
    setExamples(sortedExamples)
  }, [criteria, examples])

  const handleSaveRubric = useCallback(async () => {
    if (criteria.length === 0) {
      return
    }

    const newRubric: Rubric = {
      id: `rubric-${Date.now()}`,
      name: `Rubric v${rubrics.length}`,
      criteria: criteria,
      createdAt: new Date(),
      trainingCount: 0,
    }

    await onSaveRubric(newRubric)
    setCriteria([{ label: "Relevance", question: "Is the result relevant to the query?" }])
    setEditingRubricId(null)
  }, [criteria, rubrics.length, onSaveRubric])

  const handleLoadRubric = useCallback(
    (rubricId: string) => {
      const rubric = rubrics.find((r) => r.id === rubricId)
      if (rubric) {
        setCriteria([...rubric.criteria])
        setEditingRubricId(rubricId)
      }
    },
    [rubrics],
  )

  const resetEditor = useCallback(() => {
    setCriteria([{ label: "Relevance", question: "Is the result relevant to the query?" }])
    setEditingRubricId(null)
  }, [])

  return {
    criteria,
    setCriteria,
    editingRubricId,
    examples,
    isLoadingExamples,
    scoreExamples,
    handleSaveRubric,
    handleLoadRubric,
    resetEditor,
  }
}
