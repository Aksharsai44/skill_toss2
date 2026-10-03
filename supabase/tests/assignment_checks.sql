do $$
declare
  expected_table text;
begin
  foreach expected_table in array array['assignments', 'assignment_resources', 'assignment_submissions']
  loop
    if to_regclass('public.' || expected_table) is null then
      raise exception 'missing assignment table: %', expected_table;
    end if;
    if has_table_privilege('anon', 'public.' || expected_table, 'SELECT')
      or has_table_privilege('anon', 'public.' || expected_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || expected_table, 'UPDATE')
    then
      raise exception 'anon has assignment privileges on %', expected_table;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.assignment_submissions', 'DELETE') then
    raise exception 'hard submission deletion is exposed';
  end if;
end;
$$;
