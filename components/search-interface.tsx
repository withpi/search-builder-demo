"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { useSearch } from "@/lib/search-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { SearchResults } from "./search-results"
import { SearchResultsSkeleton } from "./search-results-skeleton"
import { EmptyState } from "./empty-state"
import { ErrorBoundary } from "./error-boundary"
import { SearchModeSelector } from "./search-mode-selector"
import { ResultLimitSelector } from "./result-limit-selector"
import { RubricSelector } from "./rubric-selector"
import { DEFAULT_RESULT_LIMIT } from "@/lib/constants"

export function SearchInterface() {
  const {
    performSearch,
    performSearchWithRubric,
    activeCorpusId,
    corpora,
    searches,
    searchMode,
    setSearchMode,
    rubrics,
    activeRubricId,
    setActiveRubric,
  } = useSearch()
  const [query, setQuery] = useState("")
  const [resultLimit, setResultLimit] = useState(DEFAULT_RESULT_LIMIT.toString())
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const activeCorpus = useMemo(() => corpora.find((c) => c.id === activeCorpusId), [corpora, activeCorpusId])

  const canSearch = useMemo(
    () => activeCorpus?.isReady && !activeCorpus?.isIndexing && query.trim().length > 0,
    [activeCorpus, query],
  )

  const handleSearch = useCallback(async () => {
    if (!canSearch) return

    setHasSearched(true)
    setIsSearching(true)
    setCurrentSearchId(null)

    try {
      const { searchId } = activeRubricId
        ? await performSearchWithRubric(query, Number.parseInt(resultLimit), activeRubricId)
        : await performSearch(query, Number.parseInt(resultLimit))
      setCurrentSearchId(searchId)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [canSearch, performSearch, performSearchWithRubric, query, resultLimit, activeRubricId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && canSearch) {
        e.preventDefault()
        handleSearch()
      }
    },
    [canSearch, handleSearch],
  )

  const currentResults = useMemo(() => {
    if (!currentSearchId) return []
    const search = searches.find((s) => s.id === currentSearchId)
    return search?.results || []
  }, [currentSearchId, searches])

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="space-y-3">
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-lg px-0 shadow-none"
              aria-label="Search query input"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SearchModeSelector
                  value={searchMode}
                  onChange={setSearchMode}
                  disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                />
                <ResultLimitSelector
                  value={resultLimit}
                  onChange={setResultLimit}
                  disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                />
                <RubricSelector
                  rubrics={rubrics}
                  value={activeRubricId}
                  onChange={setActiveRubric}
                  disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={!canSearch || isSearching}
                className="bg-primary text-primary-foreground h-9 px-5 shadow-sm hover:shadow-md transition-all font-semibold"
                aria-label={isSearching ? "Searching..." : "Search"}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isSearching && <SearchResultsSkeleton count={Math.min(Number.parseInt(resultLimit), 5)} />}

        {!isSearching && !hasSearched && <EmptyState icon={Search} title="Enter a query to search the corpus" />}

        {!isSearching && hasSearched && currentSearchId && currentResults.length === 0 && (
          <EmptyState
            icon={Search}
            title={`No results found for "${query}"`}
            description="Try a different search term"
          />
        )}

        {!isSearching && currentResults.length > 0 && (
          <SearchResults results={currentResults} searchId={currentSearchId} />
        )}
      </div>
    </ErrorBoundary>
  )
}
