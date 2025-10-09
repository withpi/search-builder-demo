export interface Document {
  id: string
  text: string
  title?: string
  url?: string
}

export interface Corpus {
  id: string
  name: string
  documents: Document[]
  isIndexing: boolean
  isReady: boolean
}

export interface SearchResult extends Document {
  score: number
  rating?: "up" | "down"
  piScore?: number
  retrievalScore?: number // Add normalized retrieval score
  questionScores?: Array<{ label: string; score: number }> // Add question scores to search results
  originalRank?: number // Track original ranking position for manual reranking
}

export interface IndexingStep {
  step: string
  status: "in-progress" | "complete" | "error"
  details?: string
}

export type SearchTrace =
  | {
      mode: "keyword"
      keywordResults: Array<{ id: string; score: number; rank: number }>
      rubricScoring?: RubricScoringTrace // Add rubric scoring info
    }
  | {
      mode: "semantic"
      semanticResults: Array<{ id: string; score: number; rank: number }>
      rubricScoring?: RubricScoringTrace // Add rubric scoring info
    }
  | {
      mode: "hybrid"
      keywordResults: Array<{ id: string; score: number; rank: number }>
      semanticResults: Array<{ id: string; score: number; rank: number }>
      hybridResults: Array<{ id: string; score: number; rank: number }>
      rrfK: number
      rubricScoring?: RubricScoringTrace // Add rubric scoring info
    }

export interface RubricScoringTrace {
  rubricId: string
  rubricName: string
  criteriaCount: number
  scoringMethod: "average" | "weighted"
  resultsScored: number
  weight: number // Add weight parameter to trace
  topResults: Array<{
    id: string
    rank: number
    retrievalScore: number
    rubricScore: number
    combinedScore: number
    questionScores?: Array<{ label: string; score: number }> // Add question scores to trace
  }>
}

export interface Search {
  id: string
  query: string
  timestamp: Date
  results: SearchResult[]
  corpusId: string
  searchMode: SearchMode
  trace: SearchTrace
  rubricId?: string // Add rubric ID to search
}

export type SearchMode = "keyword" | "semantic" | "hybrid"

export class SearchError extends Error {
  constructor(
    message: string,
    public code: "NO_CORPUS" | "NOT_READY" | "INDEXING_FAILED" | "SEARCH_FAILED",
    public details?: unknown,
  ) {
    super(message)
    this.name = "SearchError"
  }
}

export class CorpusError extends Error {
  constructor(
    message: string,
    public code: "LOAD_FAILED" | "PARSE_FAILED" | "INVALID_DATA",
    public details?: unknown,
  ) {
    super(message)
    this.name = "CorpusError"
  }
}

export interface RubricCriterion {
  label: string
  question: string
}

export interface Rubric {
  id: string
  name: string
  criteria: RubricCriterion[]
  createdAt: Date
  trainingCount: number
}

export interface RatedResult {
  searchId: string
  resultId: string
  query: string
  text: string
  title?: string
  rating: "up" | "down"
  timestamp: Date
}

export type RerankerMode = "training" | "rubric" | "rerank"
