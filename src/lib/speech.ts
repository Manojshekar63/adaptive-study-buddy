// Web Speech API wrapper for the decoding assessment.
// Listens to the user reading a target word and classifies the attempt
// as easy or difficult based on transcription similarity + response latency.

export interface VoiceResult {
  heard: string;
  similarity: number;
  latencyMs: number;
  difficult: boolean;
  reason: string;
}

type SR = any;

function getRecognitionCtor(): SR | null {
  if (typeof window === "undefined") return null;
  // @ts-ignore
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechSupported(): boolean {
  return !!getRecognitionCtor();
}

// Levenshtein distance
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[a.length];
}

function similarity(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return 0;
  const d = lev(x, y);
  return 1 - d / Math.max(x.length, y.length);
}

// Strip vowels for crude phonetic compare (helps for nonwords like "frindle")
function consonantSkeleton(s: string): string {
  return s.toLowerCase().replace(/[aeiou\s']/g, "");
}

function bestSimilarity(target: string, candidates: string[], kind: "nonword" | "irregular"): { heard: string; sim: number } {
  let best = { heard: "", sim: 0 };
  for (const c of candidates) {
    const direct = similarity(target, c);
    let sim = direct;
    if (kind === "nonword") {
      const phon = similarity(consonantSkeleton(target), consonantSkeleton(c));
      sim = Math.max(direct, phon * 0.95);
    }
    if (sim > best.sim) best = { heard: c, sim };
  }
  return best;
}

export function listenForWord(
  target: string,
  kind: "nonword" | "irregular",
  timeoutMs = 3500
): Promise<VoiceResult> {
  return new Promise((resolve) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      resolve({ heard: "", similarity: 0, latencyMs: 0, difficult: true, reason: "unsupported" });
      return;
    }
    const rec: SR = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = false;

    const candidates = new Set<string>();
    let startedAt = 0;
    let firstHeardAt = 0;
    let settled = false;

    const finish = (reason: string) => {
      if (settled) return;
      settled = true;
      try { rec.stop(); } catch {}
      const list = Array.from(candidates);
      const { heard, sim } = bestSimilarity(target, list, kind);
      const latency = firstHeardAt ? firstHeardAt - startedAt : timeoutMs;
      let difficult = true;
      let why = reason;
      if (!list.length) {
        difficult = true;
        why = "no-speech";
      } else if (sim >= 0.8 && latency < 1500) {
        difficult = false;
        why = "clear-fast";
      } else if (sim < 0.5 || latency > 2800) {
        difficult = true;
        why = sim < 0.5 ? "low-match" : "slow";
      } else {
        difficult = true;
        why = "borderline";
      }
      resolve({ heard, similarity: Number(sim.toFixed(2)), latencyMs: Math.round(latency), difficult, reason: why });
    };

    rec.onstart = () => { startedAt = performance.now(); };
    rec.onresult = (e: any) => {
      if (!firstHeardAt) firstHeardAt = performance.now();
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        for (let j = 0; j < r.length; j++) {
          const t = (r[j].transcript || "").trim();
          if (t) candidates.add(t);
        }
        if (r.isFinal) {
          setTimeout(() => finish("final"), 50);
        }
      }
    };
    rec.onerror = (e: any) => finish(`error:${e?.error || "unknown"}`);
    rec.onend = () => finish("end");

    setTimeout(() => finish("timeout"), timeoutMs);

    try {
      rec.start();
    } catch (err) {
      finish("start-failed");
    }
  });
}
