do $$
declare
  expected_table text;
begin
  foreach expected_table in array array[
    'institutions',
    'profiles',
    'students',
    'teachers',
    'parent_student_links'
  ]
  loop
    if to_regclass('public.' || expected_table) is null then
      raise exception 'missing Phase 1 table: public.%', expected_table;
    end if;

    if not exists (
      select 1
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = expected_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', expected_table;
    end if;

    if has_table_privilege('anon', 'public.' || expected_table, 'SELECT')
      or has_table_privilege('anon', 'public.' || expected_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || expected_table, 'UPDATE')
      or has_table_privilege('anon', 'public.' || expected_table, 'DELETE')
    then
      raise exception 'anon has an LMS privilege on public.%', expected_table;
    end if;
  end loop;
end;
$$;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'institutions',
    'profiles',
    'students',
    'teachers',
    'parent_student_links'
  )
order by tablename, policyname;
