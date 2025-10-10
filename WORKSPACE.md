# Search Builder Demo - Functional Requirements

This document outlines the complete functional requirements for Search Builder, a demonstration platform for search engine technologies with a focus on retrieval augmented generation (RAG) systems.

## Overview

Search Builder enables users to experiment with different search algorithms, create custom evaluation rubrics, and understand how search results are ranked. The application runs entirely in the browser with no backend server required.

## Core Entities

### Document
- **Required fields**: `id` (string), `text` (string)
- **Optional fields**: `title` (string), `url` (string)
- Documents are the searchable units within a corpus

### Corpus
- A collection of documents that can be searched
- Each corpus has: `id`, `name`, `documents[]`, `documentCount`
- Default corpus: `pszemraj/simple_wikipedia` (5,000 documents from Hugging Face)
- Users can upload custom corpora in JSON, JSONL, or TXT formats

### Search
- Represents a single search query execution
- Contains: `id`, `query`, `timestamp`, `corpusId`, `searchMode`, `results[]`, `trace`, `rubricId`, `rubricWeight`
- Stored in search history for replay and analysis
- Results can be rated (thumbs up/down) and manually reordered

### SearchResult
- A document returned from a search with scoring metadata
- Contains: document fields + `score`, `retrievalScore`, `piScore`, `questionScores[]`, `rating`, `originalRank`, `manualRank`
- `score`: Final combined score used for ranking
- `retrievalScore`: Normalized BM25 or TF-IDF score
- `piScore`: Rubric evaluation score (if rubric applied)
- `questionScores`: Individual criterion scores from rubric
- `rating`: "up" or "down" from user feedback
- `originalRank`: Initial position in search results (1-based)
- `manualRank`: Position after manual reordering (if moved)

### Rubric
- A set of evaluation criteria for scoring search results
- Contains: `id`, `name`, `criteria[]`, `createdAt`, `trainingCount`
- Each criterion has: `label` (string), `question` (string)
- Questions are used by Pi Scorer to evaluate result quality
- Rubrics are immutable once created; edits create new rubrics

### RubricIndex
- Precomputed scores for all documents in a corpus using a specific rubric
- Structure: `{ rubricId, corpusId, documentScores: Map<docId, { totalScore, questionScores[] }> }`
- Built automatically when a rubric is saved
- Enables instant search without real-time API calls

## User Flows

### 1. Basic Search Flow
1. User enters query in search input field
2. User selects search mode (Keyword/Semantic/Hybrid) - defaults to Hybrid
3. User selects number of results (10/20/50) - defaults to 20
4. User optionally selects a rubric from dropdown - defaults to "No rubric"
5. If rubric selected, user adjusts weight slider (0-100%) - defaults to 50%
6. User clicks "Search" button or presses Enter
7. System performs search and displays results with scores
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
6. User clicks "Add Criterion" to add more criteria
7. As user edits criteria (on blur), preview examples are automatically scored
8. Preview examples are sorted by score (highest first)
9. User clicks "Save Rubric" button
10. System generates unique rubric ID and name (e.g., "Rubric v0", "Rubric v1")
11. System begins building rubric index for all corpora
12. Toast notification appears in bottom-right showing progress
13. Rubric is disabled in dropdown until indexing completes
14. When indexing completes, success toast appears
15. Rubric becomes available for use in searches

