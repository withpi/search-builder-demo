"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { Button } from "@headlessui/react"
import { clsx } from "clsx"
import { CheckCircleIcon, StopCircleIcon } from "@heroicons/react/24/solid"
import { SmallRadialLoader } from "@/components/rubric/radial_loader"
import type {
  GenerateScorerJobStatus,
  GenerateScorerStatusMessage,
  GenerateScorerSystemMessage,
  GenerateScorerUserMessage,
  RubricExample,
} from "@/lib/rubric/rubricActions"
import { ProgressCircle } from "@/components/tremor/progress_circle"
import { CardStack } from "@/components/rubric/card_stack"
import { DarkArtifactButton } from "@/components/rubric/artifact_button"
import { GenerationLogsModal } from "@/components/rubric/generation_logs_modal"
import { GenerateScorerStatusIcon } from "@/components/rubric/generate_scorer_status_icon"
import { useScorerGenerator } from "@/lib/rubric/useGeneratedRubric"
import PiClient from "withpi"
import Question = PiClient.Question

interface GroupedSystemMessage extends GenerateScorerUserMessage {
  systemMessages: GenerateScorerSystemMessage[]
}

function GroupedStatusMessagePreview({
  status,
  onOpen,
  isLast = false,
}: {
  status: GroupedSystemMessage
  onOpen?: () => void
  isLast?: boolean
}) {
  return (
    <div className="fade-in flex items-stretch gap-2 text-sm">
      <div className={"flex w-5 flex-none flex-col items-center gap-2"}>
        <GenerateScorerStatusIcon status={status} isLast={isLast} />
        <div className={"w-0.5 flex-1 rounded-xl bg-slate-300 pb-3"} />
      </div>
      <div className={"flex-1 pt-2 pb-3"}>
        <div className={clsx("font-semibold transition-colors", isLast ? "text-black" : "text-zinc-600")}>
          {status.message}
        </div>
        {status.systemMessages.length > 0 ? (
          <div
            className={clsx(
              "relative max-w-96 pr-4 pb-2",
              status.systemMessages.length == 1 ? "pt-4" : status.systemMessages.length == 2 ? "pt-8" : "pt-12",
            )}
          >
            <CardStack
              offset={15}
              scaleFactor={0.97}
              items={[...status.systemMessages].reverse().map((m, i) => ({ ...m, id: `${m.message}-${i}` }))}
              renderItem={(message, index) => (
                <div
                  onClick={onOpen}
                  className={clsx(
                    "relative flex flex-1 gap-2 overflow-hidden rounded-xl border bg-white px-4 py-2 text-zinc-600",
                    index != undefined && index > 0 ? "h-full" : "",
                  )}
                >
                  {isLast && index == 0 ? (
                    <div className={"h-5 w-5 pt-0.5"}>
                      <ProgressCircle className="size-4 animate-spin" strokeWidth={12} value={30} />
                    </div>
                  ) : (
                    <div className={"flex-none"}>
                      <CheckCircleIcon className={"block w-5 flex-none text-gray-400"} />
                    </div>
                  )}
                  <span className={"relative"}>{message.message}</span>
                </div>
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function StatusMessageSkeleton() {
  return (
    <div className="flex animate-pulse items-stretch gap-2 text-sm">
      <div className={"flex w-5 flex-none flex-col items-center gap-2"}>
        <div className={"w-0.5 flex-1 rounded-xl bg-slate-300 pb-3"} />
      </div>
      <div className={"flex-1 space-y-2 pt-2 pb-3"}>
        <div className={clsx("rounded-md bg-slate-200 p-2 font-semibold transition-colors")} />
        <div className={clsx("max-w-48 rounded-md bg-slate-200 p-1 font-semibold transition-colors")} />
        <div className={clsx("max-w-48 rounded-md bg-slate-200 p-1 font-semibold transition-colors")} />
      </div>
    </div>
  )
}

function groupByContent(messages: GenerateScorerStatusMessage[]): GroupedSystemMessage[] {
  const aggregatedMessages: GroupedSystemMessage[] = []
  for (const generateScorerMessage of messages) {
    if (generateScorerMessage.target == "user") {
      const lastMessage = aggregatedMessages.length > 0 ? aggregatedMessages[aggregatedMessages.length - 1] : null
      if (lastMessage && lastMessage.message == generateScorerMessage.message) {
        lastMessage.completion = generateScorerMessage.completion
      } else {
        if (aggregatedMessages.length > 0) {
          aggregatedMessages[aggregatedMessages.length - 1].completion = 1
        }
        aggregatedMessages.push({ ...generateScorerMessage, systemMessages: [] })
      }
    } else if (aggregatedMessages.length > 0) {
      aggregatedMessages[aggregatedMessages.length - 1].systemMessages.push(generateScorerMessage)
    }
  }
  return aggregatedMessages
}

function GenerateScorerLoader({
  job,
  completeJob,
  onFinishMessage,
}: {
  job?: GenerateScorerJobStatus
  completeJob: () => Promise<void>
  onFinishMessage?: string
}) {
  const aggregatedMessages: GroupedSystemMessage[] = useMemo(() => {
    return groupByContent(job?.detailedStatus || [])
  }, [job?.detailedStatus])
  const [loadingIntoStudio, setLoadingIntoStudio] = useState<boolean>(false)
  const [openedStatus, setOpenedStatus] = useState<GroupedSystemMessage | null>(null)
  const [messageDetailsIsOpen, setMessageDetailsIsOpen] = useState(false)
  const openedLastMessage =
    aggregatedMessages.length > 0 && aggregatedMessages[aggregatedMessages.length - 1].message == openedStatus?.message
  console.log(job)
  return (
    <div className={"pt-2"}>
      {aggregatedMessages.length > 0 ? (
        aggregatedMessages.map((status, i) => (
          <GroupedStatusMessagePreview
            onOpen={() => {
              setOpenedStatus(status)
              setMessageDetailsIsOpen(true)
            }}
            isLast={job?.state != "DONE" && i == aggregatedMessages.length - 1}
            status={status}
            key={status.message}
          />
        ))
      ) : (
        <StatusMessageSkeleton />
      )}
      {job?.state == "DONE" ? (
        <>
          <div className={"flex h-4 w-5 flex-none flex-col items-center gap-2"}>
            <div className={"w-0.5 flex-1 rounded-xl bg-slate-300 pb-3"} />
          </div>
          <div className={"flex pb-4"}>
            <div className={"flex w-5 flex-none flex-col items-center gap-2"}>
              <div className={"pt-3"}>
                <CheckCircleIcon className={"block w-5 flex-none text-green-500"} />
              </div>
              <div className={"w-0.5 flex-1 rounded-xl bg-slate-300 pb-3"} />
            </div>
            <div className={"pl-2"}>
              <div className={"pt-2 pb-3 text-sm font-semibold"}>Your rubric is ready</div>
              <DarkArtifactButton
                onClick={async () => {
                  setLoadingIntoStudio(true)
                  await completeJob()
                  setLoadingIntoStudio(false)
                }}
              >
                {onFinishMessage} {loadingIntoStudio ? <SmallRadialLoader /> : null}
              </DarkArtifactButton>
            </div>
          </div>
        </>
      ) : null}
      {openedStatus ? (
        <GenerationLogsModal
          setIsOpen={setMessageDetailsIsOpen}
          isOpen={messageDetailsIsOpen}
          systemMessages={openedStatus?.systemMessages || []}
          isLast={openedLastMessage}
          userMessage={openedStatus}
        />
      ) : null}
    </div>
  )
}

function RubricGenJob({
  title = "Generate new version",
  generatingScorer,
  stopGeneratingScorer,
  startGeneratingScorer,
  finishGeneratingScorer,
  disabled,
  viewOnly,
  job,
  onFinishMessage = "Load into studio",
}: {
  title: string
  generatingScorer: boolean
  stopGeneratingScorer: () => Promise<void>
  startGeneratingScorer: () => Promise<void>
  finishGeneratingScorer: () => Promise<void>
  disabled?: boolean
  viewOnly?: boolean
  job?: GenerateScorerJobStatus | null
  onFinishMessage?: string
}) {
  const [height, setHeight] = useState<number | "auto">("auto")
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const containerRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        const observedHeight = entries?.[0]?.contentRect?.height
        setHeight(observedHeight ?? "auto")
      })
      resizeObserverRef.current.observe(node)
    } else if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }
  }, [])
  if (!viewOnly || generatingScorer) {
    return (
      <div className={"relative mt-2 flex flex-col rounded-xl border bg-radial from-gray-100 to-white"}>
        <div className={"p-3"}>
          <Button
            onClick={generatingScorer ? stopGeneratingScorer : startGeneratingScorer}
            disabled={disabled}
            className={clsx(
              "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-700 px-6 py-3 font-semibold text-white hover:bg-black",
              disabled ? "pointer-events-none opacity-50" : "",
            )}
          >
            {job && job.state != "DONE" ? (
              <>
                <span className="animate-pulse">Generating</span>
                <StopCircleIcon className="size-4" />
              </>
            ) : (
              <>
                <span>{title}</span>
              </>
            )}
          </Button>
          <motion.div className={"overflow-hidden"} animate={{ height: height }}>
            <div ref={containerRef}>
              {generatingScorer && job ? (
                <GenerateScorerLoader
                  onFinishMessage={"Load agent rubric"}
                  completeJob={finishGeneratingScorer}
                  job={job}
                />
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }
  return null
}

export function RubricGenerator({
  systemPrompt,
  goodExamples,
  badExamples,
  applyRubric,
}: {
  systemPrompt: string
  goodExamples: RubricExample[]
  badExamples: RubricExample[]
  applyRubric: (rubric: Question[]) => void
}) {
  const [jobId, setJobId] = useState<string | null>(null)
  const scorerGenerator = useScorerGenerator({
    initJobId: jobId || null,
    onFetch: (status) => {
      console.log("[v0] Fetched", status)
    },
    onFinish: (status) => {
      console.log("[v0] Finished with", status)
    },
    onError: (e) => {
      console.error("[v0] Error in scorerGenerator:")
      console.error("[v0] Error message:", e instanceof Error ? e.message : String(e))
      console.error("[v0] Error stack:", e instanceof Error ? e.stack : "No stack trace available")
      console.error("[v0] Full error object:", e)
    },
  })
  async function startGeneratingScorer() {
    try {
      if (goodExamples.length > 0 || badExamples.length > 0) {
        setStartingRubricGen(true)
        console.log("[v0] Starting scorer generator with ", systemPrompt, goodExamples, badExamples)
        const job = await scorerGenerator.start(systemPrompt, goodExamples, badExamples)
        console.log("[v0] Started job", job)
        setJobId(job.jobId)
        setStartingRubricGen(false)
      }
    } catch (error) {
      console.error("[v0] Error in startGeneratingScorer:")
      console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
      console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace available")
      console.error("[v0] Full error object:", error)
      setStartingRubricGen(false)
    }
  }
  const [startingRubricGen, setStartingRubricGen] = useState<boolean>(false)
  return (
    <RubricGenJob
      job={scorerGenerator.status}
      generatingScorer={Boolean(startingRubricGen || scorerGenerator.running || jobId)}
      title={"Generate agent rubric"}
      finishGeneratingScorer={async () => {
        setJobId(null)
        if (scorerGenerator.status?.dimensions) {
          await applyRubric(scorerGenerator.status?.dimensions)
        }
      }}
      startGeneratingScorer={startGeneratingScorer}
      stopGeneratingScorer={async () => {
        await scorerGenerator.cancel()
      }}
    />
  )
}
