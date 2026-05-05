## Goal

Make the reading experience adapt to each individual learner. When a student taps a word they find hard, increment a counter for that user+word in the database. As the count grows, automatically pre-show the syllable breakdown (and audio) every time that word appears in any future passage — without the student having to tap it again. Use this signal as a lightweight personal "model" of what each learner struggles with.

## How it works (user-facing)

1. Student opens a study passage (e.g. Photosynthesis).
2. Tapping the word "process" shows the syllable breakdown and increments `tap_count` for that user+word in the database (1, 2, 3, ...).
3. Once `tap_count >= 2`, the word "process" is treated as a **known difficult word** for that student.
4. From then on, in any passage on any topic, "process" is auto-highlighted and its breakdown is shown inline (chip under the paragraph, or always-visible chunked form on hover) — no tap required.
5. A small "My tricky words" view on the dashboard lists their top difficult words with counts, so progress is visible.
6. Counts decay slightly over time / can be reset when the learner marks a word as "I've got this".

## Technical plan

### 1. New table: `word_difficulty`

```text
word_difficulty
  id           uuid pk
  user_id      uuid  (RLS: auth.uid() = user_id)
  word         text  (lowercased, punctuation stripped)
  tap_count    int   default 1
  last_tapped  timestamptz default now()
  mastered     bool  default false
  unique (user_id, word)
```

- RLS: `Users manage own word difficulty` using `auth.uid() = user_id`.
- Index on `(user_id, word)` for fast lookup; index on `(user_id, tap_count desc)` for the dashboard list.
- Postgres function `increment_word_tap(p_word text)` (security definer, sets `search_path=public`) that does an `INSERT ... ON CONFLICT (user_id, word) DO UPDATE SET tap_count = tap_count + 1, last_tapped = now(), mastered = false` and returns the new row. Called from the client via `supabase.rpc`.

### 2. Client store (`src/store/learner.ts`)

- Add `difficultWords: Record<string, { count: number; mastered: boolean }>`.
- Add `bumpDifficultWord(word)` and `setDifficultWords(map)` actions.
- Hydrate from DB on login via `useHydrateFromBackend`.

### 3. Hydration (`src/hooks/useHydrateFromBackend.tsx` + `src/lib/api/learner.ts`)

- On sign-in, `select word, tap_count, mastered from word_difficulty where user_id = auth.uid()` and load into the store.

### 4. Reading session (`src/pages/StudySession.tsx`)

- On word click:
  - Normalize the word (lowercase, strip trailing punctuation).
  - Call `supabase.rpc('increment_word_tap', { p_word: normalized })`.
  - Update local store optimistically.
  - Show the existing syllable breakdown popover.
- Rendering each word:
  - If `difficultWords[word].count >= 2` and not `mastered`, render it with an underline + the syllabified form shown beneath the word automatically (no click needed). Show the audio button inline if `supports.audio`.
  - Threshold (default `>=2`) is a single constant so it's easy to tune later.
- Keep the existing `supports.chunking` gate as a fallback for users who haven't built any history yet.

### 5. Dashboard ("My tricky words")

- New small card on `Dashboard.tsx` listing top 10 words by `tap_count` with:
  - The word, its chunked form, count, and a "Mark as mastered" button (sets `mastered = true`).
- Empty state: "Tap any word that feels tricky while reading — I'll remember it for you."

### 6. Reasoning log

- When a word crosses the auto-show threshold for the first time, write a row to `reasoning_log` like: `Auto-chunking enabled for "process" after 2 taps` so the adaptive behavior is transparent.

## Why this is "personalised ML-like" without a heavy model

This is per-user online learning with a simple but effective signal: tap frequency is a direct measure of perceived difficulty. The same scaffold (per-user word stats with decay + mastery flag) is what a richer model would consume later. If you want to extend it, we can layer on:
- decay (halve counts weekly so old struggles fade),
- grouping by phonetic pattern (so "process" boosts "progress", "professor"),
- using the existing `phonological_score` / `surface_score` to weight the threshold per learner (a stronger decoder needs more taps before auto-showing).

These are easy follow-ups once the core loop is in place.

## Files to change / add

- `supabase/migrations/<new>.sql` — `word_difficulty` table, RLS, `increment_word_tap` function.
- `src/integrations/supabase/types.ts` — auto-regenerated.
- `src/store/learner.ts` — add `difficultWords` slice.
- `src/lib/api/learner.ts` — fetch + upsert helpers.
- `src/hooks/useHydrateFromBackend.tsx` — hydrate `difficultWords`.
- `src/pages/StudySession.tsx` — call RPC on tap, auto-render breakdown for known difficult words.
- `src/pages/Dashboard.tsx` — "My tricky words" card with mastery toggle.

No new secrets or external services needed. No edge function required (everything goes through RLS-protected RPC and table access).
