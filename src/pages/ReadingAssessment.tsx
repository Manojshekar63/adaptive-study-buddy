import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLearner, ReadingSpeed } from "@/store/learner";
import { ASSESSMENT_PARAGRAPH } from "@/lib/content";
import { motion } from "framer-motion";
import { Check, Timer } from "lucide-react";

export default function ReadingAssessment() {
  const nav = useNavigate();
  const { setReading } = useLearner();
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ wpm: number; speed: ReadingSpeed } | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!started || result) return;
    const id = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(id);
  }, [started, result]);

  const begin = () => { startRef.current = Date.now(); setStarted(true); };
  const done = () => {
    const seconds = (Date.now() - startRef.current) / 1000;
    const words = ASSESSMENT_PARAGRAPH.split(/\s+/).length;
    const wpm = Math.round((words / seconds) * 60);
    const speed: ReadingSpeed = wpm < 140 ? "slow" : wpm > 220 ? "fast" : "medium";
    setReading(wpm, speed);
    setResult({ wpm, speed });
  };

  const speedCopy: Record<ReadingSpeed, string> = {
    slow: "a careful, steady pace",
    medium: "a moderate, balanced pace",
    fast: "a confident, quick pace",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Step 1 of 2 · Reading pace</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">Read this paragraph at your natural pace.</h1>
      <p className="text-muted-foreground mb-8">No pressure — just read like you normally would.</p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-card border border-border shadow-soft p-8 sm:p-10"
      >
        {!result ? (
          <>
            <p className="text-xl sm:text-2xl leading-relaxed reading-width">
              {started ? ASSESSMENT_PARAGRAPH : <span className="text-muted-foreground italic">Press start when you're ready.</span>}
            </p>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span className="font-mono tabular-nums text-lg">{elapsed.toFixed(1)}s</span>
              </div>
              {!started ? (
                <Button onClick={begin} size="lg" className="rounded-full px-7">Start reading</Button>
              ) : (
                <Button onClick={done} size="lg" className="rounded-full px-7 gap-2">
                  <Check className="w-4 h-4" /> I'm done
                </Button>
              )}
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="text-center">
              <div className="font-display text-7xl font-bold text-primary">{result.wpm}</div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground mt-1">words per minute</div>
              <p className="mt-6 text-lg reading-width mx-auto">
                You read at <span className="font-semibold text-foreground">{speedCopy[result.speed]}</span>. We'll tune your sessions to match.
              </p>
              <Button size="lg" onClick={() => nav("/assess/decoding")} className="mt-8 rounded-full px-8">
                Continue
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
