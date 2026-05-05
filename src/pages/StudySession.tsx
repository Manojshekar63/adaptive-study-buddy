import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { PRESET_TOPICS } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowRight, Eye, Focus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { recordWordTap, recordWordExposures } from "@/lib/api/learner";

const AUTO_HELP_THRESHOLD = 0.4;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

function syllabify(word: string): string[] {
  // naive friendly chunker for demo
  const w = word.toLowerCase();
  if (w.length <= 4) return [word];
  const groups: string[] = [];
  let cur = "";
  const vowels = "aeiouy";
  for (let i = 0; i < w.length; i++) {
    cur += word[i];
    const next = w[i + 1];
    if (vowels.includes(w[i]) && next && !vowels.includes(next) && i < w.length - 2) {
      groups.push(cur);
      cur = "";
    }
  }
  if (cur) groups.push(cur);
  return groups.length > 1 ? groups : [word];
}

export default function StudySession() {
  const nav = useNavigate();
  const { schedule, currentBlockId, topic, uploadedName, topicContent, decoding, log } = useLearner();
  const block = schedule.find((b) => b.id === currentBlockId) ?? schedule.find((b) => b.kind === "study" && !b.done);

  const supports = block?.supports ?? { audio: decoding.phonological >= 2, chunking: decoding.phonological >= 1 };

  const content = useMemo(() => {
    if (topicContent?.paragraphs?.length) return topicContent;
    if (topic && PRESET_TOPICS[topic]) return PRESET_TOPICS[topic];
    if (topic) return { title: topic, paragraphs: ["Your reading is being prepared. Please head back to the schedule in a moment."] };
    return PRESET_TOPICS[Object.keys(PRESET_TOPICS)[0]];
  }, [topic, uploadedName, topicContent]);

  const [pIdx, setPIdx] = useState(0);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{ word: string; pieces: string[] } | null>(null);
  const [focus, setFocus] = useState(true);

  useEffect(() => { log(`Session started · ${content.title} · supports ${JSON.stringify(supports)}`, "session"); }, []);

  const paragraphs = content.paragraphs;
  const para = paragraphs[pIdx];
  const words = para.split(/\s+/);

  const next = () => {
    if (pIdx + 1 >= paragraphs.length) { nav("/study/feedback"); return; }
    setPIdx(pIdx + 1); setActiveWord(null); setBreakdown(null);
  };

  const onWordClick = (w: string) => {
    if (!supports.chunking) return;
    setBreakdown({ word: w.replace(/[.,!?;:]$/, ""), pieces: syllabify(w.replace(/[.,!?;:]$/, "")) });
  };

  return (
    <div className={`max-w-3xl mx-auto ${focus ? "" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Now reading</p>
          <h1 className="font-display font-bold text-2xl">{content.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFocus((f) => !f)} className="gap-2">
          {focus ? <Eye className="w-4 h-4" /> : <Focus className="w-4 h-4" />}
          {focus ? "Exit focus" : "Focus mode"}
        </Button>
      </div>

      {/* progress */}
      <div className="flex gap-1.5 mb-6">
        {paragraphs.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < pIdx ? "bg-primary" : i === pIdx ? "bg-primary/60" : "bg-border"}`} />
        ))}
      </div>

      <motion.div
        layout
        className={`rounded-3xl border border-border bg-card shadow-soft p-8 sm:p-12 ${focus ? "min-h-[420px]" : ""}`}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={pIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-2xl sm:text-3xl leading-[1.7] reading-width text-foreground/90"
          >
            {words.map((w, i) => (
              <span
                key={i}
                onMouseEnter={() => setActiveWord(i)}
                onMouseLeave={() => setActiveWord((c) => (c === i ? null : c))}
                onClick={() => onWordClick(w)}
                className={`cursor-pointer rounded px-0.5 transition-colors ${
                  activeWord === i ? "bg-accent-soft text-accent-foreground" : ""
                } ${supports.chunking ? "hover:bg-primary-soft" : ""}`}
              >
                {w}{" "}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>

        <AnimatePresence>
          {breakdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft/60 p-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Sound it out</p>
                  <div className="font-display font-bold text-3xl tracking-wide">
                    {breakdown.pieces.join("·")}
                  </div>
                </div>
                {supports.audio && (
                  <Button
                    variant="outline"
                    onClick={() => toast.success(`Playing audio: ${breakdown.word}`)}
                    className="gap-2 rounded-full"
                  >
                    <Volume2 className="w-4 h-4" /> Play audio
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Paragraph {pIdx + 1} of {paragraphs.length}</span>
          <Button size="lg" onClick={next} className="rounded-full px-8 gap-2">
            {pIdx + 1 >= paragraphs.length ? "Finish session" : "Next"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {supports.chunking && !breakdown && (
        <p className="text-xs text-muted-foreground mt-4 text-center">Tip: tap any word to break it into sounds.</p>
      )}
    </div>
  );
}
