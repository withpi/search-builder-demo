"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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

  const selectedRubric = value ? safeRubrics.find((r) => r.id === value) : null

  return (
    <div className="space-y-3">
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

      {selectedRubric && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {selectedRubric.criteria.length} {selectedRubric.criteria.length === 1 ? "criterion" : "criteria"}
          </p>
          <Accordion type="single" collapsible className="w-full">
            {selectedRubric.criteria.map((criterion, index) => (
              <AccordionItem key={index} value={`criterion-${index}`} className="border-b last:border-b-0">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">{criterion.label}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-2">{criterion.question}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  )
}
