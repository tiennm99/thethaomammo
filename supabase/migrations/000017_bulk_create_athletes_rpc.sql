-- Admin-only bulk insert RPC for CSV import.
-- Input: payload jsonb shape { rows: [ { full_name, dob, gender, club_id?, club_name?, phone? }, ... ] }
-- Returns: { inserted: int, errors: [ { row: int, message: text } ] }
-- Each row is independent — bad rows are reported, good rows still land.

create or replace function thethaomammo.bulk_create_athletes(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = thethaomammo, public
as $$
declare
  v_rows jsonb := coalesce(payload->'rows', '[]'::jsonb);
  v_row jsonb;
  v_idx int := 0;
  v_inserted int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_full_name text;
  v_dob_text text;
  v_dob date;
  v_gender thethaomammo.gender;
  v_gender_text text;
  v_club_id uuid;
  v_club_name text;
  v_phone text;
begin
  if not shared.is_admin('thethaomammo') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_row in select * from jsonb_array_elements(v_rows) loop
    v_idx := v_idx + 1;

    v_full_name := nullif(trim(v_row->>'full_name'), '');
    if v_full_name is null then
      v_errors := v_errors || jsonb_build_object(
        'row', v_idx, 'message', 'full_name bắt buộc'
      );
      continue;
    end if;

    v_dob_text := nullif(trim(v_row->>'dob'), '');
    begin
      v_dob := case when v_dob_text is null then null else v_dob_text::date end;
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'row', v_idx, 'message', 'dob không hợp lệ (YYYY-MM-DD)'
      );
      continue;
    end;

    v_gender_text := nullif(lower(trim(v_row->>'gender')), '');
    if v_gender_text is null then
      v_gender := null;
    elsif v_gender_text in ('male', 'female') then
      v_gender := v_gender_text::thethaomammo.gender;
    else
      v_errors := v_errors || jsonb_build_object(
        'row', v_idx, 'message', 'gender phải là male/female'
      );
      continue;
    end if;

    v_club_id := nullif(trim(v_row->>'club_id'), '')::uuid;
    v_club_name := nullif(trim(v_row->>'club_name'), '');
    v_phone := nullif(trim(v_row->>'phone'), '');

    begin
      insert into thethaomammo.athletes (full_name, dob, gender, club_id, club_name, phone)
      values (v_full_name, v_dob, v_gender, v_club_id, v_club_name, v_phone);
      v_inserted := v_inserted + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'row', v_idx, 'message', sqlerrm
      );
    end;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'errors', v_errors);
end;
$$;

revoke all on function thethaomammo.bulk_create_athletes(jsonb) from public;
grant execute on function thethaomammo.bulk_create_athletes(jsonb) to authenticated;
