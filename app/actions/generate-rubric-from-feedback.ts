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

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export async function generateRubricFromFeedback(feedbackExamples: FeedbackExample[]): Promise<RubricCriterion[]> {
  const feedbackItems = feedbackExamples.filter((item) => item.feedback && item.feedback.trim().length > 0)

  if (feedbackItems.length === 0) {
    throw new Error("No feedback provided in examples")
  }

  const criteria: RubricCriterion[] = []

  for (const item of feedbackItems) {
    try {
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

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      const parsed = JSON.parse(text.trim())

      if (!parsed.label || !parsed.question) {
        throw new Error("Invalid response structure: missing label or question")
      }

      criteria.push({
        label: parsed.label,
        question: parsed.question,
      })
    } catch (error) {
      console.error("[v0] Error generating criterion:", error instanceof Error ? error.message : String(error))
      // Continue processing other feedback items
    }
  }

  if (criteria.length === 0) {
    throw new Error("Failed to generate any criteria from feedback. Check server logs for details.")
  }

  return criteria
}
