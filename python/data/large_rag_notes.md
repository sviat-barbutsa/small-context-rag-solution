# Large RAG Notes

Retrieval augmented generation helps language models answer questions from large collections of text.

The basic idea is to keep the large document collection outside the prompt. The system only sends a small number of relevant chunks to the model.

This is useful when the full source material is too large for the model context window.

## Chunking

Chunking means splitting a long document into smaller pieces.

A chunk should be large enough to preserve meaning but small enough to retrieve precisely.

If chunks are too small, the answer may miss surrounding context.

If chunks are too large, the context window fills quickly.

This project starts with a chunk size of 800 characters and an overlap of 120 characters.

## Embeddings

An embedding is a vector representation of text.

Similar pieces of text should have similar vectors.

The system creates embeddings for each document chunk.

When the user asks a question, the system embeds the question too.

Then it compares the question vector with chunk vectors to find likely relevant chunks.

## Context Budgeting

The model cannot read unlimited text.

Even if the local model supports a large context window, this project uses an 8192 token budget for practice.

The retrieved context should stay below a smaller budget, such as 6000 tokens, so there is room for instructions, the user question, and the model answer.

Context budgeting prevents the prompt from becoming too large.

## Failure Modes

If the system sends too much text, the model may become slower, more expensive, or less focused.

If the system retrieves the wrong chunks, the answer may be incomplete.

If the system retrieves too few chunks, the answer may miss important details.

If the system retrieves too many chunks, irrelevant text may distract the model.

## Workarounds

The main workaround is selective retrieval.

Another workaround is summarizing old conversation history.

Another workaround is trimming less useful messages.

Another workaround is storing large intermediate artifacts outside the prompt and only keeping short references in active context.

Deep Agents includes built-in patterns that help with filesystem-backed context management and long-running tasks.
