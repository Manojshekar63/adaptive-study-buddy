import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Headphones, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="relative">
      <section className="pt-10 sm:pt-20 pb-16 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground mb-6 shadow-card"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Adaptive learning for dyslexic minds
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display font-bold text-5xl sm:text-7xl leading-[1.05] tracking-tight text-balance"
        >
          Study <span className="text-shimmer">smarter</span>,
          <br />not harder.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground reading-width mx-auto"
        >
          DyslexAI quietly observes how you read and reshapes every session around your pace, energy and decoding style — no labels, no lectures.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/onboarding">
            <Button size="lg" className="gap-2 rounded-full px-7 h-12 text-base shadow-soft">
              Start learning <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="lg" className="rounded-full h-12">
              See dashboard
            </Button>
          </Link>
        </motion.div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto pb-16">
        {[
          { icon: Activity, title: "Reads your pace", body: "Sessions stretch or shrink to match your reading speed." },
          { icon: Headphones, title: "Decoding helpers", body: "Audio + word breakdown when phonological cues are tricky." },
          { icon: BookOpen, title: "Learns each session", body: "Tell us how it felt — the plan reflows in real time." },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="rounded-2xl bg-card border border-border p-6 shadow-card hover-lift"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary grid place-items-center mb-4">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
