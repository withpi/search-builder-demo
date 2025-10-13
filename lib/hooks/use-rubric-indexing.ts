"use client"

import { useState, useCallback } from "react"
import { toast, type Id } from "react-toastify"
import type { Rubric, Corpus, RubricIndex } from "@/lib/types"
import { scoreResult } from "@/app/actions/score-results"

interface UseRubricIndexingProps {
  corpora: Corpus[]
  onIndexCreated: (index: RubricIndex) => void
}

const CONCURRENCY_LIMIT = 20
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 100

export function useRubricIndexing({ corpora, onIndexCreated }: UseRubricIndexingProps) {
  const [indexingRubrics, setIndexingRubrics] = useState<Set<string>>(new Set())
  const [indexingProgress, setIndexingProgress] = useState<{
    current: number
    total: number
    corpusName: string
  } | null>(null)

  const scoreDocumentWithRetry = async (
    doc: { id: string; text: string },
    criteria: Rubric["criteria"],
    attempt = 1,
  ): Promise<{ docId: string; totalScore: number; questionScores: Array<{ label: string; score: number }> }> => {
    try {
      if (!doc.text || doc.text.trim() === "") {
        console.warn("[v0] Skipping document with empty text:", { docId: doc.id })
        return { docId: doc.id, totalScore: 0, questionScores: [] }
      }

      const response = await scoreResult({
        query: "",
        text: doc.text,
        criteria,
      })

      return {
        docId: doc.id,
        totalScore: response.error ? 0 : (response.total_score ?? 0),
        questionScores: response.question_scores || [],
      }
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
        console.log(`[v0] Retry attempt ${attempt} for document ${doc.id} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return scoreDocumentWithRetry(doc, criteria, attempt + 1)
      }

      console.error(`[v0] Failed to score document ${doc.id} after ${MAX_RETRIES} attempts:`, error)
      return { docId: doc.id, totalScore: 0, questionScores: [] }
    }
  }

  const processConcurrentTasks = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress: (completed: number, total: number) => void,
  ): Promise<R[]> => {
    const results: R[] = []
    let completed = 0
    const total = items.length

    const executeTask = async (item: T): Promise<R> => {
      const result = await processor(item)
      completed++
      onProgress(completed, total)
      return result
    }

    for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
      const batch = items.slice(i, i + CONCURRENCY_LIMIT)
      const batchResults = await Promise.all(batch.map(executeTask))
      results.push(...batchResults)
    }

    return results
  }

  const buildRubricIndex = useCallback(async (rubric: Rubric, corpus: Corpus, toastId: Id): Promise<RubricIndex> => {
    console.log("[v0] Building rubric index:", {
      rubricId: rubric.id,
      rubricName: rubric.name,
      corpusId: corpus.id,
      corpusName: corpus.name,
      totalDocuments: corpus.documents.length,
    })

    const scores = new Map<string, { totalScore: number; questionScores: Array<{ label: string; score: number }> }>()

    const totalDocs = corpus.documents.length

    const results = await processConcurrentTasks(
      corpus.documents,
      (doc) => scoreDocumentWithRetry(doc, rubric.criteria),
      (completed, total) => {
        const progress = completed / total
        toast.update(toastId, {
          render: `Building index for "${rubric.name}"... ${completed}/${total} documents indexed in ${corpus.name}`,
          progress,
        })

        setIndexingProgress({
          current: completed,
          total,
          corpusName: corpus.name,
        })
      },
    )

    results.forEach((result) => {
      scores.set(result.docId, {
        totalScore: result.totalScore,
        questionScores: result.questionScores,
      })
      console.log("[v0] Stored scores for document:", {
        docId: result.docId,
        totalScore: result.totalScore,
        questionScoresCount: result.questionScores.length,
      })
    })

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
        progress: 0,
      })

      try {
        let completedCorpora = 0

        for (const corpus of readyCorpora) {
          const index = await buildRubricIndex(rubric, corpus, toastId)
          onIndexCreated(index)

          completedCorpora++
          toast.update(toastId, {
            render: `Building index for "${rubric.name}"... ${completedCorpora} of ${totalCorpora} corpora indexed`,
            progress: completedCorpora / totalCorpora,
          })
        }

        console.log("[v0] Rubric indexing completed successfully:", {
          rubricId: rubric.id,
          rubricName: rubric.name,
          corporaIndexed: totalCorpora,
        })

        const totalDocs = readyCorpora.reduce((sum, c) => sum + c.documents.length, 0)
        toast.update(toastId, {
          render: `✓ Indexing complete! (${totalDocs}/${totalDocs})`,
          type: "success",
          isLoading: false,
          autoClose: 5000,
        })
      } catch (error) {
        console.error("[v0] Rubric indexing failed:", {
          rubricId: rubric.id,
          rubricName: rubric.name,
          error: error instanceof Error ? error.message : String(error),
        })

        toast.update(toastId, {
          render: `Failed to build index for "${rubric.name}"`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
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
    [corpora, buildRubricIndex, onIndexCreated],
  )

  const isIndexing = indexingRubrics.size > 0

  return {
    indexingRubrics,
    indexingProgress,
    isIndexing,
    indexRubric,
  }
}
