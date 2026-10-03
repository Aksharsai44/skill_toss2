do $$
declare
  expected_table text;
begin
  foreach expected_table in array array[
    'departments', 'academic_courses', 'subjects', 'batches',
    'teacher_batch_assignments', 'student_enrollments'
  ]
  loop
    if to_regclass('public.' || expected_table) is null then
      raise exception 'missing core academic table: public.%', expected_table;
    end if;
    if not exists (
      select 1 from pg_class as table_row
      join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
      where schema_row.nspname = 'public'
        and table_row.relname = expected_table
        and table_row.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', expected_table;
    end if;
    if has_table_privilege('anon', 'public.' || expected_table, 'SELECT')
      or has_table_privilege('anon', 'public.' || expected_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || expected_table, 'UPDATE')
      or has_table_privilege('anon', 'public.' || expected_table, 'DELETE')
    then
      raise exception 'anon has a privilege on public.%', expected_table;
    end if;
  end loop;
end;
$$;
