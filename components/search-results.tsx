"use client"

import { useCallback, memo, useState } from "react"
import type { SearchResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, ThumbsUp, ThumbsDown, GripVertical } from "lucide-react"
import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"
import { ExpandableTextCard } from "./expandable-text-card"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSearchResults } from "@/lib/hooks/use-search-results"
import { RatingFeedbackModal } from "./rating-feedback-modal"
import { toast } from "react-toastify"

interface SearchResultsProps {
  results: SearchResult[]
  searchId: string | null
}

export const SearchResults = memo(function SearchResults({ results, searchId }: SearchResultsProps) {
  const { rateResult, updateResultRanking, searches, performSearchWithRubric } = useSearch()
  const { integrateFeedback, setActiveRubric } = useRubric()

  const currentSearch = searches.find((s) => s.id === searchId)

  const { sensors, handleRate, handleDragEnd, resultIds } = useSearchResults({
    results,
    searchId,
    onRate: rateResult,
    onUpdateRanking: updateResultRanking,
  })

  const handleRateWithFeedback = useCallback(
    async (resultId: string, rating: "up" | "down", feedback?: string) => {
      console.log("[v0] handleRateWithFeedback called", { resultId, rating, feedback })
      handleRate(resultId, rating, feedback)

      if (feedback && feedback.trim()) {
        const result = results.find((r) => r.id === resultId)
        console.log("[v0] Found result:", result)
        console.log("[v0] Current search:", currentSearch)

        if (result && currentSearch) {
          const toastId = toast.loading("Integrating feedback into rubric...")

          try {
            console.log("[v0] Calling integrateFeedback...")
            const response = await integrateFeedback({
              query: currentSearch.query,
              result: result.text,
              rating,
              feedback: feedback.trim(),
            })

            console.log("[v0] integrateFeedback response:", response)

            if (response.success) {
              const versionText = response.version !== undefined ? ` v${response.version}` : ""
              toast.update(toastId, {
                render: `✓ Feedback integrated into Feedback Rubric${versionText}`,
                type: "success",
                isLoading: false,
                autoClose: 3000,
              })

              console.log("[v0] Checking if rubric exists:", response.rubric)
              if (response.rubric) {
                console.log("[v0] Setting active rubric:", response.rubric.id)
                setActiveRubric(response.rubric.id)

                const rerankToastId = toast.loading(`Reranking results with Feedback Rubric${versionText}...`)

                try {
                  console.log("[v0] Calling performSearchWithRubric with existingSearchId:", {
                    query: currentSearch.query,
                    limit: results.length,
                    rubric: response.rubric,
                    existingSearchId: searchId,
                  })
                  await performSearchWithRubric(
                    currentSearch.query,
                    results.length,
                    response.rubric,
                    undefined,
                    0.5,
                    searchId || undefined,
                  )
                  console.log("[v0] performSearchWithRubric completed")

                  toast.update(rerankToastId, {
                    render: `✓ Results reranked with Feedback Rubric${versionText}`,
                    type: "success",
                    isLoading: false,
                    autoClose: 3000,
                  })
                } catch (error) {
                  console.log("[v0] Error during reranking:", error)
                  toast.update(rerankToastId, {
                    render: "Failed to rerank results",
                    type: "error",
                    isLoading: false,
                    autoClose: 5000,
                  })
                }
              } else {
                console.log("[v0] No rubric in response!")
              }
            } else {
              console.log("[v0] Integration failed:", response)
              toast.update(toastId, {
                render: "Failed to integrate feedback. The AI service encountered an error.",
                type: "error",
                isLoading: false,
                autoClose: 5000,
              })
            }
          } catch (error) {
            console.log("[v0] Error in handleRateWithFeedback:", error)
            toast.update(toastId, {
              render: "Failed to integrate feedback. The AI service encountered an error.",
              type: "error",
              isLoading: false,
              autoClose: 5000,
            })
          }
        }
      }
    },
    [handleRate, results, currentSearch, integrateFeedback, setActiveRubric, performSearchWithRubric, searchId],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Search Results <span className="text-muted-foreground font-normal">({results.length})</span>
        </h2>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={resultIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {results.map((result, index) => (
              <SortableResultCard
                key={result.id}
                result={result}
                currentIndex={index}
                onRate={handleRateWithFeedback}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
})

interface SortableResultCardProps {
  result: SearchResult
  currentIndex: number
  onRate: (resultId: string, rating: "up" | "down", feedback?: string) => void
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
  onRate: (resultId: string, rating: "up" | "down", feedback?: string) => void
  dragHandleProps?: {
    attributes: any
    listeners: any
  }
}

const ResultCard = memo(function ResultCard({ result, currentIndex, onRate, dragHandleProps }: ResultCardProps) {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [pendingRating, setPendingRating] = useState<"up" | "down" | null>(null)

  const handleRateUp = useCallback(() => {
    setPendingRating("up")
    setFeedbackModalOpen(true)
  }, [])

  const handleRateDown = useCallback(() => {
    setPendingRating("down")
    setFeedbackModalOpen(true)
  }, [])

  const handleFeedbackSubmit = useCallback(
    (feedback: string) => {
      if (pendingRating) {
        onRate(result.id, pendingRating, feedback)
        setPendingRating(null)
      }
    },
    [result.id, onRate, pendingRating],
  )

  const currentRank = currentIndex + 1
  const originalRank = result.originalRank
  const rankChanged = originalRank !== undefined && originalRank !== currentRank

  return (
    <>
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
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                >
                  Total: {(result.score ?? 0).toFixed(3)}
                </Badge>
                {result.piScore !== undefined && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Pi Score: {(result.piScore ?? 0).toFixed(3)}
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
                  {rankChanged ? `#${originalRank} → #${currentRank}` : `#${currentRank}`}
                </Badge>
              </div>
              {result.questionScores && result.questionScores.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {result.questionScores.map((qs, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {qs.label}: {qs.score.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              )}
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

      {pendingRating && (
        <RatingFeedbackModal
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
          rating={pendingRating}
          onSubmit={handleFeedbackSubmit}
          resultTitle={result.title || `Document ${result.id}`}
        />
      )}
    </>
  )
})
