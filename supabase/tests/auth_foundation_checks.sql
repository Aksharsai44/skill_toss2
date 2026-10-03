do $$
declare
  table_name text;
  policy_expression text;
begin
  if to_regprocedure('private.is_current_profile_active()') is null then
    raise exception 'missing private.is_current_profile_active()';
  end if;

  foreach table_name in array array['students', 'teachers', 'parent_student_links']
  loop
    select coalesce(qual, '')
    into policy_expression
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and cmd = 'SELECT';

    if policy_expression not like '%is_current_profile_active%' then
      raise exception 'active-profile guard missing from public.% SELECT policy', table_name;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'private.handle_new_user()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.handle_user_email_change()', 'EXECUTE')
  then
    raise exception 'authenticated clients can execute an Auth trigger function';
  end if;
end;
$$;
