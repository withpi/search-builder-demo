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

export async function scoreResult(request: ScoreRequest): Promise<ScoreResponse> {
  try {
    const apiKey = process.env.WITHPI_API_KEY

    if (!apiKey) {
      return {
        total_score: 0,
        error: "Pi API key not configured",
      }
    }

    const pi = new PiClient({ apiKey })

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
    console.error("[v0] Error scoring result:", error)
    return {
      total_score: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
