"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"
import { generateRubricFromFeedback, type FeedbackExample } from "@/app/actions/generate-rubric-from-feedback"
import type { RubricCriterion } from "@/lib/types"

interface FeedbackRubricGeneratorProps {
  feedbackExamples: FeedbackExample[]
  onApplyRubric: (criteria: RubricCriterion[]) => void
}

export function FeedbackRubricGenerator({ feedbackExamples, onApplyRubric }: FeedbackRubricGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const criteria = await generateRubricFromFeedback(feedbackExamples)

      if (criteria.length === 0) {
        setError("Failed to generate criteria. Please try again.")
        return
      }

      onApplyRubric(criteria)
    } catch (err) {
      console.error("[v0] Error generating rubric from feedback:", err)
      setError(err instanceof Error ? err.message : "Failed to generate rubric")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-foreground mb-2">Generate Rubric from Feedback</h4>
          <p className="text-sm text-muted-foreground">
            Use AI to analyze your written feedback and create evaluation criteria
          </p>
        </div>

        {feedbackExamples.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No feedback available</p>
            <p className="text-xs mt-2">Rate search results and provide written feedback to generate a rubric</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  {feedbackExamples.filter((ex) => ex.rating === "up").length} positive
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">
                  {feedbackExamples.filter((ex) => ex.rating === "down").length} negative
                </span>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Rubric...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate from Feedback
                </>
              )}
            </Button>

            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
          </>
        )}
      </div>
    </Card>
  )
}
