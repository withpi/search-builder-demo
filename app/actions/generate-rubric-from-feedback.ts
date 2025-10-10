"use server"

import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

export interface FeedbackExample {
  query: string
  result: string
  rating: "up" | "down"
  feedback: string
}

export interface GeneratedCriterion {
  label: string
  question: string
}

const rubricSchema = z.object({
  criteria: z.array(
    z.object({
      label: z.string().describe("Short label like 'Relevance' or 'Accuracy'"),
      question: z.string().describe("Yes/no question for evaluating search results"),
    }),
  ),
})

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export async function generateRubricFromFeedback(feedbackExamples: FeedbackExample[]): Promise<GeneratedCriterion[]> {
  console.log("[v0] Starting rubric generation from feedback")
  console.log("[v0] Number of feedback examples:", feedbackExamples.length)

  if (!process.env.OPEN_AI_KEY) {
    console.error("[v0] OPEN_AI_KEY environment variable is not set")
    throw new Error("OPEN_AI_KEY environment variable is not set")
  }

  const apiKey = process.env.OPEN_AI_KEY
  console.log("[v0] API key exists:", !!apiKey)
  console.log("[v0] API key length:", apiKey?.length)
  console.log("[v0] API key starts with 'sk-':", apiKey?.startsWith("sk-"))

  if (!feedbackExamples || feedbackExamples.length === 0) {
    console.error("[v0] No feedback examples provided")
    throw new Error("No feedback examples provided")
  }

  const positiveExamples = feedbackExamples.filter((ex) => ex.rating === "up")
  const negativeExamples = feedbackExamples.filter((ex) => ex.rating === "down")

  console.log("[v0] Positive examples:", positiveExamples.length)
  console.log("[v0] Negative examples:", negativeExamples.length)

  const prompt = `You are an expert at creating evaluation rubrics for search result quality. Based on user feedback about search results, generate 5-10 evaluation criteria that capture what makes results good or bad.

POSITIVE FEEDBACK (what users liked):
${positiveExamples
  .map(
    (ex, i) => `
${i + 1}. Query: "${ex.query}"
   Result: "${ex.result.substring(0, 200)}..."
   Why it was helpful: "${ex.feedback}"
`,
  )
  .join("\n")}

NEGATIVE FEEDBACK (what users disliked):
${negativeExamples
  .map(
    (ex, i) => `
${i + 1}. Query: "${ex.query}"
   Result: "${ex.result.substring(0, 200)}..."
   Why it wasn't helpful: "${ex.feedback}"
`,
  )
  .join("\n")}

Generate 5-10 evaluation criteria as questions that can be used to score search results. Each criterion should:
1. Be phrased as a yes/no question
2. Capture patterns from the feedback (e.g., relevance, accuracy, completeness, clarity)
3. Be specific enough to be actionable but general enough to apply to different queries`

  console.log("[v0] Calling OpenAI API with model: gpt-4o")

  try {
    const openaiClient = createOpenAI({
      apiKey: apiKey,
    })

    const { object } = await generateObject({
      model: openaiClient("gpt-4o"),
      schema: rubricSchema,
      prompt,
      maxOutputTokens: 2000,
    })

    console.log("[v0] Successfully generated rubric with", object.criteria.length, "criteria")
    return object.criteria
  } catch (error) {
    console.error("[v0] Error calling OpenAI API:", error)

    if (error instanceof Error) {
      console.error("[v0] Error name:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)

      // Log all properties of the error object
      console.error("[v0] Error object keys:", Object.keys(error))
      console.error("[v0] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }

    throw new Error(`Failed to generate rubric: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
