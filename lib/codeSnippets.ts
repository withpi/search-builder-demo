import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const CODE_SNIPPETS = {
  scoreFusion: {
    title: "Combining Retrieval and Rubric Scores",
    description: "Here's how to combine retrieval scores with rubric scores using a weight",
    fileName: "lib/score-normalization.ts",
    code: `
const normalizedRetrievalScore = normalizeScore(result.score, searchMode)
const rubricScore = response.error ? 0 : (response.total_score ?? 0)
const combinedScore = combineScores(normalizedRetrievalScore, rubricScore, weight)  
`,
githubUrl: "https://github.com/withpi/search-builder/blob/d4c4e865a3f9967960d052dbcd0373efc840a965/lib/score-normalization.ts#L58"
  }
}