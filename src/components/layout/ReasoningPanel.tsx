import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLearner } from "@/store/learner";
import { Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function ReasoningPanel() {
  const { reasoningOpen, toggleReasoning, reasoning } = useLearner();
  return (
    <Sheet open={reasoningOpen} onOpenChange={(o) => toggleReasoning(o)}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-warm border-l-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            Adaptive reasoning
          </SheetTitle>
          <SheetDescription>
            A live look at the rules the system is firing as you interact.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2 max-h-[80vh] overflow-y-auto pr-2">
          <AnimatePresence initial={false}>
            {reasoning.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No signals yet. Start onboarding to see DyslexAI think.
              </p>
            )}
            {[...reasoning].reverse().map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                    {r.tag ?? "rule"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{r.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
