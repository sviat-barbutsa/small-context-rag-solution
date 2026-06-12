# Small-Context RAG Solution

Companion code for the freeCodeCamp article on small-context RAG: [small-context-rag-solution](https://github.com/sviat-barbutsa/small-context-rag-solution).

Use summaries for retrieval, raw chunks for final answers, and recursive summary reduction to avoid giant prompts.

This repository is a small educational reference implementation of a practical RAG pattern I developed while building a local RAG system on a laptop with 12 GB of VRAM.

```text
document summary -> chunk summary -> raw chunk -> final answer
```

The core rule:

```text
Summaries help find relevant source material.
Raw chunks ground the answer.
Context budgeting decides what reaches the model.
```

To keep the demo simple and convenient, this repository uses small Python and TypeScript examples with simplified demo-only retrieval, summarization, and answer extraction. This lets you see the article's core ideas in practice without installing a full stack of dependencies, downloading models, running an LLM server, setting up an embedding service, or configuring a vector database.

The repo demonstrates the data flow and debugging pattern rather than production-grade model quality. In production, replace the simplified demo-only summarizer, similarity search, and token estimator with your model, embedding store, reranker, and tokenizer.

## Why This Exists

Basic RAG can fail even when retrieval finds the right chunk. If the final prompt budget is small, relevant chunks may be skipped before the model sees them.

This repo demonstrates a small-context RAG solution:

1. Summarize chunks.
2. Recursively reduce chunk summaries into document summaries.
3. Search document summaries first.
4. Search chunk summaries inside selected documents.
5. Convert chunk-summary hits back to raw chunks.
6. Apply a final context budget.
7. Answer only from raw chunk text.

## Repo Layout

```text
diagrams/
  context-budget-comparison.png
  hierarchical-rag-flow.png
  indexing-pipeline.png
  recursive-reduction.png

python/
typescript/
```

The diagram PNGs match the diagrams used in the article.

Both examples include the same four-document Markdown corpus used in the article's 250-token raw context test:

```text
context_window_notes.md
langchain_notes.md
large_rag_notes.md
project_notes.md
```

## Run The Python Example

```bash
cd python
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

## Run The TypeScript Example

```bash
cd typescript
npm install
npm run demo
```

Reproduce the article comparison:

```bash
RAW_CONTEXT_TOKEN_BUDGET=250 npm run demo
RAW_CONTEXT_TOKEN_BUDGET=1200 npm run demo
```

Interactive mode:

```bash
npm run build
npm start
```

Or build first and run the compiled version:

```bash
npm run build
node dist/index.js --question "Why can RAG fail when the context budget is too small?"
```

## Try These Questions

```text
Why can RAG fail when the context budget is too small?
What is recursive summary reduction?
Why include neighbor chunks?
```

Both examples are dependency-light and transparent. They use simplified demo-only local retrieval and summarization so the architecture is easy to inspect. In a production system, replace those pieces with your LLM, embedding model, and vector store.

The first question is the main reproducibility check. It should show the retrieval trace: document summary hits, chunk summary hits, raw chunks included, and raw chunks skipped by the 250-token context budget.

## License

MIT
