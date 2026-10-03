-- Skill Toss Demo Accounts Seed
-- Seeds the 6 role identities into auth.users, auth.identities, public.profiles,
-- and identity link tables with password 'demo123'.

begin;

-- 1. Ensure institution exists
insert into public.institutions (id, name, code, is_active)
values ('91000000-0000-4000-8000-000000000001'::uuid, 'Skill Toss Demo College', 'STDC', true)
on conflict (id) do update set is_active = true;

-- 2. Create auth user & identity if not exists
do $$
declare
  acc record;
  hashed_pw text := extensions.crypt('demo123', extensions.gen_salt('bf'));
begin
  for acc in (
    select * from (values
      ('91000000-0000-4000-8000-000000000001'::uuid, 'superadmin@skilltoss.demo', 'Priya Nair', 'super_admin'),
      ('91000000-0000-4000-8000-000000000002'::uuid, 'productadmin@skilltoss.demo', 'Aarav Mehta', 'product_admin'),
      ('91000000-0000-4000-8000-000000000003'::uuid, 'admin@skilltoss.demo', 'Rahul Sharma', 'admin'),
      ('91000000-0000-4000-8000-000000000004'::uuid, 'teacher@skilltoss.demo', 'Sneha Kapoor', 'teacher'),
      ('91000000-0000-4000-8000-000000000005'::uuid, 'student@skilltoss.demo', 'Arjun Verma', 'student'),
      ('91000000-0000-4000-8000-000000000006'::uuid, 'parent@skilltoss.demo', 'Rajesh Verma', 'parent')
    ) as t(id, email, full_name, role)
  ) loop
    if not exists (select 1 from auth.users where lower(email) = lower(acc.email)) then
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change,
        phone_change_token,
        reauthentication_token,
        email_change_confirm_status,
        is_super_admin
      ) values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        acc.id,
        'authenticated',
        'authenticated',
        acc.email,
        hashed_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', acc.full_name)::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        false
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        acc.id,
        json_build_object('sub', acc.id::text, 'email', acc.email)::jsonb,
        'email',
        acc.id::text,
        now(),
        now(),
        now()
      );
    else
      -- Ensure password is set to demo123, email confirmed, and string fields are non-null
      update auth.users
      set encrypted_password = hashed_pw,
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_token = coalesce(confirmation_token, ''),
          recovery_token = coalesce(recovery_token, ''),
          email_change_token_new = coalesce(email_change_token_new, ''),
          email_change = coalesce(email_change, ''),
          email_change_token_current = coalesce(email_change_token_current, ''),
          phone_change = coalesce(phone_change, ''),
          phone_change_token = coalesce(phone_change_token, ''),
          reauthentication_token = coalesce(reauthentication_token, ''),
          email_change_confirm_status = coalesce(email_change_confirm_status, 0)
      where lower(email) = lower(acc.email);
    end if;
  end loop;
end $$;

-- 3. Update profiles for each role
update public.profiles
set institution_id = '91000000-0000-4000-8000-000000000001'::uuid,
    full_name = 'Priya Nair',
    role = 'super_admin',
    is_active = true
where lower(email) = 'superadmin@skilltoss.demo';

update public.profiles
set institution_id = null,
    full_name = 'Aarav Mehta',
    role = 'product_admin',
    is_active = true
where lower(email) = 'productadmin@skilltoss.demo';

update public.profiles
set institution_id = '91000000-0000-4000-8000-000000000001'::uuid,
    full_name = 'Rahul Sharma',
    role = 'admin',
    is_active = true
where lower(email) = 'admin@skilltoss.demo';

update public.profiles
set institution_id = '91000000-0000-4000-8000-000000000001'::uuid,
    full_name = 'Sneha Kapoor',
    role = 'teacher',
    is_active = true
where lower(email) = 'teacher@skilltoss.demo';

update public.profiles
set institution_id = '91000000-0000-4000-8000-000000000001'::uuid,
    full_name = 'Arjun Verma',
    role = 'student',
    is_active = true
where lower(email) = 'student@skilltoss.demo';

update public.profiles
set institution_id = '91000000-0000-4000-8000-000000000001'::uuid,
    full_name = 'Rajesh Verma',
    role = 'parent',
    is_active = true
where lower(email) = 'parent@skilltoss.demo';

-- 4. Ensure teacher, student, and parent links exist
insert into public.teachers (id, institution_id, profile_id, employee_code, is_active)
select
  '91000000-0000-4000-8000-000000000006'::uuid,
  '91000000-0000-4000-8000-000000000001'::uuid,
  id,
  'TCH-001',
  true
from public.profiles
where lower(email) = 'teacher@skilltoss.demo'
on conflict (id) do nothing;

insert into public.students (id, institution_id, profile_id, roll_no, is_active)
select
  '91000000-0000-4000-8000-000000000007'::uuid,
  '91000000-0000-4000-8000-000000000001'::uuid,
  id,
  'STU-001',
  true
from public.profiles
where lower(email) = 'student@skilltoss.demo'
on conflict (id) do nothing;

insert into public.parent_student_links (institution_id, parent_profile_id, student_id, relationship, is_primary)
select
  '91000000-0000-4000-8000-000000000001'::uuid,
  parent.id,
  student.id,
  'Father',
  true
from public.profiles as parent
join public.students as student
  on student.institution_id = parent.institution_id
where lower(parent.email) = 'parent@skilltoss.demo'
  and student.profile_id = (
    select id from public.profiles where lower(email) = 'student@skilltoss.demo'
  )
on conflict do nothing;

commit;
