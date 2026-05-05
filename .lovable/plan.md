## ReadRight — Adaptive Study Scheduler Prototype

A frontend-only, demo-ready prototype that *feels* like an AI-powered adaptive study companion for dyslexic learners with phonological difficulty. Rule-based logic simulates intelligence; every decision is visualized.

### Visual System
- **Palette:** warm cream background (#FBF6EC), soft sage, muted teal, coral accents, charcoal text. All HSL tokens in `index.css`.
- **Typography:** Lexend (dyslexia-friendly) for body, Lexend Deca for headings — loaded via Google Fonts.
- **Spacing:** generous line-height (1.7), letter-spacing tweaks, max reading width 65ch.
- **Motion:** fade-in, slide-up, scale, schedule-block reflow animations. Smooth route transitions.

### Screen Flow

1. **Landing (`/`)** — Hero "Study Smarter, Not Harder", subhead about adaptive learning, CTA → onboarding. Soft illustration, three feature pills.

2. **Onboarding (`/onboarding`)** — Multi-step card: name → goal → subject chips (multi-select) → available time slider → fatigue level (4 visual mood cards). Progress dots.

3. **Reading Speed Analyzer (`/assess/reading`)** — Paragraph card, animated ring timer, "Done" button. Computes WPM → classifies slow/medium/fast with friendly result card.

4. **Cognitive Pattern Detection (`/assess/decoding`)** — 6 word trials mixing non-words (blap, strom, frindle) and irregular words (yacht, island, colonel). Easy/Difficult buttons. Internally tags `phonological` vs `surface` difficulty. **No labels shown to user** — only a warm "We've tuned things for you" confirmation.

5. **Study Input (`/study/new`)** — Tabbed UI:
   - **Upload:** drag-drop card, mock file preview chip
   - **Topic:** input → loads mock structured content (Photosynthesis, Mitosis, French Revolution presets)

6. **Schedule Engine (`/schedule`)** — Vertical timeline with color-coded study/break blocks. Each block has explanation chips ("Adjusted for reading pace", "Break added — fatigue", "Decoding support enabled"). Blocks animate in sequentially.

7. **Study Experience (`/study/session`)** — The hero screen:
   - Focus mode (dimmed chrome, single paragraph)
   - Word-level breakdown on click: `in·for·ma·tion`
   - Speaker icon (simulated audio — toast "Playing audio")
   - Active word highlight as user reads
   - Large Next button + segmented progress bar

8. **Feedback Loop (`/study/feedback`)** — Easy/Medium/Hard buttons. On select:
   - Schedule re-renders with animated diff
   - Modified blocks pulse + glow
   - Toast/banner: "Updated due to difficulty — next session shortened by 5 min, break added"

9. **Dashboard (`/dashboard`)** — Progress ring, completed vs remaining sessions, daily summary card, learning-status indicator chip ("On track", "Adapting"), streak.

### Simulated Intelligence Layer
A single `useLearnerProfile` store (Zustand + localStorage) holds:
```
{ name, goal, subjects, availableMin, fatigue,
  readingSpeed, decodingProfile: {phonological, surface},
  schedule: Block[], history: Session[] }
```
Rule engine in `lib/scheduleEngine.ts`:
- slow reader → 15-min blocks; fast → 30-min
- fatigue ≥3 → break every 2 blocks
- phonological score high → enable audio + chunking flags
- feedback Hard → shrink next block, repeat topic, insert break
- feedback Easy → lengthen, advance

### Demo Flourishes
- **Guided Tour:** floating "Demo Mode" button. Auto-advances through screens with narrated tooltip overlays (driver.js-style custom component).
- **Reasoning Side-Panel:** collapsible right drawer showing live "AI thinking" log — every rule that fires prints a line ("Detected slow reading pace → shortening sessions to 15 min"). Toggleable from header.

### Technical Notes
- React Router routes added to `App.tsx`
- Zustand for state; persist middleware for localStorage
- Framer Motion for schedule reflow + page transitions
- shadcn components: Card, Button, Tabs, Slider, Progress, Toast, Sheet (for reasoning panel), Dialog
- Fully responsive; accessibility: focus rings, aria-live for adaptation announcements, prefers-reduced-motion respected

### Out of Scope
- Real file parsing (mock preview only)
- Real TTS (toast simulation)
- Auth / backend
