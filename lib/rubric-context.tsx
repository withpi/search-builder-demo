"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Rubric, RubricIndex, Corpus } from "./types"
import { useRubricIndexing } from "./hooks/use-rubric-indexing"

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
    // No longer automatically index the corpus when a rubric is created
    // Scoring will happen in real-time during search instead
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
