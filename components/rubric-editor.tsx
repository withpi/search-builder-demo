"use client"
import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"
import { useRubricEditor } from "@/lib/hooks/use-rubric-editor"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RubricCriteriaEditor } from "@/components/rubric-criteria-editor"
import type { Document } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface ScoredExample {
  document: Document
  totalScore: number
  questionScores: Array<{ label: string; score: number }>
  isScoring: boolean
}

export function RubricEditor() {
  const { corpora, activeCorpusId } = useSearch()
  const { addRubric, rubrics, isIndexing } = useRubric()

  const {
    criteria,
    setCriteria,
    editingRubricId,
    examples,
    isLoadingExamples,
    scoreExamples,
    handleSaveRubric,
    handleLoadRubric,
  } = useRubricEditor({
    activeCorpusId,
    corpora,
    rubrics,
    onSaveRubric: addRubric,
  })

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border-border shadow-sm">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">Rubric Editor</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create rubrics to evaluate search result quality using Pi Scorer
            </p>
            {editingRubricId && (
              <p className="text-sm font-medium text-primary mt-2">
                Editing: {rubrics.find((r) => r.id === editingRubricId)?.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Criteria</h4>
              <RubricCriteriaEditor criteria={criteria} onUpdate={setCriteria} onBlur={scoreExamples} />
              <Button onClick={handleSaveRubric} className="w-full" disabled={criteria.length === 0 || isIndexing}>
                {isIndexing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building Index...
                  </>
                ) : (
                  "Save Rubric"
                )}
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
                  {examples.map((example) => (
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
        </div>
      </Card>
    </div>
  )
}
