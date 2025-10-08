# Search Builder Demo

This document outlines an application called Search Builder. The document is targeted at the LLM which powers v0, declaring all of the core functionality of the application.

Search Builder is a product intended to demo how technologies can be used to build the core retrieval stack of a search engine, particularly search engines for retrieval augmented generation (RAG).

## Features

### Core Functionality
* The user can upload a corpus of documents. A default one is provided and active.
* The default corpus is the Hugging Face dataset `pszemraj/simple_wikipedia`, limited to 5,000 documents to prevent browser memory issues.
* Search supports three modes:
  - **Keyword**: Search by keywords using Okapi BM25 (lexical/keyword matching)
  - **Semantic**: Search by semantic meaning across vectorized documents using TF-IDF
  - **Hybrid**: Blend the results of Keyword and Semantic to get the best of both techniques using Reciprocal Rank Fusion
* The user can enter a query and see the top results. They can adjust between 10, 20, and 50 results; 20 is the default.
* Search results are expandable - clicking on a result card expands it to show the full article text.

### Search History & Tracing
* Each search is recorded with detailed trace information showing:
  - Query text, timestamp, corpus used, and search mode
  - Top 10 results from each method (Keyword, Semantic) with scores and ranks
  - For Hybrid searches: how BM25 and TF-IDF results were combined using RRF
* Users can view search history in the History tab and replay previous searches.

### Result Rating System
* Users can give "thumbs up" or "thumbs down" ratings on search results.
* Thumbs up indicates the result is relevant; thumbs down means it's irrelevant.
* Ratings are stored with the search history for later analysis.

### Corpus Management
* Users can upload custom corpora in JSON, JSONL, or TXT format.
* Each document must have an `id` and `text` field; `url` and `title` are optional.
* The Browse Corpus tab provides a paginated, responsive grid view of all documents in the active corpus.
* Documents in the corpus browser are expandable to view full text.

### User Interface
* Modern light theme with blue accent colors
* Vertically compressed layout for efficient space usage
* Integrated search bar with embedded controls (mode selector, results count, search button)
* Responsive grid layouts that adapt to screen size
* Real-time indexing progress with detailed step-by-step status updates

## Implementation Details

### Core Technologies
- **Next.js 15** with App Router - React framework for the application
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling with custom design tokens
- **shadcn/ui** - Component library for UI elements (buttons, cards, dropdowns, tabs, etc.)

### Search & Retrieval
- **wink-bm25-text-search** - BM25 ranking algorithm for lexical search
- **Custom TF-IDF implementation** - Term Frequency-Inverse Document Frequency for semantic similarity
  - Computes TF-IDF vectors for all documents during indexing
  - Uses cosine similarity for semantic search
  - Processes documents in batches of 1000 to maintain UI responsiveness
- **Reciprocal Rank Fusion (RRF)** - Combines Keyword (BM25) and Semantic (TF-IDF) results
  - Formula: `RRF_score = sum(1 / (k + rank_position))` where k=60
  - Rank-based fusion avoids score normalization issues
  - Documents appearing in both result sets get boosted scores

### Data Loading
- **hyparquet** - Lightweight Parquet file parser for loading Hugging Face datasets
- **Hugging Face Dataset Viewer API** - Fetches Parquet file URLs for datasets
- **Memory optimization**:
  - Loads maximum of 5,000 documents to prevent browser crashes
  - Explicitly nulls large objects after use to aid garbage collection
  - Processes Parquet files with 10ms delays between loads for GC
  - Batched document processing during indexing (100 docs per batch for BM25, 1000 for TF-IDF)

### Architecture
- **In-memory storage** - All corpora, indices, and search history stored in browser memory
- **React Context** - Global state management for search engines, corpora, and search history
- **Client-side indexing** - Documents are indexed on load with both BM25 and TF-IDF
  - Asynchronous indexing with progress updates
  - BM25: Processes 100 documents per batch with yield points
  - TF-IDF: Tokenizes in batches of 1000, builds vocabulary, generates vectors
- **Custom tokenization** - Lowercase, whitespace normalization, stop word removal, and basic stemming

### Search Modes
1. **Keyword Mode** - Pure lexical matching using BM25, finds exact keyword matches
2. **Semantic Mode** - Pure semantic search using TF-IDF cosine similarity
3. **Hybrid Mode** - Combines both methods using RRF for optimal relevance

### Performance Optimizations
- Batched document processing to prevent UI freezing
- Explicit memory cleanup after large operations
- Progress indicators during long-running operations (indexing, vectorization)
- Lazy loading and pagination for large result sets
- Responsive grid layouts with CSS Grid auto-fit
