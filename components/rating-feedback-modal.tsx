"use client"

import type React from "react"

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
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"

interface RatingFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rating: "up" | "down"
  onSubmit: (feedback: string) => Promise<void>
  resultTitle?: string
}

export function RatingFeedbackModal({ open, onOpenChange, rating, onSubmit, resultTitle }: RatingFeedbackModalProps) {
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(feedback)
      setFeedback("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit("")
      setFeedback("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isSubmitting) {
        handleSubmit()
      }
    }
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
            onKeyDown={handleKeyDown}
            className="min-h-[120px]"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to submit or{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Shift+Enter</kbd> for a new line
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={isSubmitting}>
            Skip
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
