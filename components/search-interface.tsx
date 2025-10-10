"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { SearchResults } from "./search-results"
import { SearchResultsSkeleton } from "./search-results-skeleton"
import { EmptyState } from "./empty-state"
import { ErrorBoundary } from "./error-boundary"
import { DEFAULT_RESULT_LIMIT } from "@/lib/constants"
import { RetrievalTrace } from "./retrieval-trace"
import { SearchConfigPanel } from "./search-config-panel"

export function SearchInterface() {
  const { performSearch, performSearchWithRubric, activeCorpusId, corpora, searches, searchMode, setSearchMode } =
    useSearch()

  const { rubrics, activeRubricId, setActiveRubric, indexingRubrics, getRubricById, getIndexForRubric } = useRubric()

  const [query, setQuery] = useState("")
  const [resultLimit, setResultLimit] = useState(DEFAULT_RESULT_LIMIT.toString())
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [rubricWeight, setRubricWeight] = useState(0.5)

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
      if (activeRubricId) {
        const rubric = getRubricById(activeRubricId)
        const index = activeCorpusId ? getIndexForRubric(activeRubricId, activeCorpusId) : undefined

        if (rubric) {
          const { searchId } = await performSearchWithRubric(
            query,
            Number.parseInt(resultLimit),
            rubric,
            index,
            rubricWeight,
          )
          setCurrentSearchId(searchId)
        }
      } else {
        const { searchId } = await performSearch(query, Number.parseInt(resultLimit))
        setCurrentSearchId(searchId)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [
    canSearch,
    performSearch,
    performSearchWithRubric,
    query,
    resultLimit,
    activeRubricId,
    activeCorpusId,
    rubricWeight,
    getRubricById,
    getIndexForRubric,
  ])

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

  const currentSearch = useMemo(() => {
    if (!currentSearchId) return null
    const search = searches.find((s) => s.id === currentSearchId)

    return search || null
  }, [currentSearchId, searches])

  return (
    <ErrorBoundary>
      <div className="flex gap-6">
        {/* Configuration Panel */}
        <div className="w-80 flex-shrink-0">
          <SearchConfigPanel />
        </div>

        {/* Main Search Area */}
        <div className="flex-1 space-y-6">
          {/* Search Input */}
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
              className="text-base h-12"
            />

            <div className="flex items-center justify-end">
              <Button onClick={handleSearch} disabled={!canSearch || isSearching} size="lg" className="h-12 px-8">
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
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

          {!isSearching && currentSearch && currentResults.length > 0 && (
            <RetrievalTrace search={currentSearch} corpora={corpora} />
          )}

          {!isSearching && currentResults.length > 0 && (
            <SearchResults results={currentResults} searchId={currentSearchId} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
