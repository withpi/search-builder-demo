/**
 * Text processing utilities for search operations
 * These pure functions handle tokenization, stemming, and text normalization
 */

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "will",
  "with",
])

/**
 * Converts text to lowercase
 */
export const lowerCase = (text: string): string => text.toLowerCase()

/**
 * Removes extra whitespace and trims text
 */
export const removeExtraSpaces = (text: string): string => text.replace(/\s+/g, " ").trim()

/**
 * Tokenizes text by splitting on non-word characters
 */
export const tokenize = (text: string): string[] => {
  return text.split(/\W+/).filter((token) => token.length > 0)
}

/**
 * Removes common stop words from token array
 */
export const removeStopWords = (tokens: string[]): string[] => {
  return tokens.filter((token) => !STOP_WORDS.has(token))
}

/**
 * Simple stemming algorithm that removes common suffixes
 */
export const stem = (tokens: string[]): string[] => {
  return tokens.map((token) => {
    if (token.length <= 3) return token
    return token.replace(/ing$/, "").replace(/ed$/, "").replace(/s$/, "").replace(/ly$/, "")
  })
}

/**
 * Complete text preparation pipeline
 * Applies lowercase, cleaning, tokenization, stop word removal, and stemming
 */
export const prepareText = (text: string): string[] => {
  const lower = lowerCase(text)
  const cleaned = removeExtraSpaces(lower)
  const tokens = tokenize(cleaned)
  const filtered = removeStopWords(tokens)
  const stemmed = stem(filtered)
  return stemmed
}

/**
 * Calculates cosine similarity between two vectors
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0) return 0

  let dotProduct = 0
  const minLength = Math.min(a.length, b.length)

  for (let i = 0; i < minLength; i++) {
    dotProduct += a[i] * b[i]
  }

  return dotProduct
}

/**
 * Reciprocal Rank Fusion algorithm for combining search results
 * @param results1 First set of ranked results
 * @param results2 Second set of ranked results
 * @param k RRF constant (default 60)
 */
export const reciprocalRankFusion = (
  results1: Array<{ id: string; score: number }>,
  results2: Array<{ id: string; score: number }>,
  k = 60,
): Array<{ id: string; score: number }> => {
  const scoreMap = new Map<string, number>()

  results1.forEach((result, index) => {
    const rrfScore = 1 / (k + index + 1)
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore)
  })

  results2.forEach((result, index) => {
    const rrfScore = 1 / (k + index + 1)
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore)
  })

  return Array.from(scoreMap.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}
