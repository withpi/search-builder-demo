"use client"

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { SEARCH_MODES } from "@/lib/constants"
import type { SearchMode } from "@/lib/types"

interface SearchModeSelectorProps {
  value: SearchMode
  onChange: (mode: SearchMode) => void
  disabled?: boolean
}

export function SearchModeSelector({ value, onChange, disabled }: SearchModeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SearchMode)} disabled={disabled}>
      <SelectTrigger className="w-[140px] bg-background/50 border-border/50 h-9 text-sm shadow-none hover:bg-background transition-colors">
        <span className="font-medium">{SEARCH_MODES[value].label}</span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SEARCH_MODES).map(([mode, { label, description }]) => (
          <SelectItem key={mode} value={mode}>
            <div className="flex flex-col items-start py-1">
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
