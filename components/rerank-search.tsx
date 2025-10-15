"use client"

import { useState, useCallback } from "react"
import { useSearch } from "@/lib/search-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResultLimitSelector } from "./result-limit-selector"
import { Search, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { EmptyState } from "./empty-state"
import { RESULT_LIMITS } from "@/lib/constants"
import { formatNumber } from "@/lib/utils"

export function RerankSearch() {
  const { rubrics, performRerank, isReranking } = useSearch()
  const [query, setQuery] = useState("")
  const [selectedRubricId, setSelectedRubricId] = useState<string>("")
  const [resultLimit, setResultLimit] = useState(RESULT_LIMITS[1])
  const [results, setResults] = useState<any[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !selectedRubricId) return

    try {
      const rerankedResults = await performRerank(query, resultLimit, selectedRubricId)
      setResults(rerankedResults)
    } catch (error) {
      console.error("[v0] Reranking failed:", error)
    }
  }, [query, selectedRubricId, resultLimit, performRerank])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  if (rubrics.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No rubrics available"
        description="Create a rubric in the Rubric tab to start reranking search results"
      />
    )
  }

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
                <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select rubric" />
                  </SelectTrigger>
                  <SelectContent>
                    {rubrics.map((rubric) => (
                      <SelectItem key={rubric.id} value={rubric.id}>
                        {rubric.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ResultLimitSelector value={resultLimit} onChange={setResultLimit} />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isReranking || !query.trim() || !selectedRubricId}
                className="gap-2"
              >
                {isReranking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reranking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Rerank
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {isReranking ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results yet"
            description="Enter a query and select a rubric to see reranked results"
          />
        ) : (
          <>
            <h3 className="text-lg font-semibold text-foreground">Reranked Results ({formatNumber(results.length)})</h3>
            <div className="space-y-3">
              {results.map((result, index) => {
                const isExpanded = expandedIds.has(result.id)
                return (
                  <Card
                    key={result.id}
                    className="p-4 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(result.id)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-foreground text-base flex items-center gap-2">
                          {result.title || "Untitled"}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </h4>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-semibold text-primary">Total: {result.score.toFixed(3)}</span>
                          {result.piScore !== undefined && (
                            <span className="text-xs font-medium text-blue-600">
                              Pi Score: {result.piScore.toFixed(3)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        </div>
                      </div>
                      {result.questionScores && result.questionScores.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {result.questionScores.map((qs: { label: string; score: number }, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              {qs.label}: {qs.score.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                      <p
                        className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {result.text}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
