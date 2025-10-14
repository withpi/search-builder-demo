"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Rubric, RubricIndex, Corpus } from "./types"
import { useRubricIndexing } from "./hooks/use-rubric-indexing"
import { integrateFeedbackIntoRubric } from "@/app/actions/integrate-feedback-into-rubric"
import { toast } from "react-toastify"

export const FEEDBACK_RUBRIC_PREFIX = "Feedback Rubric v"

interface RubricContextType {
  rubrics: Rubric[]
  activeRubricId: string | null
  rubricIndexes: RubricIndex[]
  indexingRubrics: Set<string>
  indexingProgress: { current: number; total: number; corpusName: string } | null
  isIndexing: boolean
  addRubric: (rubric: Rubric) => Promise<void>
  updateRubric: (id: string, rubric: Partial<Rubric>) => void
  deleteRubric: (id: string) => void
  setActiveRubric: (id: string | null) => void
  getRubricById: (id: string) => Rubric | undefined
  getIndexForRubric: (rubricId: string, corpusId: string) => RubricIndex | undefined
  integrateFeedback: (feedback: {
    query: string
    result: string
    rating: "up" | "down"
    feedback: string
  }) => Promise<{ success: boolean; error?: string; rubric?: Rubric; version?: number }>
}

const RubricContext = createContext<RubricContextType | undefined>(undefined)

interface RubricProviderProps {
  children: ReactNode
  corpora: Corpus[]
}

export function RubricProvider({ children, corpora }: RubricProviderProps) {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [activeRubricId, setActiveRubricId] = useState<string | null>(null)
  const [rubricIndexes, setRubricIndexes] = useState<RubricIndex[]>([])

  const handleIndexCreated = useCallback((index: RubricIndex) => {
    setRubricIndexes((prev) => [...prev, index])
  }, [])

  const { indexingRubrics, indexingProgress, isIndexing, indexRubric } = useRubricIndexing({
    corpora,
    onIndexCreated: handleIndexCreated,
  })

  const addRubric = useCallback(async (rubric: Rubric) => {
    setRubrics((prev) => [...prev, rubric])
    toast.success(`Rubric "${rubric.name}" created!`, { autoClose: 3000 })
  }, [])

  const updateRubric = useCallback((id: string, updates: Partial<Rubric>) => {
    setRubrics((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const deleteRubric = useCallback(
    (id: string) => {
      setRubrics((prev) => prev.filter((r) => r.id !== id))
      setRubricIndexes((prev) => prev.filter((idx) => idx.rubricId !== id))
      if (activeRubricId === id) {
        setActiveRubricId(null)
      }
    },
    [activeRubricId],
  )

  const setActiveRubric = useCallback((id: string | null) => {
    setActiveRubricId(id)
  }, [])

  const getRubricById = useCallback(
    (id: string) => {
      return rubrics.find((r) => r.id === id)
    },
    [rubrics],
  )

  const getIndexForRubric = useCallback(
    (rubricId: string, corpusId: string) => {
      return rubricIndexes.find((idx) => idx.rubricId === rubricId && idx.corpusId === corpusId)
    },
    [rubricIndexes],
  )

  const getLatestFeedbackRubric = useCallback(() => {
    const feedbackRubrics = rubrics.filter((r) => r.name.startsWith(FEEDBACK_RUBRIC_PREFIX))
    if (feedbackRubrics.length === 0) return null

    const versions = feedbackRubrics.map((r) => {
      const match = r.name.match(/v(\d+)$/)
      return match ? Number.parseInt(match[1], 10) : -1
    })
    const maxVersion = Math.max(...versions)
    return feedbackRubrics.find((r) => r.name === `${FEEDBACK_RUBRIC_PREFIX}${maxVersion}`)
  }, [rubrics])

  const integrateFeedback = useCallback(
    async (feedback: { query: string; result: string; rating: "up" | "down"; feedback: string }) => {
      try {
        const latestFeedbackRubric = getLatestFeedbackRubric()
        const nextVersion = latestFeedbackRubric
          ? Number.parseInt(latestFeedbackRubric.name.replace(FEEDBACK_RUBRIC_PREFIX, ""), 10) + 1
          : 0

        const result = await integrateFeedbackIntoRubric({
          existingCriteria: latestFeedbackRubric?.criteria || [],
          newFeedback: feedback,
        })

        if (!result.success) {
          return { success: false, error: result.error }
        }

        const newRubric: Rubric = {
          id: `rubric-feedback-v${nextVersion}-${Date.now()}`,
          name: `${FEEDBACK_RUBRIC_PREFIX}${nextVersion}`,
          criteria: [...(latestFeedbackRubric?.criteria || []), result.criterion!],
          createdAt: new Date(),
        }

        setRubrics((prev) => [...prev, newRubric])
        toast.success(`Rubric "${newRubric.name}" created!`, { autoClose: 3000 })

        return { success: true, rubric: newRubric, version: nextVersion }
      } catch (error) {
        console.error("[v0] Error in integrateFeedback:", error)
        return { success: false, error: "Failed to integrate feedback" }
      }
    },
    [getLatestFeedbackRubric],
  )

  return (
    <RubricContext.Provider
      value={{
        rubrics,
        activeRubricId,
        rubricIndexes,
        indexingRubrics,
        indexingProgress,
        isIndexing,
        addRubric,
        updateRubric,
        deleteRubric,
        setActiveRubric,
        getRubricById,
        getIndexForRubric,
        integrateFeedback,
      }}
    >
      {children}
    </RubricContext.Provider>
  )
}

export function useRubric() {
  const context = useContext(RubricContext)
  if (context === undefined) {
    throw new Error("useRubric must be used within a RubricProvider")
  }
  return context
}
