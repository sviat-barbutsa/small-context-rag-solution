import { weightedSimilarity } from "./text.js";

export type Metadata = Record<string, string | number>;

export type SearchDocument = {
  pageContent: string;
  metadata: Metadata;
};

export type DocumentRecord = {
  docId: string;
  source: string;
  text: string;
  summary: string;
};

export type ChunkRecord = {
  chunkId: string;
  docId: string;
  source: string;
  index: number;
  text: string;
  summary: string;
  previousChunkId: string | null;
  nextChunkId: string | null;
};

export class SimpleVectorStore {
  constructor(private readonly documents: SearchDocument[]) {}

  similaritySearch(query: string, k: number): SearchDocument[] {
    return this.documents
      .map((document) => ({
        score: weightedSimilarity(query, document.pageContent),
        document,
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, k)
      .map((item) => item.document);
  }
}

export type HierarchicalIndex = {
  documentsById: Map<string, DocumentRecord>;
  chunksById: Map<string, ChunkRecord>;
  chunksByDocId: Map<string, ChunkRecord[]>;
  documentSummaryStore: SimpleVectorStore;
  chunkSummaryStoresByDocId: Map<string, SimpleVectorStore>;
};
