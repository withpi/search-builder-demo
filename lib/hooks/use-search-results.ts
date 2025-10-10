"use client"

import { useCallback, useMemo, useRef, useEffect } from "react"
import { useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { SearchResult } from "@/lib/types"

interface UseSearchResultsProps {
  results: SearchResult[]
  searchId: string | null
  onRate: (searchId: string, resultId: string, rating: "up" | "down") => void
  onUpdateRanking: (searchId: string, resultId: string, newRank: number, originalRank: number) => void
}

export function useSearchResults({ results, searchId, onRate, onUpdateRanking }: UseSearchResultsProps) {
  const lastSearchIdRef = useRef<string | null>(searchId)

  useEffect(() => {
    if (searchId !== lastSearchIdRef.current) {
      lastSearchIdRef.current = searchId
    }
  }, [searchId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleRate = useCallback(
    (resultId: string, rating: "up" | "down") => {
      if (!searchId) return
      onRate(searchId, resultId, rating)
    },
    [searchId, onRate],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id && searchId) {
        const oldIndex = results.findIndex((item) => item.id === active.id)
        const newIndex = results.findIndex((item) => item.id === over.id)

        const movedResult = results[oldIndex]
        const originalRank = movedResult.originalRank ?? oldIndex + 1
        const newRank = newIndex + 1

        onUpdateRanking(searchId, movedResult.id, newRank, originalRank)
      }
    },
    [searchId, results, onUpdateRanking],
  )

  const resultIds = useMemo(() => results.map((r) => r.id), [results])

  return {
    sensors,
    handleRate,
    handleDragEnd,
    resultIds,
  }
}
