"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearch } from "@/lib/search-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RubricCriteriaEditor } from "@/components/rubric-criteria-editor"
import { scoreResult } from "@/app/actions/score-results"
import type { RubricCriterion, Document } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface ScoredExample {
  document: Document
  totalScore: number
  questionScores: Array<{ label: string; score: number }>
  isScoring: boolean
}

export function RubricEditor() {
  const { addRubric, rubrics, corpora, activeCorpusId } = useSearch()
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { label: "Relevance", question: "Is the result relevant to the query?" },
  ])
  const [examples, setExamples] = useState<ScoredExample[]>([])
  const [isLoadingExamples, setIsLoadingExamples] = useState(false)

  useEffect(() => {
    const loadExamples = () => {
      if (!activeCorpusId) return

      const corpus = corpora.find((c) => c.id === activeCorpusId)
      if (!corpus || !corpus.isReady || corpus.documents.length === 0) return

      setIsLoadingExamples(true)

      // Sample 5 random documents
      const shuffled = [...corpus.documents].sort(() => Math.random() - 0.5)
      const sampled = shuffled.slice(0, 5)

      setExamples(
        sampled.map((doc) => ({
          document: doc,
          totalScore: 0,
          questionScores: [],
          isScoring: false,
        })),
      )

      setIsLoadingExamples(false)
    }

    loadExamples()
  }, [activeCorpusId, corpora])

  const scoreExamples = useCallback(async () => {
    if (criteria.length === 0 || criteria.some((c) => !c.label.trim() || !c.question.trim())) {
      return
    }

    // Mark all examples as scoring
    setExamples((prev) => prev.map((ex) => ({ ...ex, isScoring: true })))

    // Score each example
    const scoredExamples = await Promise.all(
      examples.map(async (example) => {
        try {
          const response = await scoreResult({
            query: "example query",
            text: example.document.text,
            criteria: criteria,
          })

          return {
            ...example,
            totalScore: response.error ? 0 : (response.total_score ?? 0),
            questionScores: response.question_scores || [],
            isScoring: false,
          }
        } catch (error) {
          console.error("[v0] Error scoring example:", error)
          return {
            ...example,
            totalScore: 0,
            questionScores: [],
            isScoring: false,
          }
        }
      }),
    )

    const sortedExamples = scoredExamples.sort((a, b) => b.totalScore - a.totalScore)

    setExamples(sortedExamples)
  }, [criteria, examples])

  const handleSaveRubric = () => {
    if (criteria.length === 0) {
      return
    }

    const newRubric = {
      id: `rubric-${Date.now()}`,
      name: `Rubric v${rubrics.length}`,
      criteria: criteria,
      createdAt: new Date(),
      trainingCount: 0,
    }

    addRubric(newRubric)
    setCriteria([{ label: "Relevance", question: "Is the result relevant to the query?" }])
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border-border shadow-sm">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">Rubric Editor</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create rubrics to evaluate search result quality using Pi Scorer
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Criteria</h4>
              <RubricCriteriaEditor criteria={criteria} onUpdate={setCriteria} onBlur={scoreExamples} />
              <Button onClick={handleSaveRubric} className="w-full" disabled={criteria.length === 0}>
                Save Rubric
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Preview Examples</h4>
              {isLoadingExamples ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : examples.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No corpus selected or corpus is empty
                </div>
              ) : (
                <div className="space-y-3">
                  {examples.map((example, idx) => (
                    <Card key={example.document.id} className="p-4 bg-muted/50">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {example.document.title && (
                              <div className="text-sm font-medium text-foreground truncate">
                                {example.document.title}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {example.document.text}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {example.isScoring ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <div className="text-sm font-semibold text-foreground">
                                {example.totalScore.toFixed(3)}
                              </div>
                            )}
                          </div>
                        </div>
                        {example.questionScores.length > 0 && !example.isScoring && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {example.questionScores.map((qs) => (
                              <div
                                key={qs.label}
                                className="text-xs px-2 py-1 bg-background rounded border border-border"
                              >
                                <span className="text-muted-foreground">{qs.label}:</span>{" "}
                                <span className="font-medium">{qs.score.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {rubrics.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Existing Rubrics ({rubrics.length})</h4>
              <div className="space-y-2">
                {rubrics.map((rubric) => (
                  <div key={rubric.id} className="text-sm p-3 bg-muted rounded-lg">
                    <div className="font-medium">{rubric.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {rubric.criteria.length} criteria • Created {rubric.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
