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

    console.log("[v0] Pi API Key exists:", !!apiKey)
    console.log("[v0] Pi API Key length:", apiKey?.length ?? 0)

    if (!apiKey) {
      return {
        total_score: 0,
        error: "Pi API key not configured",
      }
    }

    console.log("[v0] Initializing Pi Client...")
    const pi = new PiClient({ apiKey })
    console.log("[v0] Pi Client initialized successfully")

    console.log("[v0] Scoring request:", {
      query: request.query.substring(0, 50),
      textLength: request.text.length,
      criteriaCount: request.criteria.length,
    })

    const response = await pi.scoringSystem.score({
      llm_input: request.query,
      llm_output: request.text,
      scoring_spec: request.criteria,
    })

    console.log("[v0] Scoring successful, total_score:", response.total_score)

    return {
      total_score: response.total_score ?? 0,
      question_scores: response.question_scores,
    }
  } catch (error) {
    console.error("[v0] Error scoring result:", error)
    console.error("[v0] Error type:", error?.constructor?.name)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return {
      total_score: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
