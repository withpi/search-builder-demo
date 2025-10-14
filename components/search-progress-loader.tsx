import { Loader2 } from "lucide-react"

interface SearchProgressLoaderProps {
  message: string
}

export function SearchProgressLoader({ message }: SearchProgressLoaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  )
}
