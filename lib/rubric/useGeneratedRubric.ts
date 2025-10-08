"use client"

import {
  cancelGenerateScorerJob,
  createRubric,
  type GenerateScorerJobStatus,
  retrieveGenerateScorerJob,
  type RubricExample, // Import the new type
} from "@/lib/rubric/rubricActions"
import { useEffect, useRef, useState } from "react"
import useSWR from "swr"

export type ScorerGenerator = {
  status?: GenerateScorerJobStatus | null
  running: boolean
  error: any
  start: (
    appDesc: string,
    goodExamples: RubricExample[],
    badExamples: RubricExample[],
  ) => Promise<GenerateScorerJobStatus>
  cancel: () => Promise<string>
  reset: () => Promise<void>
}

export function useScorerGenerator({
  initJobId = null,
  onFetch = () => {},
  onFinish = () => {},
  onError = () => {},
}: {
  initJobId: string | null
  onFetch?: (status: GenerateScorerJobStatus) => void
  onFinish?: (status: GenerateScorerJobStatus) => void
  onError?: (err: any) => void
}): ScorerGenerator {
  const [jobId, setJobId] = useState<string | null>(initJobId)
  const [running, setRunning] = useState<boolean>(false)
  const [shouldPoll, setShouldPoll] = useState<boolean>(true)
  const finishDidRun = useRef(false)
  useEffect(() => {
    if (jobId) {
      finishDidRun.current = false
    }
  }, [jobId])
  const {
    data: status,
    error,
    mutate,
  } = useSWR(
    () => (jobId ? `/sdk/scoring_system/generate/${jobId}` : null),
    async () => {
      if (jobId) {
        console.log("Finish did run", finishDidRun.current)
        setRunning(true)
        const jobStatus = await retrieveGenerateScorerJob(jobId)
        onFetch?.(jobStatus)
        if (jobStatus.state === "ERROR" || jobStatus.state === "CANCELLED" || jobStatus.state === "DONE") {
          if (jobStatus.state === "DONE") {
            if (!finishDidRun.current) {
              onFinish?.(jobStatus)
              finishDidRun.current = true
            }
          } else if (jobStatus.state == "ERROR") {
            if (!finishDidRun.current) {
              onError(new Error(`Failed to generate scorer: ${JSON.stringify(jobStatus)} `))
            }
          }
          setRunning(false)
          setShouldPoll(false)
        }
        return jobStatus
      }
      return null
    },
    shouldPoll ? { refreshInterval: 2000, onError } : { onError },
  )

  return {
    status,
    running,
    error,
    start: async (appDesc: string, goodExamples: RubricExample[], badExamples: RubricExample[]) => {
      try {
        console.log("[v0] useScorerGenerator.start called")
        setRunning(true)
        setShouldPoll(true)
        const newJob = await createRubric(appDesc, goodExamples, badExamples)
        setJobId(newJob.jobId)
        return newJob
      } catch (error) {
        console.error("[v0] Error in useScorerGenerator.start:")
        console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
        console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace available")
        console.error("[v0] Full error object:", error)
        setRunning(false)
        onError(error)
        throw error
      }
    },
    cancel: async () => {
      if (jobId) {
        setRunning(false)
        const response = await cancelGenerateScorerJob(jobId)
        setJobId(null)
        setShouldPoll(true)
        return response
      } else {
        throw new Error("Unable to cancel a job that does not exist")
      }
    },
    reset: async () => {
      setJobId(null)
      setRunning(false)
      setShouldPoll(true)
      await mutate(null)
    },
  }
}
