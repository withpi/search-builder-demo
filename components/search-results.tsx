"use client"

import { useCallback, useMemo, memo } from "react"
import type { SearchResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react"
import { useSearch } from "@/lib/search-context"
import { ExpandableTextCard } from "./expandable-text-card"

interface SearchResultsProps {
  results: SearchResult[]
  searchId: string | null
}

export const SearchResults = memo(function SearchResults({ results, searchId }: SearchResultsProps) {
  const { rateResult } = useSearch()

  const handleRate = useCallback(
    (resultId: string, rating: "up" | "down") => {
      if (!searchId) return
      rateResult(searchId, resultId, rating)
    },
    [searchId, rateResult],
  )

  const resultsList = useMemo(
    () =>
      results.map((result, index) => <ResultCard key={result.id} result={result} index={index} onRate={handleRate} />),
    [results, handleRate],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Search Results <span className="text-muted-foreground font-normal">({results.length})</span>
        </h2>
      </div>

      <div className="space-y-3">{resultsList}</div>
    </div>
  )
})

interface ResultCardProps {
  result: SearchResult
  index: number
  onRate: (resultId: string, rating: "up" | "down") => void
}

const ResultCard = memo(function ResultCard({ result, index, onRate }: ResultCardProps) {
  const handleRateUp = useCallback(() => onRate(result.id, "up"), [result.id, onRate])
  const handleRateDown = useCallback(() => onRate(result.id, "down"), [result.id, onRate])

  return (
    <Card className="bg-card border-border hover:border-primary/50 hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
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
                Score: {result.score.toFixed(3)}
              </Badge>
              {result.piScore !== undefined && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Rubric: {result.piScore.toFixed(3)}
                </Badge>
              )}
              {result.retrievalScore !== undefined && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Retrieval: {result.retrievalScore.toFixed(3)}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                #{index + 1}
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
