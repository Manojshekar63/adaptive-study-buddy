## What "ML model" means here

A real per-student difficulty model doesn't need a heavy neural net — those need huge data per user and would never personalize from a single learner's clicks. Instead, we'll use the **right** ML approach for one-user-at-a-time learning:

**Online Bayesian difficulty estimation per word, per learner.**

For every (user, word) pair we maintain a posterior probability `p(hard | user, word)` that updates after every interaction. This is the same family of models used by Duolingo (Half-Life Regression) and Anki (SM-2). It works from the very first click, learns continuously, and is fully explainable.

### The model (simple, real, runs in the DB)

For each (user, word):
- `taps` — times the learner asked for help on this word
- `exposures` — times the word appeared in a passage they read
- `last_seen` — timestamp of last exposure
- `mastered` — learner-confirmed override

Difficulty score:
```text
difficulty = (taps + α) / (exposures + α + β) * decay(last_seen)
```
- `α = 1`, `β = 2` (Beta(1,2) prior — assume words are easy until proven otherwise)
- `decay(t) = 0.5 ^ (days_since / half_life_days)`, half-life = 14 days (forgetting curve)

Decision rule used at render time:
- `difficulty >= 0.4` AND not `mastered` → auto-show syllable breakdown + audio
- `difficulty >= 0.7` → also surface the word in "Tricky words" dashboard
- Threshold is tuned per-learner using their `phonological_score` (weaker decoders get a lower threshold so help arrives sooner)

This is genuinely an ML model: it has a prior, a likelihood update, time decay, and a personalized decision threshold. It just happens to be the right size for the data we have.

### Where the model runs

- **Update step**: a Postgres function `record_word_event(word, kind)` runs on every tap and every exposure. Pure SQL, atomic, RLS-protected.
- **Inference step**: a SQL view `v_word_difficulty` computes `difficulty` on read. The client just asks "give me my difficulty map" and renders accordingly.

No external service, no API key, no edge function. The "model weights" are the per-row counts — they live with the user's data and respect RLS.

## User-facing behavior

1. Student reads a passage. Every word shown is logged as 1 exposure (batched).
2. Student taps "process" → tap is logged → posterior updates → breakdown shows.
3. Next time "process" appears in any passage, on any topic, the breakdown is **already visible** because `difficulty` crossed the threshold.
4. Mastery: a "Got it" button on the dashboard sets `mastered=true`, which suppresses auto-help (but counts stay so the model can re-engage if struggle returns).
5. Reasoning log explains every adaptive change in plain English: *"Auto-chunking enabled for 'process' — difficulty 0.55 after 3 taps in 7 days."*

## Files to add / change

**Database** (`supabase/migrations/<new>.sql`)
- `word_events` table: `id, user_id, word, kind ('tap'|'exposure'), created_at`. RLS: owner only.
- `word_mastery` table: `user_id, word, mastered`. RLS: owner only.
- `record_word_event(p_word text, p_kind text)` SECURITY DEFINER function (granted to `authenticated` only) — inserts an event after lowercasing/stripping punctuation.
- View `v_word_difficulty` returning `(user_id, word, taps, exposures, last_seen, difficulty, mastered)` with the formula above. RLS via underlying tables.

**Client store** (`src/store/learner.ts`)
- Add `difficultWords: Record<word, { difficulty: number; mastered: boolean }>` and setter.

**Hydration** (`src/hooks/useHydrateFromBackend.tsx`, `src/lib/api/learner.ts`)
- On login, `select * from v_word_difficulty where user_id = auth.uid()` → load into store.

**Reading session** (`src/pages/StudySession.tsx`)
- On paragraph render: batch-call `record_word_event` with `kind='exposure'` for unique words (debounced, fire-and-forget).
- On word tap: `record_word_event(word, 'tap')`, optimistic local bump, show breakdown.
- Word renderer: if `difficulty(word) >= threshold(user)` and not mastered, render with persistent underline + chunked syllables shown beneath it (no tap needed). Audio button inline if `supports.audio`.

**Dashboard** (`src/pages/Dashboard.tsx`)
- "Your tricky words" card: top 8 by difficulty, with chunked spelling, difficulty bar, and "Got it" mastery button.
- Empty state: "Tap any word that feels tricky — your reader will adapt."

**Reasoning log**
- When a word first crosses the auto-help threshold, write a `reasoning_log` row.

## Why not a deep ML model

A neural model needs thousands of labeled examples per user before it beats this. The Beta-Binomial + decay approach above is what production literacy apps (Duolingo, IXL, Lexia) actually ship, because it's the right tool for sparse, per-user, online data. If you later want a richer model (e.g. transfer learning across phonetic patterns so taps on "process" boost help on "progress"), it slots in cleanly on top of these same events.
