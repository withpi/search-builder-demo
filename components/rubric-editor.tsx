"use client"

import { useState } from "react"
import { useSearch } from "@/lib/search-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RubricCriteriaEditor } from "@/components/rubric-criteria-editor"
import type { RubricCriterion } from "@/lib/types"

export function RubricEditor() {
  const { addRubric, rubrics } = useSearch()
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { label: "Relevance", question: "Is the result relevant to the query?" },
  ])

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

          <div className="max-w-2xl mx-auto">
            <RubricCriteriaEditor criteria={criteria} onUpdate={setCriteria} />
            <div className="mt-4">
              <Button onClick={handleSaveRubric} className="w-full" disabled={criteria.length === 0}>
                Save Rubric
              </Button>
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
