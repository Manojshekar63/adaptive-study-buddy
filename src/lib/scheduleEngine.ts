import { ScheduleBlock, ReadingSpeed, Fatigue } from "@/store/learner";

const uid = () => Math.random().toString(36).slice(2, 9);

export interface BuildArgs {
  topic: string;
  availableMin: number;
  readingSpeed: ReadingSpeed;
  fatigue: Fatigue;
  phonological: number; // 0..3
  surface: number;
}

export function buildSchedule(args: BuildArgs): { blocks: ScheduleBlock[]; reasons: string[] } {
  const { topic, availableMin, readingSpeed, fatigue, phonological } = args;
  const reasons: string[] = [];

  let blockLen = 25;
  if (readingSpeed === "slow") { blockLen = 15; reasons.push("Shorter sessions for a steadier reading pace"); }
  else if (readingSpeed === "fast") { blockLen = 30; reasons.push("Longer sessions to match your quick pace"); }
  else reasons.push("Balanced 25-minute sessions");

  const breakEvery = fatigue >= 3 ? 1 : 2;
  if (fatigue >= 3) reasons.push("Frequent breaks added — energy is low");

  const supports = {
    audio: phonological >= 2,
    chunking: phonological >= 1,
    smallChunks: phonological >= 2,
  };
  if (supports.audio) reasons.push("Audio decoding support enabled");
  if (supports.chunking) reasons.push("Word-level breakdown enabled");

  const subModules = [
    `Intro to ${topic}`,
    `Core concepts of ${topic}`,
    `Examples & practice`,
    `Quick recap & quiz`,
  ];

  const blocks: ScheduleBlock[] = [];
  let used = 0;
  let i = 0;
  let sinceBreak = 0;

  while (used + blockLen <= availableMin && i < subModules.length) {
    blocks.push({
      id: uid(),
      kind: "study",
      title: subModules[i],
      minutes: blockLen,
      reasons: blockReasons(readingSpeed, supports),
      supports,
    });
    used += blockLen;
    sinceBreak += 1;
    i += 1;
    if (sinceBreak >= breakEvery && used + 5 <= availableMin && i < subModules.length) {
      const breakLen = fatigue >= 3 ? 7 : 5;
      blocks.push({
        id: uid(),
        kind: "break",
        title: "Recharge break",
        minutes: breakLen,
        reasons: [fatigue >= 3 ? "Break added — fatigue is high" : "Quick reset between sessions"],
      });
      used += breakLen;
      sinceBreak = 0;
    }
  }

  if (blocks.length && used + 10 <= availableMin) {
    blocks.push({
      id: uid(),
      kind: "review",
      title: "Spaced review",
      minutes: 10,
      reasons: ["Spaced repetition for stronger recall"],
      supports,
    });
  }

  return { blocks, reasons };
}

function blockReasons(speed: ReadingSpeed, s: { audio?: boolean; chunking?: boolean }) {
  const r: string[] = [];
  if (speed === "slow") r.push("Adjusted for reading pace");
  if (speed === "fast") r.push("Optimised for your fast pace");
  if (s.audio) r.push("Audio support");
  if (s.chunking) r.push("Decoding helpers");
  return r;
}

export function adapt(
  schedule: ScheduleBlock[],
  currentId: string,
  difficulty: "easy" | "medium" | "hard"
): { next: ScheduleBlock[]; explanation: string } {
  const idx = schedule.findIndex((b) => b.id === currentId);
  if (idx === -1) return { next: schedule, explanation: "" };

  const next = schedule.map((b) => ({ ...b, modified: false }));
  next[idx] = { ...next[idx], done: true };

  let explanation = "";

  if (difficulty === "hard") {
    // shrink next study block, insert break, add a repeat block
    const nextStudy = next.findIndex((b, i) => i > idx && b.kind === "study" && !b.done);
    if (nextStudy !== -1) {
      next[nextStudy] = {
        ...next[nextStudy],
        minutes: Math.max(10, next[nextStudy].minutes - 5),
        modified: true,
        reasons: [...next[nextStudy].reasons, "Shortened — last topic felt hard"],
      };
      next.splice(nextStudy, 0, {
        id: uid(),
        kind: "break",
        title: "Extra recharge",
        minutes: 5,
        reasons: ["Added because the last block felt hard"],
        modified: true,
      });
      next.splice(nextStudy + 2, 0, {
        id: uid(),
        kind: "review",
        title: `Re-visit: ${schedule[idx].title}`,
        minutes: 8,
        reasons: ["Repeating to strengthen recall"],
        modified: true,
        supports: schedule[idx].supports,
      });
      explanation = "Next session shortened, break added, topic queued for review.";
    } else {
      explanation = "Marked complete — we'll revisit this topic tomorrow.";
    }
  } else if (difficulty === "medium") {
    const nextStudy = next.findIndex((b, i) => i > idx && b.kind === "study" && !b.done);
    if (nextStudy !== -1) {
      next[nextStudy] = { ...next[nextStudy], modified: true, reasons: [...next[nextStudy].reasons, "Pace held steady"] };
    }
    explanation = "Pace looks good — keeping the plan steady.";
  } else {
    const nextStudy = next.findIndex((b, i) => i > idx && b.kind === "study" && !b.done);
    if (nextStudy !== -1) {
      next[nextStudy] = {
        ...next[nextStudy],
        minutes: next[nextStudy].minutes + 5,
        modified: true,
        reasons: [...next[nextStudy].reasons, "Lengthened — you're flowing"],
      };
    }
    explanation = "You're in flow — extending the next session by 5 minutes.";
  }

  return { next, explanation };
}
