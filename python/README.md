# Example: Small-Context RAG Solution

This example demonstrates summary-based retrieval for small-context RAG without external dependencies.

The `data/` folder contains the same four Markdown files used in the article's 250-token raw context test:

```text
context_window_notes.md
langchain_notes.md
large_rag_notes.md
project_notes.md
```

It uses:

- simple sentence extraction as a stand-in for LLM summarization
- bag-of-words cosine similarity as a stand-in for embedding search
- raw chunk context for final answers
- a deliberately small 250-token raw context budget so skipped chunks are visible

Run:

```bash
python3 -m small_context_rag_solution --question "Why can RAG fail when the context budget is too small?"
```

Reproduce the article comparison:

```bash
RAW_CONTEXT_TOKEN_BUDGET=250 python3 -m small_context_rag_solution --question "Why can RAG fail when the context budget is too small?"
RAW_CONTEXT_TOKEN_BUDGET=1200 python3 -m small_context_rag_solution --question "Why can RAG fail when the context budget is too small?"
```

Interactive mode:

```bash
python3 -m small_context_rag_solution
```

Try questions:

```text
Why can RAG fail when the context budget is too small?
What is recursive summary reduction?
Why include neighbor chunks?
```

The first question is the main reproducibility check. The trace should show document summary hits, chunk summary hits, raw chunks included, and raw chunks skipped by the 250-token context budget.
