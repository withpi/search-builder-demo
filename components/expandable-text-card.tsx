"use client"

import { useState, memo } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ExpandableTextCardProps {
  text: string
  id: string
  maxLines?: number
  className?: string
  onExpand?: (id: string, isExpanded: boolean) => void
}

export const ExpandableTextCard = memo(function ExpandableTextCard({
  text,
  id,
  maxLines = 3,
  className = "",
  onExpand,
}: ExpandableTextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpand?.(id, newState)
  }

  return (
    <div
      className={`cursor-pointer group ${className}`}
      onClick={toggleExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleExpand()
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse text" : "Expand text"}
    >
      <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isExpanded ? "" : `line-clamp-${maxLines}`}`}>
        {text}
      </p>
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>Show less</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Show more</span>
          </>
        )}
      </div>
    </div>
  )
})
