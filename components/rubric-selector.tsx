"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Rubric } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface RubricSelectorProps {
  rubrics: Rubric[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  indexingRubrics?: Set<string>
}

export function RubricSelector({
  rubrics,
  value,
  onChange,
  disabled,
  indexingRubrics = new Set(),
}: RubricSelectorProps) {
  const isDisabled = disabled || rubrics.length === 0

  const handleChange = (val: string) => {
    const newValue = val === "none" ? null : val
    onChange(newValue)
  }

  return (
    <Select value={value || "none"} onValueChange={handleChange} disabled={isDisabled}>
      <SelectTrigger className="w-[180px] h-9 bg-background border-border">
        <SelectValue placeholder={rubrics.length === 0 ? "No rubrics created" : "No rubric"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No rubric</SelectItem>
        {rubrics.map((rubric) => {
          const isIndexing = indexingRubrics.has(rubric.id)
          return (
            <SelectItem key={rubric.id} value={rubric.id} disabled={isIndexing}>
              <div className="flex items-center gap-2">
                {isIndexing && <Loader2 className="h-3 w-3 animate-spin" />}
                <span className={isIndexing ? "text-muted-foreground" : ""}>{rubric.name}</span>
                {isIndexing && <span className="text-xs text-muted-foreground">(indexing...)</span>}
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
