import { supabase } from "@/integrations/supabase/client";
import type { ScheduleBlock } from "@/store/learner";

export async function upsertLearnerProfile(userId: string, patch: {
  name?: string;
  goal?: string;
  subjects?: string[];
  available_min?: number;
  fatigue?: number;
  wpm?: number;
  reading_speed?: string;
  phonological_score?: number;
  surface_score?: number;
  decoding_trials?: number;
}) {
  const { error } = await supabase
    .from("learner_profiles")
    .update(patch)
    .eq("user_id", userId);
  if (error) console.error("upsertLearnerProfile", error);
}

export async function loadLearnerProfile(userId: string) {
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("loadLearnerProfile", error);
  return data;
}

export async function saveSchedule(
  userId: string,
  topic: string,
  source: "topic" | "upload",
  blocks: ScheduleBlock[]
): Promise<{ scheduleId: string; blocks: ScheduleBlock[] } | null> {
  await supabase.from("schedules").update({ active: false }).eq("user_id", userId).eq("active", true);

  const { data: sched, error } = await supabase
    .from("schedules")
    .insert({ user_id: userId, topic, source, active: true })
    .select()
    .single();
  if (error || !sched) {
    console.error("saveSchedule", error);
    return null;
  }
  const rows = blocks.map((b, i) => ({
    schedule_id: sched.id,
    user_id: userId,
    position: i,
    kind: b.kind,
    title: b.title,
    minutes: b.minutes,
    reasons: b.reasons,
    supports: (b.supports ?? {}) as any,
    modified: !!b.modified,
    done: !!b.done,
  }));
  const { data: inserted, error: bErr } = await supabase
    .from("schedule_blocks")
    .insert(rows)
    .select()
    .order("position");
  if (bErr || !inserted) {
    console.error("saveSchedule blocks", bErr);
    return { scheduleId: sched.id, blocks };
  }
  const remapped: ScheduleBlock[] = inserted.map((r: any) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    minutes: r.minutes,
    reasons: r.reasons ?? [],
    supports: r.supports ?? {},
    modified: r.modified,
    done: r.done,
  }));
  return { scheduleId: sched.id, blocks: remapped };
}

export async function loadActiveSchedule(userId: string) {
  const { data: sched } = await supabase
    .from("schedules")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sched) return null;
  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("schedule_id", sched.id)
    .order("position");
  return { schedule: sched, blocks: blocks ?? [] };
}

export async function replaceScheduleBlocks(
  userId: string,
  scheduleId: string,
  blocks: ScheduleBlock[]
) {
  await supabase.from("schedule_blocks").delete().eq("schedule_id", scheduleId);
  const rows = blocks.map((b, i) => ({
    schedule_id: scheduleId,
    user_id: userId,
    position: i,
    kind: b.kind,
    title: b.title,
    minutes: b.minutes,
    reasons: b.reasons,
    supports: (b.supports ?? {}) as any,
    modified: !!b.modified,
    done: !!b.done,
  }));
  const { error } = await supabase.from("schedule_blocks").insert(rows);
  if (error) console.error("replaceScheduleBlocks", error);
}

export async function recordSession(
  userId: string,
  blockId: string | null,
  difficulty: "easy" | "medium" | "hard",
  durationSec?: number
) {
  const { error } = await supabase.from("study_sessions").insert({
    user_id: userId,
    block_id: blockId,
    difficulty,
    duration_sec: durationSec,
  });
  if (error) console.error("recordSession", error);
}

export async function logReasoning(
  userId: string,
  message: string,
  tag?: string,
  scheduleId?: string
) {
  const { error } = await supabase.from("reasoning_log").insert({
    user_id: userId,
    message,
    tag,
    schedule_id: scheduleId,
  });
  if (error) console.error("logReasoning", error);
}

export async function uploadStudyNote(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("study-notes").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error("uploadStudyNote", error);
    return null;
  }
  return path;
}
