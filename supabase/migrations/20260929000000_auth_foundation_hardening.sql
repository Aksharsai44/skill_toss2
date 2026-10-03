begin;

create function private.is_current_profile_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.is_active
  );
$$;

revoke all on function private.is_current_profile_active() from public;
grant execute on function private.is_current_profile_active() to authenticated;

drop policy students_select_authorized on public.students;
create policy students_select_authorized
  on public.students
  for select
  to authenticated
  using (
    (
      profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
    )
    or (select private.parent_can_read_student(id))
    or (select private.is_tenant_admin(institution_id))
  );

drop policy teachers_select_self_or_tenant_admin on public.teachers;
create policy teachers_select_self_or_tenant_admin
  on public.teachers
  for select
  to authenticated
  using (
    (
      profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
    )
    or (select private.is_tenant_admin(institution_id))
  );

drop policy parent_student_links_select_authorized on public.parent_student_links;
create policy parent_student_links_select_authorized
  on public.parent_student_links
  for select
  to authenticated
  using (
    (
      parent_profile_id = (select auth.uid())
      and (select private.is_current_profile_active())
    )
    or (select private.is_tenant_admin(institution_id))
  );

-- Trigger functions execute through their triggers and do not need to be callable by clients.
revoke execute on function private.set_updated_at() from authenticated;
revoke execute on function private.validate_student_profile() from authenticated;
revoke execute on function private.validate_teacher_profile() from authenticated;
revoke execute on function private.validate_parent_student_link() from authenticated;
revoke execute on function private.validate_profile_identity_role() from authenticated;
revoke execute on function private.handle_new_user() from authenticated;
revoke execute on function private.handle_user_email_change() from authenticated;

commit;
