"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearch } from "@/lib/search-context"
import { Loader2, Search, History, BookOpen, Sparkles, BarChart, Github, Key } from "lucide-react"
import { SearchInterface } from "@/components/search-interface"
import { SearchHistory } from "@/components/search-history"
import { CorpusBrowser } from "@/components/corpus-browser"
import { RerankerTab } from "@/components/reranker-tab"
import { EvaluateSearch } from "@/components/evaluate-search"

export default function Home() {
  const { isLoadingDefault, corpora, activeCorpusId, indexingSteps } = useSearch()

  const activeCorpus = corpora.find((c) => c.id === activeCorpusId)

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-background to-secondary/30">
      {isLoadingDefault ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 container mx-auto px-6 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center max-w-2xl w-full">
            <p className="text-lg font-semibold text-foreground mb-4">Loading Simple Wikipedia corpus</p>
            <div className="space-y-2 text-left bg-card rounded-xl p-6 border border-border shadow-sm">
              {indexingSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {step.status === "in-progress" && <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5" />}
                  {step.status === "complete" && (
                    <svg
                      className="h-4 w-4 text-green-600 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {step.status === "error" && (
                    <svg className="h-4 w-4 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{step.step}</p>
                    {step.details && <p className="text-xs text-muted-foreground mt-0.5">{step.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeCorpus?.isIndexing ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 container mx-auto px-6 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Indexing {activeCorpus.name}</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we prepare your corpus...</p>
          </div>
        </div>
      ) : activeCorpus?.isReady ? (
        <Tabs defaultValue="search" className="flex flex-col h-screen">
          <nav className="border-b border-border bg-card/80 backdrop-blur-sm shadow-sm flex-shrink-0">
            <div className="w-full px-6 py-3 flex items-center justify-between">
              <TabsList className="bg-secondary/50 border border-border shadow-sm h-9">
                <TabsTrigger
                  value="search"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="browse"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Browse Corpus
                </TabsTrigger>
                <TabsTrigger
                  value="reranker"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Reranker
                </TabsTrigger>
                <TabsTrigger
                  value="evaluate"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
                >
                  <BarChart className="h-3.5 w-3.5" />
                  Evaluate Search
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/withpi/search-builder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <Github className="h-4 w-4" />
                  Github
                </a>
                <a
                  href="https://withpi.ai/account/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <Key className="h-4 w-4" />
                  Get API Key
                </a>
              </div>
            </div>
          </nav>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="search" className="mt-0 h-full overflow-y-auto">
              <div className="container mx-auto px-6 py-8 max-w-7xl">
                <div className="text-center mb-8">
                  <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">Search Builder</h1>
                  <p className="text-sm text-muted-foreground">Demo platform for search engine technologies</p>
                </div>
                <SearchInterface />
              </div>
            </TabsContent>
            <TabsContent value="history" className="mt-0 h-full overflow-hidden">
              <SearchHistory />
            </TabsContent>
            <TabsContent value="browse" className="mt-0 h-full overflow-y-auto">
              <div className="container mx-auto px-6 py-8 max-w-7xl">
                <CorpusBrowser />
              </div>
            </TabsContent>
            <TabsContent value="reranker" className="mt-0 h-full overflow-y-auto">
              <div className="container mx-auto px-6 py-8 max-w-7xl">
                <RerankerTab />
              </div>
            </TabsContent>
            <TabsContent value="evaluate" className="mt-0 h-full overflow-y-auto">
              <div className="container mx-auto px-6 py-8 max-w-7xl">
                <EvaluateSearch />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground container mx-auto px-6">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a corpus to begin searching</p>
        </div>
      )}
    </main>
  )
}
