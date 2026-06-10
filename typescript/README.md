# TypeScript Example

This is a dependency-light TypeScript version of the small-context RAG solution.

The `data/` folder contains the same four Markdown files used in the article's 250-token raw context test:

```text
context_window_notes.md
langchain_notes.md
large_rag_notes.md
project_notes.md
```

It demonstrates:

- document summary retrieval
- per-document chunk summary retrieval
- recursive summary reduction
- raw chunk lookup by chunk ID
- final 250-token context budgeting

Install and run:

```bash
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

Build and run:

```bash
npm run build
node dist/index.js --question "Why can RAG fail when the context budget is too small?"
```

Try:

```text
Why can RAG fail when the context budget is too small?
What is recursive summary reduction?
Why include neighbor chunks?
```

The first question is the main reproducibility check. The trace should show document summary hits, chunk summary hits, raw chunks included, and raw chunks skipped by the 250-token context budget.
