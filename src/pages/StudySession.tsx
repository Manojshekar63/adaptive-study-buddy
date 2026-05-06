import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLearner } from "@/store/learner";
import { PRESET_TOPICS } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowRight, Eye, Focus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { recordWordTap, recordWordExposures, predictWordsDifficulty } from "@/lib/api/learner";

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
  const { schedule, currentBlockId, topic, uploadedName, topicContent, decoding, log, difficultWords, bumpWordTap } = useLearner();
  const block = schedule.find((b) => b.id === currentBlockId) ?? schedule.find((b) => b.kind === "study" && !b.done);

  const supports = block?.supports ?? { audio: decoding.phonological >= 2, chunking: decoding.phonological >= 1 };
  // Personalize threshold: weaker decoders get help sooner
  const threshold = Math.max(0.25, AUTO_HELP_THRESHOLD - decoding.phonological * 0.05);

  const content = useMemo(() => {
    if (topicContent?.paragraphs?.length) return topicContent;
    if (topic && PRESET_TOPICS[topic]) return PRESET_TOPICS[topic];
    return {
      title: topic || uploadedName || "Your reading",
      paragraphs: ["Your reading isn't ready yet. Head back to the schedule and try again."],
    };
  }, [topic, uploadedName, topicContent]);

  const [pIdx, setPIdx] = useState(0);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{ word: string; pieces: string[] } | null>(null);
  const [focus, setFocus] = useState(true);
  const [predictions, setPredictions] = useState<Record<string, { p: number; source: string }>>({});

  useEffect(() => { log(`Session started · ${content.title} · supports ${JSON.stringify(supports)}`, "session"); }, []);

  const paragraphs = content.paragraphs;
  const para = paragraphs[pIdx];
  const words = para.split(/\s+/);

  // Predict difficulty for all words in paragraph using the per-user ML model
  useEffect(() => {
    const unique = Array.from(new Set(words.map(norm).filter((w) => w.length >= 2)));
    if (!unique.length) return;
    let cancelled = false;
    predictWordsDifficulty(unique).then((preds) => {
      if (cancelled) return;
      setPredictions(preds);
      const sources = Object.values(preds).map((x) => x.source);
      const fromModel = sources.filter((s) => s === "model").length;
      if (fromModel > 0) log(`ML model scored ${fromModel}/${sources.length} words in this paragraph.`, "ml");
    });
    // exposures (label=0) recorded when user advances to next paragraph
    return () => { cancelled = true; };
  }, [pIdx]);

  const isAutoHelp = (w: string) => {
    const n = norm(w);
    const local = difficultWords[n];
    if (local?.mastered) return false;
    const p = predictions[n]?.p ?? local?.difficulty ?? 0;
    return p >= threshold;
  };

  const next = () => {
    const tapped = new Set(
      Object.keys(difficultWords).filter((n) => (difficultWords[n]?.tapCount ?? 0) > 0)
    );
    const untapped = Array.from(new Set(words.map(norm).filter((w) => w.length >= 4 && !tapped.has(w))));
    if (untapped.length) recordWordExposures(untapped); // batch SGD with label=0
    if (pIdx + 1 >= paragraphs.length) { nav("/study/feedback"); return; }
    setPIdx(pIdx + 1); setActiveWord(null); setBreakdown(null);
  };

  const onWordClick = (w: string) => {
    const clean = w.replace(/[.,!?;:]$/, "");
    setBreakdown({ word: clean, pieces: syllabify(clean) });
    const n = norm(clean);
    if (n.length >= 2) {
      const before = difficultWords[n];
      bumpWordTap(clean);
      recordWordTap(clean);
      const newCount = (before?.tapCount ?? 0) + 1;
      if (newCount === 2) {
        log(`Auto-chunking enabled for "${n}" — model marked it as a tricky word.`, "personalize");
      }
    }
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
            {words.map((w, i) => {
              const auto = isAutoHelp(w);
              const pieces = auto ? syllabify(w.replace(/[.,!?;:]$/, "")) : null;
              return (
                <span
                  key={i}
                  onMouseEnter={() => setActiveWord(i)}
                  onMouseLeave={() => setActiveWord((c) => (c === i ? null : c))}
                  onClick={() => onWordClick(w)}
                  className={`cursor-pointer rounded px-0.5 transition-colors ${
                    activeWord === i ? "bg-accent-soft text-accent-foreground" : ""
                  } ${auto ? "underline decoration-accent decoration-2 underline-offset-4" : "hover:bg-primary-soft"}`}
                  title={auto ? "Your reader learned this word is tricky for you" : "Tap to break into sounds"}
                >
                  {w}
                  {auto && pieces && pieces.length > 1 && (
                    <span className="ml-1 text-[0.6em] align-middle text-accent font-semibold">
                      [{pieces.join("·")}]
                    </span>
                  )}
                  {" "}
                </span>
              );
            })}
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
                    onClick={() => {
                      const synth = window.speechSynthesis;
                      if (!synth) {
                        toast.error("Audio not supported in this browser");
                        return;
                      }
                      synth.cancel();
                      const u = new SpeechSynthesisUtterance(breakdown.word);
                      u.rate = 0.75;
                      u.pitch = 1;
                      u.lang = "en-US";
                      synth.speak(u);
                    }}
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
