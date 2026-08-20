// Shared between server code (ai-assistant.ts, chat.ts) and client UI
// (chat-thread-view.tsx) — kept in its own file so the UI doesn't need to
// import the server-only Gemini call just to know the AI's display name.
export const ASSISTANT_NAME = 'MIA';