### 5. Rubric Editing Flow
1. User navigates to Reranker tab
2. User clicks on an existing rubric in the list at top
3. Rubric loads into editor with all criteria
4. Editor shows message: "Editing [Rubric Name] - Changes will be saved as a new rubric"
5. User modifies criteria (add, edit, or remove)
6. Preview examples update as criteria change
7. User clicks "Save Rubric"
8. System creates NEW rubric (doesn't overwrite original)
9. New rubric gets incremented name (e.g., "Rubric v1" → "Rubric v2")
10. Indexing process begins for new rubric
11. Original rubric remains unchanged in history

### 6. Rubric Generation Flow
1. User navigates to Reranker tab
2. User clicks "Generate" tab
3. System displays list of all searches from history
4. Each search shows: query, timestamp, result count, rated count, reranked count
5. User selects one or more searches as training data
6. System shows summary: X good examples, Y bad examples, Z reranked
7. Good examples: thumbs up results + results moved up in ranking
8. Bad examples: thumbs down results + results moved down in ranking
9. User clicks "Generate Rubric" button
10. System sends examples to Pi Scorer API
11. Pi Scorer analyzes patterns and generates criteria
12. New rubric is created with generated criteria
13. Indexing process begins automatically
14. User can edit generated rubric if needed

### 7. Search with Rubric Flow
1. User enters query in search interface
2. User selects a rubric from dropdown (must be fully indexed)
3. User adjusts weight slider to control rubric influence
   - 0%: Pure retrieval score (BM25/TF-IDF only)
   - 50%: Balanced blend (default)
   - 100%: Pure rubric score (Pi Scorer only)
4. User performs search
5. System retrieves results using selected search mode
6. System looks up precomputed rubric scores from index
7. System combines scores: `finalScore = (1 - weight) * retrievalScore + weight * rubricScore`
8. Results are ranked by final score
9. Each result displays:
   - Combined score badge
   - Individual criterion scores (expandable)
   - Retrieval score and rubric score breakdown
10. Search trace shows rubric weighting in retrieval trace

### 8. Corpus Upload Flow
1. User clicks corpus selector dropdown
2. User clicks "Upload Corpus" option
3. File picker opens (accepts .json, .jsonl, .txt)
4. User selects file
5. System parses file and validates format
6. Each document must have `id` and `text` fields
7. System creates new corpus with documents
8. System begins indexing (BM25 and TF-IDF)
9. Progress indicator shows indexing status
10. When complete, corpus becomes active and searchable
11. Corpus appears in corpus selector dropdown

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
   - Search mode badge
   - Rubric name (if used)
   - Rubric weight (if used)
   - Result count
   - Expand button
4. User clicks on a search to expand it
5. Expanded view shows:
   - Full retrieval trace
   - All search results with scores
   - Rating buttons and drag handles (functional)
   - Manual reranking still works in history
6. User can re-rate results or reorder them in history
7. Changes are persisted to the search record

## UI Components & Layout

### Main Navigation
- Horizontal tab bar at top with 4 tabs: Search, History, Browse Corpus, Reranker
- Active tab highlighted in blue
- Corpus selector dropdown on right side of nav bar
- Shows corpus name and document count

### Search Tab Layout
- Large "Search Builder" heading with subtitle
- Search input field (full width, rounded corners)
- Control bar below input with 4 elements (left to right):
  1. Search mode dropdown (Keyword/Semantic/Hybrid)
  2. Results count dropdown (10/20/50)
  3. Rubric selector dropdown (No rubric / list of rubrics)
  4. Weight slider (only visible when rubric selected)
  5. Blue "Search" button on far right
- Results area below controls
- Empty state: search icon + "Enter a query to search the corpus"

### Search Result Card
- White card with rounded corners and subtle shadow
- Drag handle (grip icon) on left side
- Title in bold (or first line of text if no title)
- Text snippet (truncated with ellipsis)
- Score badge in top-right (blue background)
- Ranking badge next to score:
  - Gray "#N" for unmoved results
  - Orange "#old → #new" for moved results
- Expand button (chevron icon)
- Rating buttons (thumbs up/down) at bottom
- When expanded: full text visible, collapse button

### History Tab Layout
- List of search preview cards (newest first)
- Each preview shows query, timestamp, mode, rubric info
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
- Each rubric card shows: name, criteria count, creation date
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
- Search mode badge (Keyword/Semantic/Hybrid)
- If rubric used: rubric name and weight percentage
- For Keyword: Top 10 BM25 results with scores
- For Semantic: Top 10 TF-IDF results with scores
- For Hybrid: Both lists + explanation of RRF combination
- Scores displayed with 3 decimal places

### Toast Notifications
- Positioned in bottom-right corner
- Used for rubric indexing progress
- Progress toast shows: "Indexing [Rubric Name]... X/Y documents"
- Success toast shows: "Indexing complete for [Rubric Name]"
- Styled to match application (blue accent, clean design)
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
- Range: 0-100%
- Shows two percentages: "Retrieval X% | Rubric Y%"
- Dragging updates percentages in real-time
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

### Toast Interactions
- Progress toasts are persistent (don't auto-dismiss)
- Success toasts auto-dismiss after 3 seconds
- User can manually dismiss any toast
- Multiple toasts stack vertically
- Toasts slide in from right

## Data Validation & Constraints

### Document Validation
- `id` must be unique within corpus
- `text` must be non-empty string
- `title` and `url` are optional strings
- Documents without `id` or `text` are rejected during upload

### Corpus Constraints
- Maximum 5,000 documents per corpus (browser memory limit)
- Corpus name must be unique
- Cannot delete default corpus
- Cannot have zero corpora (always at least one active)

### Search Constraints
- Query must be non-empty (after trimming)
- Results count must be 10, 20, or 50
- Search mode must be Keyword, Semantic, or Hybrid
- Rubric weight must be 0-100%
- Cannot search with rubric that's still indexing

### Rubric Constraints
- Rubric must have at least 1 criterion
- Each criterion must have non-empty label and question
- Rubric names are auto-generated (not user-editable)
- Cannot delete rubrics (only create new ones)
- Rubrics are immutable after creation

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

### BM25 (Keyword Search)
- Okapi BM25 algorithm with default parameters
- k1 = 1.2 (term frequency saturation)
- b = 0.75 (length normalization)
- Tokenization: lowercase, whitespace split, stop word removal
- Scores are normalized to 0-1 range for display
- Returns top N results sorted by BM25 score

### TF-IDF (Semantic Search)
- Term Frequency: `tf = count(term) / total_terms_in_doc`
- Inverse Document Frequency: `idf = log(total_docs / docs_containing_term)`
- TF-IDF: `tf * idf` for each term
- Document vectors: array of TF-IDF values for all terms in vocabulary
- Similarity: cosine similarity between query vector and document vectors
- Scores are normalized to 0-1 range for display
- Returns top N results sorted by cosine similarity

### Reciprocal Rank Fusion (Hybrid Search)
- Combines rankings from BM25 and TF-IDF
- Formula: `RRF_score = sum(1 / (k + rank))` where k=60
- For each document, sum its RRF contributions from both methods
- Documents in both result sets get higher scores
- Documents in only one result set still get scored
- Final ranking by RRF score (descending)
- Returns top N results sorted by RRF score

### Rubric Scoring
- Uses Pi Scorer API to evaluate documents against criteria
- Each criterion produces a score (0-1 range)
- Total rubric score: average of all criterion scores
- Scores are deterministic (same document + rubric = same score)
- Precomputed during indexing for instant search

### Score Combination (Rubric-Enhanced Search)
- Retrieval score: normalized BM25, TF-IDF, or RRF score
- Rubric score: precomputed Pi Scorer evaluation
- Weight: user-controlled slider (0-100%)
- Formula: `finalScore = (1 - weight) * retrievalScore + weight * rubricScore`
- Example: weight=50%, retrieval=0.8, rubric=0.6 → final=0.7
- Results ranked by final score (descending)

## Performance Characteristics

### Indexing Performance
- BM25 indexing: ~100 documents per batch, yields every batch
- TF-IDF indexing: ~1000 documents per batch for tokenization
- Rubric indexing: ~100 documents per batch, yields every batch
- Progress updates every batch for user feedback
- Total time depends on corpus size and rubric complexity

### Search Performance
- BM25 search: O(n) where n = corpus size, typically <100ms for 5000 docs
- TF-IDF search: O(n) cosine similarity, typically <200ms for 5000 docs
- Hybrid search: Both methods + RRF, typically <300ms for 5000 docs
- Rubric-enhanced search: Index lookup O(1), typically <50ms
- Manual reranking: O(1) array manipulation, instant

### Memory Usage
- Each document: ~1-5KB depending on text length
- 5000 documents: ~5-25MB
- BM25 index: ~2-10MB
- TF-IDF vectors: ~10-50MB (depends on vocabulary size)
- Rubric indexes: ~1-5MB per rubric per corpus
- Total: ~50-150MB for typical usage

## Error Handling

### Upload Errors
- Invalid file format: Show error toast "Invalid file format. Please upload JSON, JSONL, or TXT."
- Missing required fields: Show error toast "Documents must have 'id' and 'text' fields."
- File too large: Show error toast "Corpus too large. Maximum 5,000 documents."

### Search Errors
- Empty query: Disable search button, show placeholder
- No results: Show empty state "No results found for '[query]'"
- Indexing in progress: Disable search button, show loading state

### Rubric Errors
- No criteria: Disable save button
- Empty criterion fields: Show validation error on blur
- Pi Scorer API error: Show error toast "Failed to generate rubric. Please try again."
- Indexing error: Show error toast "Failed to index rubric. Please try again."

### Network Errors
- Pi Scorer API timeout: Show error toast "Request timed out. Please try again."
- Pi Scorer API rate limit: Show error toast "Rate limit exceeded. Please wait and try again."

## State Management

### Global State (React Context)
- `corpora`: Array of all uploaded corpora
- `activeCorpusId`: ID of currently selected corpus
- `searches`: Array of all search history
- `currentSearchId`: ID of currently displayed search
- `rubrics`: Array of all created rubrics
- `rubricIndexes`: Array of all rubric indexes
- `indexingRubrics`: Set of rubric IDs currently being indexed
- `ratedResults`: Map of result ratings by search ID and result ID
- `manualRankings`: Map of manual ranking changes by search ID and result ID

### Local State (Component-Level)
- Search input value
- Selected search mode
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

### Pi Scorer API
- Endpoint: Provided via environment variable
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

### Browser APIs
- File API: For corpus upload
- LocalStorage: Not used (all state in memory)
- IndexedDB: Not used (all state in memory)
- Web Workers: Not used (all processing on main thread with yields)

## Future Considerations

### Potential Enhancements
- Persist state to LocalStorage or IndexedDB
- Support for larger corpora with pagination/virtualization
- Real-time collaborative rubric editing
- Export search results to CSV/JSON
- A/B testing different rubrics on same query
- Rubric versioning and comparison
- Custom tokenization rules
- Support for more search algorithms (e.g., neural search)
- Rubric templates and sharing
- Advanced analytics on search patterns

### Known Limitations
- 5,000 document limit per corpus
- All processing on main thread (can block UI)
- No persistence (refresh loses all data)
- No multi-user support
- No authentication or authorization
- Pi Scorer API dependency for rubric features
- Browser memory constraints
