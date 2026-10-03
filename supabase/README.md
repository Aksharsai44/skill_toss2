# Skill Toss Supabase backend

The migration chain starts with the secure tenant/identity baseline and then adds authentication
hardening, six-role RLS, the academic core, batches, attendance, assignments, daily tracking,
private file storage, LMS communication, and trusted user provisioning. Exams, fees, leave requests, notifications, class
sessions, and the separate Course Builder content model are still intentionally deferred.

The full migration chain through `20261001001000` is deployed to the linked staging project
`skilltoss-staging` (`cbtqosdhbsvoqeaswicb`). Migration history, six-role hosted Auth/RLS checks,
private Storage checks, idempotent seed reruns, and browser route guards were verified on
2026-10-01. This is a staging target, not a production deployment.

## Trusted user provisioning

Institution Admins use `/admin/users/new` to create Teacher, Student, and Parent accounts. The
browser sends only a signed-in access token and role-specific input to the `provision-user` Edge
Function; it never receives a service-role key or chooses the user's password. The function
revalidates the actor's active database profile, permitted role, institution, request origin, and
redirect origin before asking Supabase Auth to send an invitation.

Migration `20261001001000_trusted_user_provisioning.sql` exposes a service-role-only transactional
function that converts the fresh inactive Auth-trigger profile into the requested active tenant
profile and creates the matching Teacher identity/assignment, Student identity/enrollment, or
Parent link. If the relational transaction fails, the Edge Function compensates by deleting the
new Auth identity. Admins cannot create Admin, Super Admin, or Product Admin accounts; Super Admin
may create Admin/Teacher/Student/Parent in its own institution through the server contract, though
the current Add User page is intentionally Institution-Admin scoped.

Invite and recovery callbacks return to `/login`; the user chooses a password in SkillToss and all
existing sessions are signed out after setup/recovery. Signed-in users can change their password
from Account (and Student Settings) without any application password table or custom hashing.

`npm run verify:staging:provisioning` is exact-target gated. It checks the deployed denial matrix,
the real Admin form, Auth/profile UUID linkage, role relationships, password setup, login routing,
duplicate handling, and cleanup. Successful hosted invite testing requires custom SMTP or a Send
Email hook: Supabase's built-in sender is limited to two emails per hour and is not suitable for
this three-role staging journey.

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

After applying, run every SQL file in `supabase/tests` in filename order. These checks are
non-mutating and verify table presence, RLS flags, anonymous privileges, least-privilege grants,
private buckets, and expected policies. Then perform the role-based behavioral matrix below with
real test sessions; SQL Editor queries run as an elevated database role and cannot prove RLS behavior.

For local Supabase, `authorization_behavior_checks.sql` creates rollback-only fixtures and changes
to the `authenticated` database role for every assertion. Run all checks with `ON_ERROR_STOP=1`.
The browser/Auth test harness additionally provisions six temporary users with a random password,
tests the shared login and route guards, and deletes the users in `finally`. Its default mode refuses
non-local URLs; persistent staging fixtures require the explicit gates documented below:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY="$(npx supabase status -o env | sed -n 's/^ANON_KEY=//p')" \
SUPABASE_SERVICE_ROLE_KEY="$(npx supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY=//p')" \
npm run verify:auth:local
```

## Reproducible local/staging seed

`npm run seed:staging` uses the Supabase Admin API for Auth users, then the existing database
relationships and actor-aware RLS paths for data. It is deterministic and safe to rerun: fixed
record UUIDs and lookup emails update the six seed accounts without creating duplicates. The seed
password is required at runtime and is never stored in React, SQL, or this repository.

The command defaults to local-only and rejects every non-local URL. To seed the linked staging
project, a developer must additionally set `SKILLTOSS_SEED_TARGET=staging`,
`SKILLTOSS_ALLOW_STAGING_SEED=true`, and `SKILLTOSS_STAGING_PROJECT_REF` to the exact hostname
project reference. Never use those overrides for production.

PowerShell local workflow:

```powershell
$status = npx supabase status | ConvertFrom-Json
$env:SUPABASE_URL = $status.API_URL
$env:SUPABASE_ANON_KEY = $status.ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
$env:SKILLTOSS_SEED_TARGET = 'local'
$env:SKILLTOSS_SEED_PASSWORD = Read-Host 'Temporary seed password'
npm run seed:staging
npm run verify:seed:auth
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SKILLTOSS_SEED_PASSWORD
```

The seed creates exactly one institution plus the six `@skilltoss.test` Auth identities documented
below, one course/subject/batch, the required Teacher/Student/Parent relationships, and one minimal
attendance, assignment/submission, tracker, and announcement dataset. The verification script uses
real login sessions and temporary negative-control rows to prove RLS, then removes those controls.

Hosted staging verification additionally requires `SKILLTOSS_VERIFY_TARGET=staging`,
`SKILLTOSS_ALLOW_STAGING_VERIFY=true`, and the same exact project-ref match. Run
`npm run verify:seed:auth` for browser/session/RLS checks and `npm run verify:staging:security`
for anonymous/direct-REST denial, metadata-forgery resistance, inactive-user and recovery-token
behavior, and private Storage upload/download/size/MIME/delete boundaries. Email delivery is
provider-dependent and must be reported separately from recovery callback/password-update checks.

| Role | Seed email |
| --- | --- |
| Super Admin | `superadmin@skilltoss.test` |
| Product Admin | `productadmin@skilltoss.test` |
| Admin | `admin@skilltoss.test` |
| Teacher | `teacher@skilltoss.test` |
| Student | `student@skilltoss.test` |
| Parent | `parent@skilltoss.test` |

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
