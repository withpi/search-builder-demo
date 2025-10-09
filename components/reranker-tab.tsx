"use client"

import { useSearch } from "@/lib/search-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RubricEditor } from "./rubric-editor"
import { RubricGenerator } from "@/components/rubric/scorer_generator"
import type { RubricExample } from "@/lib/rubric/rubricActions"
import type PiClient from "withpi"
import { Clock } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"

export function RerankerTab() {
  const { searches, corpora, ratedResults, addRubric } = useSearch()
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

  const selectedRatedResults = ratedResults.filter((r) => selectedSearchIds.has(r.searchId))

  const validRatedResults = selectedRatedResults.filter((r) => {
    return r && r.query && r.text && typeof r.query === "string" && typeof r.text === "string"
  })

  const goodExamples: RubricExample[] = validRatedResults
    .filter((r) => r.rating === "up")
    .map((r) => ({
      llm_input: String(r.query),
      llm_output: String(r.text),
    }))

  const badExamples: RubricExample[] = validRatedResults
    .filter((r) => r.rating === "down")
    .map((r) => ({
      llm_input: String(r.query),
      llm_output: String(r.text),
    }))

  const systemPrompt = "Search result relevance evaluator"

  const handleApplyGeneratedRubric = async (dimensions: PiClient.Question[]) => {
    const newRubric = {
      id: `rubric-${Date.now()}`,
      name: `Generated Rubric ${new Date().toLocaleDateString()}`,
      criteria: dimensions.map((d) => ({
        label: d.label || "Criterion",
        question: d.question,
      })),
      createdAt: new Date(),
      trainingCount: validRatedResults.length,
    }

    addRubric(newRubric)
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
          <CardTitle className="text-lg font-semibold text-foreground">Training Data</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select searches to use as training data for rubric generation
          </p>
        </CardHeader>
        <CardContent>
          {validRatedResults.length > 0 ? (
            <div className="mb-6">
              <RubricGenerator
                systemPrompt={systemPrompt}
                goodExamples={goodExamples}
                badExamples={badExamples}
                applyRubric={handleApplyGeneratedRubric}
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 mb-6 text-center">
              <p className="text-muted-foreground">Rubric Generator</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select searches with rated results to generate a rubric
              </p>
            </div>
          )}

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
