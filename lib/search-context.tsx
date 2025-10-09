"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import type { Corpus, Document, SearchResult, Search, SearchMode, IndexingStep, Rubric, RatedResult } from "./types"
import { SearchError, CorpusError } from "./types"
import {
  type TFIDFVectorizer,
  indexDocumentsWithBM25,
  generateTFIDFVectors,
  performSemanticSearch,
} from "./search-algorithms"
import { reciprocalRankFusion } from "./search-utils"
import { scoreResult } from "@/app/actions/score-results"

interface SearchContextType {
  corpora: Corpus[]
  activeCorpusId: string | null
  searches: Search[]
  isLoadingDefault: boolean
  indexingSteps: IndexingStep[]
  searchMode: SearchMode
  rubrics: Rubric[]
  activeRubricId: string | null
  ratedResults: RatedResult[]
  isReranking: boolean
  setSearchMode: (mode: SearchMode) => void
  setActiveCorpus: (id: string) => void
  addCorpus: (name: string, documents: Document[]) => Promise<void>
  performSearch: (query: string, limit: number) => Promise<{ searchId: string; results: SearchResult[] }>
  rateResult: (searchId: string, resultId: string, rating: "up" | "down") => void
  addRubric: (rubric: Rubric) => void
  updateRubric: (id: string, rubric: Partial<Rubric>) => void
  deleteRubric: (id: string) => void
  setActiveRubric: (id: string | null) => void
  getRatedResults: () => RatedResult[]
  performRerank: (query: string, limit: number, rubricId: string) => Promise<SearchResult[]>
  performSearchWithRubric: (
    query: string,
    limit: number,
    rubricId: string,
    weight: number,
  ) => Promise<{ searchId: string; results: SearchResult[] }>
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [corpora, setCorpora] = useState<Corpus[]>([])
  const [activeCorpusId, setActiveCorpusId] = useState<string | null>(null)
  const [searches, setSearches] = useState<Search[]>([])
  const [isLoadingDefault, setIsLoadingDefault] = useState(true)
  const [indexingSteps, setIndexingSteps] = useState<IndexingStep[]>([])
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid")

  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [activeRubricId, setActiveRubricId] = useState<string | null>(null)
  const [ratedResults, setRatedResults] = useState<RatedResult[]>([])
  const [isReranking, setIsReranking] = useState(false)

  const searchEnginesRef = useRef<Map<string, any>>(new Map())
  const tfidfVectorizersRef = useRef<Map<string, TFIDFVectorizer>>(new Map())
  const tfidfVectorsRef = useRef<Map<string, number[][]>>(new Map())

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

