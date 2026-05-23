-- Best-of-3 winner detection + cascade trigger.
-- Single cascade entrypoint: _match_cascade_for_match(uuid).
-- Trigger _match_cascade_trigger wraps it for AFTER INSERT/UPDATE on match_scores.

create or replace function thethaomammo._compute_match_winner(p_match_id uuid)
returns int
language sql
stable
as $$
  with sets as (
    select
      case when slot1_score > slot2_score then 1
           when slot2_score > slot1_score then 2
           else null end as winner
    from thethaomammo.match_scores
    where match_id = p_match_id
  ),
  tally as (
    select
      count(*) filter (where winner = 1) as w1,
      count(*) filter (where winner = 2) as w2
    from sets
  )
  select case
    when w1 >= 2 then 1
    when w2 >= 2 then 2
    else null end
  from tally;
$$;

grant execute on function thethaomammo._compute_match_winner(uuid) to authenticated;

create or replace function thethaomammo._match_cascade_for_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  v_match thethaomammo.matches;
  v_winner_slot int;
  v_winner_participant thethaomammo.match_participants;
  v_loser_participant thethaomammo.match_participants;
  v_other_loser thethaomammo.match_participants;
  v_event_id uuid;
  v_total_rounds int;
  v_next_round int;
  v_next_slot int;
  v_dest_slot int;
  v_pair_slot int;
  v_other_sf_match uuid;
  v_third_match_id uuid;
begin
  select * into v_match from thethaomammo.matches where id = p_match_id;
  if not found then return; end if;
  if v_match.status = 'completed' then return; end if;

  v_winner_slot := thethaomammo._compute_match_winner(p_match_id);
  if v_winner_slot is null then return; end if;

  select * into v_winner_participant from thethaomammo.match_participants
    where match_id = p_match_id and slot = v_winner_slot;
  select * into v_loser_participant from thethaomammo.match_participants
    where match_id = p_match_id and slot = (3 - v_winner_slot);

  update thethaomammo.matches
    set status = 'completed', winner_participant_slot = v_winner_slot
    where id = p_match_id;

  v_event_id := v_match.event_id;
  select coalesce(max(round), v_match.round) into v_total_rounds
    from thethaomammo.matches where event_id = v_event_id and third_place = false;

  -- Advance winner to next round (skip if final or third-place match).
  if v_match.round < v_total_rounds and v_match.third_place = false then
    v_next_round := v_match.round + 1;
    v_next_slot := ((v_match.slot - 1) / 2) + 1;
    v_dest_slot := ((v_match.slot - 1) % 2) + 1;

    if exists (
      select 1 from thethaomammo.match_participants p
      join thethaomammo.matches m on m.id = p.match_id
      where m.event_id = v_event_id and m.round = v_next_round
        and m.slot = v_next_slot and p.slot = v_dest_slot
    ) then
      update thethaomammo.match_participants p
        set athlete_id = v_winner_participant.athlete_id,
            team_id = v_winner_participant.team_id,
            advanced_from_match_id = p_match_id
        from thethaomammo.matches m
        where p.match_id = m.id and m.event_id = v_event_id
          and m.round = v_next_round and m.slot = v_next_slot
          and p.slot = v_dest_slot;
    else
      insert into thethaomammo.match_participants
        (match_id, slot, athlete_id, team_id, advanced_from_match_id)
      select m.id, v_dest_slot, v_winner_participant.athlete_id,
             v_winner_participant.team_id, p_match_id
      from thethaomammo.matches m
      where m.event_id = v_event_id and m.round = v_next_round and m.slot = v_next_slot;
    end if;
  end if;

  -- Third-place: created when both SF (round = total_rounds - 1) are done
  -- and total_rounds >= 2 (so SF round exists).
  if v_total_rounds >= 2 and v_match.round = v_total_rounds - 1 and v_match.third_place = false then
    v_pair_slot := case when v_match.slot = 1 then 2 else 1 end;
    select id into v_other_sf_match from thethaomammo.matches
      where event_id = v_event_id and round = v_match.round
        and slot = v_pair_slot and third_place = false;
    if found and (
      select status from thethaomammo.matches where id = v_other_sf_match
    ) = 'completed' then
      select id into v_third_match_id from thethaomammo.matches
        where event_id = v_event_id and third_place = true limit 1;
      if not found then
        insert into thethaomammo.matches (event_id, round, slot, third_place)
        values (v_event_id, v_match.round, 1, true)
        returning id into v_third_match_id;

        if v_loser_participant.match_id is not null then
          insert into thethaomammo.match_participants
            (match_id, slot, athlete_id, team_id, advanced_from_match_id)
          values (v_third_match_id, 1, v_loser_participant.athlete_id,
                  v_loser_participant.team_id, p_match_id);
        end if;

        select p.* into v_other_loser
        from thethaomammo.match_participants p
        where p.match_id = v_other_sf_match
          and p.slot = (3 - (
            select winner_participant_slot
            from thethaomammo.matches where id = v_other_sf_match
          ));

        if v_other_loser.match_id is not null then
          insert into thethaomammo.match_participants
            (match_id, slot, athlete_id, team_id, advanced_from_match_id)
          values (v_third_match_id, 2, v_other_loser.athlete_id,
                  v_other_loser.team_id, v_other_sf_match);
        end if;
      end if;
    end if;
  end if;
end;
$$;

create or replace function thethaomammo._match_cascade_trigger()
returns trigger
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
begin
  perform thethaomammo._match_cascade_for_match(coalesce(new.match_id, old.match_id));
  return null;
end;
$$;

drop trigger if exists match_cascade_on_score on thethaomammo.match_scores;
create trigger match_cascade_on_score
  after insert or update on thethaomammo.match_scores
  for each row
  execute function thethaomammo._match_cascade_trigger();

create unique index if not exists matches_third_place_unique
  on thethaomammo.matches (event_id)
  where third_place = true;
