do $$
declare
  expected_table text;
begin
  foreach expected_table in array array['daily_goals', 'daily_tasks', 'daily_activity_events']
  loop
    if to_regclass('public.' || expected_table) is null then
      raise exception 'missing daily tracker table: %', expected_table;
    end if;
    if has_table_privilege('anon', 'public.' || expected_table, 'SELECT') then
      raise exception 'anon can read daily tracker table: %', expected_table;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.daily_activity_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.daily_activity_events', 'UPDATE')
  then
    raise exception 'clients can forge daily activity history';
  end if;
end;
$$;
