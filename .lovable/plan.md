# Remove "Goal" and "Subjects" steps from Onboarding

The two screens shown ("What's pulling you here?" / "Pick the subjects on your plate.") will be removed from the onboarding flow. Nothing else in the app reads `goal` or `subjects` for behavior — they're only stored on the profile — so removal is safe.

## Changes

**`src/pages/Onboarding.tsx`**
- Drop `goal`, `setGoal`, `subjects`, `setSubjects` state and the `GOALS` / `SUBJECTS` constants.
- Reduce `steps` from 5 to 3: `["Your name", "Time today", "Energy level"]` (progress bar updates automatically).
- Remove the two `step === 1` (goal) and `step === 2` (subjects) JSX blocks; renumber Time → step 1, Energy → step 2.
- Update `canNext` array to match 3 steps.
- In `finish()`: call `setOnboarding({ name, availableMin: time, fatigue })` and `upsertLearnerProfile(user.id, { name, available_min: time, fatigue })` — no `goal`/`subjects` fields.

**`src/components/layout/DemoTour.tsx`** (line 10)
- Update copy: `"Tell us your goal, subjects, and energy."` → `"Tell us your available time and energy. We'll do the rest."`

## Left untouched (intentionally)
- `src/store/learner.ts`, `src/lib/api/learner.ts`, `src/hooks/useHydrateFromBackend.tsx`, and the `learner_profiles` DB columns keep `goal`/`subjects` as optional fields. They simply stay empty for new users — no migration needed, no risk to existing data, and no other page reads them for logic.

## Result
Onboarding becomes a 3-step flow: Name → Time → Energy. Reading/decoding assessments, schedule generation, and study sessions are unaffected.
