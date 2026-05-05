import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle2, Clock, Sparkles, Activity, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { setWordMasteredApi } from "@/lib/api/learner";

export default function Dashboard() {
  const nav = useNavigate();
  const { name, schedule, history, readingSpeed, decoding, fatigue, difficultWords, setWordMastered } = useLearner();

  const tricky = Object.entries(difficultWords)
    .filter(([, v]) => !v.mastered && v.tapCount > 0)
    .sort((a, b) => b[1].difficulty - a[1].difficulty)
    .slice(0, 8);

  const total = schedule.length || 1;
  const done = schedule.filter((b) => b.done).length;
  const pct = Math.round((done / total) * 100);
  const totalMin = schedule.reduce((a, b) => a + b.minutes, 0);
  const remainingMin = schedule.filter((b) => !b.done).reduce((a, b) => a + b.minutes, 0);

  const status =
    history.length === 0 ? "Getting to know you"
    : history[history.length - 1].difficulty === "hard" ? "Adapting · easing pace"
    : history[history.length - 1].difficulty === "easy" ? "On a roll"
    : "On track";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Your day</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-1">
            {name ? `Welcome back, ${name}.` : "Welcome back."}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-sm">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          {status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2 rounded-3xl bg-card border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Today's progress</h3>
            <span className="text-sm text-muted-foreground">{done} / {total} blocks</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Stat icon={CheckCircle2} label="Completed" value={`${done}`} />
            <Stat icon={Clock} label="Remaining" value={`${remainingMin}m`} />
            <Stat icon={Flame} label="Streak" value={`${Math.max(1, history.length)}d`} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl bg-card border border-border shadow-card p-6">
          <h3 className="font-display font-semibold mb-4">Learning posture</h3>
          <Row label="Reading pace" value={readingSpeed ?? "—"} />
          <Row label="Energy" value={`${fatigue}/4`} />
          <Row label="Decoding signal" value={decoding.phonological >= 2 ? "Supported" : "Light"} />
          <Row label="Today's plan" value={`${totalMin} min`} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-3xl bg-card border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Daily summary</h3>
          <Button size="sm" variant="ghost" onClick={() => nav("/schedule")}>Open plan</Button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Finish your first session to see a recap here.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(-5).reverse().map((h, i) => (
              <li key={i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <span>Session marked <span className="font-semibold capitalize">{h.difficulty}</span></span>
                <span className="text-muted-foreground">{new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <div className="text-center mt-8">
        <Button onClick={() => nav("/study/new")} className="rounded-full px-7">Plan another topic</Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-display font-bold text-2xl mt-1">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