  const generateVectorsForCorpus = useCallback(
    async (documents: Document[], corpusId: string) => {
      addIndexingStep("Computing TF-IDF vectors", "in-progress", `Processing ${documents.length} documents`)

      try {
        const { vectorizer, vectors } = await generateTFIDFVectors(documents, (step, current, total) => {
          if (current !== undefined && total !== undefined) {
            updateLastStep("in-progress", `${step}: ${current}/${total}`)
          } else {
            updateLastStep("in-progress", step)
          }
        })

        tfidfVectorizersRef.current.set(corpusId, vectorizer)
        tfidfVectorsRef.current.set(corpusId, vectors)

        updateLastStep("complete", `Generated ${vectors.length} TF-IDF vectors`)
      } catch (error) {
        updateLastStep("error", error instanceof Error ? error.message : "Vector generation failed")
        throw new CorpusError("Failed to generate TF-IDF vectors", "PARSE_FAILED", error)
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
      const MAX_DOCUMENTS = 1000

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

              documents.push({
                id: String(row.id || row[0]),
                text: String(row.text || row[3]),
                title: row.title || row[2] || undefined,
                url: row.url || row[1] || undefined,
              })
            }
          },
        })

        file = null as any

        updateLastStep("complete", `Parsed ${documents.length} total documents`)

        await new Promise((resolve) => setTimeout(resolve, 10))

        if (documents.length >= MAX_DOCUMENTS) {
          addIndexingStep("Document limit reached", "complete", `Loaded maximum of ${MAX_DOCUMENTS} documents`)
          break
        }
      }

      addIndexingStep("Building BM25 index", "in-progress", "Tokenizing and indexing documents")

      const engine = await indexDocumentsWithBM25(documents, (current, total) => {
        updateLastStep("in-progress", `Indexed ${current}/${total} documents`)
      })

      updateLastStep("complete", `Indexed ${documents.length} documents with BM25`)

      await generateVectorsForCorpus(documents, "default")

      addIndexingStep("Indexing complete", "complete", "Corpus ready for search")

      setCorpora([
        {
          ...defaultCorpus,
          documents,
          isIndexing: false,
          isReady: true,
        },
      ])

      searchEnginesRef.current.set("default", engine)
    } catch (error) {
      console.error("[v0] Error loading default corpus:", error)
      updateLastStep("error", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoadingDefault(false)
    }
  }, [addIndexingStep, updateLastStep, generateVectorsForCorpus])

  const addCorpus = useCallback(
    async (name: string, documents: Document[]) => {
      const id = `corpus-${Date.now()}`

      const newCorpus: Corpus = {
        id,
        name,
        documents: [],
        isIndexing: true,
        isReady: false,
      }

      setCorpora((prev) => [...prev, newCorpus])

      try {
        const engine = await indexDocumentsWithBM25(documents)
        await generateVectorsForCorpus(documents, id)

        setCorpora((prev) => prev.map((c) => (c.id === id ? { ...c, documents, isIndexing: false, isReady: true } : c)))

        searchEnginesRef.current.set(id, engine)
      } catch (error) {
        console.error("[v0] Error adding corpus:", error)
        setCorpora((prev) => prev.filter((c) => c.id !== id))
        throw error
      }
    },
    [generateVectorsForCorpus],
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
      let finalResults: Array<{ id: string; score: number }> = []

      try {
        if (searchMode === "keyword") {
          const engine = searchEnginesRef.current.get(activeCorpusId)
          if (!engine) {
            throw new SearchError("Search engine not initialized", "SEARCH_FAILED")
          }

          const keywordResults = engine.search(query, limit)
          const keywordFormatted = keywordResults.map((result: any) => ({
            id: corpus.documents[result[0]].id,
            score: result[1],
          }))

          finalResults = keywordFormatted

          const trace = {
            mode: "keyword" as const,
            keywordResults: keywordFormatted.slice(0, 10).map((r, idx) => ({
              ...r,
              rank: idx + 1,
            })),
          }

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
          return { searchId, results: searchResults }
        } else if (searchMode === "semantic") {
          const vectorizer = tfidfVectorizersRef.current.get(activeCorpusId)
          const vectors = tfidfVectorsRef.current.get(activeCorpusId)

          if (!vectorizer || !vectors) {
            throw new SearchError("TF-IDF vectors not initialized", "SEARCH_FAILED")
          }

          const documentIds = corpus.documents.map((d) => d.id)
          finalResults = performSemanticSearch(query, vectorizer, vectors, documentIds, limit)

          const trace = {
            mode: "semantic" as const,
            semanticResults: finalResults.slice(0, 10).map((r, idx) => ({
              ...r,
              rank: idx + 1,
            })),
          }

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
          return { searchId, results: searchResults }
        } else {
          // Hybrid mode
          const engine = searchEnginesRef.current.get(activeCorpusId)
          const vectorizer = tfidfVectorizersRef.current.get(activeCorpusId)
          const vectors = tfidfVectorsRef.current.get(activeCorpusId)

          if (!engine || !vectorizer || !vectors) {
            throw new SearchError("Search engines not initialized", "SEARCH_FAILED")
          }

          const keywordResults = engine.search(query, limit)
          const keywordFormatted = keywordResults.map((result: any) => ({
            id: corpus.documents[result[0]].id,
            score: result[1],
          }))

          const documentIds = corpus.documents.map((d) => d.id)
          const semanticResults = performSemanticSearch(query, vectorizer, vectors, documentIds, limit)

          const rrfK = 60
          finalResults = reciprocalRankFusion(keywordFormatted, semanticResults, rrfK)

          const trace = {
            mode: "hybrid" as const,
            keywordResults: keywordFormatted.slice(0, 10).map((r, idx) => ({
              ...r,
              rank: idx + 1,
            })),
            semanticResults: semanticResults.slice(0, 10).map((r, idx) => ({
              ...r,
              rank: idx + 1,
            })),
            hybridResults: finalResults.slice(0, 10).map((r, idx) => ({
              ...r,
              rank: idx + 1,
            })),
            rrfK,
          }

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
          return { searchId, results: searchResults }
        }
      } catch (error) {
        console.error("[v0] Search failed:", error)
        throw error instanceof SearchError ? error : new SearchError("Search operation failed", "SEARCH_FAILED", error)
      }
    },
    [activeCorpusId, corpora, searchMode],
  )

  const rateResult = useCallback(
    (searchId: string, resultId: string, rating: "up" | "down") => {
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
          timestamp: new Date(),
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

  const addRubric = useCallback((rubric: Rubric) => {
    setRubrics((prev) => [...prev, rubric])
  }, [])

  const updateRubric = useCallback((id: string, updates: Partial<Rubric>) => {
    setRubrics((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const deleteRubric = useCallback(
    (id: string) => {
      setRubrics((prev) => prev.filter((r) => r.id !== id))
      if (activeRubricId === id) {
        setActiveRubricId(null)
      }
    },
    [activeRubricId],
  )

  const getRatedResults = useCallback(() => {
    return ratedResults
  }, [ratedResults])

  const performRerank = useCallback(
    async (query: string, limit: number, rubricId: string): Promise<SearchResult[]> => {
      if (!activeCorpusId) {
        throw new SearchError("No active corpus selected", "NO_CORPUS")
      }

      const rubric = rubrics.find((r) => r.id === rubricId)
      if (!rubric) {
        throw new SearchError("Rubric not found", "SEARCH_FAILED")
      }

      setIsReranking(true)

      try {
        const initialResults = await performSearch(query, limit * 2)

        const scoredResults = await Promise.all(
          initialResults.results.map(async (result) => {
            const response = await scoreResult({
              query,
              text: result.text,
              criteria: rubric.criteria,
            })

            return {
              ...result,
              piScore: response.total_score,
            }
          }),
        )

        // Sort by Pi score
        const rerankedResults = scoredResults.sort((a, b) => (b.piScore || 0) - (a.piScore || 0)).slice(0, limit)

        return rerankedResults
      } catch (error) {
        console.error("[v0] Reranking failed:", error)
        throw error instanceof SearchError
          ? error
          : new SearchError("Reranking operation failed", "SEARCH_FAILED", error)
      } finally {
        setIsReranking(false)
      }
    },
    [activeCorpusId, rubrics, performSearch],
  )

  const setActiveCorpus = useCallback((id: string) => {
    setActiveCorpusId(id)
  }, [])

  const setActiveRubric = useCallback((id: string | null) => {
    setActiveRubricId(id)
  }, [])

  const normalizeScore = useCallback((score: number, mode: SearchMode): number => {
    if (score === undefined || score === null || isNaN(score)) {
      return 0
    }
    if (mode === "keyword") {
      return Math.min(score / 10, 1)
    } else if (mode === "semantic") {
      return score
    } else {
      return Math.min(score * 10, 1)
    }
  }, [])

  const performSearchWithRubric = useCallback(
    async (
      query: string,
      limit: number,
      rubricId: string,
      weight = 0.5,
    ): Promise<{ searchId: string; results: SearchResult[] }> => {
      if (!activeCorpusId) {
        throw new SearchError("No active corpus selected", "NO_CORPUS")
      }

      const rubric = rubrics.find((r) => r.id === rubricId)
      if (!rubric) {
        throw new SearchError("Rubric not found", "SEARCH_FAILED")
      }

      console.log("[v0] Performing search with rubric:", {
        rubricId: rubric.id,
        rubricName: rubric.name,
        criteriaCount: rubric.criteria.length,
        criteria: rubric.criteria.map((c) => ({ label: c.label, question: c.question })),
        weight,
      })

      try {
        const { searchId, results: initialResults } = await performSearch(query, limit * 2)

        const scoredResults = await Promise.all(
          initialResults.map(async (result, index) => {
            try {
              console.log(`[v0] Scoring result ${index + 1}/${initialResults.length}:`, {
                documentId: result.id,
                documentTitle: result.title,
                rubricId: rubric.id,
                rubricName: rubric.name,
              })

              const response = await scoreResult({
                query,
                text: result.text,
                criteria: rubric.criteria,
              })

              console.log(`[v0] Score response for result ${index + 1}:`, {
                documentId: result.id,
                documentTitle: result.title,
                totalScore: response.total_score,
                questionScores: response.question_scores,
                hasError: !!response.error,
                error: response.error,
              })

              const normalizedRetrievalScore = normalizeScore(result.score, searchMode)
              const rubricScore = response.error ? 0 : (response.total_score ?? 0)
              const combinedScore = (1 - weight) * normalizedRetrievalScore + weight * rubricScore

              console.log(`[v0] Combined score calculation for result ${index + 1}:`, {
                documentId: result.id,
                documentTitle: result.title,
                retrievalScore: normalizedRetrievalScore,
                rubricScore: rubricScore,
                weight: weight,
                combinedScore: combinedScore,
                formula: `(1 - ${weight}) * ${normalizedRetrievalScore} + ${weight} * ${rubricScore} = ${combinedScore}`,
              })

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

        setSearches((prev) =>
          prev.map((search) =>
            search.id === searchId
              ? {
                  ...search,
                  results: rerankedResults,
                  rubricId,
                  trace: {
                    ...search.trace,
                    rubricScoring: {
                      rubricId,
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

        return { searchId, results: rerankedResults }
      } catch (error) {
        console.error("[v0] Rubric-enhanced search failed:", error)
        throw error instanceof SearchError
          ? error
          : new SearchError("Rubric-enhanced search failed", "SEARCH_FAILED", error)
      }
    },
    [activeCorpusId, rubrics, performSearch, searchMode, normalizeScore],
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
        rubrics,
        activeRubricId,
        ratedResults,
        isReranking,
        setSearchMode,
        setActiveCorpus,
        addCorpus,
        performSearch,
        rateResult,
        addRubric,
        updateRubric,
        deleteRubric,
        setActiveRubric,
        getRatedResults,
        performRerank,
        performSearchWithRubric,
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
