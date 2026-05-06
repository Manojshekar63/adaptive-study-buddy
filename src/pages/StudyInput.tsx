import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLearner } from "@/store/learner";
import { useAuth } from "@/hooks/useAuth";
import { saveSchedule, uploadStudyNote, logReasoning } from "@/lib/api/learner";
import { buildSchedule } from "@/lib/scheduleEngine";
import { PRESET_TOPICS } from "@/lib/content";
import { Upload, FileText, Sparkles, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractFileText, chunkIntoParagraphs } from "@/lib/pdfText";

export default function StudyInput() {
  const nav = useNavigate();
  const { setTopic, setUploaded, setSchedule, setScheduleId, setTopicContent, log, availableMin, readingSpeed, fatigue, decoding } = useLearner();
  const { user } = useAuth();
  const [topic, setTopicLocal] = useState("");
  const [uploaded, setUploadedLocal] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const presets = Object.keys(PRESET_TOPICS);

  const generate = async (chosenTopic: string, source: "topic" | "upload" = "topic", sourceText?: string) => {
    const { blocks, reasons } = buildSchedule({
      topic: chosenTopic,
      availableMin,
      readingSpeed: readingSpeed ?? "medium",
      fatigue,
      phonological: decoding.phonological,
      surface: decoding.surface,
    });
    setSchedule(blocks);
    reasons.forEach((r) => log(r, "schedule"));
    log(`Built ${blocks.length}-block plan for "${chosenTopic}"`, "schedule");

    // Use preset only for topic mode when there's an exact match.
    const preset = source === "topic" ? PRESET_TOPICS[chosenTopic] : undefined;

    // For uploads: build the passage directly from the PDF text — no AI rewrite, no preset.
    let manualContent: { title: string; paragraphs: string[] } | undefined;
    if (source === "upload" && sourceText && sourceText.trim().length >= 40) {
      manualContent = chunkIntoParagraphs(sourceText, chosenTopic);
      setTopicContent(manualContent);
    } else if (source === "upload") {
      manualContent = {
        title: chosenTopic,
        paragraphs: [
          "We couldn't read text from this file. Try a text-based PDF or type the topic instead.",
        ],
      };
      setTopicContent(manualContent);
    } else if (preset) {
      setTopicContent(preset);
    } else {
      setTopicContent(undefined);
    }

    let scheduleId: string | undefined;
    if (user) {
      const result = await saveSchedule(user.id, chosenTopic, source, blocks);
      if (result) {
        scheduleId = result.scheduleId;
        setScheduleId(result.scheduleId);
        setSchedule(result.blocks);
        for (const r of reasons) await logReasoning(user.id, r, "schedule", result.scheduleId);
        // Persist the manual passage so refresh / hydrate keeps the user's PDF text.
        if (manualContent) {
          await supabase.from("schedules").update({ content: manualContent as any }).eq("id", result.scheduleId);
        }
      }
    }

    if (source === "topic" && !preset) {
      toast.message("Preparing your reading…");
      supabase.functions
        .invoke("generate-content", {
          body: { topic: chosenTopic, scheduleId, sourceText: sourceText?.slice(0, 12000) },
        })
        .then(({ data, error }) => {
          if (error) {
            const status = (error as any).context?.status;
            if (status === 429) toast.error("Lots of requests right now — try again in a moment.");
            else if (status === 402) toast.error("Out of AI credits — add some in Settings → Workspace → Usage.");
            else toast.error("Couldn't write your passage — using a fallback.");
            return;
          }
          if (data?.content) {
            setTopicContent(data.content);
            toast.success("Your reading is ready");
          }
        });
    }

    nav("/schedule");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadedLocal(f.name);
    setUploaded(f.name);
    setUploading(true);
    let extracted = "";
    try {
      extracted = await extractFileText(f);
    } catch (err) {
      console.error("extract", err);
    }
    setUploadedText(extracted);
    if (extracted.length < 40) {
      toast.warning("Couldn't read text from this file — we'll use the filename as the topic.");
    } else {
      toast.success("Notes read · personalizing your study");
    }
    if (user) {
      const path = await uploadStudyNote(user.id, f);
      if (!path) toast.error("Saving file failed — continuing anyway");
    }
    setUploading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">What are we studying?</h1>
      <p className="text-muted-foreground mb-8">Drop a file or pick a topic — both feel just as good.</p>

      <Tabs defaultValue="topic" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mb-6 h-12 rounded-full p-1 bg-muted">
          <TabsTrigger value="topic" className="rounded-full">Type a topic</TabsTrigger>
          <TabsTrigger value="upload" className="rounded-full">Upload notes</TabsTrigger>
        </TabsList>

        <TabsContent value="topic">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border shadow-soft p-8">
            <div className="flex gap-2">
              <Input
                value={topic}
                onChange={(e) => setTopicLocal(e.target.value)}
                placeholder="e.g. Photosynthesis"
                className="h-14 text-lg rounded-xl"
              />
              <Button
                size="lg"
                disabled={!topic.trim()}
                onClick={() => { setTopic(topic); generate(topic); }}
                className="rounded-xl px-6 gap-2"
              >
                <Sparkles className="w-4 h-4" /> Plan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 mb-3">Try one of these to see it in action:</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => { setTopicLocal(p); setTopic(p); generate(p); }}
                  className="px-4 py-2 rounded-full text-sm border border-border bg-background hover:border-primary/60 hover-lift"
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="upload">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border shadow-soft p-8">
            {!uploaded ? (
              <label className="block border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/60 transition-colors bg-muted/40">
                <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
                <div className="font-medium">Drop a PDF or click to choose</div>
                <p className="text-sm text-muted-foreground mt-1">We'll structure it into bite-sized study blocks.</p>
                <input type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleUpload} />
              </label>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/40 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary grid place-items-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{uploaded}</div>
                  <div className="text-xs text-muted-foreground">Ready to plan</div>
                </div>
                <button onClick={() => { setUploadedLocal(null); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <Button
              size="lg"
              disabled={!uploaded || uploading}
              onClick={() => generate(uploaded?.replace(/\.\w+$/, "") || "Your notes", "upload", uploadedText)}
              className="mt-6 w-full rounded-xl gap-2"
            >
              {uploading ? "Reading your notes…" : "Build my plan"} <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
