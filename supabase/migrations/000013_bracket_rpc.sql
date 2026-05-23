-- Bracket generation: single-elimination with byes for non-power-of-2 fields.
--
-- Layout convention:
--   firstRoundSize = 2^rounds (next power of 2 above n).
--   "Logical positions" 1..firstRoundSize hold participants and byes.
--   Byes occupy ODD positions 1, 3, 5, ..., (2*byes - 1) so each bye pairs
--   with a real player in R1 — no bye-vs-bye matches are ever created.
--   R1 pair S spans positions (2S-1, 2S). If S <= byes the pair is
--   (bye, real) → the real player is hard-placed into R2 at gen time and
--   no R1 match record is created. If S > byes both positions are real →
--   one R1 match record at slot S.
--   R1 slot numbering: byes+1..firstRoundSize/2.
--   Cascade math (R(r), slot K) → (R(r+1), slot ceil(K/2), participant ((K-1)%2)+1)
--   is identical across rounds and byes — no special case in the trigger.
--   Total matches = n - 1 (single elim invariant).

create or replace function thethaomammo.generate_event_bracket(
  p_event_id uuid,
  p_seed text default 'random'
) returns jsonb
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  v_event thethaomammo.events;
  v_existing int;
  v_count int;
  v_rounds int;
  v_first_round_size int;
  v_byes int;
  v_r1_matches int;
  v_ids uuid[];
  v_team_ids uuid[];
  v_use_teams boolean;
  v_seed_real float8;
  v_round int;
  v_slot int;
  v_match_id uuid;
  v_real_idx int;
  v_real_total int;
  v_position int;
  v_pair_slot int;
  v_r2_slot int;
  v_r2_p_slot int;
  v_total_rounds int;
  v_target_athlete uuid;
  v_target_team uuid;
begin
  if not shared.is_admin('thethaomammo') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_event from thethaomammo.events where id = p_event_id;
  if not found then raise exception 'event not found'; end if;

  select count(*) into v_existing from thethaomammo.matches where event_id = p_event_id;
  if v_existing > 0 then
    raise exception 'Sự kiện đã có bảng đấu. Hãy xoá trước khi tạo lại.';
  end if;

  v_use_teams := (v_event.kind = 'doubles');

  if v_use_teams then
    select array_agg(distinct r.team_id order by r.team_id) into v_team_ids
    from thethaomammo.registrations r
    where r.event_id = p_event_id
      and r.deleted_at is null
      and r.status = 'confirmed'
      and r.team_id is not null;
    v_count := coalesce(array_length(v_team_ids, 1), 0);
  else
    select array_agg(r.athlete_id order by r.athlete_id) into v_ids
    from thethaomammo.registrations r
    where r.event_id = p_event_id
      and r.deleted_at is null
      and r.status = 'confirmed';
    v_count := coalesce(array_length(v_ids, 1), 0);
  end if;

  if v_count < 2 then
    raise exception 'Cần ít nhất 2 đăng ký đã xác nhận.';
  end if;

  -- Deterministic shuffle by seed.
  v_seed_real := abs(hashtext(p_seed))::float8 / 2147483648.0;
  perform setseed(least(0.999999, greatest(-0.999999, (v_seed_real * 2 - 1))));
  if v_use_teams then
    select array_agg(x order by random()) into v_team_ids from unnest(v_team_ids) as x;
  else
    select array_agg(x order by random()) into v_ids from unnest(v_ids) as x;
  end if;

  v_rounds := greatest(1, ceil(log(2, v_count::numeric))::int);
  v_first_round_size := 1 << v_rounds;
  v_byes := v_first_round_size - v_count;
  v_r1_matches := v_count - (v_first_round_size / 2);  -- = n - first_round_size/2
  v_total_rounds := v_rounds;

  -- Create R1 match shells for real pairs (slots byes+1..firstRoundSize/2).
  for v_slot in (v_byes + 1)..(v_first_round_size / 2) loop
    insert into thethaomammo.matches (event_id, round, slot)
    values (p_event_id, 1, v_slot);
  end loop;

  -- Create R2..R_total match shells (full set, slots 1..2^(rounds-r)).
  for v_round in 2..v_total_rounds loop
    for v_slot in 1..(v_first_round_size / (1 << v_round)) loop
      insert into thethaomammo.matches (event_id, round, slot)
      values (p_event_id, v_round, v_slot);
    end loop;
  end loop;

  -- Populate participants.
  -- Real player array order: byes' pair partners first (one real per bye),
  -- then the remaining reals that play R1 pairs.
  -- Positions 1..v_first_round_size map as: odd positions 1..2*v_byes-1 are
  -- byes; positions 2, 4, ..., 2*v_byes are the byes' partners; positions
  -- (2*v_byes+1)..v_first_round_size are remaining reals.
  --
  -- For pair S in 1..byes: (bye, partner) — partner = real[S]. Partner
  -- advances directly to R2 at (ceil(S/2), ((S-1)%2)+1).
  -- For pair S in (byes+1)..(firstRoundSize/2): both real. R1 match has
  -- slot=S with participants real[byes + 2*(S-byes) - 1] and real[byes + 2*(S-byes)].
  v_real_idx := 1;
  v_real_total := v_count;

  -- Byes' partners (one real per bye).
  for v_pair_slot in 1..v_byes loop
    v_r2_slot := ((v_pair_slot - 1) / 2) + 1;
    v_r2_p_slot := ((v_pair_slot - 1) % 2) + 1;
    select id into v_match_id from thethaomammo.matches
      where event_id = p_event_id and round = 2 and slot = v_r2_slot;

    if v_use_teams then
      v_target_team := v_team_ids[v_real_idx];
      insert into thethaomammo.match_participants (match_id, slot, team_id)
      values (v_match_id, v_r2_p_slot, v_target_team);
    else
      v_target_athlete := v_ids[v_real_idx];
      insert into thethaomammo.match_participants (match_id, slot, athlete_id)
      values (v_match_id, v_r2_p_slot, v_target_athlete);
    end if;
    v_real_idx := v_real_idx + 1;
  end loop;

  -- R1 real-vs-real matches.
  for v_pair_slot in (v_byes + 1)..(v_first_round_size / 2) loop
    select id into v_match_id from thethaomammo.matches
      where event_id = p_event_id and round = 1 and slot = v_pair_slot;

    if v_use_teams then
      insert into thethaomammo.match_participants (match_id, slot, team_id)
        values (v_match_id, 1, v_team_ids[v_real_idx]);
      v_real_idx := v_real_idx + 1;
      insert into thethaomammo.match_participants (match_id, slot, team_id)
        values (v_match_id, 2, v_team_ids[v_real_idx]);
      v_real_idx := v_real_idx + 1;
    else
      insert into thethaomammo.match_participants (match_id, slot, athlete_id)
        values (v_match_id, 1, v_ids[v_real_idx]);
      v_real_idx := v_real_idx + 1;
      insert into thethaomammo.match_participants (match_id, slot, athlete_id)
        values (v_match_id, 2, v_ids[v_real_idx]);
      v_real_idx := v_real_idx + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'event_id', p_event_id,
    'participants', v_count,
    'rounds', v_rounds,
    'byes', v_byes,
    'r1_matches', v_r1_matches,
    'total_matches', v_count - 1
  );
end;
$$;

grant execute on function thethaomammo.generate_event_bracket(uuid, text) to authenticated;
