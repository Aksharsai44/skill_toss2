begin;

create or replace function private.validate_daily_tracker_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

  if tg_table_name = 'daily_tasks' then
    if new.goal_id is not null and not exists (
      select 1 from public.daily_goals as goal
      where goal.id = new.goal_id
        and goal.student_id = new.student_id
        and goal.institution_id = new.institution_id
    ) then
      raise exception 'task goal must belong to the same student' using errcode = '23514';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

create or replace function private.record_daily_tracker_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_event text;
begin
  if tg_table_name = 'daily_goals' then
    if tg_op = 'INSERT' then
      next_event := 'goal_created';
    elsif new.status = 'completed' and old.status <> 'completed' then
      next_event := 'goal_completed';
    end if;

    if next_event is not null then
      insert into public.daily_activity_events (
        institution_id,
        student_id,
        event_type,
        goal_id,
        task_id
      )
      values (new.institution_id, new.student_id, next_event, new.id, null);
    end if;
  elsif tg_table_name = 'daily_tasks' then
    if tg_op = 'INSERT' then
      next_event := 'task_created';
    elsif new.status = 'completed' and old.status <> 'completed' then
      next_event := 'task_completed';
    end if;

    if next_event is not null then
      insert into public.daily_activity_events (
        institution_id,
        student_id,
        event_type,
        goal_id,
        task_id
      )
      values (new.institution_id, new.student_id, next_event, new.goal_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_daily_tracker_owner() from public, anon, authenticated;
revoke all on function private.record_daily_tracker_activity() from public, anon, authenticated;

commit;
