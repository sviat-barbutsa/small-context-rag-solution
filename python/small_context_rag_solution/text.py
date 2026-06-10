from __future__ import annotations

import math
import re
from collections import Counter

from .config import (
    CHUNK_SIZE,
    IMPORTANT_TERMS,
    STOPWORDS,
    SUMMARY_REDUCTION_INPUT_TOKEN_BUDGET,
)


def words(text: str) -> list[str]:
    return [
        word
        for word in re.findall(r"[a-z0-9]+", text.lower())
        if word not in STOPWORDS and len(word) > 1
    ]


def cosine_similarity(left: str, right: str) -> float:
    left_counts = Counter(words(left))
    right_counts = Counter(words(right))

    if not left_counts or not right_counts:
        return 0.0

    shared = set(left_counts) & set(right_counts)
    dot = sum(left_counts[word] * right_counts[word] for word in shared)
    left_norm = math.sqrt(sum(count * count for count in left_counts.values()))
    right_norm = math.sqrt(sum(count * count for count in right_counts.values()))
    return dot / (left_norm * right_norm)


def weighted_similarity(query: str, text: str) -> float:
    query_terms = set(words(query))
    text_terms = set(words(text))
    important_overlap = query_terms & text_terms & IMPORTANT_TERMS
    priority_overlap = important_overlap & {"budget", "fail", "failure", "failures"}
    return (
        cosine_similarity(query, text)
        + (0.15 * len(important_overlap))
        + (0.35 * len(priority_overlap))
    )


def approximate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def split_text(text: str) -> list[str]:
    chunks = []
    current_paragraphs = []
    current_size = 0

    for paragraph in re.split(r"\n\s*\n", text.strip()):
        paragraph = paragraph.strip()

        if not paragraph:
            continue

        if current_paragraphs and current_size + len(paragraph) > CHUNK_SIZE:
            chunks.append("\n\n".join(current_paragraphs))
            current_paragraphs = []
            current_size = 0

        current_paragraphs.append(paragraph)
        current_size += len(paragraph)

    if current_paragraphs:
        chunks.append("\n\n".join(current_paragraphs))

    return chunks


def summarize_text(text: str, max_sentences: int = 2) -> str:
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", " ".join(text.split()))
        if sentence.strip()
    ]

    if len(sentences) <= max_sentences:
        return " ".join(sentences)

    scored_sentences = []

    for position, sentence in enumerate(sentences):
        sentence_words = words(sentence)
        term_score = sum(3 for word in sentence_words if word in IMPORTANT_TERMS)
        first_sentence_bonus = 1 if position == 0 else 0
        scored_sentences.append(
            (
                term_score + first_sentence_bonus,
                position,
                sentence,
            )
        )

    selected = sorted(
        scored_sentences,
        key=lambda item: (-item[0], item[1]),
    )[:max_sentences]
    selected.sort(key=lambda item: item[1])

    return " ".join(sentence for _score, _position, sentence in selected)


def pack_summaries_by_token_budget(
    summaries: list[str],
    token_budget: int,
) -> list[list[str]]:
    batches = []
    current_batch = []
    current_tokens = 0

    for summary in summaries:
        summary_tokens = approximate_tokens(summary)

        if current_batch and current_tokens + summary_tokens > token_budget:
            batches.append(current_batch)
            current_batch = []
            current_tokens = 0

        current_batch.append(summary)
        current_tokens += summary_tokens

    if current_batch:
        batches.append(current_batch)

    return batches


def force_summary_reduction_progress(summaries: list[str]) -> list[list[str]]:
    return [summaries[index : index + 2] for index in range(0, len(summaries), 2)]


def reduce_summary_batch(summaries: list[str]) -> str:
    combined = " ".join(summaries)
    return summarize_text(combined, max_sentences=3)


def recursively_reduce_summaries(summaries: list[str]) -> str:
    if not summaries:
        return "No summary available."

    current_summaries = summaries
    level = 1

    while len(current_summaries) > 1:
        batches = pack_summaries_by_token_budget(
            current_summaries,
            SUMMARY_REDUCTION_INPUT_TOKEN_BUDGET,
        )

        if len(batches) == len(current_summaries):
            batches = force_summary_reduction_progress(current_summaries)

        print(
            f"Reducing {len(current_summaries)} summaries into {len(batches)} "
            f"batch summaries at level {level}"
        )

        current_summaries = [reduce_summary_batch(batch) for batch in batches]
        level += 1

    return summarize_text(current_summaries[0], max_sentences=3)
