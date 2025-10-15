"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import type {
  Corpus,
  Document,
  SearchResult,
  Search,
  SearchMode,
  IndexingStep,
  RatedResult,
  Rubric,
  RubricIndex,
} from "./types"
import { SearchError, CorpusError } from "./types"
import type { Orama } from "@orama/orama"
import { scoreResult } from "@/app/actions/score-results"
import { normalizeScore, combineScores } from "./score-normalization"
import { arrayMove } from "./array-utils"
import { SearchStrategyFactory } from "./search-strategies"

interface SearchContextType {
  corpora: Corpus[]
  activeCorpusId: string | null
  searches: Search[]
  isLoadingDefault: boolean
  indexingSteps: IndexingStep[]
  searchMode: SearchMode
  ratedResults: RatedResult[]
  scoringWeight: number
  searchProgress: string | null // Added search progress state
  setSearchMode: (mode: SearchMode) => void
  setActiveCorpus: (id: string) => void
  setScoringWeight: (weight: number) => void
  addCorpus: (name: string, documents: Document[]) => Promise<void>
  performSearch: (query: string, limit: number) => Promise<{ searchId: string; results: SearchResult[] }>
  rateResult: (searchId: string, resultId: string, rating: "up" | "down", feedback?: string) => void
  getRatedResults: () => RatedResult[]
  performSearchWithRubric: (
    query: string,
    limit: number,
    rubric: Rubric,
    index: RubricIndex | undefined,
    weight: number,
    existingSearchId?: string,
  ) => Promise<{ searchId: string; results: SearchResult[] }>
  updateResultRanking: (searchId: string, resultId: string, newRank: number, originalRank: number) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [corpora, setCorpora] = useState<Corpus[]>([])
  const [activeCorpusId, setActiveCorpusId] = useState<string | null>(null)
  const [searches, setSearches] = useState<Search[]>([])
  const [isLoadingDefault, setIsLoadingDefault] = useState(true)
  const [indexingSteps, setIndexingSteps] = useState<IndexingStep[]>([])
  const [searchMode, setSearchMode] = useState<SearchMode>("keyword")
  const [ratedResults, setRatedResults] = useState<RatedResult[]>([])
  const [scoringWeight, setScoringWeight] = useState<number>(0.5)
  const [searchProgress, setSearchProgress] = useState<string | null>(null)

  const oramaDbsRef = useRef<Map<string, Orama<any>>>(new Map())

  useEffect(() => {
    loadDefaultCorpus()
  }, [])

  const addIndexingStep = useCallback((step: string, status: IndexingStep["status"], details?: string) => {
    setIndexingSteps((prev) => [...prev, { step, status, details }])
  }, [])

  const updateLastStep = useCallback((status: IndexingStep["status"], details?: string) => {
    setIndexingSteps((prev) => {
      const updated = [...prev]
      if (updated.length > 0) {
        updated[updated.length - 1] = { ...updated[updated.length - 1], status, details }
      }
      return updated
    })
  }, [])

