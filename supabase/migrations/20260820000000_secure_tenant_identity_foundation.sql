begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  code text not null check (btrim(code) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index institutions_code_unique_idx
  on public.institutions (lower(code));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete restrict,
  role text not null default 'student'
    check (role in ('product_admin', 'super_admin', 'admin', 'teacher', 'student', 'parent')),
  full_name text not null check (btrim(full_name) <> ''),
  email text,
  avatar_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_product_admin_has_no_tenant
    check (role <> 'product_admin' or institution_id is null),
  constraint profiles_active_tenant_assignment
    check (not is_active or role = 'product_admin' or institution_id is not null),
  unique (institution_id, id)
);

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;
create index profiles_institution_role_idx
  on public.profiles (institution_id, role);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  profile_id uuid,
  roll_no text not null check (btrim(roll_no) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  unique (institution_id, id),
  foreign key (institution_id, profile_id)
    references public.profiles(institution_id, id)
    on delete restrict
);

create unique index students_institution_roll_no_unique_idx
  on public.students (institution_id, lower(roll_no));
create index students_institution_idx
  on public.students (institution_id);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  profile_id uuid,
  employee_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  unique (institution_id, id),
  foreign key (institution_id, profile_id)
    references public.profiles(institution_id, id)
    on delete restrict,
  check (employee_code is null or btrim(employee_code) <> '')
);

create unique index teachers_institution_employee_code_unique_idx
  on public.teachers (institution_id, lower(employee_code))
  where employee_code is not null;
create index teachers_institution_idx
  on public.teachers (institution_id);

create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  parent_profile_id uuid not null,
  student_id uuid not null,
  relationship text not null check (btrim(relationship) <> ''),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (parent_profile_id, student_id),
  foreign key (institution_id, parent_profile_id)
    references public.profiles(institution_id, id)
    on delete cascade,
  foreign key (institution_id, student_id)
    references public.students(institution_id, id)
    on delete cascade
);

create index parent_student_links_parent_idx
  on public.parent_student_links (parent_profile_id);
create index parent_student_links_student_idx
  on public.parent_student_links (student_id);
create index parent_student_links_institution_idx
  on public.parent_student_links (institution_id);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger students_set_updated_at
  before update on public.students
  for each row execute function private.set_updated_at();
create trigger teachers_set_updated_at
  before update on public.teachers
  for each row execute function private.set_updated_at();

create function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create function private.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.institution_id
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create function private.is_tenant_admin(target_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.is_active
      and p.institution_id = target_institution_id
      and p.role in ('admin', 'super_admin')
  );
$$;

create function private.can_manage_profile(
  target_institution_id uuid,
  target_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as manager
    where manager.id = (select auth.uid())
      and manager.is_active
      and manager.institution_id = target_institution_id
      and (
        (manager.role = 'super_admin' and target_role in ('admin', 'teacher', 'student', 'parent'))
        or
        (manager.role = 'admin' and target_role in ('teacher', 'student', 'parent'))
      )
  );
$$;

create function private.parent_can_read_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_student_links as link
    join public.profiles as parent
      on parent.id = link.parent_profile_id
     and parent.institution_id = link.institution_id
    where link.student_id = target_student_id
      and link.parent_profile_id = (select auth.uid())
      and parent.role = 'parent'
      and parent.is_active
  );
$$;

create function private.validate_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and not exists (
    select 1
    from public.profiles as p
    where p.id = new.profile_id
      and p.institution_id = new.institution_id
      and p.role = 'student'
  ) then
    raise exception 'student profile must reference a student role in the same institution'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_teacher_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and not exists (
    select 1
    from public.profiles as p
    where p.id = new.profile_id
      and p.institution_id = new.institution_id
      and p.role = 'teacher'
  ) then
    raise exception 'teacher profile must reference a teacher role in the same institution'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_parent_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles as p
    where p.id = new.parent_profile_id
      and p.institution_id = new.institution_id
      and p.role = 'parent'
  ) then
    raise exception 'parent link must reference a parent role in the same institution'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.validate_profile_identity_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> old.role then
    if new.role <> 'student' and exists (
      select 1 from public.students as s where s.profile_id = new.id
    ) then
      raise exception 'unlink the Student identity before changing this profile role'
        using errcode = '23514';
    end if;

    if new.role <> 'teacher' and exists (
      select 1 from public.teachers as t where t.profile_id = new.id
    ) then
      raise exception 'unlink the Teacher identity before changing this profile role'
        using errcode = '23514';
    end if;

    if new.role <> 'parent' and exists (
      select 1 from public.parent_student_links as link
      where link.parent_profile_id = new.id
    ) then
      raise exception 'remove Parent links before changing this profile role'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger students_validate_profile
  before insert or update of institution_id, profile_id on public.students
  for each row execute function private.validate_student_profile();
