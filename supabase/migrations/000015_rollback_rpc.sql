-- Admin escape hatch: revert a completed match to pending and clear downstream
-- participant placement (only if downstream match has no scores yet).

create or replace function thethaomammo.cascade_rollback_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  v_match thethaomammo.matches;
  v_next_match_id uuid;
  v_next_round int;
  v_next_slot int;
  v_dest_slot int;
  v_downstream_has_scores boolean;
begin
  if not shared.is_admin('thethaomammo') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_match from thethaomammo.matches where id = p_match_id;
  if not found then raise exception 'match not found'; end if;

  if v_match.third_place = false then
    v_next_round := v_match.round + 1;
    v_next_slot := ((v_match.slot - 1) / 2) + 1;
    v_dest_slot := ((v_match.slot - 1) % 2) + 1;

    select id into v_next_match_id from thethaomammo.matches
      where event_id = v_match.event_id and round = v_next_round and slot = v_next_slot
        and third_place = false;

    if v_next_match_id is not null then
      select exists (select 1 from thethaomammo.match_scores where match_id = v_next_match_id)
        into v_downstream_has_scores;
      if v_downstream_has_scores then
        raise exception 'Trận kế tiếp đã có tỉ số. Không thể rollback.';
      end if;

      update thethaomammo.match_participants
        set athlete_id = null, team_id = null, advanced_from_match_id = null
        where match_id = v_next_match_id and slot = v_dest_slot;
    end if;
  end if;

  -- Drop any third-place match if this is an SF.
  delete from thethaomammo.matches
    where event_id = v_match.event_id and third_place = true
      and not exists (select 1 from thethaomammo.match_scores ms where ms.match_id = thethaomammo.matches.id);

  -- Clear scores and reset match status.
  delete from thethaomammo.match_scores where match_id = p_match_id;
  update thethaomammo.matches
    set status = 'pending', winner_participant_slot = null
    where id = p_match_id;

  return jsonb_build_object('ok', true, 'match_id', p_match_id);
end;
$$;

grant execute on function thethaomammo.cascade_rollback_match(uuid) to authenticated;
