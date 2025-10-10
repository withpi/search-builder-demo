"use server"

import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/google-vertex"
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

const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY

if (!serviceAccountKey) {
  console.error("[v0] SERVICE_ACCOUNT_KEY environment variable is not set")
}

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})


export async function generateRubricFromFeedback(feedbackExamples: FeedbackExample[]): Promise<GeneratedCriterion[]> {
  if (!vertex) {
    throw new Error("Vertex AI provider not initialized - SERVICE_ACCOUNT_KEY is missing or invalid")
  }

  console.log("[v0] Starting rubric generation from feedback", {
    totalExamples: feedbackExamples.length,
    positiveCount: feedbackExamples.filter((ex) => ex.rating === "up").length,
    negativeCount: feedbackExamples.filter((ex) => ex.rating === "down").length,
  })

  const positiveExamples = feedbackExamples.filter((ex) => ex.rating === "up")
  const negativeExamples = feedbackExamples.filter((ex) => ex.rating === "down")

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

  try {
    console.log("[v0] Calling generateObject with Vertex AI model")

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: rubricSchema,
      prompt,
      maxOutputTokens: 2000,
    })

    console.log("[v0] Successfully generated rubric criteria", {
      criteriaCount: object.criteria.length,
    })

    return object.criteria
  } catch (error) {
    console.error("[v0] Error generating rubric from feedback:", error)
    throw error
  }
}
