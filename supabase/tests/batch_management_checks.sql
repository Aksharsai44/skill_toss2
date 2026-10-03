do $$
declare
  expected_policy text;
begin
  foreach expected_policy in array array[
    'batches_insert_by_tenant_admin',
    'batches_update_by_tenant_admin',
    'teacher_batch_assignments_insert_by_tenant_admin',
    'teacher_batch_assignments_update_by_tenant_admin',
    'student_enrollments_insert_by_tenant_admin',
    'student_enrollments_update_by_tenant_admin'
  ]
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = expected_policy) then
      raise exception 'missing batch management policy: %', expected_policy;
    end if;
  end loop;

  if to_regclass('public.batch_details') is null then
    raise exception 'missing public.batch_details view';
  end if;

  if has_table_privilege('anon', 'public.batch_details', 'SELECT') then
    raise exception 'anon can read batch details';
  end if;

  if has_table_privilege('authenticated', 'public.batches', 'DELETE') then
    raise exception 'hard batch deletion is exposed to authenticated clients';
  end if;
end;
$$;
