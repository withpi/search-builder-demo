import { CheckCircleIcon } from "@heroicons/react/24/solid"
import { ProgressCircle } from "@/components/tremor/progress_circle"
import type { GenerateScorerUserMessage } from "@/lib/rubric/rubricActions"
import { cn } from "@/lib/utils"

export function GenerateScorerStatusIcon({
  status,
  isLast,
  className,
}: {
  status: GenerateScorerUserMessage
  isLast?: boolean
  className?: string
}) {
  if (isLast) {
    return (
      <div className={cn("pt-0.5", className)}>
        <ProgressCircle className="size-5 animate-spin" strokeWidth={12} value={status.completion * 100} />
      </div>
    )
  }

  return (
    <div className={cn("flex-none", className)}>
      <CheckCircleIcon className="block w-5 text-green-500" />
    </div>
  )
}
