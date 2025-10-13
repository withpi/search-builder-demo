"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Rubric } from "@/lib/types"

interface RubricSelectorProps {
  rubrics: Rubric[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function RubricSelector({ rubrics, value, onChange, disabled }: RubricSelectorProps) {
  const safeRubrics = rubrics || []
  const isDisabled = disabled || safeRubrics.length === 0

  const handleChange = (val: string) => {
    const newValue = val === "none" ? null : val
    onChange(newValue)
  }

  return (
    <Select value={value || "none"} onValueChange={handleChange} disabled={isDisabled}>
      <SelectTrigger className="w-[180px] h-9 bg-background border-border">
        <SelectValue placeholder={safeRubrics.length === 0 ? "No rubrics created" : "No rubric"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No rubric</SelectItem>
        {safeRubrics.map((rubric) => (
          <SelectItem key={rubric.id} value={rubric.id}>
            {rubric.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
