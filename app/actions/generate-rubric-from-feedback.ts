"use server"

import { generateObject } from "ai"
import { z } from "zod"
import type { RatedResult, RubricCriterion } from "@/lib/types"
import { createOpenAI } from "@ai-sdk/openai"

const questionSchema = z.object({
  label: z.string().describe("A concise label for the evaluation criterion"),
  question: z.string().describe("The evaluation question to ask"),
  options: z.array(z.string()).optional().describe("Optional multiple choice options for the question"),
})
const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export async function generateRubricFromFeedback(ratedResults: RatedResult[]): Promise<RubricCriterion[]> {
  const feedbackItems = ratedResults.filter((r) => r.feedback && r.feedback.trim().length > 0)

  if (feedbackItems.length === 0) {
    throw new Error("No feedback provided in rated results")
  }

  const criteria: RubricCriterion[] = []

  for (const item of feedbackItems) {
    const isPositive = item.rating === "up"

    const prompt = `Convert this feedback into an evaluation question. The question must be GENERALIZABLE to work for ANY query, not just this specific example.

Feedback: "${item.feedback}"
Query: ${item.query}

RESULT CONTEXT (for understanding structure only):
Title: ${item.title || "N/A"}
Text: ${item.text}

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

Create a question that evaluates ${isPositive ? "whether this positive behavior is present" : "whether this negative behavior is avoided"}.`

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: questionSchema,
      prompt,
    })

    criteria.push({
      label: object.label,
      question: object.question,
    })
  }

  return criteria
}
