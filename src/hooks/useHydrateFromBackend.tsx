import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLearner } from "@/store/learner";
import { loadLearnerProfile, loadActiveSchedule } from "@/lib/api/learner";

/** Hydrate Zustand store from Supabase once user is logged in. */
export function useHydrateFromBackend() {
  const { user } = useAuth();
  const setOnboarding = useLearner((s) => s.setOnboarding);
  const setReading = useLearner((s) => s.setReading);
  const setSchedule = useLearner((s) => s.setSchedule);
  const setScheduleId = useLearner((s) => s.setScheduleId);
  const setTopicContent = useLearner((s) => s.setTopicContent);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const profile = await loadLearnerProfile(user.id);
      if (!alive || !profile) return;
      setOnboarding({
        name: profile.name ?? "",
        goal: profile.goal ?? "",
        subjects: profile.subjects ?? [],
        availableMin: profile.available_min ?? 60,
        fatigue: (profile.fatigue ?? 2) as any,
      });
      if (profile.wpm && profile.reading_speed) {
        setReading(profile.wpm, profile.reading_speed as any);
      }
      // load active schedule
      const sched = await loadActiveSchedule(user.id);
      if (sched && alive) {
        setScheduleId(sched.schedule.id);
        setTopicContent(sched.content ?? undefined);
        setSchedule(
          sched.blocks.map((b: any) => ({
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
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);
}
