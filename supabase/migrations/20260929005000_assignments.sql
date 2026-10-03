begin;

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  subject_id uuid not null,
  title text not null check (btrim(title) <> ''),
  instructions text not null default '',
  due_at timestamptz not null,
  max_marks numeric(8,2) not null check (max_marks > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by_profile_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete restrict,
  foreign key (institution_id, subject_id)
    references public.subjects(institution_id, id) on delete restrict,
  foreign key (institution_id, created_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);
create index assignments_batch_due_idx on public.assignments (batch_id, due_at);

create table public.assignment_resources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  assignment_id uuid not null,
  file_name text not null check (btrim(file_name) <> ''),
  mime_type text not null check (btrim(mime_type) <> ''),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_bucket text not null default 'learning-resources',
  storage_path text not null check (btrim(storage_path) <> '' and storage_path !~ '(^|/)\.\.(/|$)'),
  uploaded_by_profile_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  foreign key (institution_id, assignment_id)
    references public.assignments(institution_id, id) on delete cascade,
  foreign key (institution_id, uploaded_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  assignment_id uuid not null,
  student_id uuid not null,
  response text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'graded')),
  submitted_at timestamptz,
  marks numeric(8,2),
  feedback text,
  graded_by_profile_id uuid,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (assignment_id, student_id),
  foreign key (institution_id, assignment_id)
    references public.assignments(institution_id, id) on delete cascade,
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete restrict,
  foreign key (institution_id, graded_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict,
  check (
    (status = 'draft' and submitted_at is null and marks is null and graded_at is null)
    or (status = 'submitted' and submitted_at is not null and marks is null and graded_at is null)
    or (status = 'graded' and submitted_at is not null and marks is not null and graded_at is not null)
  )
);
create index assignment_submissions_student_idx
  on public.assignment_submissions (student_id, status);

create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function private.set_updated_at();
create trigger assignment_submissions_set_updated_at before update on public.assignment_submissions
  for each row execute function private.set_updated_at();

create function private.current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select student.id from public.students as student
  join public.profiles as profile on profile.id = student.profile_id
  where profile.id = (select auth.uid())
    and profile.role = 'student'
    and profile.is_active
    and student.is_active;
$$;

create function private.can_read_assignment(target_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments as assignment
    where assignment.id = target_assignment_id
      and (
        (select private.can_manage_batch_academics(assignment.batch_id))
        or (
          assignment.status = 'published'
          and (
            (select private.student_can_access_batch(assignment.batch_id))
            or (select private.parent_can_access_batch(assignment.batch_id))
          )
        )
      )
  );
$$;

create function private.teacher_can_read_student_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students as student
    join public.student_enrollments as enrollment
      on enrollment.student_id = student.id and enrollment.status = 'active'
    where student.profile_id = target_profile_id
      and (select private.teacher_can_access_batch(enrollment.batch_id))
  );
$$;

create function private.parent_can_read_student_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students as student
    where student.profile_id = target_profile_id
      and (select private.parent_can_read_student(student.id))
  );
$$;

create function private.validate_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_profile_id = (select auth.uid());
  elsif new.id <> old.id or new.institution_id <> old.institution_id
    or new.batch_id <> old.batch_id or new.subject_id <> old.subject_id
    or new.created_by_profile_id <> old.created_by_profile_id then
    raise exception 'assignment identity cannot be changed' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.batches as batch
    join public.subjects as subject
      on subject.academic_course_id = batch.academic_course_id
     and subject.institution_id = batch.institution_id
    where batch.id = new.batch_id
      and subject.id = new.subject_id
      and batch.institution_id = new.institution_id
      and batch.status = 'active'
      and subject.is_active
  ) then
    raise exception 'assignment subject must belong to an active batch course' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_assignment_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  assignment_row public.assignments%rowtype;
  actor_role text;
  actor_student_id uuid;
