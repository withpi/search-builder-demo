"use client"

import { useSearch } from "@/lib/search-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import { useState } from "react"
import { CorpusUploadDialog } from "./corpus-upload-dialog"

export function CorpusSelector() {
  const { corpora, activeCorpusId, setActiveCorpus } = useSearch()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const activeCorpus = corpora.find((c) => c.id === activeCorpusId)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Select value={activeCorpusId || undefined} onValueChange={setActiveCorpus}>
          <SelectTrigger className="w-full bg-background border-border h-12 shadow-sm hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Select a corpus" />
          </SelectTrigger>
          <SelectContent>
            {corpora.map((corpus) => (
              <SelectItem key={corpus.id} value={corpus.id} disabled={corpus.isIndexing}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{corpus.name}</span>
                  {corpus.isIndexing && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {corpus.isReady && (
                    <span className="text-xs text-muted-foreground">({corpus.documents.length} docs)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setUploadDialogOpen(true)}
        className="border-border h-12 w-12 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <CorpusUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </div>
  )
}
