"use server"

import type { RubricCriterion } from "@/lib/types"

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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] OpenAI API error:", response.status, errorText)
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("[v0] OpenAI API response received")

      const text = data.choices?.[0]?.message?.content

      if (!text) {
        console.error("[v0] No content in OpenAI response:", data)
        throw new Error("No content in OpenAI response")
      }

      console.log("[v0] Response text:", text)

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
