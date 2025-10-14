# Search Builder Demo - Functional Requirements

This document outlines the complete functional requirements for Search Builder, a demonstration platform for search engine technologies with a focus on retrieval augmented generation (RAG) systems.

## Overview

Search Builder enables users to experiment with search algorithms, create custom evaluation rubrics, and understand how search results are ranked. The application runs entirely in the browser with no backend server required, using Orama for efficient in-memory search indexing.

## Core Entities

### Document
- **Required fields**: `text` (string)
- **Optional fields**: `title` (string), `url` (string)
- **Generated field**: `id` (string) - automatically generated as `{corpusId}-{index}`
- Documents are the searchable units within a corpus
- IDs are never imported from source files; always generated to ensure uniqueness

### Corpus
- A collection of documents that can be searched
- Each corpus has: `id`, `name`, `documents[]`, `documentCount`, `isIndexing`, `isReady`
- Default corpus: `pszemraj/simple_wikipedia` (1,000 documents from Hugging Face)
- Users can upload custom corpora in JSON, JSONL, CSV, or TXT formats
- Maximum recommended size: 5,000 documents per corpus
- Automatically indexed with Orama on upload

### Search
- Represents a single search query execution
- Contains: `id`, `query`, `timestamp`, `corpusId`, `searchMode`, `results[]`, `trace`, `rubricId`, `scoringWeight`
- Stored in search history for replay and analysis
- Results can be rated (thumbs up/down) and manually reordered
- Search mode is always "keyword" (BM25) but preserved in data structure for future extensibility

### SearchResult
- A document returned from a search with scoring metadata
- Contains: document fields + `score`, `retrievalScore`, `piScore`, `questionScores[]`, `rating`, `originalRank`, `manualRank`
- `score`: Final combined score used for ranking
- `retrievalScore`: Normalized BM25 score from Orama
- `piScore`: Rubric evaluation score (if rubric applied)
- `questionScores`: Individual criterion scores from rubric
- `rating`: "up" or "down" from user feedback
- `originalRank`: Initial position in search results (1-based)
- `manualRank`: Position after manual reordering (if moved)

### Rubric
- A set of evaluation criteria for scoring search results
- Contains: `id`, `name`, `criteria[]`, `createdAt`, `trainingCount`, `version`, `parentRubricId`
- Each criterion has: `label` (string), `question` (string)
- Questions are used by Pi Scorer to evaluate result quality
- Rubrics follow versioning pattern: v0, v1, v2, etc.
- Editing a rubric creates a new version based on the parent

### RubricIndex
- Precomputed scores for all documents in a corpus using a specific rubric
- Structure: `{ rubricId, corpusId, documentScores: Map<docId, { totalScore, questionScores[] }> }`
- Built automatically when a rubric is saved
- Enables instant search without real-time API calls

## User Flows

### 1. Basic Search Flow
1. User enters query in search input field
2. User selects number of results (10/20/50) - defaults to 20
3. User optionally selects a rubric from dropdown - defaults to "No rubric"
4. If rubric selected, user adjusts weight slider (0-100% in 5% increments) - defaults to 50%
5. User clicks "Search" button or presses Enter
6. System performs BM25 search using Orama
7. System displays results with scores and retrieval trace
8. Results show: title, text snippet, score badge, expand button, rating buttons, drag handle
9. User can expand results to see full text
10. Search is saved to history with all parameters and results

### 2. Manual Reranking Flow
1. User performs a search to get results
2. User hovers over a result to see drag handle (grip icon)
3. User drags result to new position in list
4. System updates positions of all affected results
5. Moved results show "#old → #new" badge in orange
6. Unmoved results show "#current" badge in gray
7. Ranking changes are persisted in search history
8. Manual ranking preferences are tracked for rubric generation

### 3. Result Rating Flow
1. User views search results
2. User clicks thumbs up (↑) or thumbs down (↓) on a result
3. Button highlights in blue (up) or red (down)
4. Rating is stored with the search result
5. Ratings are used as training data for rubric generation
6. User can change rating by clicking the other button
7. Clicking the same button again removes the rating

### 4. Rubric Creation Flow
1. User navigates to Reranker tab
2. User clicks "Edit" tab (default view)
3. System displays rubric editor with:
   - List of existing rubrics at top (or placeholder if none)
   - Criteria editor on left
   - Preview examples on right (5 random documents from active corpus)
