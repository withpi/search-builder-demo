"use client"

import { useSearch } from "@/lib/search-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { SearchResults } from "./search-results"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function SearchHistory() {
  const { searches, corpora } = useSearch()
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null)
  const [traceOpen, setTraceOpen] = useState(false)

  const selectedSearch = searches.find((s) => s.id === selectedSearchId)

  if (searches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No search history yet</p>
        <p className="text-sm mt-2">Your searches will appear here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* History List */}
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold text-foreground mb-4">Search History</h2>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {searches.map((search) => {
              const corpus = corpora.find((c) => c.id === search.corpusId)
              const upvotes = search.results.filter((r) => r.rating === "up").length
              const downvotes = search.results.filter((r) => r.rating === "down").length

              return (
                <Card
                  key={search.id}
                  className={`cursor-pointer transition-colors ${
                    selectedSearchId === search.id
                      ? "bg-accent border-accent-foreground/20"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSelectedSearchId(search.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-foreground line-clamp-1">{search.query}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {corpus?.name || "Unknown"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {search.searchMode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{search.results.length} results</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(search.timestamp), "MMM d, h:mm a")}
                      </span>
                      {(upvotes > 0 || downvotes > 0) && (
                        <div className="flex items-center gap-2">
                          {upvotes > 0 && (
                            <span className="flex items-center gap-1 text-green-500">
                              <ThumbsUp className="h-3 w-3" />
                              {upvotes}
                            </span>
                          )}
                          {downvotes > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <ThumbsDown className="h-3 w-3" />
                              {downvotes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Search Details */}
      <div className="lg:col-span-2">
        {selectedSearch ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedSearch.query}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(selectedSearch.timestamp), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedSearchId(null)} className="border-border">
                Close
              </Button>
            </div>

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
                        {selectedSearch.trace.mode}
                      </Badge>
                    </div>

                    {selectedSearch.trace.keywordResults && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Keyword (BM25) Results (Top 10)</h4>
                        <div className="space-y-1 text-xs">
                          {selectedSearch.trace.keywordResults.map((result) => {
                            const doc = corpora
                              .find((c) => c.id === selectedSearch.corpusId)
                              ?.documents.find((d) => d.id === result.id)
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between py-1 border-b border-border/50"
                              >
                                <span className="text-muted-foreground">
                                  #{result.rank} {doc?.title || doc?.id}
                                </span>
                                <span className="font-mono text-foreground">{result.score.toFixed(4)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedSearch.trace.semanticResults && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Semantic (TF-IDF) Results (Top 10)
                        </h4>
                        <div className="space-y-1 text-xs">
                          {selectedSearch.trace.semanticResults.map((result) => {
                            const doc = corpora
                              .find((c) => c.id === selectedSearch.corpusId)
                              ?.documents.find((d) => d.id === result.id)
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between py-1 border-b border-border/50"
                              >
                                <span className="text-muted-foreground">
                                  #{result.rank} {doc?.title || doc?.id}
                                </span>
                                <span className="font-mono text-foreground">{result.score.toFixed(4)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedSearch.trace.hybridResults && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Hybrid (RRF) Results (k={selectedSearch.trace.rrfK})
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          Combined using Reciprocal Rank Fusion: RRF_score = sum(1 / (k + rank))
                        </p>
                        <div className="space-y-1 text-xs">
                          {selectedSearch.trace.hybridResults.map((result) => {
                            const doc = corpora
                              .find((c) => c.id === selectedSearch.corpusId)
                              ?.documents.find((d) => d.id === result.id)
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between py-1 border-b border-border/50"
                              >
                                <span className="text-muted-foreground">
                                  #{result.rank} {doc?.title || doc?.id}
                                </span>
                                <span className="font-mono text-foreground">{result.score.toFixed(4)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <SearchResults results={selectedSearch.results} searchId={selectedSearch.id} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Select a search to view details</p>
              <p className="text-sm mt-2">Click on any search from the history</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
