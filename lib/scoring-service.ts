"use server"

import PiClient from "withpi"

export interface ScoreRequest {
  query: string
  text: string
  criteria: Array<{ label: string; question: string }>
}

export interface ScoreResponse {
  total_score: number
  question_scores?: Array<{ label: string; score: number }>
  error?: string
}

export interface BatchScoreRequest {
  documents: Array<{ id: string; text: string }>
  query: string
  criteria: Array<{ label: string; question: string }>
}

export interface BatchScoreResponse {
  results: Array<{
    docId: string
    totalScore: number
    questionScores: Array<{ label: string; score: number }>
  }>
  errors: Array<{ docId: string; error: string }>
}

let piClient: PiClient | null = null

function getPiClient(): PiClient {
  if (!piClient) {
    const apiKey = process.env.WITHPI_API_KEY
    if (!apiKey) {
      throw new Error("Pi API key not configured")
    }
    piClient = new PiClient({ apiKey })
  }
  return piClient
}

export async function scoreResult(request: ScoreRequest): Promise<ScoreResponse> {
  try {
    const pi = getPiClient()

    const response = await pi.scoringSystem.score({
      llm_input: request.query,
      llm_output: request.text,
      scoring_spec: request.criteria,
    })

    return {
      total_score: response.total_score ?? 0,
      question_scores: response.question_scores,
    }
  } catch (error) {
    console.error("Error scoring result:", error)
    return {
      total_score: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function scoreBatch(request: BatchScoreRequest): Promise<BatchScoreResponse> {
  const results: Array<{
    docId: string
    totalScore: number
    questionScores: Array<{ label: string; score: number }>
  }> = []
  const errors: Array<{ docId: string; error: string }> = []

  try {
    const pi = getPiClient()

    const scoringPromises = request.documents.map(async (doc) => {
      try {
        const response = await pi.scoringSystem.score({
          llm_input: request.query,
          llm_output: doc.text,
          scoring_spec: request.criteria,
        })

        return {
          docId: doc.id,
          totalScore: response.total_score ?? 0,
          questionScores: response.question_scores || [],
        }
      } catch (error) {
        errors.push({
          docId: doc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        return {
          docId: doc.id,
          totalScore: 0,
          questionScores: [],
        }
      }
    })

    const batchResults = await Promise.all(scoringPromises)
    results.push(...batchResults)
  } catch (error) {
    console.error("Error in batch scoring:", error)
    throw error
  }

  return { results, errors }
}
