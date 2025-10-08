"use client"

import type React from "react"

import { useState } from "react"
import { useSearch } from "@/lib/search-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText } from "lucide-react"
import type { Document } from "@/lib/types"

interface CorpusUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CorpusUploadDialog({ open, onOpenChange }: CorpusUploadDialogProps) {
  const { addCorpus } = useSearch()
  const [corpusName, setCorpusName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!corpusName) {
        setCorpusName(selectedFile.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !corpusName) return

    setIsUploading(true)
    try {
      const text = await file.text()
      const documents: Document[] = []

      // Parse JSON or JSONL format
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          data.forEach((item, idx) => {
            documents.push({
              id: item.id || `doc-${idx}`,
              text: item.text || "",
              title: item.title,
              url: item.url,
            })
          })
        }
      } else if (file.name.endsWith(".jsonl")) {
        const lines = text.split("\n").filter((line) => line.trim())
        lines.forEach((line, idx) => {
          try {
            const item = JSON.parse(line)
            documents.push({
              id: item.id || `doc-${idx}`,
              text: item.text || "",
              title: item.title,
              url: item.url,
            })
          } catch (e) {
            console.error("Error parsing line:", e)
          }
        })
      } else if (file.name.endsWith(".txt")) {
        // Split by double newlines for simple text files
        const chunks = text.split("\n\n").filter((chunk) => chunk.trim())
        chunks.forEach((chunk, idx) => {
          documents.push({
            id: `doc-${idx}`,
            text: chunk.trim(),
          })
        })
      }

      if (documents.length === 0) {
        alert("No valid documents found in file")
        return
      }

      await addCorpus(corpusName, documents)
      onOpenChange(false)
      setCorpusName("")
      setFile(null)
    } catch (error) {
      console.error("Error uploading corpus:", error)
      alert("Error uploading corpus. Please check the file format.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Custom Corpus</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a JSON, JSONL, or TXT file containing your documents. Each document should have an id and text field.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="corpus-name" className="text-foreground">
              Corpus Name
            </Label>
            <Input
              id="corpus-name"
              value={corpusName}
              onChange={(e) => setCorpusName(e.target.value)}
              placeholder="My Custom Corpus"
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file-upload" className="text-foreground">
              File
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".json,.jsonl,.txt"
                onChange={handleFileChange}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>JSON: Array of objects with id, text, title (optional), url (optional)</li>
              <li>JSONL: One JSON object per line</li>
              <li>TXT: Plain text split by double newlines</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !corpusName || isUploading}
            className="bg-primary text-primary-foreground"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
