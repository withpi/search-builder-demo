"use server"

import { generateText } from "ai"

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

export async function generateRubricFromFeedback(feedbackExamples: FeedbackExample[]): Promise<GeneratedCriterion[]> {
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
3. Be specific enough to be actionable but general enough to apply to different queries

Format each criterion as:
Label: [Short label like "Relevance" or "Accuracy"]
Question: [Yes/no question like "Does this result directly answer the user's query?"]

Return ONLY the criteria in this exact format, one per line, with a blank line between each criterion.`

  const { text } = await generateText({
    model: "google/gemini-2.0-flash-exp",
    prompt,
    maxOutputTokens: 2000,
  })

  // Parse the generated text into criteria
  const criteria: GeneratedCriterion[] = []
  const blocks = text.split("\n\n").filter((block) => block.trim())

  for (const block of blocks) {
    const lines = block.split("\n")
    let label = ""
    let question = ""

    for (const line of lines) {
      if (line.startsWith("Label:")) {
        label = line.replace("Label:", "").trim()
      } else if (line.startsWith("Question:")) {
        question = line.replace("Question:", "").trim()
      }
    }

    if (label && question) {
      criteria.push({ label, question })
    }
  }

  return criteria
}
