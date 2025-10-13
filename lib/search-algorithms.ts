import { prepareText, cosineSimilarity } from "./search-utils"
import type { Document } from "./types"

/**
 * TF-IDF Vectorizer for semantic search
 * Converts documents into numerical vectors based on term frequency and inverse document frequency
 */
export class TFIDFVectorizer {
  private vocabulary: Map<string, number> = new Map()
  private idf: Map<string, number> = new Map()
  private documentCount = 0

  /**
   * Fits the vectorizer to a corpus of documents
   * Builds vocabulary and calculates IDF values
   */
  fit(documents: string[][]) {
    this.documentCount = documents.length
    const termDocumentCount = new Map<string, number>()

    // Build vocabulary and count document frequencies
    documents.forEach((doc) => {
      const uniqueTerms = new Set(doc)
      uniqueTerms.forEach((term) => {
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, this.vocabulary.size)
        }
        termDocumentCount.set(term, (termDocumentCount.get(term) || 0) + 1)
      })
    })

    // Calculate IDF for each term
    termDocumentCount.forEach((count, term) => {
      const idf = Math.log((this.documentCount + 1) / (count + 1)) + 1
      this.idf.set(term, idf)
    })
  }

  /**
   * Transforms a document into a TF-IDF vector
   */
  transform(document: string[]): number[] {
    const vector = new Array(this.vocabulary.size).fill(0)
    const termFreq = new Map<string, number>()

    // Calculate term frequencies
    document.forEach((term) => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1)
    })

    // Calculate TF-IDF for each term
    termFreq.forEach((freq, term) => {
      const idx = this.vocabulary.get(term)
      if (idx !== undefined) {
        const tf = freq / document.length
        const idf = this.idf.get(term) || 0
        vector[idx] = tf * idf
      }
    })

    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm > 0) {
      return vector.map((val) => val / norm)
    }
    return vector
  }

  getVocabularySize(): number {
    return this.vocabulary.size
  }
}

/**
 * Indexes documents using BM25 algorithm
 * @param documents Array of documents to index
 * @param onProgress Optional callback for progress updates
 */
export async function indexDocumentsWithBM25(
  documents: Document[],
  onProgress?: (current: number, total: number) => void,
) {
  const BM25 = (await import("wink-bm25-text-search")).default
  const engine = BM25()

  engine.defineConfig({
    fldWeights: { title: 2, text: 1 },
    ovFldNames: ["title", "text"],
  })

  engine.definePrepTasks([prepareText])

  const BATCH_SIZE = 100
  const totalDocs = documents.length

  for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, totalDocs)

    for (let j = i; j < batchEnd; j++) {
      const doc = documents[j]
      engine.addDoc(
        {
          title: doc.title || "",
          text: doc.text || "",
          id: doc.id,
          url: doc.url,
        },
        j,
      )
    }

    if (onProgress) {
      onProgress(batchEnd, totalDocs)
    }

    if (batchEnd < totalDocs) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  engine.consolidate()

  return engine
}

/**
 * Generates TF-IDF vectors for a corpus of documents
 * @param documents Array of documents to vectorize
 * @param onProgress Optional callback for progress updates
 */
export async function generateTFIDFVectors(
  documents: Document[],
  onProgress?: (step: string, current?: number, total?: number) => void,
): Promise<{ vectorizer: TFIDFVectorizer; vectors: number[][] }> {
  const BATCH_SIZE = 1000
  const processedDocs: string[][] = []

  onProgress?.("Tokenizing documents", 0, documents.length)

  // Tokenize all documents
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, documents.length)
    const batch: string[][] = []

    for (let j = i; j < batchEnd; j++) {
      const doc = documents[j]
      const text = `${doc.title || ""} ${doc.text || ""}`.trim()
      if (text) {
        batch.push(prepareText(text))
      } else {
        batch.push([])
      }
    }

    processedDocs.push(...batch)
    onProgress?.("Tokenizing documents", batchEnd, documents.length)

    if (batchEnd < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  onProgress?.("Building vocabulary")

  // Fit vectorizer
  const vectorizer = new TFIDFVectorizer()
  vectorizer.fit(processedDocs)

  await new Promise((resolve) => setTimeout(resolve, 0))

  onProgress?.("Generating vectors", 0, processedDocs.length)

  // Generate vectors
  const vectors: number[][] = []

  for (let i = 0; i < processedDocs.length; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, processedDocs.length)
    const batchVectors: number[][] = []

    for (let j = i; j < batchEnd; j++) {
      batchVectors.push(vectorizer.transform(processedDocs[j]))
      processedDocs[j] = [] // Clear processed doc to free memory
    }

    vectors.push(...batchVectors)
    onProgress?.("Generating vectors", batchEnd, processedDocs.length)

    if (batchEnd < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  processedDocs.length = 0 // Clear array

  return { vectorizer, vectors }
}

/**
 * Performs semantic search using TF-IDF vectors and cosine similarity
 */
export function performSemanticSearch(
  query: string,
  vectorizer: TFIDFVectorizer,
  vectors: number[][],
  documentIds: string[],
  limit: number,
): Array<{ id: string; score: number }> {
  const queryTokens = prepareText(query)
  const queryVector = vectorizer.transform(queryTokens)

  const similarities = vectors.map((docVector, idx) => ({
    id: documentIds[idx],
    score: cosineSimilarity(queryVector, docVector),
  }))

  return similarities.sort((a, b) => b.score - a.score).slice(0, limit)
}
