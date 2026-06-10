from __future__ import annotations

import re

from .config import (
    CHUNK_RETRIEVAL_K_PER_DOC,
    DOC_RETRIEVAL_K,
    EXPAND_NEIGHBOR_CHUNKS,
    RAW_CONTEXT_TOKEN_BUDGET,
)
from .models import ChunkRecord, HierarchicalIndex, SearchDocument
from .text import approximate_tokens, words


def retrieve_summary_path(
    question: str,
    index: HierarchicalIndex,
) -> tuple[list[SearchDocument], list[SearchDocument]]:
    document_hits = index.document_summary_store.similarity_search(
        question,
        k=min(DOC_RETRIEVAL_K, len(index.documents_by_id)),
    )

    chunk_hits = []
    seen_chunk_ids = set()

    for document_hit in document_hits:
        doc_id = str(document_hit.metadata["doc_id"])
        chunk_store = index.chunk_summary_stores_by_doc_id[doc_id]
        doc_chunk_count = len(index.chunks_by_doc_id[doc_id])
        per_doc_hits = chunk_store.similarity_search(
            question,
            k=min(CHUNK_RETRIEVAL_K_PER_DOC, doc_chunk_count),
        )

        for chunk_hit in per_doc_hits:
            chunk_id = str(chunk_hit.metadata["chunk_id"])

            if chunk_id in seen_chunk_ids:
                continue

            chunk_hits.append(chunk_hit)
            seen_chunk_ids.add(chunk_id)

    return document_hits, chunk_hits


def candidate_raw_chunks(
    chunk_hits: list[SearchDocument],
    index: HierarchicalIndex,
) -> list[ChunkRecord]:
    candidates = []
    seen_chunk_ids = set()

    for chunk_hit in chunk_hits:
        chunk = index.chunks_by_id[str(chunk_hit.metadata["chunk_id"])]
        related_chunk_ids = [chunk.chunk_id]

        if EXPAND_NEIGHBOR_CHUNKS:
            related_chunk_ids.extend([chunk.next_chunk_id, chunk.previous_chunk_id])

        for chunk_id in related_chunk_ids:
            if chunk_id is None or chunk_id in seen_chunk_ids:
                continue

            candidates.append(index.chunks_by_id[chunk_id])
            seen_chunk_ids.add(chunk_id)

    return candidates


def format_raw_chunk(chunk: ChunkRecord) -> str:
    return (
        f"Source: {chunk.source}\n"
        f"Chunk ID: {chunk.chunk_id}\n"
        f"Chunk position: {chunk.index}\n\n"
        f"{chunk.text}"
    )


def build_raw_context(
    chunk_hits: list[SearchDocument],
    index: HierarchicalIndex,
) -> tuple[str, list[tuple[ChunkRecord, int]], list[tuple[ChunkRecord, int]]]:
    included_chunks = []
    skipped_chunks = []
    used_tokens = 0

    for chunk in candidate_raw_chunks(chunk_hits, index):
        raw_context_part = format_raw_chunk(chunk)
        raw_context_tokens = approximate_tokens(raw_context_part)

        if used_tokens + raw_context_tokens > RAW_CONTEXT_TOKEN_BUDGET:
            skipped_chunks.append((chunk, raw_context_tokens))
            continue

        included_chunks.append((chunk, raw_context_tokens))
        used_tokens += raw_context_tokens

    included_chunks.sort(key=lambda item: (item[0].source, item[0].index))

    context = "\n\n---\n\n".join(
        format_raw_chunk(chunk)
        for chunk, _tokens in included_chunks
    )

    return context, included_chunks, skipped_chunks


def answer_from_raw_context(question: str, raw_context: str) -> str:
    if not raw_context:
        return "I do not know from the retrieved raw chunks."

    content_lines = []

    for line in raw_context.splitlines():
        stripped = line.strip()

        if not stripped:
            continue

        if stripped == "---":
            continue

        if stripped.startswith(("Source:", "Chunk ID:", "Chunk position:")):
            continue

        if stripped.startswith("#"):
            continue

        content_lines.append(stripped)

    content_text = " ".join(content_lines)
    question_terms = set(words(question))
    asks_about_failure = bool(question_terms & {"fail", "failure", "failures"})
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", content_text)
        if sentence.strip()
    ]
    scored = []

    for sentence in sentences:
        sentence_terms = set(words(sentence))
        score = len(question_terms & sentence_terms)

        if asks_about_failure:
            lowered = sentence.lower()

            if any(
                phrase in lowered
                for phrase in (
                    "too much text",
                    "wrong chunks",
                    "too few chunks",
                    "too many chunks",
                    "miss important details",
                    "may become slower",
                )
            ):
                score += 3

        scored.append((score, sentence))

    scored.sort(key=lambda item: item[0], reverse=True)
    best = [sentence for score, sentence in scored[:3] if score > 0]

    if not best:
        return "I do not know from the retrieved raw chunks."

    return " ".join(best)


def print_retrieval_trace(
    document_hits: list[SearchDocument],
    chunk_hits: list[SearchDocument],
    included_chunks: list[tuple[ChunkRecord, int]],
    skipped_chunks: list[tuple[ChunkRecord, int]],
) -> None:
    print("\nDocument summary hits:")
    for position, hit in enumerate(document_hits, start=1):
        print(f"{position}. {hit.metadata['source']}")
        print(f"   summary: {hit.page_content}")

    print("\nChunk summary hits:")
    for position, hit in enumerate(chunk_hits, start=1):
        print(f"{position}. {hit.metadata['chunk_id']}")
        print(f"   summary: {hit.page_content}")

    print("\nRaw chunks included:")
    for position, (chunk, tokens) in enumerate(included_chunks, start=1):
        preview = " ".join(chunk.text.split())[:140]
        print(f"{position}. {chunk.chunk_id} ({tokens} approx tokens)")
        print(f"   {preview}...")

    print("\nRaw chunks skipped:")
    for position, (chunk, tokens) in enumerate(skipped_chunks, start=1):
        preview = " ".join(chunk.text.split())[:140]
        print(f"{position}. {chunk.chunk_id} ({tokens} approx tokens)")
        print(f"   {preview}...")


def answer_question(question: str, index: HierarchicalIndex) -> str:
    document_hits, chunk_hits = retrieve_summary_path(question, index)
    raw_context, included_chunks, skipped_chunks = build_raw_context(chunk_hits, index)
    print_retrieval_trace(document_hits, chunk_hits, included_chunks, skipped_chunks)
    return answer_from_raw_context(question, raw_context)
