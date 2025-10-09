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

  const handleChange = (val: string) => {
    const newValue = val === "none" ? null : val
    const selectedRubric = rubrics.find((r) => r.id === newValue)

    console.log("[v0] Rubric selector changed:", {
      previousValue: value,
      newValue: newValue,
      selectedRubricName: selectedRubric?.name || "None",
      allRubrics: rubrics.map((r) => ({ id: r.id, name: r.name })),
    })

    onChange(newValue)
  }

  return (
    <Select value={value || "none"} onValueChange={handleChange} disabled={isDisabled}>
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
