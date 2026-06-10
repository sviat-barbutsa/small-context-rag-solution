from __future__ import annotations
from dataclasses import dataclass
from .text import weighted_similarity


@dataclass(frozen=True)
class SearchDocument:
    page_content: str
    metadata: dict[str, str | int]


@dataclass(frozen=True)
class DocumentRecord:
    doc_id: str
    source: str
    text: str
    summary: str


@dataclass(frozen=True)
class ChunkRecord:
    chunk_id: str
    doc_id: str
    source: str
    index: int
    text: str
    summary: str
    previous_chunk_id: str | None
    next_chunk_id: str | None


@dataclass(frozen=True)
class SimpleVectorStore:
    documents: list[SearchDocument]

    def similarity_search(self, query: str, k: int) -> list[SearchDocument]:
        scored = [
            (weighted_similarity(query, document.page_content), document)
            for document in self.documents
        ]
        scored.sort(key=lambda item: item[0], reverse=True)
        return [document for score, document in scored[:k] if score > 0]


@dataclass(frozen=True)
class HierarchicalIndex:
    documents_by_id: dict[str, DocumentRecord]
    chunks_by_id: dict[str, ChunkRecord]
    chunks_by_doc_id: dict[str, list[ChunkRecord]]
    document_summary_store: SimpleVectorStore
    chunk_summary_stores_by_doc_id: dict[str, SimpleVectorStore]
