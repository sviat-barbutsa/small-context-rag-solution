from __future__ import annotations

import sys

from .config import DEFAULT_QUESTION, RAW_CONTEXT_TOKEN_BUDGET
from .index import build_records, create_hierarchical_index
from .models import HierarchicalIndex
from .retrieval import answer_question


def get_cli_question(arguments: list[str]) -> str | None:
    if "--question" not in arguments:
        return None

    question_index = arguments.index("--question") + 1

    if question_index >= len(arguments):
        return DEFAULT_QUESTION

    return arguments[question_index]


def print_answer(question: str, index: HierarchicalIndex) -> None:
    answer = answer_question(question, index)
    print("\nAnswer:")
    print(answer)


def main() -> None:
    print("Building hierarchical summary index")
    document_records, chunk_records = build_records()
    index = create_hierarchical_index(document_records, chunk_records)

    print("\nIndex ready")
    print(f"Documents: {len(document_records)}")
    print(f"Chunks: {len(chunk_records)}")
    print(f"Raw context budget: {RAW_CONTEXT_TOKEN_BUDGET} approx tokens")

    cli_question = get_cli_question(sys.argv[1:])

    if cli_question is not None:
        print(f"\nQuestion: {cli_question}")
        print_answer(cli_question, index)
        return

    while True:
        question = input("\nQuestion: ").strip()

        if question.lower() in {"q", "quit", "exit"}:
            break

        print_answer(question, index)
