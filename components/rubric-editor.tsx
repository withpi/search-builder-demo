"use client"

import { useSearch } from "@/lib/search-context"
import { Card } from "@/components/ui/card"
import { RubricGenerator } from "@/components/rubric/scorer_generator"
import type { RubricExample } from "@/lib/rubric/rubricActions"
import type PiClient from "withpi"

export function RubricEditor() {
  const { ratedResults, addRubric } = useSearch()

  const validRatedResults = ratedResults.filter((r) => {
    return r && r.query && r.text && typeof r.query === "string" && typeof r.text === "string"
  })

  const goodExamples: RubricExample[] = validRatedResults
    .filter((r) => r.rating === "up")
    .map((r) => ({
      llm_input: JSON.stringify([
        {
          role: "user",
          content: String(r.query),
        },
      ]),
      llm_output: String(r.text),
    }))

  const badExamples: RubricExample[] = validRatedResults
    .filter((r) => r.rating === "down")
    .map((r) => ({
      llm_input: JSON.stringify([
        {
          role: "user",
          content: String(r.query),
        },
      ]),
      llm_output: String(r.text),
    }))

  const systemPrompt = "Search result relevance evaluator"

  const handleApplyRubric = async (dimensions: PiClient.Question[]) => {
    const newRubric = {
      id: `rubric-${Date.now()}`,
      name: `Generated Rubric ${new Date().toLocaleDateString()}`,
      criteria: dimensions.map((d) => ({
        label: d.label || "Criterion",
        question: d.question,
      })),
      createdAt: new Date(),
      trainingCount: validRatedResults.length,
    }

    addRubric(newRubric)
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border-border shadow-sm">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">Rubric Generator</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Generate a Pi-powered rubric from your rated search results to capture your relevance preferences.
            </p>
          </div>

          <div className="pt-2 text-sm text-muted-foreground text-center">
            <p>
              {validRatedResults.length} rated result{validRatedResults.length !== 1 ? "s" : ""} available
              {goodExamples.length > 0 && <span className="text-green-600 ml-2">({goodExamples.length} relevant)</span>}
              {badExamples.length > 0 && <span className="text-red-600 ml-2">({badExamples.length} irrelevant)</span>}
            </p>
          </div>

          {validRatedResults.length > 0 ? (
            <RubricGenerator
              systemPrompt={systemPrompt}
              goodExamples={goodExamples}
              badExamples={badExamples}
              applyRubric={handleApplyRubric}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Rate some search results in the Training tab to get started</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
