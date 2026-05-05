import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLearner, Fatigue } from "@/store/learner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";

const SUBJECTS = ["Biology", "Math", "History", "English", "Chemistry", "Physics", "Geography", "Languages"];
const GOALS = ["Pass an exam", "Stay on top of class", "Learn for fun", "Build a daily habit"];
const FATIGUE: { v: Fatigue; label: string; icon: any }[] = [
  { v: 1, label: "Energised", icon: BatteryFull },
  { v: 2, label: "Fine", icon: BatteryMedium },
  { v: 3, label: "A bit tired", icon: BatteryLow },
  { v: 4, label: "Drained", icon: Battery },
];

export default function Onboarding() {
  const nav = useNavigate();
  const { setOnboarding, log } = useLearner();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [time, setTime] = useState(60);
  const [fatigue, setFatigue] = useState<Fatigue>(2);

  const steps = ["Your name", "Your goal", "Subjects", "Time today", "Energy level"];
  const next = () => setStep((s) => s + 1);

  const finish = async () => {
    setOnboarding({ name, goal, subjects, availableMin: time, fatigue });
    log(`Profile saved · ${time} min available · fatigue ${fatigue}/4`, "onboarding");
    if (user) {
      await upsertLearnerProfile(user.id, {
        name, goal, subjects, available_min: time, fatigue,
      });
      await logReasoning(user.id, `Profile saved · ${time} min available · fatigue ${fatigue}/4`, "onboarding");
    }
    nav("/assess/reading");
  };

  const canNext = [name.trim(), goal, subjects.length > 0, time > 0, true][step];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      <div className="rounded-3xl bg-card border border-border shadow-soft p-8 sm:p-10 min-h-[420px]">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
          Step {step + 1} of {steps.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <>
                <h2 className="font-display font-bold text-3xl mb-6">What should we call you?</h2>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  className="h-14 text-lg rounded-xl"
                />
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="font-display font-bold text-3xl mb-6">What's pulling you here, {name || "friend"}?</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`p-4 rounded-xl border text-left transition-all hover-lift ${
                        goal === g ? "border-primary bg-primary-soft ring-glow" : "border-border bg-card"
                      }`}
                    >
                      <span className="font-medium">{g}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="font-display font-bold text-3xl mb-6">Pick the subjects on your plate.</h2>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => {
                    const on = subjects.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setSubjects((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                        className={`px-4 py-2 rounded-full border text-sm transition-all ${
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="font-display font-bold text-3xl mb-2">How much time do you have today?</h2>
                <p className="text-muted-foreground mb-8">We'll fit a calm plan inside it.</p>
                <div className="text-center mb-6">
                  <span className="font-display text-6xl font-bold text-primary">{time}</span>
                  <span className="text-xl text-muted-foreground ml-2">minutes</span>
                </div>
                <Slider
                  value={[time]}
                  onValueChange={(v) => setTime(v[0])}
                  min={20}
                  max={120}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>20m</span><span>120m</span>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h2 className="font-display font-bold text-3xl mb-6">How's your energy right now?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FATIGUE.map((f) => {
                    const on = fatigue === f.v;
                    return (
                      <button
                        key={f.v}
                        onClick={() => setFatigue(f.v)}
                        className={`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all hover-lift ${
                          on ? "border-accent bg-accent-soft ring-glow" : "border-border bg-card"
                        }`}
                      >
                        <f.icon className={`w-7 h-7 ${on ? "text-accent" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next} disabled={!canNext} className="gap-2 rounded-full px-6">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={finish} className="gap-2 rounded-full px-6">
              Begin assessment <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
