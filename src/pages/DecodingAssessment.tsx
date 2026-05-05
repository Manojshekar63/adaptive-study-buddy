import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { useAuth } from "@/hooks/useAuth";
import { upsertLearnerProfile } from "@/lib/api/learner";
import { DECODING_TRIALS } from "@/lib/content";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { isSpeechSupported, listenForWord, type VoiceResult } from "@/lib/speech";

type Phase = "idle" | "listening" | "analyzing" | "result";

export default function DecodingAssessment() {
  const nav = useNavigate();
  const { recordDecoding, log, decoding } = useLearner();
  const { user } = useAuth();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [voiceMode, setVoiceMode] = useState(true);
  const supported = useRef(isSpeechSupported());
  const trial = DECODING_TRIALS[i];

  useEffect(() => {
    if (!supported.current) setVoiceMode(false);
  }, []);

  const submit = (difficult: boolean) => {
    recordDecoding(trial.kind, difficult);
    const isLast = i + 1 >= DECODING_TRIALS.length;
    if (isLast) {
      log("Decoding signal captured — calibrating supports.", "assessment");
      setDone(true);
      const next = { ...decoding, trials: decoding.trials + 1 };
      if (difficult) {
        if (trial.kind === "nonword") next.phonological += 1;
        else next.surface += 1;
      }
      if (user) {
        upsertLearnerProfile(user.id, {
          phonological_score: next.phonological,
          surface_score: next.surface,
          decoding_trials: next.trials,
        });
      }
    } else {
      setI(i + 1);
      setPhase("idle");
      setLastResult(null);
    }
  };

  const handleListen = async () => {
    setPhase("listening");
    setLastResult(null);
    const res = await listenForWord(trial.word, trial.kind);
    setPhase("analyzing");
    setLastResult(res);

    const heardLabel = res.heard ? `"${res.heard}"` : "nothing clear";
    const seconds = (res.latencyMs / 1000).toFixed(1);
    if (res.reason === "no-speech") {
      log(`No speech detected for "${trial.word}" — counted as difficult.`, "voice");
    } else if (!res.difficult) {
      log(`Heard ${heardLabel} for "${trial.word}" in ${seconds}s — easy.`, "voice");
    } else {
      log(`Heard ${heardLabel} for "${trial.word}" (${res.similarity} match, ${seconds}s) — counted as difficult.`, "voice");
    }

    setTimeout(() => {
      setPhase("result");
      setTimeout(() => submit(res.difficult), 700);
    }, 350);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Step 2 of 2 · Word recognition</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">How does each of these feel to read?</h1>
      <p className="text-muted-foreground mb-8">Read the word out loud — we'll listen and figure out the rest.</p>

      <div className="rounded-3xl bg-card border border-border shadow-soft p-8 sm:p-12 min-h-[420px] flex flex-col items-center justify-center">
        {!done ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={trial.word}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
              className="w-full text-center"
            >
              <div className="text-xs text-muted-foreground mb-6">Word {i + 1} of {DECODING_TRIALS.length}</div>
              <div className="font-display text-7xl sm:text-8xl font-bold tracking-tight mb-10">{trial.word}</div>

              {voiceMode ? (
                <VoicePanel
                  phase={phase}
                  result={lastResult}
                  onListen={handleListen}
                  onFallback={() => setVoiceMode(false)}
                  supported={supported.current}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-3">
                    <Button size="lg" variant="outline" onClick={() => submit(true)} className="rounded-full px-7 h-12">
                      Difficult
                    </Button>
                    <Button size="lg" onClick={() => submit(false)} className="rounded-full px-7 h-12">
                      Easy
                    </Button>
                  </div>
                  {supported.current && (
                    <button
                      onClick={() => setVoiceMode(true)}
                      className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
                    >
                      Use voice instead
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-1 mt-10">
                {DECODING_TRIALS.map((_, k) => (
                  <span key={k} className={`h-1.5 rounded-full transition-all ${k <= i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-soft text-primary grid place-items-center mx-auto mb-5">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">We've tuned things for you.</h2>
            <p className="text-muted-foreground reading-width mx-auto">
              Your sessions will quietly include the right supports — no labels, just better reading.
            </p>
            <Button size="lg" onClick={() => nav("/study/new")} className="mt-8 rounded-full px-8">
              Add what to study
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function VoicePanel({
  phase,
  result,
  onListen,
  onFallback,
  supported,
}: {
  phase: Phase;
  result: VoiceResult | null;
  onListen: () => void;
  onFallback: () => void;
  supported: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      {phase === "idle" && (
        <>
          <button
            onClick={onListen}
            className="relative inline-flex items-center gap-3 rounded-full bg-primary text-primary-foreground px-7 h-14 font-medium shadow-soft hover:opacity-90 transition"
          >
            <Mic className="w-5 h-5" />
            Tap to read aloud
          </button>
          <p className="text-xs text-muted-foreground">
            We'll listen to how you read it — your mic stays on this device.
          </p>
          {supported && (
            <button onClick={onFallback} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4">
              Use buttons instead
            </button>
          )}
        </>
      )}

      {phase === "listening" && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground grid place-items-center">
              <Mic className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Listening…
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Got it — analyzing…</p>
        </div>
      )}

      {phase === "result" && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 rounded-full px-5 h-12 ${
            result.difficult ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {result.difficult ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          <span className="font-medium">
            {result.difficult ? "Let's note that" : "Sounds easy"}
          </span>
        </motion.div>
      )}
    </div>
  );
}
