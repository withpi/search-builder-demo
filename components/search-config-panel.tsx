"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CorpusSelector } from "@/components/corpus-selector"
import { SearchModeSelector } from "@/components/search-mode-selector"
import { RubricSelector } from "@/components/rubric-selector"
import { useSearch } from "@/lib/search-context"

interface ConfigSection {
  id: string
  title: string
  defaultOpen?: boolean
}

const sections: ConfigSection[] = [
  { id: "index", title: "Index", defaultOpen: true },
  { id: "query-understanding", title: "Query Understanding", defaultOpen: false },
  { id: "retrieval", title: "Retrieval", defaultOpen: false },
  { id: "scoring-reranking", title: "Scoring and Reranking", defaultOpen: false },
]

export function SearchConfigPanel() {
  const {
    searchMode,
    setSearchMode,
    rubrics,
    activeRubricId,
    setActiveRubric,
    activeCorpusId,
    corpora,
  } = useSearch()
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    index: true,
    "query-understanding": true,
    retrieval: true,
    "scoring-reranking": true,
  })

  const activeCorpus = corpora.find((c) => c.id === activeCorpusId)

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <Card className="h-fit sticky top-4 border border-border shadow-md">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configuration</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure search parameters</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Download className="h-3.5 w-3.5" />
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
      
      <div className="divide-y divide-border">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={openSections[section.id]}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-foreground">{section.title}</span>
                {openSections[section.id] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 py-3 bg-muted/20">
                {section.id === "index" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Corpus</label>
                    <CorpusSelector />
                  </div>
                ) : section.id === "retrieval" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Search Mode</label>
                    <SearchModeSelector
                      value={searchMode}
                      onChange={setSearchMode}
                      disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                    />
                  </div>
                ) : section.id === "query-understanding" ? (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" disabled className="w-full cursor-not-allowed">
                      Add Pi Fanout Model
                      <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                    </Button>
                    <Button variant="outline" size="sm" disabled className="w-full cursor-not-allowed">
                      Add Pi Intent Classifier
                      <span className="ml-2 text-xs text-muted-foreground">(coming soon)</span>
                    </Button>
                  </div>
                ) : section.id === "scoring-reranking" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-foreground">Pi Scorer</h3>
                      <div className="space-y-2">
                        <RubricSelector
                          rubrics={rubrics}
                          value={activeRubricId}
                          onChange={setActiveRubric}
                          disabled={!activeCorpus?.isReady || activeCorpus?.isIndexing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-foreground">Pi Reranker (Coming Soon)</h3>
                      <p className="text-xs text-muted-foreground italic">
                        Coming soon: use your feedback data to train Pi's Reranking Model
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Configuration options will appear here
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Card>
  )
}

