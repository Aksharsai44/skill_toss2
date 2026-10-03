begin;

-- Called only by the trusted user-provisioning Edge Function after it has created an Auth user.
-- The function re-checks the initiating profile and performs every PostgreSQL write atomically.
create function public.provision_invited_user(
  actor_profile_id uuid,
  target_profile_id uuid,
  target_email text,
  target_full_name text,
  target_role text,
  target_institution_id uuid,
  teacher_employee_code text default null,
  target_batch_id uuid default null,
  target_subject_id uuid default null,
  student_roll_no text default null,
  parent_student_id uuid default null,
  parent_relationship text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
  target public.profiles%rowtype;
  teacher_id uuid;
  student_id uuid;
begin
  select * into actor from public.profiles where id = actor_profile_id;
  if actor.id is null or not actor.is_active or actor.role not in ('super_admin', 'admin') then
    raise exception 'not authorized to provision users' using errcode = '42501';
  end if;

  if actor.institution_id is null or target_institution_id is distinct from actor.institution_id then
    raise exception 'users may be provisioned only in the caller institution' using errcode = '42501';
  end if;

  if (actor.role = 'admin' and target_role not in ('teacher', 'student', 'parent'))
    or (actor.role = 'super_admin' and target_role not in ('admin', 'teacher', 'student', 'parent')) then
    raise exception 'role is not permitted for this administrator' using errcode = '42501';
  end if;

  if btrim(coalesce(target_full_name, '')) = '' or target_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid full name and email are required' using errcode = '22023';
  end if;

  select * into target from public.profiles where id = target_profile_id for update;
  if target.id is null
    or target.is_active
    or target.institution_id is not null
    or target.role <> 'student'
    or lower(target.email) is distinct from lower(target_email) then
    raise exception 'Auth profile is missing or is not a fresh invitation profile' using errcode = '23514';
  end if;

  update public.profiles
  set institution_id = target_institution_id,
      role = target_role,
      full_name = btrim(target_full_name),
      is_active = true
  where id = target_profile_id;

  if target_role = 'teacher' then
    insert into public.teachers (institution_id, profile_id, employee_code)
    values (target_institution_id, target_profile_id, nullif(btrim(teacher_employee_code), ''))
    returning id into teacher_id;

    if target_batch_id is not null then
      insert into public.teacher_batch_assignments (
        institution_id, batch_id, teacher_id, subject_id, is_primary
      ) values (
        target_institution_id, target_batch_id, teacher_id, target_subject_id, true
      );
    end if;
  elsif target_role = 'student' then
    if btrim(coalesce(student_roll_no, '')) = '' or target_batch_id is null then
      raise exception 'student roll number and batch are required' using errcode = '22023';
    end if;

    insert into public.students (institution_id, profile_id, roll_no)
    values (target_institution_id, target_profile_id, btrim(student_roll_no))
    returning id into student_id;

    insert into public.student_enrollments (institution_id, batch_id, student_id)
    values (target_institution_id, target_batch_id, student_id);
  elsif target_role = 'parent' then
    if parent_student_id is null or btrim(coalesce(parent_relationship, '')) = '' then
      raise exception 'linked student and relationship are required' using errcode = '22023';
    end if;

    insert into public.parent_student_links (
      institution_id, parent_profile_id, student_id, relationship, is_primary
    ) values (
      target_institution_id, target_profile_id, parent_student_id,
      btrim(parent_relationship), true
    );
  end if;

  return jsonb_build_object(
    'profile_id', target_profile_id,
    'role', target_role,
    'institution_id', target_institution_id,
    'teacher_id', teacher_id,
    'student_id', student_id
  );
end;
$$;

revoke all on function public.provision_invited_user(
  uuid, uuid, text, text, text, uuid, text, uuid, uuid, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.provision_invited_user(
  uuid, uuid, text, text, text, uuid, text, uuid, uuid, text, uuid, text
) to service_role;

commit;