  const indexCorpusWithOrama = useCallback(
    async (documents: Document[], corpusId: string) => {
      addIndexingStep("Creating Orama search index", "in-progress", `Processing ${documents.length} documents`)

      try {
        console.log("[v0] Starting Orama indexing for corpus:", corpusId, "with", documents.length, "documents")

        console.log("[v0] Importing @orama/orama...")
        const { create, insert } = await import("@orama/orama")
        console.log("[v0] Successfully imported @orama/orama")

        console.log("[v0] Importing @orama/stopwords/english...")
        const { stopwords: englishStopwords } = await import("@orama/stopwords/english")
        console.log("[v0] Successfully imported stopwords, count:", englishStopwords?.length || 0)

        console.log("[v0] Importing @orama/stemmers/english...")
        const { stemmer, language } = await import("@orama/stemmers/english")
        console.log("[v0] Successfully imported stemmer")

        console.log("[v0] Creating Orama database with schema...")
        const db = await create({
          schema: {
            id: "string",
            title: "string",
            text: "string",
            url: "string",
          },
          components: {
            tokenizer: {
              stemming: true,
              stemmer,
              language,
              stopWords: englishStopwords,
            },
          },
          sort: {
            enabled: false,
          },
        })
        console.log("[v0] Successfully created Orama database")

        updateLastStep("in-progress", "Inserting documents into index")

        const BATCH_SIZE = 500 // Increased batch size from 100 to 500 for better performance with large corpora
        for (let i = 0; i < documents.length; i += BATCH_SIZE) {
          const batchEnd = Math.min(i + BATCH_SIZE, documents.length)

          for (let j = i; j < batchEnd; j++) {
            const doc = documents[j]
            const generatedId = `${corpusId}-${j}`
            await insert(db, {
              id: generatedId,
              title: doc.title || "",
              text: doc.text || "",
              url: doc.url || "",
            })
          }

          updateLastStep("in-progress", `Indexed ${batchEnd}/${documents.length} documents`)

          if (batchEnd < documents.length) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }

        console.log("[v0] Successfully inserted all documents into Orama")
        oramaDbsRef.current.set(corpusId, db)
        updateLastStep("complete", `Indexed ${documents.length} documents with Orama`)
      } catch (error) {
        console.error("[v0] Orama indexing error:", error)
        console.error("[v0] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error,
        })
        updateLastStep("error", error instanceof Error ? error.message : "Indexing failed")
        throw new CorpusError("Failed to create Orama index", "PARSE_FAILED", error)
      }
    },
    [addIndexingStep, updateLastStep],
  )

  const loadDefaultCorpus = useCallback(async () => {
    setIsLoadingDefault(true)
    setIndexingSteps([])

    try {
      const defaultCorpus: Corpus = {
        id: "default",
        name: "Simple Wikipedia",
        documents: [],
        isIndexing: true,
        isReady: false,
      }

      setCorpora([defaultCorpus])
      setActiveCorpusId("default")

      addIndexingStep("Fetching dataset metadata", "in-progress", "Connecting to HuggingFace")

      const response = await fetch("https://datasets-server.huggingface.co/parquet?dataset=pszemraj/simple_wikipedia")

      if (!response.ok) {
        throw new CorpusError("Failed to fetch dataset metadata", "LOAD_FAILED")
      }

      const data = await response.json()
      const parquetFiles = data.parquet_files || []

      if (parquetFiles.length === 0) {
        throw new CorpusError("No parquet files found in dataset", "INVALID_DATA")
      }

      updateLastStep("complete", `Found ${parquetFiles.length} Parquet file(s)`)

      const { asyncBufferFromUrl, parquetRead } = await import("hyparquet")
      const documents: Document[] = []
      const MAX_DOCUMENTS = 10000

      for (let fileIndex = 0; fileIndex < parquetFiles.length && documents.length < MAX_DOCUMENTS; fileIndex++) {
        const parquetUrl = parquetFiles[fileIndex].url

        addIndexingStep(
          `Loading Parquet file ${fileIndex + 1}/${parquetFiles.length}`,
          "in-progress",
          "Downloading dataset",
        )

        let file = await asyncBufferFromUrl({ url: parquetUrl })

        updateLastStep("complete", `Loaded file ${fileIndex + 1}`)

        addIndexingStep("Parsing documents", "in-progress", "Reading Parquet data")

        await parquetRead({
          file,
          onComplete: (data: any[]) => {
            for (const row of data) {
              if (documents.length >= MAX_DOCUMENTS) break

              const idx = documents.length
              documents.push({
                id: `default-${idx}`,
                text: String(row.text || row[3]),
                title: row.title || row[2] || undefined,
                url: row.url || row[1] || undefined,
              })
            }
          },
        })

        file = null as any

        await new Promise((resolve) => setTimeout(resolve, 10))

        if (documents.length >= MAX_DOCUMENTS) {
          addIndexingStep("Document limit reached", "complete", `Loaded maximum of ${MAX_DOCUMENTS} documents`)
          break
        }
      }

      await indexCorpusWithOrama(documents, "default")

      addIndexingStep("Indexing complete", "complete", "Corpus ready for search")

      setCorpora([
        {
          ...defaultCorpus,
          documents,
          isIndexing: false,
          isReady: true,
        },
      ])
    } catch (error) {
      console.error("Error loading default corpus:", error)
      updateLastStep("error", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoadingDefault(false)
    }
  }, [addIndexingStep, updateLastStep, indexCorpusWithOrama])

  const addCorpus = useCallback(
    async (name: string, documents: Document[]) => {
      const id = `corpus-${Date.now()}`

      const documentsWithIds = documents.map((doc, idx) => ({
        ...doc,
        id: `${id}-${idx}`,
      }))

      const newCorpus: Corpus = {
        id,
        name,
        documents: [],
        isIndexing: true,
        isReady: false,
      }

      setCorpora((prev) => [...prev, newCorpus])

      try {
        await indexCorpusWithOrama(documentsWithIds, id)

        setCorpora((prev) =>
          prev.map((c) => (c.id === id ? { ...c, documents: documentsWithIds, isIndexing: false, isReady: true } : c)),
        )

        setActiveCorpusId(id)
      } catch (error) {
        console.error("Error adding corpus:", error)
        setCorpora((prev) => prev.filter((c) => c.id !== id))
        throw error
      }
    },
    [indexCorpusWithOrama],
  )

  const performSearch = useCallback(
    async (query: string, limit: number): Promise<{ searchId: string; results: SearchResult[] }> => {
      if (!activeCorpusId) {
        throw new SearchError("No active corpus selected", "NO_CORPUS")
      }

      const corpus = corpora.find((c) => c.id === activeCorpusId)

      if (!corpus) {
        throw new SearchError("Corpus not found", "NO_CORPUS")
      }

      if (!corpus.isReady) {
        throw new SearchError("Corpus is not ready for search", "NOT_READY")
      }

      const searchId = `search-${Date.now()}`

      try {
        if (searchMode === "keyword") {
          setSearchProgress("Searching keyword database...")
        } else if (searchMode === "semantic") {
          setSearchProgress("Searching vector database...")
        } else {
          setSearchProgress("Searching keyword database...")
        }

        const strategy = SearchStrategyFactory.getStrategy(searchMode)

        const oramaDb = oramaDbsRef.current.get(activeCorpusId)
        if (!oramaDb) {
          throw new SearchError("Search index not found", "NOT_READY")
        }

        if (searchMode === "hybrid") {
          setSearchProgress("Searching vector database...")
        }

        const { results: finalResults, trace } = await strategy.execute(query, limit, corpus, oramaDb)

        const searchResults: SearchResult[] = finalResults.slice(0, limit).map((result) => {
          const doc = corpus.documents.find((d) => d.id === result.id)!
          return { ...doc, score: result.score }
        })

        const search: Search = {
          id: searchId,
          query,
          timestamp: new Date(),
          results: searchResults,
          corpusId: activeCorpusId,
          searchMode,
          trace,
        }

        setSearches((prev) => [search, ...prev])
        setSearchProgress(null)

        return { searchId, results: searchResults }
      } catch (error) {
        console.error("Search failed:", error)
        setSearchProgress(null)
        throw error instanceof SearchError ? error : new SearchError("Search operation failed", "SEARCH_FAILED", error)
      }
    },
    [activeCorpusId, corpora, searchMode],
  )

  const rateResult = useCallback(
    (searchId: string, resultId: string, rating: "up" | "down", feedback?: string) => {
      setSearches((prev) =>
        prev.map((search) =>
          search.id === searchId
            ? {
                ...search,
                results: search.results.map((result) => (result.id === resultId ? { ...result, rating } : result)),
              }
            : search,
        ),
      )

      const search = searches.find((s) => s.id === searchId)
      const result = search?.results.find((r) => r.id === resultId)

      if (search && result) {
        const ratedResult: RatedResult = {
          searchId,
          resultId,
          query: search.query,
          text: result.text,
          title: result.title,
          rating,
          feedback,
          timestamp: new Date(),
          manualRank: result.manualRank,
          originalRank: result.originalRank,
        }

        setRatedResults((prev) => {
          const existing = prev.findIndex((r) => r.searchId === searchId && r.resultId === resultId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = ratedResult
            return updated
          }
          return [...prev, ratedResult]
        })
      }
    },
    [searches],
  )

  const getRatedResults = useCallback(() => {
    return ratedResults
  }, [ratedResults])

  const setActiveCorpus = useCallback((id: string) => {
    setActiveCorpusId(id)
  }, [])

  const performSearchWithRubric = useCallback(
    async (
      query: string,
      limit: number,
      rubric: Rubric,
      index: RubricIndex | undefined,
      weight = 0.5,
      existingSearchId?: string,
    ): Promise<{ searchId: string; results: SearchResult[] }> => {
      if (!activeCorpusId) {
        throw new SearchError("No active corpus selected", "NO_CORPUS")
      }

      try {
        let searchId: string
        let initialResults: SearchResult[]

        if (existingSearchId) {
          const existingSearch = searches.find((s) => s.id === existingSearchId)
          if (!existingSearch) {
            throw new SearchError("Existing search not found", "SEARCH_FAILED")
          }
          searchId = existingSearchId
          initialResults = existingSearch.results.map((r) => ({
            ...r,
            score: r.retrievalScore || r.score,
          }))
        } else {
          const searchResult = await performSearch(query, limit * 2)
          searchId = searchResult.searchId
          initialResults = searchResult.results
        }

        setSearchProgress(`Reranking with ${rubric.name}...`)

        const scoredResults = await Promise.all(
          initialResults.map(async (result) => {
            try {
              const response = await scoreResult({
                query,
                text: result.text,
                criteria: rubric.criteria,
              })

              console.log("[v0] Real-time scoring result:", {
                resultId: result.id,
                totalScore: response.total_score,
                questionScoresCount: response.question_scores?.length || 0,
                questionScores: response.question_scores,
              })

              const normalizedRetrievalScore = normalizeScore(result.score, searchMode)
              const rubricScore = response.error ? 0 : (response.total_score ?? 0)
              const combinedScore = combineScores(normalizedRetrievalScore, rubricScore, weight)

              return {
                ...result,
                piScore: rubricScore,
                retrievalScore: normalizedRetrievalScore,
                score: combinedScore,
                questionScores: response.question_scores,
              }
            } catch (error) {
              console.error("[v0] Error scoring result:", error)
              const normalizedRetrievalScore = normalizeScore(result.score, searchMode)
              return {
                ...result,
                piScore: 0,
                retrievalScore: normalizedRetrievalScore,
                score: normalizedRetrievalScore,
              }
            }
          }),
        )

        const rerankedResults = scoredResults.sort((a, b) => b.score - a.score).slice(0, limit)

        console.log("[v0] Final reranked results:", {
          count: rerankedResults.length,
          results: rerankedResults.map((r) => ({
            id: r.id,
            score: r.score,
            piScore: r.piScore,
            questionScoresCount: r.questionScores?.length || 0,
          })),
        })

        setSearches((prev) =>
          prev.map((search) =>
            search.id === searchId
              ? {
                  ...search,
                  results: rerankedResults,
                  rubricId: rubric.id,
                  trace: {
                    ...search.trace,
                    rubricScoring: {
                      rubricId: rubric.id,
                      rubricName: rubric.name,
                      criteriaCount: rubric.criteria.length,
                      scoringMethod: "average",
                      resultsScored: rerankedResults.length,
                      weight,
                      topResults: rerankedResults.slice(0, 5).map((r, idx) => ({
                        id: r.id,
                        rank: idx + 1,
                        retrievalScore: r.retrievalScore!,
                        rubricScore: r.piScore!,
                        combinedScore: r.score,
                        questionScores: r.questionScores,
                      })),
                    },
                  },
                }
              : search,
          ),
        )

        setSearchProgress(null)
        console.log("[v0] performSearchWithRubric completed")

        return { searchId, results: rerankedResults }
      } catch (error) {
        console.error("Rubric-enhanced search failed:", error)
        setSearchProgress(null)
        throw error instanceof SearchError
          ? error
          : new SearchError("Rubric-enhanced search failed", "SEARCH_FAILED", error)
      }
    },
    [activeCorpusId, performSearch, searchMode, searches],
  )

  const updateResultRanking = useCallback(
    (searchId: string, resultId: string, newRank: number, originalRank: number) => {
      setSearches((prev) =>
        prev.map((search) => {
          if (search.id !== searchId) return search

          const currentIndex = search.results.findIndex((r) => r.id === resultId)
          if (currentIndex === -1) return search

          const newIndex = newRank - 1

          const reorderedResults = arrayMove(search.results, currentIndex, newIndex)

          const updatedResults = reorderedResults.map((result, idx) => {
            const newPosition = idx + 1
            if (result.id === resultId) {
              return {
                ...result,
                manualRank: newPosition,
                originalRank: result.originalRank ?? originalRank,
              }
            } else if (result.originalRank === undefined) {
              const originalIndex = search.results.findIndex((r) => r.id === result.id)
              return {
                ...result,
                originalRank: originalIndex + 1,
                manualRank: newPosition,
              }
            } else {
              return {
                ...result,
                manualRank: newPosition,
              }
            }
          })

          return {
            ...search,
            results: updatedResults,
          }
        }),
      )

      const search = searches.find((s) => s.id === searchId)
      const result = search?.results.find((r) => r.id === resultId)

      if (search && result && result.rating) {
        setRatedResults((prev) => {
          const existing = prev.findIndex((r) => r.searchId === searchId && r.resultId === resultId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = {
              ...updated[existing],
              manualRank: newRank,
              originalRank: result.originalRank ?? originalRank,
            }
            return updated
          }
          return prev
        })
      }
    },
    [searches],
  )

  return (
    <SearchContext.Provider
      value={{
        corpora,
        activeCorpusId,
        searches,
        isLoadingDefault,
        indexingSteps,
        searchMode,
        ratedResults,
        scoringWeight,
        searchProgress,
        setSearchMode,
        setActiveCorpus,
        setScoringWeight,
        addCorpus,
        performSearch,
        rateResult,
        getRatedResults,
        performSearchWithRubric,
        updateResultRanking,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
