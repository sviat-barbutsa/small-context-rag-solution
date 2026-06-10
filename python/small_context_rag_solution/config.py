from __future__ import annotations

import os
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
CHUNK_SIZE = 420
DOC_RETRIEVAL_K = 2
CHUNK_RETRIEVAL_K_PER_DOC = 2
SUMMARY_REDUCTION_INPUT_TOKEN_BUDGET = 90
EXPAND_NEIGHBOR_CHUNKS = True
DEFAULT_QUESTION = "Why can RAG fail when the context budget is too small?"


def get_int_env(name: str, default: int) -> int:
    value = os.getenv(name)

    if value is None:
        return default

    return int(value)


RAW_CONTEXT_TOKEN_BUDGET = get_int_env("RAW_CONTEXT_TOKEN_BUDGET", 250)

# ATTENTION! It's a demo-only word lists used by the simplified retriever and summarizer. Your real systems should replace this with embeddings, reranking tokenizer-aware budgeting, and model-generated summaries.
STOPWORDS = {
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
}

IMPORTANT_TERMS = {
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
}
