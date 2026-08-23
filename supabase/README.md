# Supabase Phase 1

The migration chain currently contains only the secure tenant and identity baseline. Assignments, attendance, exams, fees, resources, notifications, class sessions, notes, leaves, and Course Builder data have not been migrated.

## Apply the migration

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally; do not commit `.env` and do not put a service-role key in the frontend.

For a new linked project, apply the repository migration with the Supabase CLI:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Run `npx supabase init` only once; skip it if `supabase/config.toml` already exists.

Alternatively, open the migration file in the Supabase SQL Editor and run it once against the new, empty project. Do not run the old demo migrations; they were removed because they granted anonymous CRUD and created domains outside Phase 1.

After applying, run `tests/phase1_schema_checks.sql` in the SQL Editor. It checks the five tables, RLS flags, and anonymous table privileges without creating records.

## Create the development identities

1. In Supabase Dashboard, open **Authentication > Users**.
2. Create five email/password users: Rahul Sharma (Admin), Sneha Kapoor (Teacher), Arjun Verma (Student), Parent of Arjun (Parent), and optionally a Super Admin for RLS testing.
3. Choose the passwords in the Dashboard. Do not put them in SQL or repository files.
4. The Auth trigger creates an inactive, tenant-unassigned `student` profile for each user. Signup metadata cannot select a role or institution.
5. Replace the example email addresses below with the exact Auth-user emails, then run the SQL in the Dashboard SQL Editor.

```sql
begin;

insert into public.institutions (name, code)
values ('Skill Toss Demo College', 'STDC');

update public.profiles
set institution_id = (select id from public.institutions where code = 'STDC'),
    role = 'admin',
    full_name = 'Rahul Sharma',
    is_active = true
where lower(email) = lower('admin@example.test');

update public.profiles
set institution_id = (select id from public.institutions where code = 'STDC'),
    role = 'teacher',
    full_name = 'Sneha Kapoor',
    is_active = true
where lower(email) = lower('teacher@example.test');

update public.profiles
set institution_id = (select id from public.institutions where code = 'STDC'),
    role = 'student',
    full_name = 'Arjun Verma',
    is_active = true
where lower(email) = lower('student@example.test');

update public.profiles
set institution_id = (select id from public.institutions where code = 'STDC'),
    role = 'parent',
    full_name = 'Parent of Arjun',
    is_active = true
where lower(email) = lower('parent@example.test');

insert into public.teachers (institution_id, profile_id, employee_code)
select institution_id, id, 'TCH-001'
from public.profiles
where lower(email) = lower('teacher@example.test');

insert into public.students (institution_id, profile_id, roll_no)
select institution_id, id, 'STU-001'
from public.profiles
where lower(email) = lower('student@example.test');

insert into public.parent_student_links (
  institution_id,
  parent_profile_id,
  student_id,
  relationship,
  is_primary
)
select
  parent.institution_id,
  parent.id,
  student.id,
  'Parent',
  true
from public.profiles as parent
join public.students as student
  on student.institution_id = parent.institution_id
where lower(parent.email) = lower('parent@example.test')
  and student.profile_id = (
    select id
    from public.profiles
    where lower(email) = lower('student@example.test')
  );

commit;
```

Review the affected rows before committing if the supplied emails are not unique or do not match the intended Auth users. The schema enforces globally unique non-null profile emails and per-institution roll/employee codes.

## RLS verification matrix

Use the frontend or an authenticated Supabase client with each account. Never use the SQL Editor for these behavioral checks because its database role bypasses normal user RLS.

| Account | Expected result |
| --- | --- |
| Anonymous | Cannot select or modify any Phase 1 table |
| Student | Can select own profile and own `students` row; cannot update either |
| Parent | Can select own profile, own link, and linked Student row; cannot modify Student or link |
| Teacher | Can select own profile and own `teachers` row; cannot read institution Students |
| Admin | Can manage non-admin profiles and identity rows in the same institution only |
| Super Admin | Can manage admin/teacher/student/parent profiles and identity rows in the same institution only |
| Product Admin | Can read institution platform metadata and own profile; cannot read educational identity rows |

To prove tenant isolation, create a second named test institution and an Admin through the same controlled Dashboard process, then query its known IDs while signed in as the first Admin. The API must return no rows and all writes must fail. Remove the deliberate test tenant after verification if it is not needed.

Students cannot update `profiles`; therefore changing Auth `user_metadata.role` or `user_metadata.institution_id` has no authorization effect. Role and institution assignments are stored only in `public.profiles` and controlled by SQL/bootstrap or tenant-manager policies.
