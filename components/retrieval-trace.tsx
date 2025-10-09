"use client"

import type { Search } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface RetrievalTraceProps {
  search: Search
  corpora: Array<{ id: string; documents: Array<{ id: string; title?: string }> }>
}

export function RetrievalTrace({ search, corpora }: RetrievalTraceProps) {
  const [traceOpen, setTraceOpen] = useState(false)

  return (
    <Collapsible open={traceOpen} onOpenChange={setTraceOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Retrieval Trace</CardTitle>
              {traceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="secondary" className="uppercase">
                {search.trace.mode}
              </Badge>
            </div>

            {search.trace.keywordResults && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Keyword (BM25) Results (Top 10)</h4>
                <div className="space-y-1 text-xs">
                  {search.trace.keywordResults.map((result) => {
                    const doc = corpora.find((c) => c.id === search.corpusId)?.documents.find((d) => d.id === result.id)
                    return (
                      <div key={result.id} className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">
                          #{result.rank} {doc?.title || doc?.id}
                        </span>
                        <span className="font-mono text-foreground">{(result.score ?? 0).toFixed(4)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {search.trace.semanticResults && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Semantic (TF-IDF) Results (Top 10)</h4>
                <div className="space-y-1 text-xs">
                  {search.trace.semanticResults.map((result) => {
                    const doc = corpora.find((c) => c.id === search.corpusId)?.documents.find((d) => d.id === result.id)
                    return (
                      <div key={result.id} className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">
                          #{result.rank} {doc?.title || doc?.id}
                        </span>
                        <span className="font-mono text-foreground">{(result.score ?? 0).toFixed(4)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {search.trace.hybridResults && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Hybrid (RRF) Results (k={search.trace.rrfK})
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Combined using Reciprocal Rank Fusion: RRF_score = sum(1 / (k + rank))
                </p>
                <div className="space-y-1 text-xs">
                  {search.trace.hybridResults.map((result) => {
                    const doc = corpora.find((c) => c.id === search.corpusId)?.documents.find((d) => d.id === result.id)
                    return (
                      <div key={result.id} className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">
                          #{result.rank} {doc?.title || doc?.id}
                        </span>
                        <span className="font-mono text-foreground">{(result.score ?? 0).toFixed(4)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {search.trace.rubricScoring && (
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Rubric Scoring</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Rubric Used:</span>
                    <span className="font-medium text-foreground">{search.trace.rubricScoring.rubricName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Criteria Count:</span>
                    <span className="font-medium text-foreground">{search.trace.rubricScoring.criteriaCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Scoring Method:</span>
                    <span className="font-medium text-foreground capitalize">
                      {search.trace.rubricScoring.scoringMethod}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Results Scored:</span>
                    <span className="font-medium text-foreground">{search.trace.rubricScoring.resultsScored}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Score Weighting:</span>
                    <span className="font-medium text-foreground">
                      Retrieval: {Math.round((1 - search.trace.rubricScoring.weight) * 100)}% • Rubric:{" "}
                      {Math.round(search.trace.rubricScoring.weight * 100)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h5 className="text-xs font-semibold text-foreground mb-2">All Rubric Scores</h5>
                  <div className="space-y-1 text-xs max-h-[300px] overflow-y-auto">
                    {search.results
                      .filter((r) => r.piScore !== undefined)
                      .sort((a, b) => (b.piScore || 0) - (a.piScore || 0))
                      .map((result, index) => {
                        const doc = corpora
                          .find((c) => c.id === search.corpusId)
                          ?.documents.find((d) => d.id === result.id)
                        return (
                          <div
                            key={result.id}
                            className="flex items-center justify-between py-1 border-b border-border/50"
                          >
                            <span className="text-muted-foreground">
                              #{index + 1} {doc?.title || doc?.id}
                            </span>
                            <span className="font-mono text-foreground">{(result.piScore ?? 0).toFixed(4)}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>

                <div className="mt-3">
                  <h5 className="text-xs font-semibold text-foreground mb-2">Top 5 Combined Results</h5>
                  <p className="text-xs text-muted-foreground mb-2">
                    Combined Score = {(1 - search.trace.rubricScoring.weight).toFixed(2)} × Retrieval Score +{" "}
                    {search.trace.rubricScoring.weight.toFixed(2)} × Rubric Score
                  </p>
                  <div className="space-y-1 text-xs">
                    {search.trace.rubricScoring.topResults.map((result) => {
                      const doc = corpora
                        .find((c) => c.id === search.corpusId)
                        ?.documents.find((d) => d.id === result.id)
                      return (
                        <div key={result.id} className="py-2 border-b border-border/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              #{result.rank} {doc?.title || doc?.id}
                            </span>
                            <span className="font-mono text-foreground font-semibold">
                              {(result.combinedScore ?? 0).toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-4">
                            <span>Retrieval: {(result.retrievalScore ?? 0).toFixed(4)}</span>
                            <span>Rubric: {(result.rubricScore ?? 0).toFixed(4)}</span>
                          </div>
                          {result.questionScores && result.questionScores.length > 0 && (
                            <div className="pl-4 mt-2 space-y-1">
                              <div className="text-[10px] font-semibold text-muted-foreground">Question Scores:</div>
                              {result.questionScores.map((qs) => (
                                <div
                                  key={qs.label}
                                  className="flex items-center justify-between text-[10px] text-muted-foreground"
                                >
                                  <span>{qs.label}:</span>
                                  <span className="font-mono">{qs.score.toFixed(4)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
