"use client"

import { useState, useCallback } from "react"
import { useSearch } from "@/lib/search-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { SearchModeSelector } from "./search-mode-selector"
import { ResultLimitSelector } from "./result-limit-selector"
import { Search, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { EmptyState } from "./empty-state"
import { RESULT_LIMITS } from "@/lib/constants"

export function TrainingInterface() {
  const { performSearch, rateResult, ratedResults } = useSearch()
  const [query, setQuery] = useState("")
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic" | "hybrid">("hybrid")
  const [resultLimit, setResultLimit] = useState(RESULT_LIMITS[1])
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const searchResults = await performSearch(query, resultLimit)
      setResults(searchResults)
      setCurrentSearchId(`search-${Date.now()}`)
    } catch (error) {
      console.error("[v0] Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }, [query, resultLimit, performSearch])

  const handleRate = useCallback(
    (resultId: string, rating: "up" | "down") => {
      if (!currentSearchId) return
      rateResult(currentSearchId, resultId, rating)
    },
    [currentSearchId, rateResult],
  )

  const getRating = useCallback(
    (resultId: string) => {
      if (!currentSearchId) return undefined
      return results.find((r) => r.id === resultId)?.rating
    },
    [currentSearchId, results],
  )

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border shadow-sm">
        <div className="space-y-4">
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="Enter your search query..."
              className="text-lg h-12"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SearchModeSelector value={searchMode} onChange={setSearchMode} />
                <ResultLimitSelector value={resultLimit} onChange={setResultLimit} />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !query.trim()} className="gap-2">
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {results.length > 0 ? `Results (${results.length})` : "Rate results to build training data"}
          </h3>
          <div className="text-sm text-muted-foreground">
            {ratedResults.length} result{ratedResults.length !== 1 ? "s" : ""} rated
          </div>
        </div>

        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results yet"
            description="Search for documents and rate them to build your training dataset"
          />
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => {
              const rating = getRating(result.id)
              return (
                <Card key={result.id} className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-foreground text-base">{result.title || "Untitled"}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">Score: {result.score.toFixed(3)}</span>
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{result.text}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={rating === "up" ? "default" : "outline"}
                        onClick={() => handleRate(result.id, "up")}
                        className="gap-1"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={rating === "down" ? "destructive" : "outline"}
                        onClick={() => handleRate(result.id, "down")}
                        className="gap-1"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
