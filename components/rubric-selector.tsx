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
  const isDisabled = disabled || rubrics.length === 0

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[180px] h-9 bg-background border-border">
        <SelectValue placeholder={rubrics.length === 0 ? "No rubrics created" : "No rubric"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No rubric</SelectItem>
        {rubrics.map((rubric) => (
          <SelectItem key={rubric.id} value={rubric.id}>
            {rubric.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
