begin;

create function private.validate_teacher_batch_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_active and not exists (
    select 1 from public.teachers as teacher
    join public.batches as batch on batch.institution_id = teacher.institution_id
    where teacher.id = new.teacher_id
      and batch.id = new.batch_id
      and teacher.institution_id = new.institution_id
      and teacher.is_active
      and batch.status = 'active'
  ) then
    raise exception 'active assignment requires an active teacher and batch in the same institution'
      using errcode = '23514';
  end if;

  if new.subject_id is not null and not exists (
    select 1 from public.subjects as subject
    join public.batches as batch
      on batch.academic_course_id = subject.academic_course_id
     and batch.institution_id = subject.institution_id
    where subject.id = new.subject_id
      and batch.id = new.batch_id
      and subject.institution_id = new.institution_id
      and subject.is_active
  ) then
    raise exception 'assigned subject must be active and belong to the batch course'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_student_enrollment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and not exists (
    select 1 from public.students as student
    join public.batches as batch on batch.institution_id = student.institution_id
    where student.id = new.student_id
      and batch.id = new.batch_id
      and student.institution_id = new.institution_id
      and student.is_active
      and batch.status = 'active'
  ) then
    raise exception 'active enrollment requires an active student and batch in the same institution'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger teacher_batch_assignments_validate
  before insert or update on public.teacher_batch_assignments
  for each row execute function private.validate_teacher_batch_assignment();
create trigger student_enrollments_validate
  before insert or update on public.student_enrollments
  for each row execute function private.validate_student_enrollment();

revoke all on function private.validate_teacher_batch_assignment() from public, authenticated;
revoke all on function private.validate_student_enrollment() from public, authenticated;

create policy batches_insert_by_tenant_admin on public.batches for insert to authenticated
  with check ((select private.is_tenant_admin(institution_id)));
create policy batches_update_by_tenant_admin on public.batches for update to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

create policy teacher_batch_assignments_insert_by_tenant_admin
  on public.teacher_batch_assignments for insert to authenticated
  with check ((select private.is_tenant_admin(institution_id)));
create policy teacher_batch_assignments_update_by_tenant_admin
  on public.teacher_batch_assignments for update to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

create policy student_enrollments_insert_by_tenant_admin
  on public.student_enrollments for insert to authenticated
  with check ((select private.is_tenant_admin(institution_id)));
create policy student_enrollments_update_by_tenant_admin
  on public.student_enrollments for update to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

grant insert, update on table public.batches to authenticated;
grant insert, update on table public.teacher_batch_assignments to authenticated;
grant insert, update on table public.student_enrollments to authenticated;

create view public.batch_details
with (security_invoker = true)
as
select
  batch.id,
  batch.institution_id,
  batch.academic_course_id,
  batch.name,
  batch.schedule,
  batch.status,
  batch.archived_at,
  batch.created_at,
  batch.updated_at,
  course.code as course_code,
  course.title as course_title,
  department.id as department_id,
  department.code as department_code,
  department.name as department_name,
  coalesce(teachers.items, '[]'::jsonb) as teachers,
  coalesce(students.items, '[]'::jsonb) as students
from public.batches as batch
join public.academic_courses as course on course.id = batch.academic_course_id
join public.departments as department on department.id = course.department_id
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'assignment_id', assignment.id,
    'teacher_id', teacher.id,
    'employee_code', teacher.employee_code,
    'profile_id', profile.id,
    'full_name', profile.full_name,
    'avatar_url', profile.avatar_url,
    'subject_id', assignment.subject_id,
    'is_primary', assignment.is_primary,
    'is_active', assignment.is_active
  ) order by assignment.is_primary desc, profile.full_name) as items
  from public.teacher_batch_assignments as assignment
  join public.teachers as teacher on teacher.id = assignment.teacher_id
  left join public.profiles as profile on profile.id = teacher.profile_id
  where assignment.batch_id = batch.id
) as teachers on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'enrollment_id', enrollment.id,
    'student_id', student.id,
    'roll_no', student.roll_no,
    'profile_id', profile.id,
    'full_name', profile.full_name,
    'avatar_url', profile.avatar_url,
    'status', enrollment.status,
    'enrolled_at', enrollment.enrolled_at,
    'removed_at', enrollment.removed_at
  ) order by profile.full_name, student.roll_no) as items
  from public.student_enrollments as enrollment
  join public.students as student on student.id = enrollment.student_id
  left join public.profiles as profile on profile.id = student.profile_id
  where enrollment.batch_id = batch.id
) as students on true;

revoke all on table public.batch_details from public, anon, authenticated;
grant select on table public.batch_details to authenticated;

commit;