create trigger teachers_validate_profile
  before insert or update of institution_id, profile_id on public.teachers
  for each row execute function private.validate_teacher_profile();
create trigger parent_student_links_validate_parent
  before insert or update of institution_id, parent_profile_id on public.parent_student_links
  for each row execute function private.validate_parent_student_link();
create trigger profiles_validate_identity_role
  before update of role on public.profiles
  for each row execute function private.validate_profile_identity_role();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    institution_id,
    role,
    full_name,
    email,
    avatar_url,
    is_active
  )
  values (
    new.id,
    null,
    'student',
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.email), ''),
      'Pending user'
    ),
    new.email,
    null,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id
    and email is distinct from new.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

revoke all on function private.set_updated_at() from public;
revoke all on function private.current_profile_role() from public;
revoke all on function private.current_institution_id() from public;
revoke all on function private.is_tenant_admin(uuid) from public;
revoke all on function private.can_manage_profile(uuid, text) from public;
revoke all on function private.parent_can_read_student(uuid) from public;
revoke all on function private.validate_student_profile() from public;
revoke all on function private.validate_teacher_profile() from public;
revoke all on function private.validate_parent_student_link() from public;
revoke all on function private.validate_profile_identity_role() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_user_email_change() from public;

grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.current_institution_id() to authenticated;
grant execute on function private.is_tenant_admin(uuid) to authenticated;
grant execute on function private.can_manage_profile(uuid, text) to authenticated;
grant execute on function private.parent_can_read_student(uuid) to authenticated;
grant execute on function private.validate_student_profile() to authenticated;
grant execute on function private.validate_teacher_profile() to authenticated;
grant execute on function private.validate_parent_student_link() to authenticated;
grant execute on function private.validate_profile_identity_role() to authenticated;

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.parent_student_links enable row level security;

create policy institutions_select_own_or_platform
  on public.institutions
  for select
  to authenticated
  using (
    id = (select private.current_institution_id())
    or (select private.current_profile_role()) = 'product_admin'
  );

create policy profiles_select_self_or_tenant_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_tenant_admin(institution_id))
  );

create policy profiles_update_by_tenant_manager
  on public.profiles
  for update
  to authenticated
  using ((select private.can_manage_profile(institution_id, role)))
  with check ((select private.can_manage_profile(institution_id, role)));

create policy students_select_authorized
  on public.students
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.parent_can_read_student(id))
    or (select private.is_tenant_admin(institution_id))
  );

create policy students_insert_by_tenant_admin
  on public.students
  for insert
  to authenticated
  with check ((select private.is_tenant_admin(institution_id)));

create policy students_update_by_tenant_admin
  on public.students
  for update
  to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

create policy students_delete_by_tenant_admin
  on public.students
  for delete
  to authenticated
  using ((select private.is_tenant_admin(institution_id)));

create policy teachers_select_self_or_tenant_admin
  on public.teachers
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.is_tenant_admin(institution_id))
  );

create policy teachers_insert_by_tenant_admin
  on public.teachers
  for insert
  to authenticated
  with check ((select private.is_tenant_admin(institution_id)));

create policy teachers_update_by_tenant_admin
  on public.teachers
  for update
  to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

create policy teachers_delete_by_tenant_admin
  on public.teachers
  for delete
  to authenticated
  using ((select private.is_tenant_admin(institution_id)));

create policy parent_student_links_select_authorized
  on public.parent_student_links
  for select
  to authenticated
  using (
    parent_profile_id = (select auth.uid())
    or (select private.is_tenant_admin(institution_id))
  );

create policy parent_student_links_insert_by_tenant_admin
  on public.parent_student_links
  for insert
  to authenticated
  with check ((select private.is_tenant_admin(institution_id)));

create policy parent_student_links_update_by_tenant_admin
  on public.parent_student_links
  for update
  to authenticated
  using ((select private.is_tenant_admin(institution_id)))
  with check ((select private.is_tenant_admin(institution_id)));

create policy parent_student_links_delete_by_tenant_admin
  on public.parent_student_links
  for delete
  to authenticated
  using ((select private.is_tenant_admin(institution_id)));

revoke all on table public.institutions from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.students from public, anon, authenticated;
revoke all on table public.teachers from public, anon, authenticated;
revoke all on table public.parent_student_links from public, anon, authenticated;

grant select on table public.institutions to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.students to authenticated;
grant select, insert, update, delete on table public.teachers to authenticated;
grant select, insert, update, delete on table public.parent_student_links to authenticated;

commit;
