
CREATE TABLE public.word_difficulty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word text NOT NULL,
  tap_count integer NOT NULL DEFAULT 1,
  mastered boolean NOT NULL DEFAULT false,
  last_tapped timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);

CREATE INDEX idx_word_difficulty_user_word ON public.word_difficulty(user_id, word);
CREATE INDEX idx_word_difficulty_user_count ON public.word_difficulty(user_id, tap_count DESC);

ALTER TABLE public.word_difficulty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own word difficulty"
ON public.word_difficulty
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_word_tap(p_word text)
RETURNS public.word_difficulty
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_norm text := lower(regexp_replace(p_word, '[^a-zA-Z'']', '', 'g'));
  v_row public.word_difficulty;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_norm IS NULL OR length(v_norm) = 0 THEN
    RAISE EXCEPTION 'empty word';
  END IF;

  INSERT INTO public.word_difficulty (user_id, word, tap_count, last_tapped, mastered)
  VALUES (v_user, v_norm, 1, now(), false)
  ON CONFLICT (user_id, word)
  DO UPDATE SET tap_count = public.word_difficulty.tap_count + 1,
                last_tapped = now(),
                mastered = false
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
