import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const dataDir = join(rootDir, "data");

export const chunkSize = 420;
export const docRetrievalK = 2;
export const chunkRetrievalKPerDoc = 2;
export const summaryReductionInputTokenBudget = 90;
export const expandNeighborChunks = true;
export const defaultQuestion = "Why can RAG fail when the context budget is too small?";

export function getIntEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return Number.parseInt(value, 10);
}

export const rawContextTokenBudget = getIntEnv("RAW_CONTEXT_TOKEN_BUDGET", 250);

// ATTENTION! It's a demo-only word lists used by the simplified retriever and summarizer. Your real systems should replace this with embeddings, reranking tokenizer-aware budgeting, and model-generated summaries.
export const stopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "because",
  "but",
  "by",
  "can",
  "for",
  "from",
  "if",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "use",
  "with",
]);

export const importantTerms = new Set([
  "answer",
  "budget",
  "chunk",
  "chunks",
  "context",
  "embedding",
  "embeddings",
  "fail",
  "failure",
  "failures",
  "model",
  "prompt",
  "rag",
  "retrieval",
  "retrieves",
  "summary",
  "summaries",
  "window",
]);
