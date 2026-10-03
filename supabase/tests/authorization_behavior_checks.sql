-- Behavioral RLS verification. All fixtures are rolled back, and every assertion runs as the
-- same `authenticated` database role used by PostgREST rather than as the database owner.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', fixture.id, 'authenticated', 'authenticated',
  fixture.email, crypt('LocalOnly-Auth123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, fixture.metadata, now(), now()
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'product-admin@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'super-admin@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'admin@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'teacher@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'student@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000006'::uuid, 'parent@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000007'::uuid, 'other-teacher@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000008'::uuid, 'other-student@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000009'::uuid, 'other-admin@auth-check.test', '{}'::jsonb),
  ('20000000-0000-0000-0000-00000000000a'::uuid, 'other-tenant-student@auth-check.test', '{}'::jsonb),
  (
    '20000000-0000-0000-0000-00000000000b'::uuid,
    'metadata-attacker@auth-check.test',
    '{"role":"super_admin","institution_id":"10000000-0000-0000-0000-000000000002"}'::jsonb
  )
) as fixture(id, email, metadata);

-- Public signup metadata must never provision a privileged or active profile.
do $$
declare
  provisioned public.profiles%rowtype;
begin
  select * into strict provisioned
  from public.profiles
  where id = '20000000-0000-0000-0000-00000000000b';

  if provisioned.role <> 'student' or provisioned.is_active or provisioned.institution_id is not null then
    raise exception 'Auth metadata influenced authoritative profile provisioning';
  end if;
end;
$$;

insert into public.institutions (id, name, code) values
  ('10000000-0000-0000-0000-000000000001', 'Authorization Test One', 'AUTH-CHECK-ONE'),
  ('10000000-0000-0000-0000-000000000002', 'Authorization Test Two', 'AUTH-CHECK-TWO');

update public.profiles
set institution_id = case
      when id = '20000000-0000-0000-0000-000000000001' then null
      when id in (
        '20000000-0000-0000-0000-000000000009',
        '20000000-0000-0000-0000-00000000000a'
      ) then '10000000-0000-0000-0000-000000000002'::uuid
      else '10000000-0000-0000-0000-000000000001'::uuid
    end,
    role = case id
      when '20000000-0000-0000-0000-000000000001' then 'product_admin'
      when '20000000-0000-0000-0000-000000000002' then 'super_admin'
      when '20000000-0000-0000-0000-000000000003' then 'admin'
      when '20000000-0000-0000-0000-000000000004' then 'teacher'
      when '20000000-0000-0000-0000-000000000005' then 'student'
      when '20000000-0000-0000-0000-000000000006' then 'parent'
      when '20000000-0000-0000-0000-000000000007' then 'teacher'
      when '20000000-0000-0000-0000-000000000009' then 'admin'
      else 'student'
    end,
    full_name = email,
    is_active = true
where id::text like '20000000-0000-0000-0000-0000000000%';

insert into public.teachers (id, institution_id, profile_id, employee_code) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'AUTH-T1'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 'AUTH-T2');

insert into public.students (id, institution_id, profile_id, roll_no) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'AUTH-S1'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', 'AUTH-S2'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000000a', 'AUTH-S3'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000000b', 'AUTH-S4');

insert into public.parent_student_links (
  id, institution_id, parent_profile_id, student_id, relationship, is_primary
) values (
  '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001',
  'Parent', true
);

insert into public.departments (id, institution_id, name, code) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Test Department One', 'AUTH-D1'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Test Department Two', 'AUTH-D2');

insert into public.academic_courses (id, institution_id, department_id, code, title) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'AUTH-C1', 'Test Course One'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'AUTH-C2', 'Test Course Two');

insert into public.batches (id, institution_id, academic_course_id, name) values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Authorization Batch One'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Authorization Batch Two'),
  ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Authorization Batch Three');

insert into public.teacher_batch_assignments (institution_id, batch_id, teacher_id, is_primary) values
  ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', true);

insert into public.student_enrollments (institution_id, batch_id, student_id) values
  ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003');

-- Teacher: assigned batch/enrollment only; base Student identities remain unavailable.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.batches where id::text like '80000000-%') <> 1
    or exists (select 1 from public.batches where id = '80000000-0000-0000-0000-000000000002')
    or (select count(*) from public.student_enrollments where id is not null and batch_id::text like '80000000-%') <> 1
    or exists (select 1 from public.students where id::text like '40000000-%') then
    raise exception 'teacher RLS escaped assigned-batch scope';
  end if;
end $$;
reset role;

-- Student: own identity and enrolled batch only.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;
insert into public.daily_goals (
  id, institution_id, student_id, title, category, target, status
) values (
  '90000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'Authorization tracker trigger check',
  'Test',
  'Verify owner and activity triggers',
  'active'
);
do $$ begin
  if (select count(*) from public.students where id::text like '40000000-%') <> 1
    or not exists (select 1 from public.students where id = '40000000-0000-0000-0000-000000000001')
    or (select count(*) from public.batches where id::text like '80000000-%') <> 1
    or not exists (
      select 1 from public.daily_activity_events
      where goal_id = '90000000-0000-0000-0000-000000000001'
        and event_type = 'goal_created'
    ) then
    raise exception 'student RLS escaped own/enrolled scope';
  end if;
end $$;
reset role;

-- Parent: explicitly linked child and that child's batch only.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.students where id::text like '40000000-%') <> 1
    or not exists (select 1 from public.students where id = '40000000-0000-0000-0000-000000000001')
    or (select count(*) from public.parent_student_links where id::text like '50000000-%') <> 1
    or (select count(*) from public.batches where id::text like '80000000-%') <> 1 then
    raise exception 'parent RLS escaped explicitly linked child scope';
  end if;
end $$;
reset role;

-- Tenant Admin and Super Admin: their own institution only.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.students where id::text like '40000000-%') <> 3
    or exists (select 1 from public.students where id = '40000000-0000-0000-0000-000000000003')
    or (select count(*) from public.batches where id::text like '80000000-%') <> 2 then
    raise exception 'admin RLS escaped tenant scope';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.profiles where id = '20000000-0000-0000-0000-000000000009')
    or exists (select 1 from public.batches where id = '80000000-0000-0000-0000-000000000003') then
    raise exception 'super admin RLS escaped tenant scope';
  end if;
end $$;
reset role;

-- Product Admin: platform institution metadata and own profile, no educational identities.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.institutions where id::text like '10000000-%') <> 2
    or (select count(*) from public.profiles where id::text like '20000000-%') <> 1
    or exists (select 1 from public.students where id::text like '40000000-%')
    or exists (select 1 from public.batches where id::text like '80000000-%') then
    raise exception 'product admin RLS exceeds platform contract';
  end if;
end $$;
reset role;

-- Client-controlled JWT metadata cannot elevate a database-authoritative Student profile.
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-00000000000b","role":"authenticated","user_metadata":{"role":"super_admin","institution_id":"10000000-0000-0000-0000-000000000002"}}',
  true
);
set local role authenticated;
do $$ begin
  if (select count(*) from public.students where id::text like '40000000-%') <> 1
    or not exists (select 1 from public.students where id = '40000000-0000-0000-0000-000000000004')
    or exists (select 1 from public.batches where id::text like '80000000-%') then
    raise exception 'JWT metadata granted privileges outside the authoritative profile';
  end if;
end $$;
reset role;

rollback;
