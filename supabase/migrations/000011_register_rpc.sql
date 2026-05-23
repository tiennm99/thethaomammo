-- Atomic registration RPC: athlete upsert + registration + team + payment + notification.

create or replace function thethaomammo._find_or_create_athlete(
  p_full_name text,
  p_dob date,
  p_gender thethaomammo.gender,
  p_club_id uuid,
  p_club_name text,
  p_phone text,
  p_claim_user_id uuid
) returns thethaomammo.athletes
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  existing thethaomammo.athletes;
  fresh thethaomammo.athletes;
  lock_key bigint;
begin
  -- Advisory lock keyed on hash(name+dob+club) to serialize concurrent finds.
  lock_key := hashtext(lower(p_full_name) || '|' || coalesce(p_dob::text, '') || '|' || coalesce(p_club_id::text, ''));
  perform pg_advisory_xact_lock(lock_key);

  select * into existing
  from thethaomammo.athletes
  where lower(full_name) = lower(p_full_name)
    and dob is not distinct from p_dob
    and club_id is not distinct from p_club_id
    and deleted_at is null
  limit 1;

  if found then
    -- Claim if claim_user_id is set and existing is unclaimed.
    if p_claim_user_id is not null and existing.claim_user_id is null then
      update thethaomammo.athletes
        set claim_user_id = p_claim_user_id,
            phone = coalesce(p_phone, phone)
        where id = existing.id
        returning * into existing;
    end if;
    return existing;
  end if;

  insert into thethaomammo.athletes (full_name, dob, gender, club_id, club_name, phone, claim_user_id)
  values (p_full_name, p_dob, p_gender, p_club_id, p_club_name, p_phone, p_claim_user_id)
  returning * into fresh;
  return fresh;
end;
$$;

