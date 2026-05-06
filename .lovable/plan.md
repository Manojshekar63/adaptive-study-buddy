# Use the uploaded PDF as the actual reading content

## The bug today

When a PDF is uploaded on `/study/new`:
1. `StudyInput.handleUpload` extracts text via `extractFileText` into `uploadedText`.
2. `generate()` calls `setTopicContent(undefined)` and then fires the `generate-content` edge function (Lovable AI) to **rewrite** the notes into 4 short paragraphs.
3. While the AI is still working — or if it errors / runs out of credits — `StudySession` hits this fallback in `src/pages/StudySession.tsx`:
   ```ts
   return PRESET_TOPICS[Object.keys(PRESET_TOPICS)[0]];   // Photosynthesis
   ```
   So the user sees the canned Photosynthesis passage instead of anything from their PDF.

The user wants the **actual PDF text** to appear (a "manual" passage built from the upload), no Photosynthesis fallback, and no dependency on the AI rewrite.

## Plan

### 1. Build the passage directly from the extracted PDF text
File: `src/lib/pdfText.ts` — add a small helper:
```ts
export function chunkIntoParagraphs(text: string, target = 4): { title: string; paragraphs: string[] }
```
- Cleans whitespace, splits on existing blank lines first.
- If fewer than `target` chunks, splits on sentence boundaries (`. ! ?`) and re-groups into ~`target` paragraphs of roughly equal sentence count (cap each paragraph at ~80 words so it stays dyslexia-friendly).
- Title = first non-empty line (≤ 60 chars), trimmed; falls back to the filename.

### 2. Use that passage immediately on upload
File: `src/pages/StudyInput.tsx` (inside `generate()` when `source === "upload"`):
- If `sourceText` has ≥ 40 chars, call `chunkIntoParagraphs(sourceText)` and `setTopicContent(...)` **before** navigating.
- Skip the `generate-content` AI invocation entirely for uploads — the user explicitly wants their own notes, not a rewrite. (Topic mode keeps using the AI / preset path unchanged.)
- If extraction failed (`uploadedText` < 40 chars), still navigate but set a clear placeholder passage like *"We couldn't read text from this PDF. Try a text-based PDF or type the topic instead."* — no Photosynthesis.

### 3. Remove the Photosynthesis fallback in StudySession
File: `src/pages/StudySession.tsx`, the `content` `useMemo`:
- If `topicContent?.paragraphs?.length` → use it.
- Else if `topic && PRESET_TOPICS[topic]` → use the preset (only when the user explicitly picked that preset topic).
- Else → return `{ title: topic || uploadedName || "Your reading", paragraphs: ["Your reading isn't ready yet. Go back to the schedule and try again."] }`.
- **Delete** the `PRESET_TOPICS[Object.keys(PRESET_TOPICS)[0]]` line so Photosynthesis never appears unsolicited.

### 4. Persist the manual passage
In `StudyInput.generate()` for uploads, after `saveSchedule`, write the manual `content` onto the schedule row:
```ts
await supabase.from("schedules").update({ content }).eq("id", scheduleId);
```
So a refresh / `useHydrateFromBackend` still loads the user's PDF text, not a fallback.

## Files changed
- `src/lib/pdfText.ts` — add `chunkIntoParagraphs`.
- `src/pages/StudyInput.tsx` — build passage from PDF text, persist to `schedules.content`, skip AI for uploads.
- `src/pages/StudySession.tsx` — remove Photosynthesis fallback, show graceful empty state.

## Out of scope
- The ML model, decoding assessment, voice flow, edge function code — all unchanged.
- Topic-mode (typed topic / preset chips) keeps its current AI-generated passage behaviour.
