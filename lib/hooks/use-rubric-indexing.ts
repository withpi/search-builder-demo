"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { Rubric, Corpus, RubricIndex } from "@/lib/types"
import { scoreResult } from "@/app/actions/score-results"

interface UseRubricIndexingProps {
  corpora: Corpus[]
  onIndexCreated: (index: RubricIndex) => void
}

export function useRubricIndexing({ corpora, onIndexCreated }: UseRubricIndexingProps) {
  const [indexingRubrics, setIndexingRubrics] = useState<Set<string>>(new Set())
  const [indexingProgress, setIndexingProgress] = useState<{
    current: number
    total: number
    corpusName: string
  } | null>(null)

  const buildRubricIndex = useCallback(async (rubric: Rubric, corpus: Corpus): Promise<RubricIndex> => {
    console.log("[v0] Building rubric index:", {
      rubricId: rubric.id,
      rubricName: rubric.name,
      corpusId: corpus.id,
      corpusName: corpus.name,
      totalDocuments: corpus.documents.length,
    })

    const scores = new Map<string, { totalScore: number; questionScores: Array<{ label: string; score: number }> }>()

    const BATCH_SIZE = 50
    const totalDocs = corpus.documents.length

    for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalDocs)
      const batch = corpus.documents.slice(i, batchEnd)

      console.log("[v0] Processing batch:", {
        batchStart: i,
        batchEnd,
        batchSize: batch.length,
        progress: `${batchEnd}/${totalDocs}`,
      })

      const batchResults = await Promise.all(
        batch.map(async (doc) => {
          try {
            const response = await scoreResult({
              query: "",
              text: doc.text,
              criteria: rubric.criteria,
            })

            return {
              docId: doc.id,
              totalScore: response.error ? 0 : (response.total_score ?? 0),
              questionScores: response.question_scores || [],
            }
          } catch (error) {
            console.error("[v0] Error scoring document:", {
              docId: doc.id,
              error: error instanceof Error ? error.message : String(error),
            })
            return {
              docId: doc.id,
              totalScore: 0,
              questionScores: [],
            }
          }
        }),
      )

      batchResults.forEach((result) => {
        scores.set(result.docId, {
          totalScore: result.totalScore,
          questionScores: result.questionScores,
        })
      })

      setIndexingProgress({
        current: batchEnd,
        total: totalDocs,
        corpusName: corpus.name,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log("[v0] Rubric index built successfully:", {
      rubricId: rubric.id,
      corpusId: corpus.id,
      totalDocuments: totalDocs,
      scoresCount: scores.size,
    })

    return {
      rubricId: rubric.id,
      corpusId: corpus.id,
      scores,
      createdAt: new Date(),
      documentCount: totalDocs,
    }
  }, [])

  const indexRubric = useCallback(
    async (rubric: Rubric) => {
      console.log("[v0] Starting rubric indexing:", {
        rubricId: rubric.id,
        rubricName: rubric.name,
        totalCorpora: corpora.filter((c) => c.isReady && c.documents.length > 0).length,
      })

      setIndexingRubrics((prev) => new Set(prev).add(rubric.id))
      setIndexingProgress(null)

      const readyCorpora = corpora.filter((c) => c.isReady && c.documents.length > 0)
      const totalCorpora = readyCorpora.length

      const toastId = toast.loading(`Building index for "${rubric.name}"...`, {
        description: `0 of ${totalCorpora} corpora indexed`,
      })

      try {
        let completedCorpora = 0

        for (const corpus of readyCorpora) {
          const progressInterval = setInterval(() => {
            if (indexingProgress) {
              toast.loading(`Building index for "${rubric.name}"...`, {
                id: toastId,
                description: `${indexingProgress.current}/${indexingProgress.total} documents indexed in ${indexingProgress.corpusName}`,
              })
            }
          }, 500)

          const index = await buildRubricIndex(rubric, corpus)
          onIndexCreated(index)

          clearInterval(progressInterval)

          completedCorpora++
          toast.loading(`Building index for "${rubric.name}"...`, {
            id: toastId,
            description: `${completedCorpora} of ${totalCorpora} corpora indexed`,
          })
        }

        console.log("[v0] Rubric indexing completed successfully:", {
          rubricId: rubric.id,
          rubricName: rubric.name,
          corporaIndexed: totalCorpora,
        })

        toast.success(`Index complete for "${rubric.name}"`, {
          id: toastId,
          description: `${totalCorpora} ${totalCorpora === 1 ? "corpus" : "corpora"} indexed successfully`,
        })
      } catch (error) {
        console.error("[v0] Rubric indexing failed:", {
          rubricId: rubric.id,
          rubricName: rubric.name,
          error: error instanceof Error ? error.message : String(error),
        })

        toast.error(`Failed to build index for "${rubric.name}"`, {
          id: toastId,
          description: error instanceof Error ? error.message : "Unknown error occurred",
        })
        throw error
      } finally {
        setIndexingRubrics((prev) => {
          const next = new Set(prev)
          next.delete(rubric.id)
          return next
        })
        setIndexingProgress(null)
      }
    },
    [corpora, buildRubricIndex, onIndexCreated, indexingProgress],
  )

  const isIndexing = indexingRubrics.size > 0

  return {
    indexingRubrics,
    indexingProgress,
    isIndexing,
    indexRubric,
  }
}
