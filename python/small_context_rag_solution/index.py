from __future__ import annotations

from .config import DATA_DIR
from .models import (
    ChunkRecord,
    DocumentRecord,
    HierarchicalIndex,
    SearchDocument,
    SimpleVectorStore,
)
from .text import recursively_reduce_summaries, split_text, summarize_text


def load_documents() -> list[SearchDocument]:
    documents = []

    for index, path in enumerate(sorted(DATA_DIR.glob("*.md")), start=1):
        documents.append(
            SearchDocument(
                page_content=path.read_text(encoding="utf-8"),
                metadata={
                    "doc_id": f"doc-{index:03d}-{path.stem}",
                    "source": str(path.relative_to(DATA_DIR.parent)),
                },
            )
        )

    return documents


def build_records() -> tuple[list[DocumentRecord], list[ChunkRecord]]:
    document_records = []
    chunk_records = []

    for document in load_documents():
        doc_id = str(document.metadata["doc_id"])
        source = str(document.metadata["source"])
        chunks = split_text(document.page_content)
        chunk_summaries = []

        print(f"\nIndexing {source}")
        print(f"Created chunks: {len(chunks)}")

        for index, chunk in enumerate(chunks, start=1):
            summary = f"Chunk {index} summary: {summarize_text(chunk)}"
            chunk_summaries.append(summary)

        document_summary = recursively_reduce_summaries(chunk_summaries)
        document_records.append(
            DocumentRecord(
                doc_id=doc_id,
                source=source,
                text=document.page_content,
                summary=document_summary,
            )
        )

        for index, (chunk, summary) in enumerate(zip(chunks, chunk_summaries), start=1):
            chunk_id = f"{doc_id}-chunk-{index:03d}"
            previous_chunk_id = None
            next_chunk_id = None

            if index > 1:
                previous_chunk_id = f"{doc_id}-chunk-{index - 1:03d}"

            if index < len(chunks):
                next_chunk_id = f"{doc_id}-chunk-{index + 1:03d}"

            chunk_records.append(
                ChunkRecord(
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    source=source,
                    index=index,
                    text=chunk,
                    summary=summary,
                    previous_chunk_id=previous_chunk_id,
                    next_chunk_id=next_chunk_id,
                )
            )

    return document_records, chunk_records


def create_hierarchical_index(
    document_records: list[DocumentRecord],
    chunk_records: list[ChunkRecord],
) -> HierarchicalIndex:
    document_summary_store = SimpleVectorStore(
        [
            SearchDocument(
                page_content=record.summary,
                metadata={"doc_id": record.doc_id, "source": record.source},
            )
            for record in document_records
        ]
    )

    chunks_by_doc_id: dict[str, list[ChunkRecord]] = {}

    for chunk in chunk_records:
        chunks_by_doc_id.setdefault(chunk.doc_id, []).append(chunk)

    chunk_summary_stores_by_doc_id = {}

    for doc_id, doc_chunks in chunks_by_doc_id.items():
        chunk_summary_stores_by_doc_id[doc_id] = SimpleVectorStore(
            [
                SearchDocument(
                    page_content=chunk.summary,
                    metadata={
                        "chunk_id": chunk.chunk_id,
                        "doc_id": chunk.doc_id,
                        "source": chunk.source,
                        "chunk_index": chunk.index,
                    },
                )
                for chunk in doc_chunks
            ]
        )

    return HierarchicalIndex(
        documents_by_id={record.doc_id: record for record in document_records},
        chunks_by_id={record.chunk_id: record for record in chunk_records},
        chunks_by_doc_id=chunks_by_doc_id,
        document_summary_store=document_summary_store,
        chunk_summary_stores_by_doc_id=chunk_summary_stores_by_doc_id,
    )
