export const SEARCH_MODES = {
  keyword: {
    label: "Keyword",
    description: "Search by keywords using Okapi BM25",
  },
  semantic: {
    label: "Semantic",
    description: "Search by semantic meaning across vectorized documents",
  },
  hybrid: {
    label: "Hybrid",
    description: "Blend the results of Keyword and Semantic to get the best of both techniques",
  },
} as const

export const PAGINATION = {
  CORPUS_BROWSER_ITEMS_PER_PAGE: 20,
  SEARCH_HISTORY_HEIGHT: 600,
} as const

export const RESULT_LIMITS = [10, 20, 50] as const

export const DEFAULT_RESULT_LIMIT = 20
