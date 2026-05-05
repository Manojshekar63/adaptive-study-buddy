
REVOKE EXECUTE ON FUNCTION public.increment_word_tap(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_word_tap(text) TO authenticated;
