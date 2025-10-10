import type { SearchMode } from "./types"

/**
 * Normalizes keyword search scores (BM25) to 0-1 range
 * BM25 scores typically range from 0-10+
 */
export function normalizeKeywordScore(score: number): number {
  if (score === undefined || score === null || isNaN(score)) {
    return 0
  }
  return Math.min(score / 10, 1)
}

/**
 * Normalizes semantic search scores (cosine similarity) to 0-1 range
 * Cosine similarity already ranges from 0-1
 */
export function normalizeSemanticScore(score: number): number {
  if (score === undefined || score === null || isNaN(score)) {
    return 0
  }
  return Math.max(0, Math.min(score, 1))
}

/**
 * Normalizes hybrid search scores (RRF) to 0-1 range
 * RRF scores are typically small decimals
 */
export function normalizeHybridScore(score: number): number {
  if (score === undefined || score === null || isNaN(score)) {
    return 0
  }
  return Math.min(score * 10, 1)
}

/**
 * Normalizes a score based on the search mode
 */
export function normalizeScore(score: number, mode: SearchMode): number {
  switch (mode) {
    case "keyword":
      return normalizeKeywordScore(score)
    case "semantic":
      return normalizeSemanticScore(score)
    case "hybrid":
      return normalizeHybridScore(score)
    default:
      return 0
  }
}

/**
 * Combines retrieval and rubric scores with a weight
 * @param retrievalScore Normalized retrieval score (0-1)
 * @param rubricScore Rubric score (0-1)
 * @param weight Weight for rubric score (0-1), where 0 = all retrieval, 1 = all rubric
 */
export function combineScores(retrievalScore: number, rubricScore: number, weight: number): number {
  if (weight < 0 || weight > 1) {
    throw new Error("Weight must be between 0 and 1")
  }
  return (1 - weight) * retrievalScore + weight * rubricScore
}

/**
 * Normalizes Pi Scorer rubric scores to 0-1 range
 * Pi Scorer returns scores from 0-1 already
 */
export function normalizeRubricScore(score: number): number {
  if (score === undefined || score === null || isNaN(score)) {
    return 0
  }
  return Math.max(0, Math.min(score, 1))
}
