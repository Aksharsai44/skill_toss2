begin;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  code text not null check (btrim(code) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id)
);
create unique index departments_institution_code_unique_idx
  on public.departments (institution_id, lower(code));

create table public.academic_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  department_id uuid not null,
  code text not null check (btrim(code) <> ''),
  title text not null check (btrim(title) <> ''),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, department_id)
    references public.departments(institution_id, id) on delete restrict
);
create unique index academic_courses_institution_code_unique_idx
  on public.academic_courses (institution_id, lower(code));
create index academic_courses_department_idx on public.academic_courses (department_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  academic_course_id uuid not null,
  code text not null check (btrim(code) <> ''),
  title text not null check (btrim(title) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, academic_course_id)
    references public.academic_courses(institution_id, id) on delete restrict
);
create unique index subjects_course_code_unique_idx
  on public.subjects (academic_course_id, lower(code));

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  academic_course_id uuid not null,
  name text not null check (btrim(name) <> ''),
  schedule text,
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, academic_course_id)
    references public.academic_courses(institution_id, id) on delete restrict,
  check ((status = 'archived') = (archived_at is not null))
);
create unique index batches_active_name_unique_idx
  on public.batches (institution_id, lower(name)) where status = 'active';
create index batches_course_status_idx on public.batches (academic_course_id, status);

create table public.teacher_batch_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  teacher_id uuid not null,
  subject_id uuid,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete cascade,
  foreign key (institution_id, teacher_id)
    references public.teachers(institution_id, id) on delete restrict,
  foreign key (institution_id, subject_id)
    references public.subjects(institution_id, id) on delete restrict
);
create unique index teacher_batch_subject_unique_idx
  on public.teacher_batch_assignments (batch_id, teacher_id, subject_id)
  where subject_id is not null;
create unique index teacher_batch_general_unique_idx
  on public.teacher_batch_assignments (batch_id, teacher_id)
  where subject_id is null;
create index teacher_batch_assignments_teacher_idx
  on public.teacher_batch_assignments (teacher_id, is_active);

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  student_id uuid not null,
  status text not null default 'active' check (status in ('active', 'removed')),
  enrolled_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (institution_id, id),
  unique (batch_id, student_id),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete cascade,
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete restrict,
  check ((status = 'removed') = (removed_at is not null))
);
create index student_enrollments_student_status_idx
  on public.student_enrollments (student_id, status);

create trigger departments_set_updated_at before update on public.departments
  for each row execute function private.set_updated_at();
create trigger academic_courses_set_updated_at before update on public.academic_courses
  for each row execute function private.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function private.set_updated_at();
create trigger batches_set_updated_at before update on public.batches
  for each row execute function private.set_updated_at();

create function private.teacher_can_access_batch(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.teacher_batch_assignments as assignment
    join public.teachers as teacher
      on teacher.id = assignment.teacher_id
     and teacher.institution_id = assignment.institution_id
    where assignment.batch_id = target_batch_id
      and assignment.is_active
      and teacher.is_active
      and teacher.profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
  );
$$;

create function private.student_can_access_batch(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.student_enrollments as enrollment
    join public.students as student
      on student.id = enrollment.student_id
     and student.institution_id = enrollment.institution_id
    where enrollment.batch_id = target_batch_id
      and enrollment.status = 'active'
      and student.is_active
      and student.profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
  );
$$;

create function private.parent_can_access_batch(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.student_enrollments as enrollment
    join public.parent_student_links as link
      on link.student_id = enrollment.student_id
     and link.institution_id = enrollment.institution_id
    where enrollment.batch_id = target_batch_id
      and enrollment.status = 'active'
      and link.parent_profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
  );
$$;

revoke all on function private.teacher_can_access_batch(uuid) from public;
revoke all on function private.student_can_access_batch(uuid) from public;
revoke all on function private.parent_can_access_batch(uuid) from public;
grant execute on function private.teacher_can_access_batch(uuid) to authenticated;
grant execute on function private.student_can_access_batch(uuid) to authenticated;
grant execute on function private.parent_can_access_batch(uuid) to authenticated;

alter table public.departments enable row level security;
alter table public.academic_courses enable row level security;
alter table public.subjects enable row level security;
alter table public.batches enable row level security;
alter table public.teacher_batch_assignments enable row level security;
alter table public.student_enrollments enable row level security;

create policy departments_select_same_tenant on public.departments for select to authenticated
  using (institution_id = (select private.current_institution_id()));
create policy academic_courses_select_same_tenant on public.academic_courses for select to authenticated
  using (institution_id = (select private.current_institution_id()));
create policy subjects_select_same_tenant on public.subjects for select to authenticated
  using (institution_id = (select private.current_institution_id()));
create policy batches_select_authorized on public.batches for select to authenticated
  using (
    (select private.is_tenant_admin(institution_id))
    or (select private.teacher_can_access_batch(id))
    or (select private.student_can_access_batch(id))
    or (select private.parent_can_access_batch(id))
  );
create policy teacher_batch_assignments_select_authorized
  on public.teacher_batch_assignments for select to authenticated
  using (
    (select private.is_tenant_admin(institution_id))
    or (select private.teacher_can_access_batch(batch_id))
    or (select private.student_can_access_batch(batch_id))
    or (select private.parent_can_access_batch(batch_id))
  );
create policy student_enrollments_select_authorized
  on public.student_enrollments for select to authenticated
  using (
    (select private.is_tenant_admin(institution_id))
    or (select private.teacher_can_access_batch(batch_id))
    or (
      student_id in (
        select student.id from public.students as student
        where student.profile_id = (select auth.uid()) and student.is_active
      )
      and (select private.is_current_profile_active())
    )
    or (select private.parent_can_read_student(student_id))
  );

revoke all on table public.departments from public, anon, authenticated;
revoke all on table public.academic_courses from public, anon, authenticated;
revoke all on table public.subjects from public, anon, authenticated;
revoke all on table public.batches from public, anon, authenticated;
revoke all on table public.teacher_batch_assignments from public, anon, authenticated;
revoke all on table public.student_enrollments from public, anon, authenticated;
grant select on table public.departments to authenticated;
grant select on table public.academic_courses to authenticated;
grant select on table public.subjects to authenticated;
grant select on table public.batches to authenticated;
grant select on table public.teacher_batch_assignments to authenticated;
grant select on table public.student_enrollments to authenticated;

commit;
