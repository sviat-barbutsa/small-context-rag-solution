# Context Window Notes

A model's context window is the amount of text it can consider at one time.

The context includes the system prompt, user message, previous conversation, retrieved documents, tool results, and the model's generated output.

This project intentionally uses an 8192 token context window to practice realistic limitations.

The main workaround for large documents is retrieval augmented generation.

Instead of sending an entire document to the model, the system splits documents into chunks, embeds them, retrieves only the most relevant chunks, and sends only those chunks to the model.
