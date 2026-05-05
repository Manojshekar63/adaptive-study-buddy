import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingSpeed = "slow" | "medium" | "fast";
export type Fatigue = 1 | 2 | 3 | 4;
export type BlockKind = "study" | "break" | "review";

export interface ScheduleBlock {
  id: string;
  kind: BlockKind;
  title: string;
  minutes: number;
  reasons: string[];
  supports?: { audio?: boolean; chunking?: boolean; smallChunks?: boolean };
  modified?: boolean;
  done?: boolean;
}

export interface SessionRecord {
  blockId: string;
  difficulty: "easy" | "medium" | "hard";
  at: number;
}

export interface ReasoningEntry {
  id: string;
  at: number;
  message: string;
  tag?: string;
}

interface LearnerState {
  // onboarding
  name: string;
  goal: string;
  subjects: string[];
  availableMin: number;
  fatigue: Fatigue;
  // assessments
  readingSpeed?: ReadingSpeed;
  wpm?: number;
  decoding: { phonological: number; surface: number; trials: number };
  // study
  topic?: string;
  uploadedName?: string;
  scheduleId?: string;
  topicContent?: { title: string; paragraphs: string[] };
  difficultWords: Record<string, { difficulty: number; tapCount: number; mastered: boolean }>;
  schedule: ScheduleBlock[];
  currentBlockId?: string;
  history: SessionRecord[];
  reasoning: ReasoningEntry[];
  // ui
  reasoningOpen: boolean;
  tourActive: boolean;
  // actions
  setOnboarding: (p: Partial<Pick<LearnerState, "name" | "goal" | "subjects" | "availableMin" | "fatigue">>) => void;
  setReading: (wpm: number, speed: ReadingSpeed) => void;
  recordDecoding: (kind: "nonword" | "irregular", difficult: boolean) => void;
  setTopic: (t: string) => void;
  setUploaded: (n: string) => void;
  setScheduleId: (id?: string) => void;
  setTopicContent: (c?: { title: string; paragraphs: string[] }) => void;
  setSchedule: (s: ScheduleBlock[]) => void;
  setCurrentBlock: (id?: string) => void;
  recordSession: (rec: SessionRecord) => void;
  applyAdaptation: (next: ScheduleBlock[]) => void;
  setDifficultWords: (m: LearnerState["difficultWords"]) => void;
  bumpWordTap: (word: string) => void;
  setWordMastered: (word: string, mastered: boolean) => void;
  log: (message: string, tag?: string) => void;
  toggleReasoning: (v?: boolean) => void;
  setTour: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  name: "",
  goal: "",
  subjects: [] as string[],
  availableMin: 60,
  fatigue: 2 as Fatigue,
  readingSpeed: undefined,
  wpm: undefined,
  decoding: { phonological: 0, surface: 0, trials: 0 },
  topic: undefined,
  uploadedName: undefined,
  schedule: [] as ScheduleBlock[],
  currentBlockId: undefined,
  history: [] as SessionRecord[],
  reasoning: [] as ReasoningEntry[],
  reasoningOpen: false,
  tourActive: false,
};

export const useLearner = create<LearnerState>()(
  persist(
    (set, get) => ({
      ...initial,
      setOnboarding: (p) => set((s) => ({ ...s, ...p })),
      setReading: (wpm, speed) => {
        set({ wpm, readingSpeed: speed });
        get().log(`Reading pace measured: ${wpm} WPM → ${speed}`, "assessment");
      },
      recordDecoding: (kind, difficult) => {
        const d = { ...get().decoding, trials: get().decoding.trials + 1 };
        if (difficult) {
          if (kind === "nonword") d.phonological += 1;
          else d.surface += 1;
        }
        set({ decoding: d });
      },
      setTopic: (t) => set({ topic: t, uploadedName: undefined }),
      setUploaded: (n) => set({ uploadedName: n, topic: undefined }),
      setScheduleId: (id) => set({ scheduleId: id }),
      setTopicContent: (c) => set({ topicContent: c }),
      setSchedule: (s) => set({ schedule: s }),
      setCurrentBlock: (id) => set({ currentBlockId: id }),
      recordSession: (rec) => set((s) => ({ history: [...s.history, rec] })),
      applyAdaptation: (next) => set({ schedule: next }),
      log: (message, tag) =>
        set((s) => ({
          reasoning: [
            ...s.reasoning.slice(-49),
            { id: crypto.randomUUID(), at: Date.now(), message, tag },
          ],
        })),
      toggleReasoning: (v) => set((s) => ({ reasoningOpen: v ?? !s.reasoningOpen })),
      setTour: (v) => set({ tourActive: v }),
      reset: () => set({ ...initial }),
    }),
    { name: "readright-learner" }
  )
);
