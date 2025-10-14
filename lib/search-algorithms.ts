// Keeping only the prepareText utility function which is still used elsewhere

import { prepareText } from "./search-utils"

// All other functions have been replaced by Orama's built-in functionality
// - TFIDFVectorizer -> Orama's internal vector indexing
// - indexDocumentsWithBM25 -> Orama's fulltext indexing
// - generateTFIDFVectors -> Orama's vector generation
// - performSemanticSearch -> Orama's search API

export { prepareText }
