begin;

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  subject_id uuid not null,
  attendance_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_by_profile_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (batch_id, subject_id, attendance_date),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete restrict,
  foreign key (institution_id, subject_id)
    references public.subjects(institution_id, id) on delete restrict,
  foreign key (institution_id, created_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);
create index attendance_sessions_batch_date_idx
  on public.attendance_sessions (batch_id, attendance_date desc);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  attendance_session_id uuid not null,
  student_id uuid not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  marked_by_profile_id uuid not null default auth.uid(),
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (attendance_session_id, student_id),
  foreign key (institution_id, attendance_session_id)
    references public.attendance_sessions(institution_id, id) on delete cascade,
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete restrict,
  foreign key (institution_id, marked_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);
create index attendance_records_student_idx on public.attendance_records (student_id);

create trigger attendance_sessions_set_updated_at before update on public.attendance_sessions
  for each row execute function private.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records
  for each row execute function private.set_updated_at();

create function private.can_manage_batch_academics(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batches as batch
    where batch.id = target_batch_id
      and batch.status = 'active'
      and (
        (select private.is_tenant_admin(batch.institution_id))
        or (select private.teacher_can_access_batch(batch.id))
      )
  );
$$;

create function private.can_read_attendance_record(
  target_session_id uuid,
  target_student_id uuid
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.attendance_sessions as session
    join public.students as student
      on student.id = target_student_id
     and student.institution_id = session.institution_id
    where session.id = target_session_id
      and (
        (select private.is_tenant_admin(session.institution_id))
        or (select private.teacher_can_access_batch(session.batch_id))
        or (
          student.profile_id = (select auth.uid())
          and student.is_active
          and (select private.is_current_profile_active())
        )
        or (select private.parent_can_read_student(student.id))
      )
  );
$$;

create function private.validate_attendance_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_profile_id = (select auth.uid());
  elsif new.id <> old.id or new.institution_id <> old.institution_id
    or new.batch_id <> old.batch_id or new.subject_id <> old.subject_id
    or new.attendance_date <> old.attendance_date
    or new.created_by_profile_id <> old.created_by_profile_id then
    raise exception 'attendance session identity cannot be changed' using errcode = '23514';
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
    raise exception 'attendance subject must belong to an active batch course' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_attendance_record()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.id <> old.id or new.institution_id <> old.institution_id
    or new.attendance_session_id <> old.attendance_session_id
    or new.student_id <> old.student_id
  ) then
    raise exception 'attendance record identity cannot be changed' using errcode = '23514';
  end if;
  new.marked_by_profile_id = (select auth.uid());
  new.marked_at = now();
  if not exists (
    select 1
    from public.attendance_sessions as session
    join public.student_enrollments as enrollment
      on enrollment.batch_id = session.batch_id
     and enrollment.institution_id = session.institution_id
    join public.students as student on student.id = enrollment.student_id
    where session.id = new.attendance_session_id
      and enrollment.student_id = new.student_id
      and session.institution_id = new.institution_id
      and session.status = 'open'
      and enrollment.status = 'active'
      and student.is_active
  ) then
    raise exception 'attendance requires an open session and active batch enrollment'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger attendance_sessions_validate before insert or update on public.attendance_sessions
  for each row execute function private.validate_attendance_session();
create trigger attendance_records_validate before insert or update on public.attendance_records
  for each row execute function private.validate_attendance_record();

revoke all on function private.can_manage_batch_academics(uuid) from public;
revoke all on function private.can_read_attendance_record(uuid, uuid) from public;
revoke all on function private.validate_attendance_session() from public, authenticated;
revoke all on function private.validate_attendance_record() from public, authenticated;
grant execute on function private.can_manage_batch_academics(uuid) to authenticated;
grant execute on function private.can_read_attendance_record(uuid, uuid) to authenticated;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy attendance_sessions_select_authorized on public.attendance_sessions for select to authenticated
  using (
    (select private.can_manage_batch_academics(batch_id))
    or (select private.student_can_access_batch(batch_id))
    or (select private.parent_can_access_batch(batch_id))
  );
create policy attendance_sessions_insert_authorized on public.attendance_sessions for insert to authenticated
  with check (
    created_by_profile_id = (select auth.uid())
    and (select private.can_manage_batch_academics(batch_id))
  );
create policy attendance_sessions_update_authorized on public.attendance_sessions for update to authenticated
  using ((select private.can_manage_batch_academics(batch_id)))
  with check ((select private.can_manage_batch_academics(batch_id)));

create policy attendance_records_select_authorized on public.attendance_records for select to authenticated
  using ((select private.can_read_attendance_record(attendance_session_id, student_id)));
create policy attendance_records_insert_authorized on public.attendance_records for insert to authenticated
  with check (
    marked_by_profile_id = (select auth.uid())
    and exists (
      select 1 from public.attendance_sessions as session
      where session.id = attendance_session_id
        and (select private.can_manage_batch_academics(session.batch_id))
    )
  );
create policy attendance_records_update_authorized on public.attendance_records for update to authenticated
  using (
    exists (
      select 1 from public.attendance_sessions as session
      where session.id = attendance_session_id
        and (select private.can_manage_batch_academics(session.batch_id))
    )
  )
  with check (
    marked_by_profile_id = (select auth.uid())
    and exists (
      select 1 from public.attendance_sessions as session
      where session.id = attendance_session_id
        and (select private.can_manage_batch_academics(session.batch_id))
    )
  );

revoke all on table public.attendance_sessions from public, anon, authenticated;
revoke all on table public.attendance_records from public, anon, authenticated;
grant select, insert, update on table public.attendance_sessions to authenticated;
grant select, insert, update on table public.attendance_records to authenticated;

create view public.student_attendance_summary
with (security_invoker = true)
as
select
  record.institution_id,
  record.student_id,
  session.subject_id,
  subject.code as subject_code,
  subject.title as subject_title,
  count(*)::integer as total_sessions,
  count(*) filter (where record.status in ('present', 'late'))::integer as attended_sessions,
  count(*) filter (where record.status = 'absent')::integer as absent_sessions,
  count(*) filter (where record.status = 'late')::integer as late_sessions,
  count(*) filter (where record.status = 'excused')::integer as excused_sessions,
  round(
    100.0 * count(*) filter (where record.status in ('present', 'late')) / nullif(count(*), 0),
    2
  ) as attendance_percentage
from public.attendance_records as record
join public.attendance_sessions as session on session.id = record.attendance_session_id
join public.subjects as subject on subject.id = session.subject_id
group by record.institution_id, record.student_id, session.subject_id, subject.code, subject.title;

revoke all on table public.student_attendance_summary from public, anon, authenticated;
grant select on table public.student_attendance_summary to authenticated;

commit;