create or replace function thethaomammo.register_athlete_transaction(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  v_kind text := payload->>'kind';
  v_event_id uuid := (payload->>'event_id')::uuid;
  v_proof_path text := payload->>'payment_proof_path';
  v_event thethaomammo.events;
  v_t_status thethaomammo.tournament_status;
  v_t_legacy boolean;
  v_athlete thethaomammo.athletes;
  v_athlete_2 thethaomammo.athletes;
  v_team thethaomammo.teams;
  v_reg_ids uuid[] := array[]::uuid[];
  v_athlete_ids uuid[] := array[]::uuid[];
  v_reg_id uuid;
  v_user_id uuid := auth.uid();
  v_athletes jsonb;
  v_athlete_obj jsonb;
  v_amount int;
begin
  if v_kind is null or v_event_id is null then
    raise exception 'invalid payload: missing kind/event_id';
  end if;

  select * into v_event from thethaomammo.events where id = v_event_id;
  if not found then raise exception 'event not found'; end if;

  -- Trust-boundary check: RPC is granted to anon, so we cannot rely on the
  -- page-level filter. Block draft/completed/archived/legacy tournaments.
  select t.status, t.is_legacy into v_t_status, v_t_legacy
  from thethaomammo.tournaments t
  where t.id = v_event.tournament_id and t.deleted_at is null;
  if not found or v_t_legacy or v_t_status not in ('open', 'in_progress') then
    raise exception 'Giải đấu không mở đăng ký.';
  end if;

  v_amount := coalesce(v_event.entry_fee_vnd, 0);

  v_athletes := payload->'athletes';
  if v_athletes is null or jsonb_array_length(v_athletes) = 0 then
    raise exception 'invalid payload: empty athletes';
  end if;

  if v_kind = 'singles' and jsonb_array_length(v_athletes) <> 1 then
    raise exception 'singles expects 1 athlete';
  end if;
  if v_kind = 'doubles' and jsonb_array_length(v_athletes) <> 2 then
    raise exception 'doubles expects 2 athletes';
  end if;

  -- Athlete 1
  v_athlete_obj := v_athletes->0;
  v_athlete := thethaomammo._find_or_create_athlete(
    v_athlete_obj->>'full_name',
    (nullif(v_athlete_obj->>'dob',''))::date,
    nullif(v_athlete_obj->>'gender','')::thethaomammo.gender,
    nullif(v_athlete_obj->>'club_id','')::uuid,
    v_athlete_obj->>'club_name',
    v_athlete_obj->>'phone',
    v_user_id
  );
  v_athlete_ids := array_append(v_athlete_ids, v_athlete.id);

  if v_kind = 'doubles' then
    v_athlete_obj := v_athletes->1;
    v_athlete_2 := thethaomammo._find_or_create_athlete(
      v_athlete_obj->>'full_name',
      (nullif(v_athlete_obj->>'dob',''))::date,
      nullif(v_athlete_obj->>'gender','')::thethaomammo.gender,
      nullif(v_athlete_obj->>'club_id','')::uuid,
      v_athlete_obj->>'club_name',
      v_athlete_obj->>'phone',
      null
    );
    if v_athlete.id = v_athlete_2.id then
      raise exception 'Hai vận động viên phải khác nhau.';
    end if;
    v_athlete_ids := array_append(v_athlete_ids, v_athlete_2.id);

    insert into thethaomammo.teams (event_id, name, captain_athlete_id)
    values (v_event_id, v_athlete.full_name || ' / ' || v_athlete_2.full_name, v_athlete.id)
    returning * into v_team;
  end if;

  -- Athlete 1 registration
  insert into thethaomammo.registrations (event_id, athlete_id, team_id, user_id, payment_status, payment_proof_path)
  values (v_event_id, v_athlete.id, v_team.id, v_user_id, 'pending', v_proof_path)
  returning id into v_reg_id;
  v_reg_ids := array_append(v_reg_ids, v_reg_id);

  insert into thethaomammo.registration_payments (registration_id, amount_vnd, note)
  values (v_reg_id, v_amount, 'pending verification');

  insert into thethaomammo.notifications (user_id, email, type, payload, dedup_key)
  values (
    v_user_id,
    coalesce(v_athlete_obj->>'email', null),
    'registration_success',
    jsonb_build_object('registration_id', v_reg_id, 'event_id', v_event_id, 'athlete_id', v_athlete.id),
    'reg_success:' || v_reg_id::text
  )
  on conflict (dedup_key) do nothing;

  if v_kind = 'doubles' then
    insert into thethaomammo.registrations (event_id, athlete_id, team_id, user_id, payment_status, payment_proof_path)
    values (v_event_id, v_athlete_2.id, v_team.id, v_user_id, 'pending', v_proof_path)
    returning id into v_reg_id;
    v_reg_ids := array_append(v_reg_ids, v_reg_id);

    insert into thethaomammo.registration_payments (registration_id, amount_vnd, note)
    values (v_reg_id, v_amount, 'pending verification');

    insert into thethaomammo.notifications (user_id, email, type, payload, dedup_key)
    values (
      null,
      coalesce((v_athletes->1)->>'email', null),
      'registration_success',
      jsonb_build_object('registration_id', v_reg_id, 'event_id', v_event_id, 'athlete_id', v_athlete_2.id),
      'reg_success:' || v_reg_id::text
    )
    on conflict (dedup_key) do nothing;
  end if;

  return jsonb_build_object(
    'registration_ids', to_jsonb(v_reg_ids),
    'athlete_ids', to_jsonb(v_athlete_ids),
    'team_id', v_team.id
  );

exception
  when unique_violation then
    raise exception 'Vận động viên đã đăng ký cho nội dung này.' using errcode = 'P0001';
end;
$$;

grant execute on function thethaomammo.register_athlete_transaction(jsonb) to anon, authenticated;

-- Lookup helper for dedup UX (returns top candidates).
create or replace function thethaomammo.lookup_athlete(p_full_name text, p_dob date, p_club_id uuid)
returns setof thethaomammo.athletes
language sql
stable
security definer
set search_path = thethaomammo, public
as $$
  select * from thethaomammo.athletes
  where deleted_at is null
    and (
      (lower(full_name) = lower(p_full_name) and dob is not distinct from p_dob)
      or similarity(full_name, p_full_name) > 0.6
    )
  order by case when lower(full_name) = lower(p_full_name) then 0 else 1 end,
           similarity(full_name, p_full_name) desc
  limit 5;
$$;

grant execute on function thethaomammo.lookup_athlete(text, date, uuid) to anon, authenticated;
