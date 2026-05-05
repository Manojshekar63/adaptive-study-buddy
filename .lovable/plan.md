## Goal

Replace the Bayesian formula with a **trained logistic regression model per learner**, updated online (SGD) after every word interaction. The model predicts `p(struggle | word, learner)` from word features and learner state — not just from past taps on that specific word. This means it can predict difficulty for words the learner has **never seen before**, which the current model cannot.

## The model

**Per learner**, store a weight vector `w ∈ ℝ^9` and bias `b`:

```
features f(word, learner):
  f1 = log(1 + length)
  f2 = consonant_cluster_count        (e.g. "str", "ngth")
  f3 = vowel_ratio                    (vowels / length)
  f4 = syllable_estimate              (naive, same as current syllabify)
  f5 = is_irregular_spelling          (1 if matches simple regex set)
  f6 = log(1 + tap_count_for_word)    (per-user)
  f7 = log(1 + exposures_for_word)    (per-user)
  f8 = days_since_last_seen / 14      (capped)
  f9 = learner.phonological_score / 5 (global learner trait)

prediction:  p = sigmoid(w·f + b)
loss:        binary cross-entropy with label y∈{0,1}
                y = 1 if learner tapped the word for help in this exposure
                y = 0 if word was shown and not tapped
update (SGD, η=0.1, L2=1e-4):
  w ← w − η · ((p − y)·f + λ·w)
  b ← b − η · (p − y)
```

This is a real ML model: parameters, gradient updates, regularization, and predictions for unseen inputs. It learns **what kinds of words** trip up this specific learner — a feature the formula cannot capture.

## Where it runs

- **Training (online)**: Postgres function `update_word_model(p_word, p_label)` — pulls the learner's current weights, computes features in SQL, applies one SGD step, writes weights back. One round trip per interaction, ~1ms.
- **Inference**: Postgres function `predict_word_difficulty(p_word)` returning `p`. Called rarely; mostly we batch-predict for all words in the current paragraph via `predict_words_difficulty(p_words text[])` returning `(word, p)`.
- **Cold start**: until the learner has ≥10 events, fall back to the current `v_word_difficulty` Bayesian score. After 10 events, switch to the trained model. This is automatic in `predict_words_difficulty`.

All weights stay per-user, RLS-protected. No external compute, no edge function.

## Schema changes

New table `word_model`:
```text
word_model
  user_id      uuid pk
  weights      double precision[]  -- length 9
  bias         double precision    default 0
  trained_n    integer             default 0   -- # SGD steps taken
  updated_at   timestamptz
```
RLS: owner only. Auto-initialized on first call with zeros.

New table `word_event` (append-only, needed for proper labels):
```text
word_event
  id           uuid pk
  user_id      uuid
  word         text       -- normalized
  label        smallint   -- 1 = tap, 0 = exposure-without-tap
  features     double precision[]  -- snapshot, length 9, for replay/audit
  predicted_p  double precision
  created_at   timestamptz
```
RLS: owner only. Used for: model audit, retraining from scratch, future batch experiments.

Keep `word_difficulty` as the running counters table (already in place) — it feeds features `f6`, `f7`, `f8`.

## Functions

- `extract_word_features(p_word text, p_user uuid) returns double precision[]` — computes the 9 features in SQL using `word_difficulty` for per-user counters and `learner_profiles` for `phonological_score`.
- `predict_words_difficulty(p_words text[]) returns table(word text, p double precision, source text)` — batch predict; `source = 'model' | 'baseline'` depending on cold-start.
- `update_word_model(p_word text, p_label smallint) returns void` — one SGD step + writes a `word_event` row + bumps `word_difficulty` counters (tap or exposure).
- All `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE ... TO authenticated` only.

## Client changes

- `src/lib/api/learner.ts`:
  - `predictWordsDifficulty(words: string[])` → calls `predict_words_difficulty`.
  - `recordWordTap(word)` → now calls `update_word_model(word, 1)` instead of the old RPC.
  - `recordWordExposures(words)` → loops and calls `update_word_model(word, 0)` for each (or a new batch RPC `update_word_model_batch`).

- `src/store/learner.ts`: keep `difficultWords` map but populate it from model predictions for the **current paragraph** (not from a global table). Cache predictions per word in-session.

- `src/pages/StudySession.tsx`:
  - On paragraph render: call `predictWordsDifficulty(uniqueWords)` once, store results in local state.
  - Word renderer: auto-help when `p >= threshold`. Threshold formula stays personal (`max(0.25, 0.4 − 0.05 × phonological)`).
  - On tap: optimistic local bump, fire `update_word_model(word, 1)`.
  - After paragraph "Next": fire `update_word_model_batch(unTapped, 0)` so the model learns from non-taps too — these are the negative examples that prevent the model from predicting "everything is hard".

- `src/pages/Dashboard.tsx`: "Your tricky words" now ranks by the latest model prediction across recently-seen words. Add a small "Model trained on N interactions" line so the learning is visible. Add a "Reset my model" button that zeros the weights.

## Reasoning log

After every meaningful change, write a `reasoning_log` entry:
- *"Model updated · word 'process' · prediction 0.72 · label 1"* (debug-style, behind the AI reasoning panel).
- *"Auto-chunking now ON for words with consonant clusters ≥ 2 — your model learned this pattern."* — emitted when a feature weight crosses a threshold (interpretability touch).

## Cold start + safety

- Until `trained_n >= 10`, predictions come from the existing Bayesian view. No regression in UX for new learners.
- Hard cap weights to `[-5, 5]` after each step (prevents runaway).
- Bias initialized so `sigmoid(b) ≈ base_rate` (current global tap rate, default 0.15).

## Files

**Migrations**
- `supabase/migrations/<new>.sql` — `word_model`, `word_event`, all functions, RLS, grants.

**Code**
- `src/lib/api/learner.ts` — new `predictWordsDifficulty`, replace existing tap/exposure RPC calls.
- `src/store/learner.ts` — predictions cache helper.
- `src/pages/StudySession.tsx` — predict-on-render, label-on-next, tap update.
- `src/pages/Dashboard.tsx` — "Model trained on N" indicator, "Reset model" button.
- `src/hooks/useHydrateFromBackend.tsx` — also load `trained_n` from `word_model` for the dashboard.

## Why this is better than the current model

- **Generalizes**: predicts for words the learner has never seen, using word shape + their phonological profile.
- **Trainable**: real gradient descent, real loss, real regularization.
- **Auditable**: every event stored with features and prediction → you can re-derive the model.
- **Same UX**: auto-help still appears the same way; the brain behind it just got smarter.

If you want even more ML, the natural next steps from here are: (1) factorization-machine over phoneme n-grams (transfer between similar words), (2) replace logistic regression with a small per-user MLP once `trained_n > 500`. Both slot in by swapping the predict/update functions; the data layout doesn't change.
