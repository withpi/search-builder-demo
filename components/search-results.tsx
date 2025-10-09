"use client"

import { useCallback, useMemo, memo, useState } from "react"
import type { SearchResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, ThumbsUp, ThumbsDown, GripVertical } from "lucide-react"
import { useSearch } from "@/lib/search-context"
import { ExpandableTextCard } from "./expandable-text-card"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SearchResultsProps {
  results: SearchResult[]
  searchId: string | null
}

export const SearchResults = memo(function SearchResults({ results, searchId }: SearchResultsProps) {
  const { rateResult } = useSearch()
  const [reorderedResults, setReorderedResults] = useState<SearchResult[]>(() =>
    results.map((r, idx) => ({ ...r, originalRank: idx + 1 })),
  )

  useMemo(() => {
    setReorderedResults(results.map((r, idx) => ({ ...r, originalRank: idx + 1 })))
  }, [results])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleRate = useCallback(
    (resultId: string, rating: "up" | "down") => {
      if (!searchId) return
      rateResult(searchId, resultId, rating)
    },
    [searchId, rateResult],
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setReorderedResults((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const resultsList = useMemo(
    () =>
      reorderedResults.map((result, index) => (
        <SortableResultCard key={result.id} result={result} currentIndex={index} onRate={handleRate} />
      )),
    [reorderedResults, handleRate],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Search Results <span className="text-muted-foreground font-normal">({results.length})</span>
        </h2>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={reorderedResults.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">{resultsList}</div>
        </SortableContext>
      </DndContext>
    </div>
  )
})

interface SortableResultCardProps {
  result: SearchResult
  currentIndex: number
  onRate: (resultId: string, rating: "up" | "down") => void
}

const SortableResultCard = memo(function SortableResultCard({ result, currentIndex, onRate }: SortableResultCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: result.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ResultCard
        result={result}
        currentIndex={currentIndex}
        onRate={onRate}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  )
})

interface ResultCardProps {
  result: SearchResult
  currentIndex: number
  onRate: (resultId: string, rating: "up" | "down") => void
  dragHandleProps?: {
    attributes: any
    listeners: any
  }
}

const ResultCard = memo(function ResultCard({ result, currentIndex, onRate, dragHandleProps }: ResultCardProps) {
  const handleRateUp = useCallback(() => onRate(result.id, "up"), [result.id, onRate])
  const handleRateDown = useCallback(() => onRate(result.id, "down"), [result.id, onRate])

  const originalRank = result.originalRank ?? currentIndex + 1
  const newRank = currentIndex + 1
  const rankChanged = originalRank !== newRank

  return (
    <Card className="bg-card border-border hover:border-primary/50 hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              {result.title || `Document ${result.id}`}
              {result.url && (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label={`Open ${result.title || "document"} in new tab`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                Score: {(result.score ?? 0).toFixed(3)}
              </Badge>
              {result.piScore !== undefined && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Rubric: {(result.piScore ?? 0).toFixed(3)}
                </Badge>
              )}
              {result.retrievalScore !== undefined && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Retrieval: {(result.retrievalScore ?? 0).toFixed(3)}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${rankChanged ? "bg-orange-50 text-orange-700 border-orange-200" : ""}`}
              >
                {rankChanged ? `#${originalRank} → #${newRank}` : `#${newRank}`}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRateUp}
              className={`h-9 w-9 p-0 ${
                result.rating === "up"
                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                  : "text-muted-foreground hover:text-green-600 hover:bg-green-50"
              }`}
              aria-label="Rate result as helpful"
              aria-pressed={result.rating === "up"}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRateDown}
              className={`h-9 w-9 p-0 ${
                result.rating === "down"
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
              }`}
              aria-label="Rate result as not helpful"
              aria-pressed={result.rating === "down"}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="hover:bg-accent/50 transition-colors rounded-b-lg">
        <ExpandableTextCard text={result.text} id={result.id} />
      </CardContent>
    </Card>
  )
})
