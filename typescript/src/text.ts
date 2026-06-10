import {
  chunkSize,
  importantTerms,
  stopwords,
  summaryReductionInputTokenBudget,
} from "./config.js";

export function words(text: string): string[] {
  return Array.from(text.toLowerCase().matchAll(/[a-z0-9]+/g))
    .map((match) => match[0])
    .filter((word) => !stopwords.has(word) && word.length > 1);
}

export function cosineSimilarity(left: string, right: string): number {
  const leftCounts = countWords(words(left));
  const rightCounts = countWords(words(right));
  const shared = Array.from(leftCounts.keys()).filter((word) => rightCounts.has(word));

  if (shared.length === 0) {
    return 0;
  }

  const dot = shared.reduce(
    (sum, word) => sum + leftCounts.get(word)! * rightCounts.get(word)!,
    0,
  );
  const leftNorm = vectorNorm(leftCounts);
  const rightNorm = vectorNorm(rightCounts);
  return dot / (leftNorm * rightNorm);
}

export function weightedSimilarity(query: string, text: string): number {
  const queryTerms = new Set(words(query));
  const textTerms = new Set(words(text));
  const importantOverlap = Array.from(queryTerms).filter(
    (word) => textTerms.has(word) && importantTerms.has(word),
  );
  const priorityOverlap = importantOverlap.filter((word) =>
    ["budget", "fail", "failure", "failures"].includes(word),
  );

  return (
    cosineSimilarity(query, text)
    + 0.15 * importantOverlap.length
    + 0.35 * priorityOverlap.length
  );
}

function countWords(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return counts;
}

function vectorNorm(counts: Map<string, number>): number {
  return Math.sqrt(
    Array.from(counts.values()).reduce((sum, count) => sum + count * count, 0),
  );
}

export function approximateTokens(text: string): number {
  return Math.max(1, Math.floor(text.length / 4));
}

export function splitText(text: string): string[] {
  const chunks: string[] = [];
  let currentParagraphs: string[] = [];
  let currentSize = 0;

  for (const paragraph of text.trim().split(/\n\s*\n/)) {
    const cleanParagraph = paragraph.trim();

    if (!cleanParagraph) {
      continue;
    }

    if (currentParagraphs.length > 0 && currentSize + cleanParagraph.length > chunkSize) {
      chunks.push(currentParagraphs.join("\n\n"));
      currentParagraphs = [];
      currentSize = 0;
    }

    currentParagraphs.push(cleanParagraph);
    currentSize += cleanParagraph.length;
  }

  if (currentParagraphs.length > 0) {
    chunks.push(currentParagraphs.join("\n\n"));
  }

  return chunks;
}

export function summarizeText(text: string, maxSentences = 2): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= maxSentences) {
    return sentences.join(" ");
  }

  const scoredSentences = sentences.map((sentence, position) => {
    const termScore = words(sentence).filter((word) => importantTerms.has(word)).length * 3;
    const firstSentenceBonus = position === 0 ? 1 : 0;
    return {
      score: termScore + firstSentenceBonus,
      position,
      sentence,
    };
  });

  return scoredSentences
    .sort((left, right) => right.score - left.score || left.position - right.position)
    .slice(0, maxSentences)
    .sort((left, right) => left.position - right.position)
    .map((item) => item.sentence)
    .join(" ");
}

export function packSummariesByTokenBudget(
  summaries: string[],
  tokenBudget: number,
): string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentTokens = 0;

  for (const summary of summaries) {
    const summaryTokens = approximateTokens(summary);

    if (currentBatch.length > 0 && currentTokens + summaryTokens > tokenBudget) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokens = 0;
    }

    currentBatch.push(summary);
    currentTokens += summaryTokens;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

export function forceSummaryReductionProgress(summaries: string[]): string[][] {
  const batches: string[][] = [];

  for (let index = 0; index < summaries.length; index += 2) {
    batches.push(summaries.slice(index, index + 2));
  }

  return batches;
}

export function reduceSummaryBatch(summaries: string[]): string {
  return summarizeText(summaries.join(" "), 3);
}

export function recursivelyReduceSummaries(summaries: string[]): string {
  if (summaries.length === 0) {
    return "No summary available.";
  }

  let currentSummaries = summaries;
  let level = 1;

  while (currentSummaries.length > 1) {
    let batches = packSummariesByTokenBudget(
      currentSummaries,
      summaryReductionInputTokenBudget,
    );

    if (batches.length === currentSummaries.length) {
      batches = forceSummaryReductionProgress(currentSummaries);
    }

    console.log(
      `Reducing ${currentSummaries.length} summaries into ${batches.length} batch summaries at level ${level}`,
    );

    currentSummaries = batches.map((batch) => reduceSummaryBatch(batch));
    level += 1;
  }

  return summarizeText(currentSummaries[0], 3);
}
