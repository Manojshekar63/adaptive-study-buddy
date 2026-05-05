import { useEffect, useState } from "react";
import { useLearner } from "@/store/learner";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";

const STEPS: { path: string; title: string; body: string }[] = [
  { path: "/", title: "Welcome", body: "ReadRight tunes every study session to how you actually read — no labels, just behaviour." },
  { path: "/onboarding", title: "Quick onboarding", body: "Tell us your goal, subjects, and energy. We'll do the rest." },
  { path: "/assess/reading", title: "Reading pace", body: "We measure how fast you decode real text — privately." },
  { path: "/assess/decoding", title: "Decoding signal", body: "Six word trials silently reveal whether you struggle more with sounding out or with irregular spellings." },
  { path: "/study/new", title: "Bring your content", body: "Drop a PDF or just type a topic — both paths feel equally fluent." },
  { path: "/schedule", title: "Adaptive plan", body: "Every block carries a chip explaining why it looks the way it does." },
  { path: "/study/session", title: "Focus mode", body: "One paragraph at a time, with optional word breakdown and audio for tricky words." },
  { path: "/study/feedback", title: "Real-time adaptation", body: "Tell us how that felt and watch the schedule reflow before your eyes." },
  { path: "/dashboard", title: "Daily picture", body: "Track progress, streaks, and the system's current learning posture." },
];

export function DemoTour() {
  const { tourActive, setTour } = useLearner();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tourActive) return;
    setStep(0);
    navigate(STEPS[0].path);
  }, [tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    navigate(STEPS[step].path);
  }, [step, tourActive]);

  const close = () => { setTour(false); setStep(0); };
  const next = () => (step >= STEPS.length - 1 ? close() : setStep(step + 1));

  return (
    <AnimatePresence>
      {tourActive && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,460px)]"
        >
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5 ring-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-1">
                  Demo · {step + 1} of {STEPS.length}
                </p>
                <h4 className="font-display font-bold text-lg">{STEPS[step].title}</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{STEPS[step].body}</p>
              </div>
              <button onClick={close} className="text-muted-foreground hover:text-foreground -mt-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
                ))}
              </div>
              <Button size="sm" onClick={next} className="gap-1">
                {step >= STEPS.length - 1 ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
