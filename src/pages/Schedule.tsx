import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, BookOpen, Sparkles, Play, RotateCcw, Volume2, ScissorsLineDashed } from "lucide-react";

export default function Schedule() {
  const nav = useNavigate();
  const { schedule, setCurrentBlock, name, topic, uploadedName } = useLearner();

  if (schedule.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-muted-foreground mb-6">No plan yet — let's build one.</p>
        <Button onClick={() => nav("/study/new")}>Add study content</Button>
      </div>
    );
  }

  const subject = topic ?? uploadedName ?? "your topic";
  const total = schedule.reduce((a, b) => a + b.minutes, 0);

  const start = (id: string) => { setCurrentBlock(id); nav("/study/session"); };

  const iconFor = (k: string) => k === "study" ? BookOpen : k === "break" ? Coffee : RotateCcw;
  const colorFor = (k: string) =>
    k === "study" ? "bg-study-soft text-study border-study/30"
    : k === "break" ? "bg-break-soft text-foreground border-break/40"
    : "bg-focus-soft text-focus border-focus/30";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Your plan{name ? `, ${name}` : ""}</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-1">{subject}</h1>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-2xl">{total}<span className="text-base text-muted-foreground"> min</span></div>
          <div className="text-xs text-muted-foreground">{schedule.length} blocks</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-accent-soft/60 px-5 py-3 mb-8 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-sm">
          Plan tuned to your reading pace, energy and decoding profile. Hover any block to see why it's there.
        </p>
      </div>

      <ol className="space-y-3 relative before:absolute before:left-7 before:top-2 before:bottom-2 before:w-px before:bg-border">
        <AnimatePresence initial={true}>
          {schedule.map((b, i) => {
            const Icon = iconFor(b.kind);
            return (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                className="relative pl-16"
              >
                <div className={`absolute left-3 top-3 w-9 h-9 rounded-full grid place-items-center border ${colorFor(b.kind)} ${b.modified ? "animate-pulse-glow" : ""}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className={`rounded-2xl border bg-card p-5 shadow-card hover-lift ${b.modified ? "border-accent ring-glow" : "border-border"} ${b.done ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display font-semibold text-lg leading-tight">{b.title}</h3>
                      <div className="text-sm text-muted-foreground mt-0.5">{b.minutes} min · {b.kind}</div>
                    </div>
                    {b.kind === "study" && !b.done && (
                      <Button size="sm" onClick={() => start(b.id)} className="rounded-full gap-1">
                        <Play className="w-3.5 h-3.5" /> Start
                      </Button>
                    )}
                    {b.done && <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground">Done</span>}
                  </div>
                  {b.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {b.reasons.map((r, k) => (
                        <span key={k} className="text-[11px] px-2.5 py-1 rounded-full bg-primary-soft/70 text-primary border border-primary/20">
                          {r}
                        </span>
                      ))}
                      {b.supports?.audio && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent-soft text-accent-foreground border border-accent/30 inline-flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Audio
                        </span>
                      )}
                      {b.supports?.chunking && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent-soft text-accent-foreground border border-accent/30 inline-flex items-center gap-1">
                          <ScissorsLineDashed className="w-3 h-3" /> Chunked
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
