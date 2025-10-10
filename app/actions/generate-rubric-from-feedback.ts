"use server"

import { generateText } from "ai"
import type { RubricCriterion } from "@/lib/types"
import { createOpenAI } from "@ai-sdk/openai"

export interface FeedbackExample {
  query: string
  result: string
  rating: "up" | "down"
  feedback: string
}

const apiKey = process.env.OPEN_AI_KEY

if (!apiKey) {
  console.error("[v0] OPEN_AI_KEY environment variable is not set")
}

const openai = createOpenAI({
  apiKey: apiKey || "",
})

export async function generateRubricFromFeedback(feedbackExamples: FeedbackExample[]): Promise<RubricCriterion[]> {
  console.log("[v0] Starting rubric generation with", feedbackExamples.length, "examples")

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured. Please set OPEN_AI_KEY environment variable.")
  }

  const feedbackItems = feedbackExamples.filter((item) => item.feedback && item.feedback.trim().length > 0)

  if (feedbackItems.length === 0) {
    throw new Error("No feedback provided in examples")
  }

  console.log("[v0] Processing", feedbackItems.length, "feedback items")

  const criteria: RubricCriterion[] = []

  for (const item of feedbackItems) {
    try {
      console.log("[v0] Generating criterion for feedback:", item.feedback)

      const isPositive = item.rating === "up"

      const prompt = `Convert this feedback into an evaluation question. The question must be GENERALIZABLE to work for ANY query, not just this specific example.

Feedback: "${item.feedback}"
Query: ${item.query}

RESULT CONTEXT (for understanding structure only):
Text: ${item.result}

CRITICAL RULES:
1. Keep the EXACT requirement from the feedback - do not add qualifiers, interpretations, or extra criteria
2. Make the question work for ANY query - do not reference specific content from this example
3. Reference structure/format/approach, NOT the specific content
4. Only convert the statement to a question format

EXAMPLES:

Feedback: "it should be a table"
Question: "Is the response formatted as a table?"
(NOT: "Is the response about activities formatted as a table?")

Feedback: "missing location parameter"
Question: "Does the result include location information?"
(NOT: "Does the result include the Bernal Heights location?")

Feedback: "search results are irrelevant"
Question: "Does the result contain relevant information?"
(NOT: "Does the search response contain relevant bars in Bernal Heights?")

Feedback: "response lacks detail"
Question: "Does the response provide sufficient detail?"
(NOT: "Does the response provide sufficient detail about Bernal Heights?")

Create a question that evaluates ${isPositive ? "whether this positive behavior is present" : "whether this negative behavior is avoided"}.

Respond with ONLY a JSON object in this exact format:
{
  "label": "A concise label for the evaluation criterion",
  "question": "The evaluation question to ask"
}`

      let response
      try {
        console.log("[v0] Calling OpenAI API...")
        response = await generateText({
          model: openai("gpt-4o"),
          prompt,
        })
        console.log("[v0] OpenAI API response received, text length:", response.text?.length || 0)
        console.log("[v0] Response text:", response.text)
      } catch (apiError: any) {
        console.error("[v0] OpenAI API call failed:")
        console.error("[v0] Error name:", apiError?.name)
        console.error("[v0] Error message:", apiError?.message)
        console.error("[v0] Error stack:", apiError?.stack)
        console.error("[v0] Error cause:", apiError?.cause)
        console.error("[v0] Full error object:", JSON.stringify(apiError, Object.getOwnPropertyNames(apiError), 2))
        throw apiError
      }

      const { text } = response

      let parsed
      try {
        parsed = JSON.parse(text.trim())
        console.log("[v0] Successfully parsed JSON:", parsed)
      } catch (parseError) {
        console.error("[v0] Failed to parse JSON from response:", text)
        throw new Error(
          `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        )
      }

      if (!parsed.label || !parsed.question) {
        console.error("[v0] Invalid response structure:", parsed)
        throw new Error("Invalid response structure: missing label or question")
      }

      criteria.push({
        label: parsed.label,
        question: parsed.question,
      })

      console.log("[v0] Successfully generated criterion:", parsed.label)
    } catch (error) {
      console.error("[v0] Error generating criterion:", error instanceof Error ? error.message : String(error))
      console.error("[v0] Error details:", error)
      // Continue processing other feedback items
    }
  }

  if (criteria.length === 0) {
    throw new Error("Failed to generate any criteria from feedback. Check server logs for details.")
  }

  console.log("[v0] Successfully generated", criteria.length, "criteria")
  return criteria
}
