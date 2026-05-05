# Voice-Based Decoding Assessment

Replace the manual "Easy / Difficult" buttons on `/assess/decoding` with a microphone flow. The learner taps a mic, reads the displayed word aloud, and the app automatically classifies the attempt as **Easy** or **Difficult** based on what it hears — no self-rating needed. The rest of the screen (header, word card, progress dots, completion state) stays exactly as in the screenshot.

## How the voice analysis works

We use the browser-native **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition`) — no external API key, no cost, runs locally in Chrome/Edge/Safari. For each word:

1. User taps the **mic button** (replaces the two buttons).
2. We start `SpeechRecognition` with `lang="en-US"`, `interimResults=true`, `maxAlternatives=5`, and a **3.5s listening window**.
3. We measure two signals:
   - **Pronunciation match score** — Levenshtein-based similarity between the target word and each alternative transcript (best of 5). Normalized to `[0,1]`.
   - **Response latency** — ms from `onstart` to first non-empty interim result. Long latency = hesitation = harder.
4. **Classification rule** (deterministic, fast):
   - `similarity ≥ 0.8` AND `latency < 1500ms` → **Easy**
   - `similarity < 0.5` OR `latency > 2800ms` OR no speech detected → **Difficult**
   - Otherwise → **Difficult** (conservative, since hesitation matters for dyslexia screening)
5. For **nonwords** (`blap`, `strom`, `frindle`), the recognizer often returns the closest real word — we compare phonetically using a simple **Soundex / Metaphone-lite** function so `"blap"` ≈ `"blap"`/`"blah"`/`"blab"` counts as a successful decode attempt; total mismatch (e.g. silence or `"I don't know"`) counts as Difficult.
6. Result is fed into the existing `recordDecoding(trial.kind, difficult)` call — **the downstream ML pipeline (logistic regression, `update_word_model`, phonological/surface scores) stays unchanged**.

## UI changes (matching the screenshot)

Everything in the card stays the same except the action area:

```text
┌─────────────────────────────────────┐
│           Word 5 of 6               │
│                                     │
│           frindle                   │
│                                     │
│      ┌───────────────┐              │
│      │  🎤  Tap to   │   ← single   │
│      │     read      │     mic btn  │
│      └───────────────┘              │
│                                     │
│   "Listening…" / waveform pulse     │
│                                     │
│      • • • • • ○                    │
└─────────────────────────────────────┘
```

States of the mic button:
- **Idle**: teal pill, mic icon + "Tap to read aloud"
- **Listening**: pulsing ring animation, "Listening…", red dot
- **Analyzing**: spinner, "Got it — analyzing…"
- **Result flash** (300ms): green check "Sounds easy" or amber "Let's note that" — then auto-advance to next word

Below the mic, a tiny muted line: *"We'll listen to how you read it — your mic stays on this device."*

### Fallback
If `SpeechRecognition` is unavailable (Firefox, denied permission, no mic), we **gracefully fall back to the original two-button UI** with a small notice: *"Voice not available — tap how it felt instead."*

## Files to change

| File | Change |
|---|---|
| `src/pages/DecodingAssessment.tsx` | Replace Easy/Difficult buttons with mic flow; keep header, word card, progress dots, and completion state identical. Call existing `recordDecoding` + `upsertLearnerProfile` with the auto-classified result. |
| `src/lib/speech.ts` *(new)* | Wrapper around `SpeechRecognition`: `listenForWord(target, kind, timeoutMs) → { heard, similarity, latencyMs, difficult }`. Includes Levenshtein, vowel-stripped phonetic compare for nonwords, and capability detection. |
| `src/store/learner.ts` | Add optional `lastVoiceSample?: { word; heard; similarity; latencyMs }` to the reasoning log payload so the existing reasoning panel can show *"Heard 'frindel' (0.71 match, 1.9s) → counted as difficult"*. No schema change needed. |

## Reasoning-panel entries (keeps the "personalized" feel)

After each trial we call `log(...)` with messages like:
- `"Heard 'photosynthesis' clearly in 0.9s — easy."`
- `"Heard 'frindel' (0.71 similarity, 1.9s hesitation) — counted as difficult."`
- `"No speech detected for 'yacht' — counted as difficult."`

## Privacy

Web Speech API in Chrome/Edge streams audio to Google for transcription; we'll add a one-line disclosure under the mic and a `"Use buttons instead"` link that switches to the legacy UI permanently for that session. No audio is stored by us.

## Out of scope

- No new Supabase tables, no edge functions, no API keys.
- No changes to the ML model, `word_model`, or the rest of the app — only the decoding-assessment input method changes.

