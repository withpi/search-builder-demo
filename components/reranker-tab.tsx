"use client"

import { useSearch } from "@/lib/search-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RubricEditor } from "./rubric-editor"
import { Clock, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"

export function RerankerTab() {
  const { searches, corpora } = useSearch()
  const [selectedSearchIds, setSelectedSearchIds] = useState<Set<string>>(new Set())

  const toggleSearchSelection = (searchId: string) => {
    setSelectedSearchIds((prev) => {
      const next = new Set(prev)
      if (next.has(searchId)) {
        next.delete(searchId)
      } else {
        next.add(searchId)
      }
      return next
    })
  }

  const handleGenerateRubric = () => {
    console.log("[v0] Generate rubric from searches:", Array.from(selectedSearchIds))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Reranker</h2>
        <p className="text-sm text-muted-foreground">
          Train a Pi rubric to capture your preferences and rerank search results
        </p>
      </div>

      {/* Rubric Editor Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Current Rubric</CardTitle>
        </CardHeader>
        <CardContent>
          <RubricEditor />
        </CardContent>
      </Card>

      {/* Training Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">Training Data</CardTitle>
            <Button
              onClick={handleGenerateRubric}
              disabled={selectedSearchIds.size === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Rubric
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Select searches to use as training data for rubric generation
          </p>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-8 mb-6 text-center">
            <p className="text-muted-foreground">Rubric Generator</p>
            <p className="text-xs text-muted-foreground mt-1">Component will be added here</p>
          </div>

          {searches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No searches yet</p>
              <p className="text-sm mt-2">Perform some searches and rate results to generate training data</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {searches.map((search) => {
                  const corpus = corpora.find((c) => c.id === search.corpusId)
                  const ratedCount = search.results.filter((r) => r.rating).length
                  const isSelected = selectedSearchIds.has(search.id)

                  return (
                    <Card
                      key={search.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-accent border-accent-foreground/20"
                          : "bg-card border-border hover:border-muted-foreground/50"
                      }`}
                      onClick={() => toggleSearchSelection(search.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSearchSelection(search.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium text-foreground line-clamp-1">
                              {search.query}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {corpus?.name || "Unknown"}
                              </Badge>
                              <Badge variant="secondary" className="text-xs uppercase">
                                {search.searchMode}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{search.results.length} results</span>
                              {ratedCount > 0 && (
                                <Badge variant="default" className="text-xs bg-green-500">
                                  {ratedCount} rated
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 pl-11">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(search.timestamp), "MMM d, h:mm a")}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
