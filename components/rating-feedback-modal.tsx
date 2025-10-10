"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown } from "lucide-react"

interface RatingFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rating: "up" | "down"
  onSubmit: (feedback: string) => void
  resultTitle?: string
}

export function RatingFeedbackModal({ open, onOpenChange, rating, onSubmit, resultTitle }: RatingFeedbackModalProps) {
  const [feedback, setFeedback] = useState("")

  const handleSubmit = () => {
    onSubmit(feedback)
    setFeedback("")
    onOpenChange(false)
  }

  const handleSkip = () => {
    onSubmit("")
    setFeedback("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rating === "up" ? (
              <>
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <span>Helpful Result</span>
              </>
            ) : (
              <>
                <ThumbsDown className="h-5 w-5 text-red-600" />
                <span>Not Helpful Result</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {rating === "up"
              ? "What made this result helpful? (Optional)"
              : "What could be improved about this result? (Optional)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {resultTitle && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Result:</span> {resultTitle}
            </div>
          )}
          <Textarea
            placeholder={
              rating === "up"
                ? "e.g., This result directly answered my question..."
                : "e.g., This result was off-topic because..."
            }
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
