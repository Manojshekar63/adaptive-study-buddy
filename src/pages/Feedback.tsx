import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { useAuth } from "@/hooks/useAuth";
import { adapt } from "@/lib/scheduleEngine";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, BookOpen, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  replaceScheduleBlocks,
  recordSession as recordSessionDB,
  logReasoning,
} from "@/lib/api/learner";

type Diff = "easy" | "medium" | "hard";

export default function Feedback() {
  const nav = useNavigate();
  const { schedule, currentBlockId, scheduleId, topic, applyAdaptation, recordSession, log, setScheduleId, setSchedule } = useLearner();
  const { user } = useAuth();
  const [picked, setPicked] = useState<Diff | null>(null);
  const [explanation, setExplanation] = useState<string>("");

  const block = schedule.find((b) => b.id === currentBlockId) ?? schedule.find((b) => b.kind === "study" && !b.done);

  const choose = async (d: Diff) => {
    if (!block) return;
    const { next, explanation: localExp } = adapt(schedule, block.id, d);
    applyAdaptation(next);
    recordSession({ blockId: block.id, difficulty: d, at: Date.now() });
    setPicked(d);
    setExplanation(localExp);
    log(`Feedback: ${d} · ${localExp}`, "adaptation");

    if (user) {
      await recordSessionDB(user.id, block.id, d);
      if (scheduleId) {
        await replaceScheduleBlocks(user.id, scheduleId, next);
        // reload to get fresh IDs
        const { data: fresh } = await supabase
          .from("schedule_blocks")
          .select("*")
          .eq("schedule_id", scheduleId)
          .order("position");
        if (fresh) {
          setSchedule(
            fresh.map((b: any) => ({
              id: b.id,
              kind: b.kind,
              title: b.title,
              minutes: b.minutes,
              reasons: b.reasons ?? [],
              supports: b.supports ?? {},
              modified: b.modified,
              done: b.done,
            }))
          );
        }
        await logReasoning(user.id, `Feedback: ${d} · ${localExp}`, "adaptation", scheduleId);
      }

      // Ask AI for warmer explanation (non-blocking-ish)
      try {
        const { data } = await supabase.functions.invoke("ai-explain", {
          body: { difficulty: d, topic, fallback: localExp },
        });
        if (data?.explanation) setExplanation(data.explanation);
      } catch (e) {
        console.error("ai-explain", e);
      }
    }
  };
  // keep setScheduleId reference to avoid TS unused warn
  void setScheduleId;

  const iconFor = (k: string) => k === "study" ? BookOpen : k === "break" ? Coffee : RotateCcw;
  const colorFor = (k: string) =>
    k === "study" ? "bg-study-soft text-study border-study/30"
    : k === "break" ? "bg-break-soft text-foreground border-break/40"
    : "bg-focus-soft text-focus border-focus/30";

  return (
    <div className="max-w-3xl mx-auto">
      {!picked ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xl mx-auto py-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-3">How did that feel?</h1>
          <p className="text-muted-foreground mb-10">Your answer reshapes what comes next — instantly.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {(["easy", "medium", "hard"] as Diff[]).map((d) => (
              <button
                key={d}
                onClick={() => choose(d)}
                className="rounded-2xl border border-border bg-card p-6 hover-lift hover:border-primary/60"
              >
                <div className="text-3xl mb-2">{d === "easy" ? "🌱" : d === "medium" ? "🌤" : "🌧"}</div>
                <div className="font-display font-semibold capitalize">{d}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {d === "easy" ? "Felt smooth" : d === "medium" ? "Some effort" : "Tough going"}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-accent/40 bg-accent-soft/70 p-5 mb-8 flex items-start gap-3"
          >
            <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Plan updated</p>
              <p className="text-sm">{explanation}</p>
            </div>
          </motion.div>

          <h2 className="font-display font-bold text-2xl mb-4">Your reshaped plan</h2>

          <ol className="space-y-3 relative before:absolute before:left-7 before:top-2 before:bottom-2 before:w-px before:bg-border">
            <AnimatePresence initial={false}>
              {schedule.map((b, i) => {
                const Icon = iconFor(b.kind);
                return (
                  <motion.li
                    key={b.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 22 }}
                    className="relative pl-16"
                  >
                    <div className={`absolute left-3 top-3 w-9 h-9 rounded-full grid place-items-center border ${colorFor(b.kind)} ${b.modified ? "animate-pulse-glow" : ""}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={`rounded-2xl border bg-card p-4 shadow-card ${b.modified ? "border-accent ring-glow" : "border-border"} ${b.done ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-display font-semibold leading-tight">{b.title}</h3>
                          <div className="text-xs text-muted-foreground mt-0.5">{b.minutes} min · {b.kind}</div>
                        </div>
                        {b.modified && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-semibold">
                            Updated
                          </span>
                        )}
                        {b.done && <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">Done</span>}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>

          <div className="flex items-center justify-between mt-8">
            <Button variant="ghost" onClick={() => nav("/schedule")}>Back to plan</Button>
            <Button onClick={() => nav("/dashboard")} className="rounded-full px-6 gap-2">
              See dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
