import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { useAuth } from "@/hooks/useAuth";
import { upsertLearnerProfile } from "@/lib/api/learner";
import { DECODING_TRIALS } from "@/lib/content";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function DecodingAssessment() {
  const nav = useNavigate();
  const { recordDecoding, log, decoding } = useLearner();
  const { user } = useAuth();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);

  const trial = DECODING_TRIALS[i];

  const answer = (difficult: boolean) => {
    recordDecoding(trial.kind, difficult);
    if (i + 1 >= DECODING_TRIALS.length) {
      log("Decoding signal captured — calibrating supports.", "assessment");
      setDone(true);
      // persist final scores (use updated values)
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
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Step 2 of 2 · Word recognition</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">How does each of these feel to read?</h1>
      <p className="text-muted-foreground mb-8">Just a quick gut-check. There are no wrong answers.</p>

      <div className="rounded-3xl bg-card border border-border shadow-soft p-8 sm:p-12 min-h-[360px] flex flex-col items-center justify-center">
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
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" variant="outline" onClick={() => answer(true)} className="rounded-full px-7 h-12">
                  Difficult
                </Button>
                <Button size="lg" onClick={() => answer(false)} className="rounded-full px-7 h-12">
                  Easy
                </Button>
              </div>
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
