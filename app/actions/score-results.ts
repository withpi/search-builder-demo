"use server"

import PiClient from "withpi"
import type { RubricCriterion } from "@/lib/types"
import { auth } from "@/auth"

interface ScoreResultRequest {
  query: string
  text: string
  criteria: RubricCriterion[]
}

interface ScoreResultResponse {
  total_score: number
  question_scores: Array<{ label: string; score: number }>
  error?: string
}

export async function scoreResult(request: ScoreResultRequest): Promise<ScoreResultResponse> {
  await auth();

  try {
    const apiKey = process.env.WITHPI_API_KEY

    if (!apiKey) {
      return {
        total_score: 0,
        question_scores: [],
        error: "WITHPI_API_KEY environment variable is not set",
      }
    }

    const client = new PiClient({ apiKey })

    const scoringSpec = request.criteria.map((criterion) => ({
      label: criterion.label,
      question: criterion.question,
    }))

    const response = await client.scoringSystem.score({
      llm_input: request.query,
      llm_output: request.text,
      scoring_spec: scoringSpec,
    })

    return {
      total_score: response.total_score,
      question_scores: Object.entries(response.question_scores).map(([label, score]) => ({
        label,
        score: score as number,
      })),
    }
  } catch (error) {
    console.error("Error scoring result:", error)
    return {
      total_score: 0,
      question_scores: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
