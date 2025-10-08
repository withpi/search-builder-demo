"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RESULT_LIMITS } from "@/lib/constants"

interface ResultLimitSelectorProps {
  value: string
  onChange: (limit: string) => void
  disabled?: boolean
}

export function ResultLimitSelector({ value, onChange, disabled }: ResultLimitSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[120px] bg-background/50 border-border/50 h-9 text-sm shadow-none hover:bg-background transition-colors">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RESULT_LIMITS.map((limit) => (
          <SelectItem key={limit} value={limit.toString()}>
            {limit} results
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
