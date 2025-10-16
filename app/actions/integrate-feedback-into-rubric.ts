"use server"

import { auth } from "@/auth";
import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export interface FeedbackIntegrationInput {
  existingCriteria: Array<{ label: string; question: string }>
  newFeedback: {
    query: string
    result: string
    rating: "up" | "down"
    feedback: string
  }
}

export async function integrateFeedbackIntoRubric(input: FeedbackIntegrationInput) {
  await auth();

  try {
    const { existingCriteria, newFeedback } = input

    const apiKey = process.env.OPEN_AI_KEY

    if (!apiKey) {
      console.error("[v0] OPEN_AI_KEY environment variable is not set")
      throw new Error("OpenAI API key is not configured")
    }

    console.log("[v0] Integrating feedback into rubric with", existingCriteria.length, "existing criteria")

    const prompt = `You are helping to build a search result evaluation rubric based on user feedback.

EXISTING RUBRIC CRITERIA:
${existingCriteria.length > 0 ? existingCriteria.map((c, i) => `${i + 1}. ${c.label}: ${c.question}`).join("\n") : "None yet"}

NEW FEEDBACK:
Query: "${newFeedback.query}"
Result: "${newFeedback.result}"
Rating: ${newFeedback.rating === "up" ? "Helpful (thumbs up)" : "Not helpful (thumbs down)"}
User Feedback: "${newFeedback.feedback}"

Based on this new feedback, generate ONE new evaluation criterion that captures what the user cares about. The criterion should be:
1. A clear, specific question that can be used to evaluate search results
2. Different from existing criteria (don't duplicate)
3. Focused on the aspect mentioned in the user's feedback
4. Applicable to other search results, not just this specific one

Respond with ONLY a JSON object in this exact format:
{
  "label": "Short label (2-4 words)",
  "question": "Clear evaluation question"
}

Example:
{
  "label": "Factual Accuracy",
  "question": "Does the result provide factually accurate information that directly answers the query?"
}`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] OpenAI API response received")

    const text = data.choices?.[0]?.message?.content

    if (!text) {
      console.error("[v0] No content in OpenAI response:", data)
      throw new Error("No content in OpenAI response")
    }

    console.log("[v0] Response text:", text)

    const newCriterion = JSON.parse(text.trim())
    console.log("[v0] Successfully parsed criterion:", newCriterion)

    if (!newCriterion.label || !newCriterion.question) {
      console.error("[v0] Invalid criterion structure:", newCriterion)
      throw new Error("Invalid criterion structure")
    }

    return {
      success: true,
      criterion: newCriterion as { label: string; question: string },
    }
  } catch (error) {
    console.error("[v0] Error integrating feedback into rubric:", error)
    return {
      success: false,
      error: "Failed to integrate feedback",
    }
  }
}
