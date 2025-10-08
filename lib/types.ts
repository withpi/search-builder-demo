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
    }
  | {
      mode: "semantic"
      semanticResults: Array<{ id: string; score: number; rank: number }>
    }
  | {
      mode: "hybrid"
      keywordResults: Array<{ id: string; score: number; rank: number }>
      semanticResults: Array<{ id: string; score: number; rank: number }>
      hybridResults: Array<{ id: string; score: number; rank: number }>
      rrfK: number
    }

export interface Search {
  id: string
  query: string
  timestamp: Date
  results: SearchResult[]
  corpusId: string
  searchMode: SearchMode
  trace: SearchTrace
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