begin
  select * into assignment_row from public.assignments where id = new.assignment_id;
  actor_role := (select private.current_profile_role());
  actor_student_id := (select private.current_student_id());

  if tg_op = 'UPDATE' and (
    new.id <> old.id or new.assignment_id <> old.assignment_id or new.student_id <> old.student_id
    or new.institution_id <> old.institution_id
  ) then
    raise exception 'submission ownership cannot be changed' using errcode = '23514';
  end if;

  if actor_role = 'student' then
    if actor_student_id is null or actor_student_id <> new.student_id then
      raise exception 'students may modify only their own submission' using errcode = '42501';
    end if;
    if assignment_row.status <> 'published' or now() > assignment_row.due_at then
      raise exception 'assignment is not accepting submissions' using errcode = '23514';
    end if;
    if not (select private.student_can_access_batch(assignment_row.batch_id)) then
      raise exception 'student is not enrolled in the assignment batch' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.status = 'graded' then
      raise exception 'graded submissions cannot be changed by students' using errcode = '23514';
    end if;
    if new.status not in ('draft', 'submitted') then
      raise exception 'students cannot grade submissions' using errcode = '42501';
    end if;
    new.marks = null;
    new.feedback = null;
    new.graded_by_profile_id = null;
    new.graded_at = null;
    if new.status = 'submitted' then
      new.submitted_at := case when tg_op = 'UPDATE' then coalesce(old.submitted_at, now()) else now() end;
    else
      new.submitted_at := null;
    end if;
  elsif (select private.can_manage_batch_academics(assignment_row.batch_id)) then
    if tg_op = 'INSERT' then
      raise exception 'staff cannot create a student submission' using errcode = '42501';
    end if;
    if old.status not in ('submitted', 'graded') or old.submitted_at is null then
      raise exception 'only submitted work can be evaluated' using errcode = '23514';
    end if;
    new.response = old.response;
    new.submitted_at = old.submitted_at;
    if new.status <> 'graded' or new.marks is null
      or new.marks < 0 or new.marks > assignment_row.max_marks then
      raise exception 'grade must be between zero and the assignment maximum' using errcode = '23514';
    end if;
    new.graded_by_profile_id = (select auth.uid());
    new.graded_at = now();
  else
    raise exception 'not authorized to modify this submission' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger assignments_validate before insert or update on public.assignments
  for each row execute function private.validate_assignment();
create trigger assignment_submissions_validate before insert or update on public.assignment_submissions
  for each row execute function private.validate_assignment_submission();

revoke all on function private.current_student_id() from public;
revoke all on function private.can_read_assignment(uuid) from public;
revoke all on function private.teacher_can_read_student_profile(uuid) from public;
revoke all on function private.parent_can_read_student_profile(uuid) from public;
revoke all on function private.validate_assignment() from public, authenticated;
revoke all on function private.validate_assignment_submission() from public, authenticated;
grant execute on function private.current_student_id() to authenticated;
grant execute on function private.can_read_assignment(uuid) to authenticated;
grant execute on function private.teacher_can_read_student_profile(uuid) to authenticated;
grant execute on function private.parent_can_read_student_profile(uuid) to authenticated;

drop policy profiles_select_self_or_tenant_admin on public.profiles;
create policy profiles_select_authorized on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_tenant_admin(institution_id))
    or (select private.teacher_can_read_student_profile(id))
    or (select private.parent_can_read_student_profile(id))
  );

alter table public.assignments enable row level security;
alter table public.assignment_resources enable row level security;
alter table public.assignment_submissions enable row level security;

create policy assignments_select_authorized on public.assignments for select to authenticated
  using ((select private.can_read_assignment(id)));
create policy assignments_insert_authorized on public.assignments for insert to authenticated
  with check (
    created_by_profile_id = (select auth.uid())
    and (select private.can_manage_batch_academics(batch_id))
  );
create policy assignments_update_authorized on public.assignments for update to authenticated
  using ((select private.can_manage_batch_academics(batch_id)))
  with check ((select private.can_manage_batch_academics(batch_id)));

create policy assignment_resources_select_authorized on public.assignment_resources for select to authenticated
  using ((select private.can_read_assignment(assignment_id)));
create policy assignment_resources_insert_authorized on public.assignment_resources for insert to authenticated
  with check (
    uploaded_by_profile_id = (select auth.uid())
    and exists (
      select 1 from public.assignments as assignment
      where assignment.id = assignment_id
        and (select private.can_manage_batch_academics(assignment.batch_id))
    )
  );

create policy assignment_submissions_select_authorized
  on public.assignment_submissions for select to authenticated
  using (
    student_id = (select private.current_student_id())
    or (select private.parent_can_read_student(student_id))
    or exists (
      select 1 from public.assignments as assignment
      where assignment.id = assignment_id
        and (select private.can_manage_batch_academics(assignment.batch_id))
    )
  );
create policy assignment_submissions_insert_own
  on public.assignment_submissions for insert to authenticated
  with check (student_id = (select private.current_student_id()));
create policy assignment_submissions_update_own_or_staff
  on public.assignment_submissions for update to authenticated
  using (
    student_id = (select private.current_student_id())
    or exists (
      select 1 from public.assignments as assignment
      where assignment.id = assignment_id
        and (select private.can_manage_batch_academics(assignment.batch_id))
    )
  )
  with check (
    student_id = (select private.current_student_id())
    or exists (
      select 1 from public.assignments as assignment
      where assignment.id = assignment_id
        and (select private.can_manage_batch_academics(assignment.batch_id))
    )
  );

revoke all on table public.assignments from public, anon, authenticated;
revoke all on table public.assignment_resources from public, anon, authenticated;
revoke all on table public.assignment_submissions from public, anon, authenticated;
grant select, insert, update on table public.assignments to authenticated;
grant select, insert on table public.assignment_resources to authenticated;
grant select, insert, update on table public.assignment_submissions to authenticated;

commit;
