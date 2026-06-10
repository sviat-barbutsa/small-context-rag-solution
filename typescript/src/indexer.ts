import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { dataDir, rootDir } from "./config.js";
import {
  type ChunkRecord,
  type DocumentRecord,
  type HierarchicalIndex,
  type SearchDocument,
  SimpleVectorStore,
} from "./models.js";
import { recursivelyReduceSummaries, splitText, summarizeText } from "./text.js";

export function loadDocuments(): SearchDocument[] {
  return readdirSync(dataDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort()
    .map((fileName, index) => {
      const sourcePath = join(dataDir, fileName);
      const source = relative(rootDir, sourcePath).replaceAll("\\", "/");
      const stem = fileName.replace(/\.md$/, "");
      return {
        pageContent: readFileSync(sourcePath, "utf8"),
        metadata: {
          docId: `doc-${String(index + 1).padStart(3, "0")}-${stem}`,
          source,
        },
      };
    });
}

export function buildRecords(): [DocumentRecord[], ChunkRecord[]] {
  const documentRecords: DocumentRecord[] = [];
  const chunkRecords: ChunkRecord[] = [];

  for (const document of loadDocuments()) {
    const docId = String(document.metadata.docId);
    const source = String(document.metadata.source);
    const chunks = splitText(document.pageContent);
    const chunkSummaries: string[] = [];

    console.log(`\nIndexing ${source}`);
    console.log(`Created chunks: ${chunks.length}`);

    chunks.forEach((chunk, index) => {
      chunkSummaries.push(`Chunk ${index + 1} summary: ${summarizeText(chunk)}`);
    });

    const documentSummary = recursivelyReduceSummaries(chunkSummaries);
    documentRecords.push({
      docId,
      source,
      text: document.pageContent,
      summary: documentSummary,
    });

    chunks.forEach((chunk, index) => {
      const chunkNumber = index + 1;
      const chunkId = `${docId}-chunk-${String(chunkNumber).padStart(3, "0")}`;
      const previousChunkId =
        chunkNumber > 1
          ? `${docId}-chunk-${String(chunkNumber - 1).padStart(3, "0")}`
          : null;
      const nextChunkId =
        chunkNumber < chunks.length
          ? `${docId}-chunk-${String(chunkNumber + 1).padStart(3, "0")}`
          : null;

      chunkRecords.push({
        chunkId,
        docId,
        source,
        index: chunkNumber,
        text: chunk,
        summary: chunkSummaries[index],
        previousChunkId,
        nextChunkId,
      });
    });
  }

  return [documentRecords, chunkRecords];
}

export function createHierarchicalIndex(
  documentRecords: DocumentRecord[],
  chunkRecords: ChunkRecord[],
): HierarchicalIndex {
  const documentSummaryStore = new SimpleVectorStore(
    documentRecords.map((record) => ({
      pageContent: record.summary,
      metadata: {
        docId: record.docId,
        source: record.source,
      },
    })),
  );

  const chunksByDocId = new Map<string, ChunkRecord[]>();

  for (const chunk of chunkRecords) {
    const chunks = chunksByDocId.get(chunk.docId) ?? [];
    chunks.push(chunk);
    chunksByDocId.set(chunk.docId, chunks);
  }

  const chunkSummaryStoresByDocId = new Map<string, SimpleVectorStore>();

  for (const [docId, docChunks] of chunksByDocId.entries()) {
    chunkSummaryStoresByDocId.set(
      docId,
      new SimpleVectorStore(
        docChunks.map((chunk) => ({
          pageContent: chunk.summary,
          metadata: {
            chunkId: chunk.chunkId,
            docId: chunk.docId,
            source: chunk.source,
            chunkIndex: chunk.index,
          },
        })),
      ),
    );
  }

  return {
    documentsById: new Map(documentRecords.map((record) => [record.docId, record])),
    chunksById: new Map(chunkRecords.map((record) => [record.chunkId, record])),
    chunksByDocId,
    documentSummaryStore,
    chunkSummaryStoresByDocId,
  };
}
