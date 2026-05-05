## Problem

`StudySession.tsx` only knows three preset topics (Photosynthesis, Mitosis, French Revolution). For anything else the user types, this line falls back to the first preset:

```ts
const key = topic && PRESET_TOPICS[topic] ? topic : Object.keys(PRESET_TOPICS)[0];
```

That's why every custom topic shows Photosynthesis.

## Fix

Generate the reading content with AI for the user's actual topic, cache it on the schedule row, and render that instead of the preset fallback.

### 1. New edge function `generate-content`
- Input: `{ topic, scheduleId }`
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a system prompt tuned for dyslexic learners: short sentences, plain words, 3–4 paragraphs, ~60 words each, returned as structured JSON via tool calling: `{ title, paragraphs: string[] }`.
- Persists result to `schedules.content` (new `jsonb` column) so we don't regenerate on every visit.
- Handles 429 / 402 and returns a clear error.

### 2. Database migration
- `ALTER TABLE schedules ADD COLUMN content jsonb;`

### 3. Frontend wiring
- After `saveSchedule(...)` in `StudyInput.tsx`, call `supabase.functions.invoke('generate-content', { body: { topic, scheduleId } })` with a loading toast ("Preparing your reading…").
- Add `content` to the schedule load in `src/lib/api/learner.ts` and `useHydrateFromBackend.tsx`; store it in the Zustand store as `topicContent`.
- `StudySession.tsx`: prefer `topicContent` from the store; fall back to `PRESET_TOPICS` only if AI hasn't returned yet.
- For preset topics, skip the AI call and use `PRESET_TOPICS` directly (instant + free).

### 4. Loading / error UX
- While generating, show a friendly skeleton ("Writing your study text…") on the session page.
- On 429: toast "Lots of requests right now — try again in a moment." On 402: toast "Out of AI credits — add some in Settings → Workspace → Usage."

## About the Mistral key

You don't need to share it. This project already has **Lovable AI** wired in (the `ai-explain` function uses it), which gives access to Gemini and GPT-5 models with no key setup and free monthly usage. I'll use that. If you'd later prefer Mistral specifically, we can swap the gateway call — just say the word and I'll request the key then.

## Files touched
- new: `supabase/functions/generate-content/index.ts`
- new: migration adding `schedules.content jsonb`
- edit: `src/lib/api/learner.ts`, `src/hooks/useHydrateFromBackend.tsx`, `src/store/learner.ts`, `src/pages/StudyInput.tsx`, `src/pages/StudySession.tsx`
