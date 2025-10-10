"use client"

import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { SearchResults } from "./search-results"
import { RetrievalTrace } from "./retrieval-trace"

export function SearchHistory() {
  const { searches, corpora } = useSearch()
  const { rubrics } = useRubric()
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null)

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* History List */}
      <div className="lg:col-span-1 flex flex-col h-full">
        <h2 className="text-lg font-semibold text-foreground mb-4">Search History</h2>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {searches.map((search) => {
              const corpus = corpora.find((c) => c.id === search.corpusId)
              const upvotes = search.results.filter((r) => r.rating === "up").length
              const downvotes = search.results.filter((r) => r.rating === "down").length
              const rubric = search.rubricId ? rubrics.find((r) => r.id === search.rubricId) : null
              const weight = search.trace?.rubricScoring?.weight

              return (
                <Card
                  key={search.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSearchId === search.id
                      ? "bg-accent border-primary shadow-md"
                      : "bg-card border-border hover:border-muted-foreground/50 hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedSearchId(search.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground leading-tight">
                      {search.query}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs font-medium border-border/60">
                        {corpus?.name || "Unknown"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-medium uppercase tracking-wide">
                        {search.searchMode}
                      </Badge>
                      {rubric && (
                        <Badge className="text-xs font-medium bg-blue-500 hover:bg-blue-600 gap-1">
                          <Sparkles className="h-3 w-3" />
                          {rubric.name}
                        </Badge>
                      )}
                    </div>
                    {weight !== undefined && (
                      <div className="text-xs text-muted-foreground mt-2 font-medium">
                        Weight: {Math.round((1 - weight) * 100)}% Retrieval • {Math.round(weight * 100)}% Rubric
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 font-medium">
                      {search.results.length} results
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{format(new Date(search.timestamp), "MMM d, h:mm a")}</span>
                      </span>
                      {(upvotes > 0 || downvotes > 0) && (
                        <div className="flex items-center gap-3">
                          {upvotes > 0 && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <ThumbsUp className="h-3.5 w-3.5 fill-green-600" />
                              {upvotes}
                            </span>
                          )}
                          {downvotes > 0 && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <ThumbsDown className="h-3.5 w-3.5 fill-red-600" />
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
      <div className="lg:col-span-2 h-full overflow-auto">
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

            <RetrievalTrace search={selectedSearch} corpora={corpora} />

            <SearchResults results={selectedSearch.results} searchId={selectedSearch.id} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
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
