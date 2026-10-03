do $$
declare
  expected_policy text;
begin
  foreach expected_policy in array array[
    'attendance_sessions_select_authorized',
    'attendance_sessions_insert_authorized',
    'attendance_sessions_update_authorized',
    'attendance_records_select_authorized',
    'attendance_records_insert_authorized',
    'attendance_records_update_authorized'
  ]
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = expected_policy) then
      raise exception 'missing attendance policy: %', expected_policy;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.attendance_sessions', 'SELECT')
    or has_table_privilege('anon', 'public.attendance_records', 'SELECT')
  then
    raise exception 'anon can read attendance data';
  end if;

  if has_table_privilege('authenticated', 'public.attendance_sessions', 'DELETE')
    or has_table_privilege('authenticated', 'public.attendance_records', 'DELETE')
  then
    raise exception 'hard attendance deletion is exposed';
  end if;
end;
$$;
