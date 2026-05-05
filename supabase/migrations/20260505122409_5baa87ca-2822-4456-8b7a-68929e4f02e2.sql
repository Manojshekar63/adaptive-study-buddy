-- =========================================================
-- ML: per-user logistic regression for word difficulty
-- =========================================================

create table if not exists public.word_model (
  user_id uuid primary key,
  weights double precision[] not null default array[0,0,0,0,0,0,0,0,0]::double precision[],
  bias double precision not null default -1.7346, -- sigmoid(-1.7346) ≈ 0.15 base rate
  trained_n integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.word_model enable row level security;

create policy "Users manage own word model"
  on public.word_model for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.word_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  word text not null,
  label smallint not null check (label in (0,1)),
  features double precision[] not null,
  predicted_p double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists word_event_user_created_idx
  on public.word_event(user_id, created_at desc);

alter table public.word_event enable row level security;

create policy "Users view own word events"
  on public.word_event for select
  using (auth.uid() = user_id);

create policy "Users insert own word events"
  on public.word_event for insert
  with check (auth.uid() = user_id);

-- ---------- Feature extraction ----------
create or replace function public.extract_word_features(p_word text, p_user uuid)
returns double precision[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text := lower(regexp_replace(p_word, '[^a-zA-Z'']', '', 'g'));
  v_len int := length(v_norm);
  v_vowels int;
  v_clusters int := 0;
  v_syll int;
  v_irregular int := 0;
  v_taps int := 0;
  v_exp int := 0;
  v_days double precision := 14;
  v_phon int := 0;
  i int;
  ch text;
  prev_consonant boolean := false;
  run int := 0;
begin
  if v_len = 0 then
    return array[0,0,0,0,0,0,0,0,0]::double precision[];
  end if;

  -- vowels
  v_vowels := length(regexp_replace(v_norm, '[^aeiouy]', '', 'g'));

  -- consonant clusters (runs of 2+ consonants)
  for i in 1..v_len loop
    ch := substr(v_norm, i, 1);
    if ch !~ '[aeiouy]' then
      run := run + 1;
      if run = 2 then v_clusters := v_clusters + 1; end if;
    else
      run := 0;
    end if;
  end loop;

  -- syllable estimate: count vowel groups
  v_syll := greatest(1,
    array_length(regexp_split_to_array(v_norm, '[^aeiouy]+'), 1) - 1
  );

  -- irregular spelling cues
  if v_norm ~ '(ough|augh|eigh|tion|sion|ph|kn|wr|gn|psy|que)' then
    v_irregular := 1;
  end if;

  -- per-user counters
  select tap_count, exposures,
         least(14, extract(epoch from (now() - last_tapped))/86400.0)
    into v_taps, v_exp, v_days
  from public.word_difficulty
  where user_id = p_user and word = v_norm;

  if v_taps is null then v_taps := 0; end if;
  if v_exp is null then v_exp := 0; end if;
  if v_days is null then v_days := 14; end if;

  -- learner trait
  select coalesce(phonological_score, 0) into v_phon
  from public.learner_profiles where user_id = p_user;

  return array[
    ln(1 + v_len),
    v_clusters::double precision,
    (v_vowels::double precision) / greatest(1, v_len),
    v_syll::double precision,
    v_irregular::double precision,
    ln(1 + v_taps),
    ln(1 + v_exp),
    v_days / 14.0,
    v_phon::double precision / 5.0
  ]::double precision[];
end;
$$;

-- ---------- Batch prediction ----------
create or replace function public.predict_words_difficulty(p_words text[])
returns table(word text, p double precision, source text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_w text;
  v_norm text;
  v_feats double precision[];
  v_weights double precision[];
  v_bias double precision;
  v_trained int;
  v_z double precision;
  v_p double precision;
  v_src text;
  i int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select weights, bias, trained_n
    into v_weights, v_bias, v_trained
  from public.word_model where user_id = v_user;

  if v_weights is null then
    v_weights := array[0,0,0,0,0,0,0,0,0]::double precision[];
    v_bias := -1.7346;
    v_trained := 0;
  end if;

  foreach v_w in array p_words loop
    v_norm := lower(regexp_replace(v_w, '[^a-zA-Z'']', '', 'g'));
    if length(v_norm) = 0 then continue; end if;

    v_feats := public.extract_word_features(v_norm, v_user);

    if v_trained >= 10 then
      v_z := v_bias;
      for i in 1..9 loop
        v_z := v_z + v_weights[i] * v_feats[i];
      end loop;
      v_p := 1.0 / (1.0 + exp(-v_z));
      v_src := 'model';
    else
      -- Bayesian fallback: (taps+1)/(taps+exp+3) * 0.5^(days/14)
      declare
        v_taps int; v_exp int; v_days double precision; v_decay double precision;
      begin
        select tap_count, exposures,
               least(14, extract(epoch from (now() - last_tapped))/86400.0)
          into v_taps, v_exp, v_days
        from public.word_difficulty where user_id = v_user and word = v_norm;
        v_taps := coalesce(v_taps, 0);
        v_exp := coalesce(v_exp, 0);
        v_days := coalesce(v_days, 14);
        v_decay := power(0.5, v_days / 14.0);
        v_p := ((v_taps + 1)::double precision / (v_taps + v_exp + 3)) * v_decay;
        v_src := 'baseline';
      end;
    end if;

    word := v_norm;
    p := v_p;
    source := v_src;
    return next;
  end loop;
end;
$$;

-- ---------- Online SGD training ----------
create or replace function public.update_word_model(p_word text, p_label smallint)
returns double precision
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_norm text := lower(regexp_replace(p_word, '[^a-zA-Z'']', '', 'g'));
  v_feats double precision[];
  v_weights double precision[];
  v_bias double precision;
  v_trained int;
  v_z double precision;
  v_p double precision;
  v_err double precision;
  v_eta constant double precision := 0.1;
  v_lambda constant double precision := 0.0001;
  v_new_w double precision[];
  i int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if length(v_norm) < 2 then return 0; end if;
  if p_label not in (0,1) then raise exception 'bad label'; end if;

  -- update counters first so features reflect current event
  if p_label = 1 then
    insert into public.word_difficulty (user_id, word, tap_count, exposures, last_tapped, mastered)
    values (v_user, v_norm, 1, 1, now(), false)
    on conflict (user_id, word) do update
      set tap_count = public.word_difficulty.tap_count + 1,
          exposures = public.word_difficulty.exposures + 1,
          last_tapped = now(),
          mastered = false;
  else
    insert into public.word_difficulty (user_id, word, tap_count, exposures, last_tapped)
    values (v_user, v_norm, 0, 1, now())
    on conflict (user_id, word) do update
      set exposures = public.word_difficulty.exposures + 1;
  end if;

  -- ensure model row exists
  insert into public.word_model (user_id) values (v_user)
  on conflict (user_id) do nothing;

  select weights, bias, trained_n into v_weights, v_bias, v_trained
  from public.word_model where user_id = v_user for update;

  v_feats := public.extract_word_features(v_norm, v_user);

  v_z := v_bias;
  for i in 1..9 loop v_z := v_z + v_weights[i] * v_feats[i]; end loop;
  v_p := 1.0 / (1.0 + exp(-v_z));
  v_err := v_p - p_label::double precision;

  v_new_w := v_weights;
  for i in 1..9 loop
    v_new_w[i] := greatest(-5.0, least(5.0,
      v_weights[i] - v_eta * (v_err * v_feats[i] + v_lambda * v_weights[i])
    ));
  end loop;
  v_bias := greatest(-5.0, least(5.0, v_bias - v_eta * v_err));

  update public.word_model
    set weights = v_new_w, bias = v_bias, trained_n = v_trained + 1, updated_at = now()
    where user_id = v_user;

  insert into public.word_event (user_id, word, label, features, predicted_p)
  values (v_user, v_norm, p_label, v_feats, v_p);

  return v_p;
end;
$$;

-- batch negative-label updates (called when paragraph ends)
create or replace function public.update_word_model_batch(p_words text[], p_label smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_w text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  foreach v_w in array p_words loop
    perform public.update_word_model(v_w, p_label);
  end loop;
end;
$$;

create or replace function public.reset_word_model()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.word_model
    set weights = array[0,0,0,0,0,0,0,0,0]::double precision[],
        bias = -1.7346,
        trained_n = 0,
        updated_at = now()
    where user_id = auth.uid();
  delete from public.word_event where user_id = auth.uid();
end;
$$;

-- ---------- Grants ----------
revoke all on function public.extract_word_features(text, uuid) from public;
revoke all on function public.predict_words_difficulty(text[]) from public;
revoke all on function public.update_word_model(text, smallint) from public;
revoke all on function public.update_word_model_batch(text[], smallint) from public;
revoke all on function public.reset_word_model() from public;

grant execute on function public.predict_words_difficulty(text[]) to authenticated;
grant execute on function public.update_word_model(text, smallint) to authenticated;
grant execute on function public.update_word_model_batch(text[], smallint) to authenticated;
grant execute on function public.reset_word_model() to authenticated;