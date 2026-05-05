
ALTER TABLE public.word_difficulty
  ADD COLUMN IF NOT EXISTS exposures integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_word_exposure(p_words text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_word text;
  v_norm text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  FOREACH v_word IN ARRAY p_words LOOP
    v_norm := lower(regexp_replace(v_word, '[^a-zA-Z'']', '', 'g'));
    IF length(v_norm) >= 4 THEN
      INSERT INTO public.word_difficulty (user_id, word, tap_count, exposures, last_tapped)
      VALUES (v_user, v_norm, 0, 1, now())
      ON CONFLICT (user_id, word)
      DO UPDATE SET exposures = public.word_difficulty.exposures + 1;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_word_exposure(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_word_exposure(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_word_mastered(p_word text, p_mastered boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_norm text := lower(regexp_replace(p_word, '[^a-zA-Z'']', '', 'g'));
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.word_difficulty
    SET mastered = p_mastered
    WHERE user_id = v_user AND word = v_norm;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_word_mastered(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_word_mastered(text, boolean) TO authenticated;

CREATE OR REPLACE VIEW public.v_word_difficulty
WITH (security_invoker = true) AS
SELECT
  user_id,
  word,
  tap_count,
  exposures,
  mastered,
  last_tapped,
  -- Beta(1,2) prior + half-life decay (14 days)
  ROUND(
    ((tap_count + 1)::numeric / (exposures + tap_count + 3)::numeric)
    * power(0.5, EXTRACT(EPOCH FROM (now() - last_tapped)) / (14 * 86400))::numeric
  , 4) AS difficulty
FROM public.word_difficulty;

GRANT SELECT ON public.v_word_difficulty TO authenticated;
