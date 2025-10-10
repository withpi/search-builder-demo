"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"
import type { RubricCriterion } from "@/lib/types"

interface RubricCriteriaEditorProps {
  criteria: RubricCriterion[]
  onUpdate: (criteria: RubricCriterion[]) => void
  onBlur?: () => void
}

export function RubricCriteriaEditor({ criteria, onUpdate, onBlur }: RubricCriteriaEditorProps) {
  const [editingCriteria, setEditingCriteria] = useState<RubricCriterion[]>(criteria)

  useEffect(() => {
    setEditingCriteria(criteria)
  }, [criteria])

  const handleLabelChange = (index: number, label: string) => {
    const updated = [...editingCriteria]
    updated[index] = { ...updated[index], label }
    setEditingCriteria(updated)
    const validCriteria = updated.filter((c) => c.label.trim() && c.question.trim())
    onUpdate(validCriteria.length > 0 ? validCriteria : updated)
  }

  const handleQuestionChange = (index: number, question: string) => {
    const updated = [...editingCriteria]
    updated[index] = { ...updated[index], question }
    setEditingCriteria(updated)
    const validCriteria = updated.filter((c) => c.label.trim() && c.question.trim())
    onUpdate(validCriteria.length > 0 ? validCriteria : updated)
  }

  const handleBlur = () => {
    if (onBlur) {
      onBlur()
    }
  }

  const handleAddCriterion = () => {
    const updated = [...editingCriteria, { label: "", question: "" }]
    setEditingCriteria(updated)
    onUpdate(updated)
  }

  const handleRemoveCriterion = (index: number) => {
    const updated = editingCriteria.filter((_, i) => i !== index)
    setEditingCriteria(updated)
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {editingCriteria.map((criterion, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor={`label-${index}`} className="text-sm font-medium">
                      Label
                    </Label>
                    <Input
                      id={`label-${index}`}
                      value={criterion.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g., Relevance"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`question-${index}`} className="text-sm font-medium">
                      Question
                    </Label>
                    <Textarea
                      id={`question-${index}`}
                      value={criterion.question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g., How relevant is this result to the query?"
                      className="mt-1 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCriterion(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleAddCriterion} className="flex-1 bg-transparent">
          <Plus className="h-4 w-4 mr-2" />
          Add Criterion
        </Button>
      </div>
    </div>
  )
}
