do $$
declare
  expected_role text;
  profiles_role_constraint text;
begin
  select string_agg(pg_get_constraintdef(constraint_row.oid), ' ')
  into profiles_role_constraint
  from pg_constraint as constraint_row
  join pg_class as table_row on table_row.oid = constraint_row.conrelid
  join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
  where schema_row.nspname = 'public'
    and table_row.relname = 'profiles'
    and constraint_row.contype = 'c';

  foreach expected_role in array array[
    'product_admin', 'super_admin', 'admin', 'teacher', 'student', 'parent'
  ]
  loop
    if profiles_role_constraint not like '%' || expected_role || '%' then
      raise exception 'profiles role constraint is missing %', expected_role;
    end if;
  end loop;

  if has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE') then
    raise exception 'authenticated clients can update Auth-owned profile email';
  end if;

  if not has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
  then
    raise exception 'tenant managers are missing required profile administration privileges';
  end if;
end;
$$;
