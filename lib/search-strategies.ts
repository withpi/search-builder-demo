import type { Document, SearchMode } from "./types"
import type { Orama, Results } from "@orama/orama"

export interface SearchStrategy {
  execute(
    query: string,
    limit: number,
    corpus: { id: string; documents: Document[] },
    oramaDb: Orama<any>,
  ): Promise<{
    results: Array<{ id: string; score: number }>
    trace: any
  }>
}

export class KeywordSearchStrategy implements SearchStrategy {
  async execute(query: string, limit: number, corpus: { id: string; documents: Document[] }, oramaDb: Orama<any>) {
    const { search } = await import("@orama/orama")

    const searchResults: Results<any> = await search(oramaDb, {
      term: query,
      limit,
      mode: "fulltext",
    })

    const keywordFormatted = searchResults.hits.map((hit: any) => ({
      id: hit.document.id,
      score: hit.score,
    }))

    const trace = {
      mode: "keyword" as const,
      keywordResults: keywordFormatted.slice(0, 10).map((r: any, idx: number) => ({
        ...r,
        rank: idx + 1,
      })),
    }

    return {
      results: keywordFormatted,
      trace,
    }
  }
}

// Orama's vector and hybrid modes need embedding generation which requires external APIs
// For simplicity and memory efficiency, we only use BM25 fulltext search

export class SearchStrategyFactory {
  static getStrategy(mode: SearchMode): SearchStrategy {
    return new KeywordSearchStrategy()
  }
}
