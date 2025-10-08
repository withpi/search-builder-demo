"use server"

import PiClient from "withpi"
import { z } from "zod"
import Question = PiClient.Question

export interface JokeRubricGenJob {
  _id: string
  jobId: string
  goodJokes: string[]
  badJokes: string[]
}

export interface GenerateScorerJobStatus {
  jobId: string
  state: "QUEUED" | "RUNNING" | "DONE" | "ERROR" | "CANCELLED"
  detailedStatus: GenerateScorerStatusMessage[]
  dimensions?: Question[]
  threshold: number | null
}

export type GenerateScorerStatusMessage = GenerateScorerSystemMessage | GenerateScorerUserMessage

// Used for debugging. Not intended for the user.
export interface GenerateScorerSystemMessage {
  target: "system"
  message: string
}

const zGenerateScorerSystemMessage = z.object({
  target: z.literal("system"),
  message: z.string(),
})

// Can be shown to the user.
export interface GenerateScorerUserMessage {
  target: "user"
  message: string
  // If present, is between 0 (just started) and 1 (complete).
  completion?: number
}

const zGenerateScorerUserMessage = z.object({
  target: z.literal("user"),
  message: z.string(),
  completion: z.number().optional(),
})

// Tries to parse out all of the status messages that conform to the structured
// scorer generation log format.
function parseDetailedStatus(detailedStatus: string[]): GenerateScorerStatusMessage[] {
  return detailedStatus
    .map((status) => {
      try {
        status = JSON.parse(status)
      } catch {
        return null
      }
      {
        const { success, data } = zGenerateScorerUserMessage.safeParse(status)
        if (success) return data
      }
      {
        const { success, data } = zGenerateScorerSystemMessage.safeParse(status)
        if (success) return data
      }
      return null
    })
    .filter((s) => s != null) as GenerateScorerStatusMessage[]
}

export interface RubricExample {
  llm_input: string // Changed from any to string - will be JSON stringified messages array
  llm_output: string // final response
}

export async function retrieveGenerateScorerJob(jobId: string): Promise<GenerateScorerJobStatus> {
  try {
    console.log("[v0] retrieveGenerateScorerJob called with jobId:", jobId)
    const apiKey = process.env.WITHPI_API_KEY
    if (!apiKey) {
      throw new Error(
        "WITHPI_API_KEY environment variable is not set. Please add it to your project's environment variables.",
      )
    }

    const client = new PiClient({
      apiKey,
    })
    const response = await client.scoringSystem.generate.retrieve(jobId)
    return {
      jobId: response.job_id,
      state: response.state,
      detailedStatus: parseDetailedStatus(response.detailed_status),
      dimensions: response.scoring_spec || [],
      threshold: response.threshold || null,
    }
  } catch (error) {
    console.error("[v0] Error in retrieveGenerateScorerJob:")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace available")
    console.error("[v0] Full error object:", error)
    throw error
  }
}

export async function createRubric(
  appDesc: string,
  goodExamples: RubricExample[],
  badExamples: RubricExample[],
): Promise<GenerateScorerJobStatus> {
  try {
    console.log("[v0] createRubric called")
    console.log("[v0] appDesc:", appDesc)
    console.log("[v0] goodExamples count:", goodExamples.length)
    console.log("[v0] badExamples count:", badExamples.length)

    const apiKey = process.env.WITHPI_API_KEY
    console.log("[v0] API key exists:", !!apiKey)
    console.log("[v0] API key length:", apiKey?.length)
    console.log("[v0] API key starts with:", apiKey?.substring(0, 5))
    console.log("[v0] API key type:", typeof apiKey)

    if (!apiKey) {
      throw new Error(
        "WITHPI_API_KEY environment variable is not set. Please add it to your project's environment variables.",
      )
    }

    console.log("[v0] Creating PiClient...")
    const client = new PiClient({
      apiKey: apiKey,
    })
    console.log("[v0] PiClient created successfully")
    console.log("[v0] PiClient type:", typeof client)
    console.log("[v0] PiClient keys:", Object.keys(client))

    const posExamples = goodExamples.map((ex) => ({
      llm_input: ex.llm_input,
      llm_output: ex.llm_output,
      score: 1,
    }))
    const negExamples = badExamples.map((ex) => ({
      llm_input: ex.llm_input,
      llm_output: ex.llm_output,
      score: 0,
    }))

    const apiPayload = {
      application_description: appDesc,
      examples: [...posExamples, ...negExamples],
      preference_examples: [],
      existing_questions: [],
      num_questions: 10,
    }

    console.log("[v0] API payload:", JSON.stringify(apiPayload, null, 2))
    console.log("[v0] Calling client.scoringSystem.generate.startJob...")
    console.log("[v0] client.scoringSystem exists:", !!client.scoringSystem)
    console.log("[v0] client.scoringSystem.generate exists:", !!(client.scoringSystem as any)?.generate)
    console.log(
      "[v0] client.scoringSystem.generate.startJob exists:",
      !!(client.scoringSystem as any)?.generate?.startJob,
    )
    console.log(
      "[v0] client.scoringSystem.generate.startJob type:",
      typeof (client.scoringSystem as any)?.generate?.startJob,
    )

    const job = await client.scoringSystem.generate.startJob(apiPayload)
    console.log("[v0] Job started successfully:", job)

    return {
      jobId: job.job_id,
      state: job.state,
      detailedStatus: parseDetailedStatus(job.detailed_status || []),
      dimensions: [],
      threshold: null,
    }
  } catch (error) {
    console.error("[v0] Error in createRubric:")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace available")
    console.error("[v0] Full error object:", error)
    throw error
  }
}

export async function cancelGenerateScorerJob(jobId: string): Promise<string> {
  try {
    console.log("[v0] cancelGenerateScorerJob called with jobId:", jobId)
    const apiKey = process.env.WITHPI_API_KEY
    if (!apiKey) {
      throw new Error(
        "WITHPI_API_KEY environment variable is not set. Please add it to your project's environment variables.",
      )
    }

    const client = new PiClient({
      apiKey,
    })
    return await client.scoringSystem.generate.cancel(jobId)
  } catch (error) {
    console.error("[v0] Error in cancelGenerateScorerJob:")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace available")
    console.error("[v0] Full error object:", error)
    throw error
  }
}

export async function getScoredData<T>(data: string[], rubric: Question[]) {
  const apiKey = process.env.WITHPI_API_KEY
  if (!apiKey) {
    throw new Error(
      "WITHPI_API_KEY environment variable is not set. Please add it to your project's environment variables.",
    )
  }

  const client = new PiClient({
    apiKey,
  })
  return Promise.all(
    data.map(async (d) => {
      const score = await client.scoringSystem.score({
        llm_input: "",
        llm_output: d,
        scoring_spec: rubric,
      })
      return {
        questionScores: Object.entries(score.question_scores).map(([key, value]) => ({ label: key, score: value })),
        score: score.total_score,
        data: d,
      }
    }),
  )
}
