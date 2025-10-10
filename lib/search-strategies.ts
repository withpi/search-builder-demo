import type { Document, SearchMode } from "./types"
import type { TFIDFVectorizer } from "./search-algorithms"
import { performSemanticSearch } from "./search-algorithms"
import { reciprocalRankFusion } from "./search-utils"

export interface SearchStrategy {
  execute(
    query: string,
    limit: number,
    corpus: { id: string; documents: Document[] },
    engines: {
      bm25?: any
      vectorizer?: TFIDFVectorizer
      vectors?: number[][]
    },
  ): {
    results: Array<{ id: string; score: number }>
    trace: any
  }
}

export class KeywordSearchStrategy implements SearchStrategy {
  execute(query: string, limit: number, corpus: { id: string; documents: Document[] }, engines: { bm25?: any }) {
    if (!engines.bm25) {
      throw new Error("BM25 engine not initialized")
    }

    const keywordResults = engines.bm25.search(query, limit)
    const keywordFormatted = keywordResults.map((result: any) => ({
      id: corpus.documents[result[0]].id,
      score: result[1],
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

export class SemanticSearchStrategy implements SearchStrategy {
  execute(
    query: string,
    limit: number,
    corpus: { id: string; documents: Document[] },
    engines: { vectorizer?: TFIDFVectorizer; vectors?: number[][] },
  ) {
    if (!engines.vectorizer || !engines.vectors) {
      throw new Error("TF-IDF vectors not initialized")
    }

    const documentIds = corpus.documents.map((d) => d.id)
    const semanticResults = performSemanticSearch(query, engines.vectorizer, engines.vectors, documentIds, limit)

    const trace = {
      mode: "semantic" as const,
      semanticResults: semanticResults.slice(0, 10).map((r, idx) => ({
        ...r,
        rank: idx + 1,
      })),
    }

    return {
      results: semanticResults,
      trace,
    }
  }
}

export class HybridSearchStrategy implements SearchStrategy {
  private keywordStrategy = new KeywordSearchStrategy()
  private semanticStrategy = new SemanticSearchStrategy()
  private rrfK = 60

  execute(
    query: string,
    limit: number,
    corpus: { id: string; documents: Document[] },
    engines: { bm25?: any; vectorizer?: TFIDFVectorizer; vectors?: number[][] },
  ) {
    if (!engines.bm25 || !engines.vectorizer || !engines.vectors) {
      throw new Error("Search engines not initialized")
    }

    const keywordResult = this.keywordStrategy.execute(query, limit, corpus, { bm25: engines.bm25 })
    const semanticResult = this.semanticStrategy.execute(query, limit, corpus, {
      vectorizer: engines.vectorizer,
      vectors: engines.vectors,
    })

    const hybridResults = reciprocalRankFusion(keywordResult.results, semanticResult.results, this.rrfK)

    const trace = {
      mode: "hybrid" as const,
      keywordResults: keywordResult.trace.keywordResults,
      semanticResults: semanticResult.trace.semanticResults,
      hybridResults: hybridResults.slice(0, 10).map((r, idx) => ({
        ...r,
        rank: idx + 1,
      })),
      rrfK: this.rrfK,
    }

    return {
      results: hybridResults,
      trace,
    }
  }
}

export class SearchStrategyFactory {
  static getStrategy(mode: SearchMode): SearchStrategy {
    switch (mode) {
      case "keyword":
        return new KeywordSearchStrategy()
      case "semantic":
        return new SemanticSearchStrategy()
      case "hybrid":
        return new HybridSearchStrategy()
      default:
        return new HybridSearchStrategy()
    }
  }
}