4. User enters criterion label (e.g., "Relevance")
5. User enters criterion question in textarea (e.g., "Is the result relevant to the query?")
6. User can press Enter to submit or Shift+Enter to add line breaks
7. User clicks "Add Criterion" to add more criteria
8. As user edits criteria (on blur), preview examples are automatically scored
9. Preview examples are sorted by score (highest first)
10. User clicks "Save Rubric" button
11. System generates unique rubric ID and name (e.g., "Rubric v0", "Rubric v1")
12. System begins building rubric index for all corpora
13. Toast notification appears showing progress with loader
14. Rubric is disabled in dropdown until indexing completes
15. When indexing completes, success toast appears
16. Rubric becomes available for use in searches

### 5. Rubric Editing Flow (Versioning)
1. User navigates to Reranker tab
2. User clicks on an existing rubric in the list at top
3. Rubric loads into editor with all criteria
4. Editor shows message: "Editing [Rubric Name] - Changes will be saved as a new rubric"
5. User modifies criteria (add, edit, or remove)
6. Preview examples update as criteria change
7. User clicks "Save Rubric"
8. System creates NEW rubric version (doesn't overwrite original)
9. New rubric gets incremented version (e.g., "Rubric v1" → "Rubric v2")
10. New rubric references parent via `parentRubricId`
11. Indexing process begins for new rubric version
12. Original rubric remains unchanged in history

### 6. Feedback-Based Rubric Generation Flow
1. User performs searches and provides feedback (ratings and reranking)
2. User navigates to Reranker tab
3. User clicks "Generate" tab
4. System displays list of all searches from history with feedback
5. Each search shows: query, timestamp, result count, rated count, reranked count
6. User selects one or more searches as training data
7. System shows summary: X good examples, Y bad examples, Z reranked
8. Good examples: thumbs up results + results moved up in ranking
9. Bad examples: thumbs down results + results moved down in ranking
10. User clicks "Generate Rubric" button
11. System sends examples to Pi Scorer API
12. Pi Scorer analyzes patterns and generates criteria
13. New rubric is created with generated criteria (version v0)
14. Indexing process begins automatically
15. User can edit generated rubric if needed (creates v1)

### 7. Search with Rubric Flow
1. User enters query in search interface
2. User selects a rubric from dropdown (must be fully indexed)
3. User adjusts weight slider to control rubric influence (5% increments)
   - 0%: Pure retrieval score (BM25 only)
   - 50%: Balanced blend (default)
   - 100%: Pure rubric score (Pi Scorer only)
4. User performs search
5. System retrieves results using BM25 via Orama
6. System looks up precomputed rubric scores from index
7. System combines scores: `finalScore = (1 - weight) * retrievalScore + weight * rubricScore`
8. Results are ranked by final score
9. Each result displays:
   - Combined score badge
   - Individual criterion scores (expandable)
   - Retrieval score and rubric score breakdown
10. Retrieval trace shows corpus name, document count, and rubric weighting

### 8. Corpus Upload Flow
1. User clicks corpus selector dropdown
2. User clicks upload icon button
3. File picker opens (accepts .json, .jsonl, .csv, .txt)
4. User selects file
5. System validates file format:
   - JSON: Must be array of objects with `text` field
   - JSONL: Each line must be valid JSON with `text` field
   - CSV: Must have `text` column (uses papaparse for proper parsing)
   - TXT: Each line becomes a document
6. If validation fails, error toast shows specific issue
7. System generates IDs for all documents: `{corpusId}-{index}`
8. System creates new corpus with documents
9. System begins indexing with Orama (BM25 with stemming and stopwords)
10. Progress indicator shows indexing status
11. When complete, corpus is automatically selected and becomes searchable
12. Success toast confirms upload
13. Corpus appears in corpus selector dropdown

### 9. Browse Corpus Flow
1. User clicks "Browse Corpus" tab
2. System displays responsive grid of document cards
3. Each card shows: title (or truncated text), document ID, expand button
4. User can click card to expand and view full text
5. Grid adapts to screen size (1-4 columns)
6. Pagination controls appear if corpus has many documents

### 10. Search History Flow
1. User clicks "History" tab
2. System displays list of all previous searches (newest first)
3. Each search preview shows:
   - Query text
   - Timestamp
   - Rubric name (if used)
   - Rubric weight (if used)
   - Result count
   - Expand button
4. User clicks on a search to expand it
5. Expanded view shows:
   - Full retrieval trace with corpus information
   - All search results with scores
   - Rating buttons and drag handles (functional)
   - Manual reranking still works in history
6. User can re-rate results or reorder them in history
7. Changes are persisted to the search record

## UI Components & Layout

### Main Navigation
- Horizontal tab bar at top with 5 tabs: Search, History, Browse Corpus, Reranker, Evaluate Search
- Active tab highlighted in blue
- "Search Builder" title in top bar
- Corpus selector dropdown on right side of nav bar
- Shows corpus name and document count
- Upload icon button next to corpus selector

### Search Tab Layout
- Search input field (full width, rounded corners, purple border)
- Search button (purple, circular, magnifying glass icon) on right side of input
- Retrieval Trace collapsible section below input
- Shows: corpus name, document count, search mode badge
- Results area below trace
- Empty state: "Enter a query to search the corpus"

### Configuration Panel (Left Sidebar)
- "Configuration" heading with "Export" button
- Collapsible sections:
  - Index: Shows indexing status
  - Corpus: Corpus selector with upload button
  - Scoring and Reranking: Rubric selector
  - Pi Scorer: Rubric dropdown
  - Score Fusion: Weight slider (Retrieval ↔ Rubric)
- Weight slider shows percentages: "X% Retrieval · Y% Rubric"
- Slider snaps to 5% increments

### Search Result Card
- White card with rounded corners and subtle shadow
- Drag handle (grip icon) on left side
- Title in bold (or first line of text if no title)
- Text snippet (truncated with ellipsis)
- Score badge in top-right (purple background)
- Ranking badge next to score:
  - Gray "#N" for unmoved results
  - Orange "#old → #new" for moved results
- Expand button (chevron icon)
- Rating buttons (thumbs up/down) at bottom
- When expanded: full text visible, collapse button

### History Tab Layout
- List of search preview cards (newest first)
- Each preview shows query, timestamp, rubric info
- No search mode badge (removed from UI)
- Click to expand and see full search details
- Expanded view shows retrieval trace + results
- Results are interactive (can rate and reorder)

### Browse Corpus Tab Layout
- Responsive grid of document cards
- Grid columns: 1 (mobile), 2 (tablet), 3 (desktop), 4 (wide)
- Each card shows document title/text preview
- Click to expand and view full document
- Pagination controls if needed

### Reranker Tab Layout
- Rubric list at top (grid of rubric cards)
- Each rubric card shows: name, version, criteria count, creation date
- Click rubric to load into editor
- Empty state: "No rubrics yet. Create your first rubric to get started."
- Tab bar below rubric list: "Edit" and "Generate"
- Edit tab contains rubric editor
- Generate tab contains rubric generator

### Rubric Editor Layout (Edit Tab)
- Two-column layout:
  - Left: Criteria editor
  - Right: Preview examples
- Criteria editor:
  - Heading: "Rubric Editor" with subtitle
  - If editing existing rubric: "Editing [name] - Changes will be saved as a new rubric"
  - List of criteria (each with label input + question textarea)
  - Textarea supports Enter to submit, Shift+Enter for line breaks
  - Delete button for each criterion
  - "Add Criterion" button
  - "Save Rubric" button (blue, full width)
- Preview examples:
  - Heading: "Preview Examples"
  - 5 document cards with scores
  - Sorted by score (highest first)
  - Scores update on blur of criterion inputs

### Rubric Generator Layout (Generate Tab)
- Heading: "Generate Rubric from Examples"
- Subtitle explaining the process
- List of searches from history (checkboxes)
- Each search shows: query, timestamp, rated count, reranked count
- Summary section showing good/bad example counts
- "Generate Rubric" button (blue)
- Progress indicator during generation

### Retrieval Trace Display
- Collapsible section showing search internals
- Corpus information section at top:
  - Corpus name badge
  - Document count
  - Search mode badge (always "Keyword")
- Top 10 BM25 results with scores
- If rubric used: rubric name and weight percentage
- Scores displayed with 3 decimal places

### Toast Notifications
- Positioned in bottom-right corner
- Used for:
  - Rubric indexing progress (with loader animation)
  - Rubric indexing completion
  - Corpus upload success/errors
  - Format validation errors
- Progress toast shows: "Indexing [Rubric Name]..." with spinner
- Success toast shows: "Indexing complete for [Rubric Name]"
- Error toasts show specific validation messages
- Auto-dismiss after 3 seconds (success) or manual dismiss (progress)

## Interaction Behaviors

### Search Input
- Placeholder: "Enter your search query..."
- Pressing Enter triggers search
- Input is trimmed before search
- Empty queries are not allowed (button disabled)

### Dropdowns
- All dropdowns use shadcn Select component
- Hover shows subtle highlight
- Selected item shown in dropdown trigger
- Dropdown opens on click
- Click outside or select item to close

### Weight Slider
- Only visible when rubric is selected
- Range: 0-100% in 5% increments
- Shows two percentages: "X% Retrieval · Y% Rubric"
- Dragging updates percentages in real-time
- Snaps to nearest 5% increment
- Default: 50/50 split
- Stored with search for history replay

### Drag and Drop
- Drag handle visible on hover over result card
- Cursor changes to grab cursor when hovering handle
- Dragging shows semi-transparent preview of card
- Drop zones highlighted during drag
- Smooth animation when card moves to new position
- All affected cards update their rank badges immediately

### Rating Buttons
- Thumbs up and thumbs down buttons side by side
- Inactive: gray outline
- Active: filled (blue for up, red for down)
- Clicking active button deactivates it (removes rating)
- Clicking opposite button switches rating
- Hover shows subtle scale animation

### Expandable Cards
- Chevron icon indicates expandable state
- Click anywhere on card (except buttons) to expand
- Expand animation: smooth height transition
- Expanded: chevron rotates 180°, full text visible
- Click again to collapse

### Rubric Selection
- Rubrics being indexed show loading spinner + "indexing..." label
- Indexed rubrics are clickable
- Clicking loads rubric into editor
- Selected rubric highlighted in list
- Weight slider appears when rubric selected in search

### Feedback Input
- Textarea in feedback modal
- Enter key submits feedback
- Shift+Enter adds line break
- Helper text shows keyboard shortcuts
- Uses kbd styling for visual clarity

### Toast Interactions
- Progress toasts are persistent (don't auto-dismiss)
- Success toasts auto-dismiss after 3 seconds
- Error toasts require manual dismiss
- User can manually dismiss any toast
- Multiple toasts stack vertically
- Toasts slide in from right

## Data Validation & Constraints

### Document Validation
- `text` must be non-empty string (required)
- `title` and `url` are optional strings
- `id` is always generated, never imported
- Documents without `text` are rejected during upload
- CSV files must have a `text` column
- JSON/JSONL files must have `text` field in each object

### Corpus Constraints
- Maximum 5,000 documents per corpus (browser memory limit)
- Corpus name must be unique
- Cannot delete default corpus
- Cannot have zero corpora (always at least one active)
- Newly uploaded corpus is automatically selected

### Search Constraints
- Query must be non-empty (after trimming)
- Results count must be 10, 20, or 50
- Search mode is always "keyword" (BM25)
- Rubric weight must be 0-100% in 5% increments
- Cannot search with rubric that's still indexing

### Rubric Constraints
- Rubric must have at least 1 criterion
- Each criterion must have non-empty label and question
- Rubric names are auto-generated with version numbers
- Cannot delete rubrics (only create new versions)
- Rubrics are immutable after creation
- Editing creates new version with incremented number

### Rating Constraints
- Each result can have at most one rating (up or down)
- Ratings can be changed or removed
- Ratings are per-search (same document can have different ratings in different searches)

### Ranking Constraints
- Ranks are 1-based (first result is rank 1)
- Original rank is set when search is performed
- Manual rank is set when user drags result
- Results without manual rank use their current position as rank

## Search Algorithm Details

### BM25 (Keyword Search via Orama)
- Implemented using @orama/orama library
- Okapi BM25 algorithm with Orama's default parameters
- Tokenization with stemming (English) via @orama/stemmers
- Stop word removal (English) via @orama/stopwords
- Sorting disabled for memory optimization
- Scores are normalized to 0-1 range for display
- Returns top N results sorted by BM25 score
- Memory-optimized configuration for browser environments

### Rubric Scoring
- Uses Pi Scorer API to evaluate documents against criteria
- Each criterion produces a score (0-1 range)
- Total rubric score: average of all criterion scores
- Scores are deterministic (same document + rubric = same score)
- Precomputed during indexing for instant search

### Score Combination (Rubric-Enhanced Search)
- Retrieval score: normalized BM25 score from Orama
- Rubric score: precomputed Pi Scorer evaluation
- Weight: user-controlled slider (0-100% in 5% increments)
- Formula: `finalScore = (1 - weight) * retrievalScore + weight * rubricScore`
- Example: weight=50%, retrieval=0.8, rubric=0.6 → final=0.7
- Results ranked by final score (descending)

## Performance Characteristics

### Indexing Performance
- Orama indexing: ~100 documents per batch, yields every batch
- Rubric indexing: ~100 documents per batch, yields every batch
- Progress updates every batch for user feedback
- Total time depends on corpus size and rubric complexity
- Memory-optimized with stemming and stopwords

### Search Performance
- BM25 search via Orama: O(n) where n = corpus size, typically <100ms for 5000 docs
- Rubric-enhanced search: Index lookup O(1), typically <50ms
- Manual reranking: O(1) array manipulation, instant
- Orama provides faster search than previous custom implementation

### Memory Usage
- Each document: ~1-5KB depending on text length
- 5000 documents: ~5-25MB
- Orama index: ~2-10MB (optimized with stemming and stopwords)
- Rubric indexes: ~1-5MB per rubric per corpus
- Total: ~20-50MB for typical usage (significantly reduced from previous implementation)

## Error Handling

### Upload Errors
- Invalid file format: Show error toast "Invalid file format. Please upload JSON, JSONL, CSV, or TXT."
- Missing required fields: Show error toast "Documents must have a 'text' field."
- Empty file: Show error toast "File is empty or contains no valid documents."
- JSON parse error: Show error toast "Invalid JSON format. Please check your file."
- CSV parse error: Show error toast "Failed to parse CSV. Please check the format."
- File too large: Show error toast "Corpus too large. Maximum 5,000 documents."
- Success: Show success toast "Successfully uploaded [N] documents"

### Search Errors
- Empty query: Disable search button, show placeholder
- No results: Show empty state "No results found for '[query]'"
- Indexing in progress: Disable search button, show loading state
- Orama error: Show error toast "Search failed. Please try again."

### Rubric Errors
- No criteria: Disable save button
- Empty criterion fields: Show validation error on blur
- Pi Scorer API error: Show error toast "Failed to generate rubric. Please try again."
- Indexing error: Show error toast "Failed to index rubric. Please try again."

### Network Errors
- Pi Scorer API timeout: Show error toast "Request timed out. Please try again."
- Pi Scorer API rate limit: Show error toast "Rate limit exceeded. Please wait and try again."
- Hugging Face API error: Fall back to empty default corpus

## State Management

### Global State (React Context)
- `corpora`: Array of all uploaded corpora
- `activeCorpusId`: ID of currently selected corpus
- `searches`: Array of all search history
- `currentSearchId`: ID of currently displayed search
- `rubrics`: Array of all created rubrics
- `rubricIndexes`: Array of all rubric indexes
- `indexingRubrics`: Set of rubric IDs currently being indexed
- `searchMode`: Always "keyword" (preserved for future extensibility)
- `scoringWeight`: Rubric weight slider value (0-100)
- `oramaDbsRef`: Map of Orama database instances by corpus ID

### Local State (Component-Level)
- Search input value
- Selected results count
- Selected rubric ID
- Rubric weight value
- Expanded result IDs
- Expanded search IDs in history
- Rubric editor criteria
- Preview example scores
- Selected searches for rubric generation

### Derived State
- Current corpus documents (from activeCorpusId)
- Current search results (from currentSearchId)
- Available rubrics for dropdown (excluding indexing rubrics)
- Good/bad example counts for rubric generation

## Integration Points

### Orama Search Engine
- Package: `@orama/orama`, `@orama/stopwords`, `@orama/stemmers`
- Used for: BM25 indexing and search
- Configuration: English stemming, English stopwords, sorting disabled
- Schema: `id`, `title`, `text`, `url` fields
- All processing in-memory, no external services

### Pi Scorer API
- Endpoint: Provided via `WITHPI_API_KEY` environment variable
- Authentication: API key in headers
- Request format: JSON with rubric criteria and document text
- Response format: JSON with total score and question scores
- Used for: Rubric generation, document scoring during indexing
- Rate limits: Handled with exponential backoff

### Hugging Face Dataset Viewer API
- Endpoint: `https://datasets-server.huggingface.co/parquet`
- No authentication required
- Used for: Loading default corpus from Hugging Face
- Returns: List of Parquet file URLs
- Fallback: If API fails, use empty corpus

### CSV Parsing
- Package: `papaparse`
- Used for: Proper CSV parsing with quoted field support
- Handles: Multi-line fields, escaped quotes, various delimiters
- Configuration: Header detection, dynamic typing, skip empty lines

### Browser APIs
- File API: For corpus upload
- LocalStorage: Not used (all state in memory)
- IndexedDB: Not used (all state in memory)
- Web Workers: Not used (all processing on main thread with yields)

## Technical Architecture

### Search Implementation
- **Previous**: Custom BM25 (wink-bm25-text-search) + custom TF-IDF vectorizer
- **Current**: Orama unified search engine with BM25
- **Removed**: Semantic search (TF-IDF), Hybrid search (RRF)
- **Reason**: Simplified architecture, better memory efficiency, Orama's vector search requires embeddings

### ID Generation Strategy
- **Pattern**: `{corpusId}-{index}` for all documents
- **Previous**: Attempted to import IDs from source files with fallback
- **Current**: Always generate IDs, never import
- **Reason**: Eliminates duplicate ID issues, ensures consistency between corpus and Orama index

### Memory Optimization
- Orama configuration: Stemming enabled, stopwords enabled, sorting disabled
- Reduces vocabulary size by ~30-50%
- Reduces index size by ~40-60%
- Enables support for larger corpora within browser memory limits

### Rubric Versioning
- Each rubric edit creates a new version (v0, v1, v2, etc.)
- Parent-child relationship tracked via `parentRubricId`
- Enables rubric evolution tracking
- Preserves search history with original rubric versions

## Future Considerations

### Potential Enhancements
- Persist state to LocalStorage or IndexedDB
- Support for larger corpora with pagination/virtualization
- Re-enable semantic search with embedding generation
- Re-enable hybrid search combining BM25 and embeddings
- Real-time collaborative rubric editing
- Export search results to CSV/JSON
- A/B testing different rubrics on same query
- Rubric comparison and analytics
- Custom tokenization rules
- Rubric templates and sharing
- Advanced analytics on search patterns
- Multi-corpus search

### Known Limitations
- 5,000 document limit per corpus (browser memory)
- All processing on main thread (can block UI for large operations)
- No persistence (refresh loses all data)
- No multi-user support
- No authentication or authorization
- Pi Scorer API dependency for rubric features
- Browser memory constraints
- Single search mode (keyword only)
- No semantic or hybrid search without embeddings

## Recent Changes (Current Session)

### Migration to Orama
- Replaced custom BM25 and TF-IDF implementations with Orama
- Added `@orama/orama`, `@orama/stopwords`, `@orama/stemmers` packages
- Removed `wink-bm25-text-search` dependency
- Simplified search strategies to use Orama's built-in BM25

### Search Mode Simplification
- Removed semantic (TF-IDF) and hybrid (RRF) search modes from UI
- Kept search mode in data structures for future extensibility
- Hidden retrieval mode selector from configuration panel
- Removed search mode badges from search history

### ID Generation Overhaul
- Simplified to always use `{corpusId}-{index}` pattern
- Removed all logic for importing IDs from source files
- Fixed ID mismatch issues between corpus documents and Orama index
- Updated default corpus loading to use generated IDs

### CSV Parsing Improvements
- Added `papaparse` library for proper CSV parsing
- Fixed issue where multi-line quoted fields were split into multiple documents
- Added validation for CSV format and required columns

### Format Validation
- Added comprehensive validation for all corpus file formats
- Specific error messages for each validation failure
- Toast notifications for upload success and errors
- Validates required fields before creating corpus

### Memory Optimization
- Configured Orama with English stemming and stopwords
- Disabled sorting feature to reduce memory overhead
- Reduced index size by 40-60% compared to previous implementation

### UX Improvements
- Auto-select newly uploaded corpus
- Added corpus information to retrieval trace
- Enter to submit feedback, Shift+Enter for line breaks in feedback modal
- Keyboard shortcut hints in feedback modal
- Weight slider snaps to 5% increments
- Improved toast notifications with loaders for progress

### Bug Fixes
- Fixed document lookup issues with ID mismatches
- Fixed CSV parsing creating too many documents from multi-line fields
- Fixed default corpus loading with incorrect IDs
- Fixed Orama indexing errors with duplicate IDs
