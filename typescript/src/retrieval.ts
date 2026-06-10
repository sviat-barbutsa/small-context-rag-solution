import {
  chunkRetrievalKPerDoc,
  docRetrievalK,
  expandNeighborChunks,
  rawContextTokenBudget,
} from "./config.js";
import {
  type ChunkRecord,
  type HierarchicalIndex,
  type SearchDocument,
} from "./models.js";
import { approximateTokens, words } from "./text.js";

export function retrieveSummaryPath(
  question: string,
  index: HierarchicalIndex,
): [SearchDocument[], SearchDocument[]] {
  const documentHits = index.documentSummaryStore.similaritySearch(
    question,
    Math.min(docRetrievalK, index.documentsById.size),
  );
  const chunkHits: SearchDocument[] = [];
  const seenChunkIds = new Set<string>();

  for (const documentHit of documentHits) {
    const docId = String(documentHit.metadata.docId);
    const chunkStore = index.chunkSummaryStoresByDocId.get(docId);
    const docChunks = index.chunksByDocId.get(docId);

    if (!chunkStore || !docChunks) {
      continue;
    }

    const perDocHits = chunkStore.similaritySearch(
      question,
      Math.min(chunkRetrievalKPerDoc, docChunks.length),
    );

    for (const chunkHit of perDocHits) {
      const chunkId = String(chunkHit.metadata.chunkId);

      if (seenChunkIds.has(chunkId)) {
        continue;
      }

      chunkHits.push(chunkHit);
      seenChunkIds.add(chunkId);
    }
  }

  return [documentHits, chunkHits];
}

export function candidateRawChunks(
  chunkHits: SearchDocument[],
  index: HierarchicalIndex,
): ChunkRecord[] {
  const candidates: ChunkRecord[] = [];
  const seenChunkIds = new Set<string>();

  for (const chunkHit of chunkHits) {
    const chunk = index.chunksById.get(String(chunkHit.metadata.chunkId));

    if (!chunk) {
      continue;
    }

    const relatedChunkIds: Array<string | null> = [chunk.chunkId];

    if (expandNeighborChunks) {
      relatedChunkIds.push(chunk.nextChunkId, chunk.previousChunkId);
    }

    for (const chunkId of relatedChunkIds) {
      if (chunkId === null || seenChunkIds.has(chunkId)) {
        continue;
      }

      const rawChunk = index.chunksById.get(chunkId);

      if (!rawChunk) {
        continue;
      }

      candidates.push(rawChunk);
      seenChunkIds.add(chunkId);
    }
  }

  return candidates;
}

export function formatRawChunk(chunk: ChunkRecord): string {
  return [
    `Source: ${chunk.source}`,
    `Chunk ID: ${chunk.chunkId}`,
    `Chunk position: ${chunk.index}`,
    "",
    chunk.text,
  ].join("\n");
}

export function buildRawContext(
  chunkHits: SearchDocument[],
  index: HierarchicalIndex,
): [string, Array<[ChunkRecord, number]>, Array<[ChunkRecord, number]>] {
  const includedChunks: Array<[ChunkRecord, number]> = [];
  const skippedChunks: Array<[ChunkRecord, number]> = [];
  let usedTokens = 0;

  for (const chunk of candidateRawChunks(chunkHits, index)) {
    const rawContextPart = formatRawChunk(chunk);
    const rawContextTokens = approximateTokens(rawContextPart);

    if (usedTokens + rawContextTokens > rawContextTokenBudget) {
      skippedChunks.push([chunk, rawContextTokens]);
      continue;
    }

    includedChunks.push([chunk, rawContextTokens]);
    usedTokens += rawContextTokens;
  }

  includedChunks.sort(
    ([left], [right]) => left.source.localeCompare(right.source) || left.index - right.index,
  );

  const context = includedChunks.map(([chunk]) => formatRawChunk(chunk)).join("\n\n---\n\n");
  return [context, includedChunks, skippedChunks];
}

export function answerFromRawContext(question: string, rawContext: string): string {
  if (!rawContext) {
    return "I do not know from the retrieved raw chunks.";
  }

  const contentText = rawContext
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== "---")
    .filter((line) => !line.startsWith("Source:"))
    .filter((line) => !line.startsWith("Chunk ID:"))
    .filter((line) => !line.startsWith("Chunk position:"))
    .filter((line) => !line.startsWith("#"))
    .join(" ");

  const questionTerms = new Set(words(question));
  const asksAboutFailure = ["fail", "failure", "failures"].some((word) =>
    questionTerms.has(word),
  );
  const sentences = contentText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const scored = sentences
    .map((sentence) => {
      let score = words(sentence).filter((word) => questionTerms.has(word)).length;

      if (asksAboutFailure) {
        const lowered = sentence.toLowerCase();

        if (
          [
            "too much text",
            "wrong chunks",
            "too few chunks",
            "too many chunks",
            "miss important details",
            "may become slower",
          ].some((phrase) => lowered.includes(phrase))
        ) {
          score += 3;
        }
      }

      return {
        score,
        sentence,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return "I do not know from the retrieved raw chunks.";
  }

  return scored.map((item) => item.sentence).join(" ");
}

export function printRetrievalTrace(
  documentHits: SearchDocument[],
  chunkHits: SearchDocument[],
  includedChunks: Array<[ChunkRecord, number]>,
  skippedChunks: Array<[ChunkRecord, number]>,
): void {
  console.log("\nDocument summary hits:");
  documentHits.forEach((hit, index) => {
    console.log(`${index + 1}. ${hit.metadata.source}`);
    console.log(`   summary: ${hit.pageContent}`);
  });

  console.log("\nChunk summary hits:");
  chunkHits.forEach((hit, index) => {
    console.log(`${index + 1}. ${hit.metadata.chunkId}`);
    console.log(`   summary: ${hit.pageContent}`);
  });

  console.log("\nRaw chunks included:");
  includedChunks.forEach(([chunk, tokens], index) => {
    const preview = chunk.text.replace(/\s+/g, " ").slice(0, 140);
    console.log(`${index + 1}. ${chunk.chunkId} (${tokens} approx tokens)`);
    console.log(`   ${preview}...`);
  });

  console.log("\nRaw chunks skipped:");
  skippedChunks.forEach(([chunk, tokens], index) => {
    const preview = chunk.text.replace(/\s+/g, " ").slice(0, 140);
    console.log(`${index + 1}. ${chunk.chunkId} (${tokens} approx tokens)`);
    console.log(`   ${preview}...`);
  });
}

export function answerQuestion(question: string, index: HierarchicalIndex): string {
  const [documentHits, chunkHits] = retrieveSummaryPath(question, index);
  const [rawContext, includedChunks, skippedChunks] = buildRawContext(chunkHits, index);
  printRetrievalTrace(documentHits, chunkHits, includedChunks, skippedChunks);
  return answerFromRawContext(question, rawContext);
}
