"use client"

import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RubricEditor } from "./rubric-editor"
import { RubricGenerator } from "@/components/rubric/scorer_generator"
import type { RubricExample } from "@/lib/rubric/rubricActions"
import type PiClient from "withpi"
import { Clock } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { formatNumber } from "@/lib/utils"

export function RerankerTab() {
  const { searches, corpora, ratedResults } = useSearch()
  const { addRubric, rubrics } = useRubric()
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

  // Results that were manually moved up (lower rank number) are treated as better
  // Results that were manually moved down (higher rank number) are treated as worse
  const manuallyRankedResults = validRatedResults.filter(
    (r) => r.manualRank !== undefined && r.originalRank !== undefined && r.manualRank !== r.originalRank,
  )

  const manuallyImprovedResults = manuallyRankedResults.filter((r) => r.manualRank! < r.originalRank!)
  const manuallyDegradedResults = manuallyRankedResults.filter((r) => r.manualRank! > r.originalRank!)

  const goodExamples: RubricExample[] = [
    // Thumbs up results
    ...validRatedResults
      .filter((r) => r.rating === "up")
      .map((r) => ({
        llm_input: String(r.query),
        llm_output: String(r.text),
      })),
    // Manually moved up results
    ...manuallyImprovedResults.map((r) => ({
      llm_input: String(r.query),
      llm_output: String(r.text),
    })),
  ]

  const badExamples: RubricExample[] = [
    // Thumbs down results
    ...validRatedResults
      .filter((r) => r.rating === "down")
      .map((r) => ({
        llm_input: String(r.query),
        llm_output: String(r.text),
      })),
    // Manually moved down results
    ...manuallyDegradedResults.map((r) => ({
      llm_input: String(r.query),
      llm_output: String(r.text),
    })),
  ]

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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Rubrics ({rubrics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rubrics.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No rubrics yet. Create your first rubric using the editor below.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rubrics.map((rubric) => (
                <Card key={rubric.id} className="p-4 bg-muted/50 hover:bg-muted transition-colors">
                  <div className="font-medium text-sm truncate">{rubric.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{rubric.criteria.length} criteria</div>
                  <div className="text-xs text-muted-foreground">{rubric.createdAt.toLocaleDateString()}</div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-0">
              <RubricEditor />
            </TabsContent>

            <TabsContent value="generate" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Training Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Select searches to use as training data for rubric generation
                  </p>
                  {manuallyRankedResults.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Including {manuallyImprovedResults.length} manually promoted and {manuallyDegradedResults.length}{" "}
                      manually demoted results
                    </p>
                  )}
                </div>

                {validRatedResults.length > 0 || manuallyRankedResults.length > 0 ? (
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
                      Select searches with rated results or manual rankings to generate a rubric
                    </p>
                  </div>
                )}

                {searches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No searches yet</p>
                    <p className="text-sm mt-2">
                      Perform some searches and rate results or manually rerank them to generate training data
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {searches.map((search) => {
                        const corpus = corpora.find((c) => c.id === search.corpusId)
                        const ratedCount = search.results.filter((r) => r.rating).length
                        const manuallyRankedCount = search.results.filter(
                          (r) =>
                            r.manualRank !== undefined &&
                            r.originalRank !== undefined &&
                            r.manualRank !== r.originalRank,
                        ).length
                        const feedbackCount = search.results.filter(
                          (r) => r.rating && r.feedback && r.feedback.trim().length > 0,
                        ).length
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
                                    <span className="text-xs text-muted-foreground">
                                      {formatNumber(search.results.length)} results
                                    </span>
                                    {ratedCount > 0 && (
                                      <Badge variant="default" className="text-xs bg-green-500">
                                        {ratedCount} rated
                                      </Badge>
                                    )}
                                    {manuallyRankedCount > 0 && (
                                      <Badge variant="default" className="text-xs bg-orange-500">
                                        {manuallyRankedCount} reranked
                                      </Badge>
                                    )}
                                    {feedbackCount > 0 && (
                                      <Badge variant="default" className="text-xs bg-blue-500">
                                        {feedbackCount} with feedback
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
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
