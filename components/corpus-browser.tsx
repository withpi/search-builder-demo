"use client"

import { useState, useMemo, memo } from "react"
import { useSearch } from "@/lib/search-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ExpandableTextCard } from "./expandable-text-card"
import { EmptyState } from "./empty-state"
import { PAGINATION } from "@/lib/constants"
import { formatNumber } from "@/lib/utils"

export const CorpusBrowser = memo(function CorpusBrowser() {
  const { corpora, activeCorpusId } = useSearch()
  const [currentPage, setCurrentPage] = useState(1)

  const activeCorpus = useMemo(() => corpora.find((c) => c.id === activeCorpusId), [corpora, activeCorpusId])

  const { totalDocuments, totalPages, startIndex, endIndex, currentDocuments } = useMemo(() => {
    if (!activeCorpus) {
      return { totalDocuments: 0, totalPages: 0, startIndex: 0, endIndex: 0, currentDocuments: [] }
    }

    const total = activeCorpus.documents.length
    const pages = Math.ceil(total / PAGINATION.CORPUS_BROWSER_ITEMS_PER_PAGE)
    const start = (currentPage - 1) * PAGINATION.CORPUS_BROWSER_ITEMS_PER_PAGE
    const end = Math.min(start + PAGINATION.CORPUS_BROWSER_ITEMS_PER_PAGE, total)
    const docs = activeCorpus.documents.slice(start, end)

    return {
      totalDocuments: total,
      totalPages: pages,
      startIndex: start,
      endIndex: end,
      currentDocuments: docs,
    }
  }, [activeCorpus, currentPage])

  if (!activeCorpus) {
    return <EmptyState icon={Database} title="No corpus selected" />
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Browse Corpus</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {startIndex + 1}-{endIndex} of {formatNumber(totalDocuments)} documents
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {activeCorpus.name}
        </Badge>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {currentDocuments.map((doc) => (
          <Card key={doc.id} className="p-6 bg-card border-border hover:border-muted-foreground/50 transition-colors">
            <div className="flex flex-col gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {doc.title && (
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {doc.title}
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Open ${doc.title} in new tab`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </h3>
                  )}
                </div>
                <ExpandableTextCard text={doc.text} id={doc.id} />
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">ID: {doc.id}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-1"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {currentPage > 3 && (
              <>
                <Button variant={currentPage === 1 ? "default" : "outline"} size="sm" onClick={() => goToPage(1)}>
                  1
                </Button>
                {currentPage > 4 && <span className="px-2 text-muted-foreground">...</span>}
              </>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page >= currentPage - 2 && page <= currentPage + 2)
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </Button>
              ))}

            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2 text-muted-foreground">...</span>}
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="gap-1"
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
})
