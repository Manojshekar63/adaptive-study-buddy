
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Learner profile
CREATE TABLE public.learner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  goal TEXT,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  available_min INTEGER NOT NULL DEFAULT 60,
  fatigue SMALLINT NOT NULL DEFAULT 2,
  reading_speed TEXT,
  wpm INTEGER,
  phonological_score INTEGER NOT NULL DEFAULT 0,
  surface_score INTEGER NOT NULL DEFAULT 0,
  decoding_trials INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own learner profile" ON public.learner_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schedules
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'topic',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedules" ON public.schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX schedules_user_active_idx ON public.schedules(user_id, active);

-- Schedule blocks
CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  supports JSONB NOT NULL DEFAULT '{}'::jsonb,
  modified BOOLEAN NOT NULL DEFAULT false,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.schedule_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX schedule_blocks_schedule_idx ON public.schedule_blocks(schedule_id, position);

-- Study sessions (history)
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.schedule_blocks(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL,
  duration_sec INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX study_sessions_user_idx ON public.study_sessions(user_id, completed_at DESC);

-- Reasoning log
CREATE TABLE public.reasoning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reasoning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own log" ON public.reasoning_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own log" ON public.reasoning_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX reasoning_log_user_idx ON public.reasoning_log(user_id, created_at DESC);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.learner_profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER learner_profiles_touch BEFORE UPDATE ON public.learner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for uploaded notes
INSERT INTO storage.buckets (id, name, public) VALUES ('study-notes', 'study-notes', false);

CREATE POLICY "Users read own notes" ON storage.objects FOR SELECT
  USING (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own notes" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own notes" ON storage.objects FOR DELETE
  USING (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
