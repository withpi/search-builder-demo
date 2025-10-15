"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CorpusSelector } from "@/components/corpus-selector"
import { RubricSelector } from "@/components/rubric-selector"
import { Slider } from "@/components/ui/slider"
import { useSearch } from "@/lib/search-context"
import { useRubric } from "@/lib/rubric-context"

interface ConfigSection {
  id: string
  title: string
  defaultOpen?: boolean
}

const sections: ConfigSection[] = [
  { id: "index", title: "Index", defaultOpen: true },
  { id: "scoring-reranking", title: "Scoring and Reranking", defaultOpen: false },
  { id: "query-understanding", title: "Query Understanding", defaultOpen: false },
]

export function SearchConfigPanel() {
  const { activeCorpusId, corpora, scoringWeight, setScoringWeight } = useSearch()
  const { rubrics, activeRubricId, setActiveRubric } = useRubric()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    index: true,
    "query-understanding": true,
    "scoring-reranking": true,
  })

  const activeCorpus = corpora.find((c) => c.id === activeCorpusId)

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const retrievalPercent = Math.round((1 - scoringWeight) * 100)
  const rubricPercent = Math.round(scoringWeight * 100)

  return (
    <Card className="h-fit p-0 overflow-hidden border shadow-sm gap-0">
      <div className="px-6 pt-6 pb-3 border-b bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Configuration</h2>
            <p className="text-sm text-muted-foreground">Configure search parameters</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="cursor-not-allowed">
                <span>Export as MCP</span>
                <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="cursor-not-allowed">
                <span>Export as API</span>
                <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="divide-y">
        {sections.map((section) => (
          <Collapsible key={section.id} open={openSections[section.id]} onOpenChange={() => toggleSection(section.id)}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                <span className="text-base font-semibold">{section.title}</span>
                {openSections[section.id] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 pt-2">
                {section.id === "index" ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Upload your Data</h3>
                    <CorpusSelector />
                    <label className="text-sm font-medium">Link your Database (coming soon)</label>
                  </div>
                ) : section.id === "scoring-reranking" ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Pi Scorer</h3>
                      <RubricSelector
                        rubrics={rubrics}
                        value={activeRubricId}
                        onChange={setActiveRubric}
                        disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                      />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Score Fusion</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Retrieval</span>
                          <span>Rubric</span>
                        </div>
                        <Slider
                          value={[scoringWeight * 100]}
                          onValueChange={(values) => setScoringWeight(values[0] / 100)}
                          min={0}
                          max={100}
                          step={5}
                          disabled={!activeRubricId}
                          className="w-full"
                        />
                        <div className="flex items-center justify-center text-xs font-medium">
                          <span className="text-muted-foreground">
                            {retrievalPercent}% Retrieval • {rubricPercent}% Rubric
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">
                        Pi Reranker <span className="text-muted-foreground font-normal">(Coming Soon)</span>
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Coming soon: use your feedback data to train Pi's Reranking Model
                      </p>
                    </div>
                  </div>
                ) : section.id === "query-understanding" ? (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full justify-between opacity-60 bg-transparent"
                    >
                      <span>Add Pi Fanout Model</span>
                      <span className="text-xs text-muted-foreground">(coming soon)</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full justify-between opacity-60 bg-transparent"
                    >
                      <span>Add Pi Intent Classifier</span>
                      <span className="text-xs text-muted-foreground">(coming soon)</span>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Configuration options will appear here</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Card>
  )
}
