begin;

create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  title text not null check (btrim(title) <> ''),
  category text not null check (btrim(category) <> ''),
  target text not null default '',
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete cascade,
  check ((status = 'completed') = (completed_at is not null))
);
create index daily_goals_student_status_idx on public.daily_goals (student_id, status);

create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  goal_id uuid,
  activity_date date not null default current_date,
  title text not null check (btrim(title) <> ''),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete cascade,
  foreign key (institution_id, goal_id)
    references public.daily_goals(institution_id, id) on delete cascade,
  check ((status = 'completed') = (completed_at is not null))
);
create index daily_tasks_student_date_idx on public.daily_tasks (student_id, activity_date desc);

create table public.daily_activity_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  event_type text not null check (event_type in ('goal_created', 'goal_completed', 'task_created', 'task_completed')),
  goal_id uuid,
  task_id uuid,
  occurred_at timestamptz not null default now(),
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete cascade,
  foreign key (institution_id, goal_id)
    references public.daily_goals(institution_id, id) on delete cascade,
  foreign key (institution_id, task_id)
    references public.daily_tasks(institution_id, id) on delete cascade
);
create index daily_activity_student_time_idx
  on public.daily_activity_events (student_id, occurred_at desc);

create trigger daily_goals_set_updated_at before update on public.daily_goals
  for each row execute function private.set_updated_at();
create trigger daily_tasks_set_updated_at before update on public.daily_tasks
  for each row execute function private.set_updated_at();

create function private.can_read_student_progress(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students as student
    where student.id = target_student_id
      and student.is_active
      and (
        (select private.is_tenant_admin(student.institution_id))
        or (
          student.profile_id = (select auth.uid())
          and (select private.is_current_profile_active())
        )
        or (select private.parent_can_read_student(student.id))
        or exists (
          select 1 from public.student_enrollments as enrollment
          where enrollment.student_id = student.id
            and enrollment.status = 'active'
            and (select private.teacher_can_access_batch(enrollment.batch_id))
        )
      )
  );
$$;

create function private.validate_daily_tracker_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.id <> old.id or new.student_id <> old.student_id
    or new.institution_id <> old.institution_id
  ) then
    raise exception 'daily tracker ownership cannot be changed' using errcode = '23514';
  end if;
  if new.student_id <> (select private.current_student_id()) then
    raise exception 'daily tracker records may be changed only by their student owner'
      using errcode = '42501';
  end if;
  if tg_table_name = 'daily_tasks' and new.goal_id is not null and not exists (
    select 1 from public.daily_goals as goal
    where goal.id = new.goal_id
      and goal.student_id = new.student_id
      and goal.institution_id = new.institution_id
  ) then
    raise exception 'task goal must belong to the same student' using errcode = '23514';
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create function private.record_daily_tracker_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  next_event text;
begin
  if tg_table_name = 'daily_goals' then
    if tg_op = 'INSERT' then next_event := 'goal_created';
    elsif new.status = 'completed' and old.status <> 'completed' then next_event := 'goal_completed';
    end if;
  else
    if tg_op = 'INSERT' then next_event := 'task_created';
    elsif new.status = 'completed' and old.status <> 'completed' then next_event := 'task_completed';
    end if;
  end if;
  if next_event is not null then
    insert into public.daily_activity_events (institution_id, student_id, event_type, goal_id, task_id)
    values (
      new.institution_id,
      new.student_id,
      next_event,
      case when tg_table_name = 'daily_goals' then new.id else new.goal_id end,
      case when tg_table_name = 'daily_tasks' then new.id else null end
    );
  end if;
  return new;
end;
$$;

create trigger daily_goals_validate before insert or update on public.daily_goals
  for each row execute function private.validate_daily_tracker_owner();
create trigger daily_tasks_validate before insert or update on public.daily_tasks
  for each row execute function private.validate_daily_tracker_owner();
create trigger daily_goals_record_activity after insert or update on public.daily_goals
  for each row execute function private.record_daily_tracker_activity();
create trigger daily_tasks_record_activity after insert or update on public.daily_tasks
  for each row execute function private.record_daily_tracker_activity();

revoke all on function private.can_read_student_progress(uuid) from public;
revoke all on function private.validate_daily_tracker_owner() from public, authenticated;
revoke all on function private.record_daily_tracker_activity() from public, authenticated;
grant execute on function private.can_read_student_progress(uuid) to authenticated;

alter table public.daily_goals enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.daily_activity_events enable row level security;

create policy daily_goals_select_authorized on public.daily_goals for select to authenticated
  using ((select private.can_read_student_progress(student_id)));
create policy daily_goals_insert_own on public.daily_goals for insert to authenticated
  with check (student_id = (select private.current_student_id()));
create policy daily_goals_update_own on public.daily_goals for update to authenticated
  using (student_id = (select private.current_student_id()))
  with check (student_id = (select private.current_student_id()));

create policy daily_tasks_select_authorized on public.daily_tasks for select to authenticated
  using ((select private.can_read_student_progress(student_id)));
create policy daily_tasks_insert_own on public.daily_tasks for insert to authenticated
  with check (student_id = (select private.current_student_id()));
create policy daily_tasks_update_own on public.daily_tasks for update to authenticated
  using (student_id = (select private.current_student_id()))
  with check (student_id = (select private.current_student_id()));

create policy daily_activity_select_authorized on public.daily_activity_events for select to authenticated
  using ((select private.can_read_student_progress(student_id)));

revoke all on table public.daily_goals from public, anon, authenticated;
revoke all on table public.daily_tasks from public, anon, authenticated;
revoke all on table public.daily_activity_events from public, anon, authenticated;
grant select, insert, update on table public.daily_goals to authenticated;
grant select, insert, update on table public.daily_tasks to authenticated;
grant select on table public.daily_activity_events to authenticated;

commit;
