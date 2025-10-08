import type React from "react"

import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border shadow-sm">
      <Icon className="h-16 w-16 mx-auto mb-4 opacity-30" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm mt-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
