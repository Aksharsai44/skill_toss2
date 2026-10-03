begin;

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  student_id uuid not null,
  title text not null check (btrim(title) <> ''),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  unique (institution_id, id, student_id),
  foreign key (institution_id, student_id)
    references public.students(institution_id, id) on delete cascade
);

create table public.note_files (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  note_id uuid not null,
  student_id uuid not null,
  file_name text not null check (length(file_name) between 1 and 255 and file_name !~ '[\\/]'),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  created_at timestamptz not null default now(),
  foreign key (institution_id, note_id, student_id)
    references public.student_notes(institution_id, id, student_id) on delete cascade
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  subject_id uuid not null,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  file_name text not null check (length(file_name) between 1 and 255 and file_name !~ '[\\/]'),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  uploaded_by_profile_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete cascade,
  foreign key (institution_id, subject_id)
    references public.subjects(institution_id, id) on delete restrict,
  foreign key (institution_id, uploaded_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  submission_id uuid not null,
  file_name text not null check (length(file_name) between 1 and 255 and file_name !~ '[\\/]'),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  uploaded_by_profile_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (institution_id, submission_id)
    references public.assignment_submissions(institution_id, id) on delete cascade,
  foreign key (institution_id, uploaded_by_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);

create trigger student_notes_set_updated_at before update on public.student_notes
  for each row execute function private.set_updated_at();

create function private.storage_path_uuid(target_name text, folder_position integer)
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  return (storage.foldername(target_name))[folder_position]::uuid;
exception when others then
  return null;
end;
$$;

create function private.can_read_learning_resource_path(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.learning_resources as resource
    where resource.storage_path = target_path
      and (
        (select private.can_manage_batch_academics(resource.batch_id))
        or (select private.student_can_access_batch(resource.batch_id))
        or (select private.parent_can_access_batch(resource.batch_id))
      )
  ) or exists (
    select 1 from public.assignment_resources as resource
    where resource.storage_path = target_path
      and (select private.can_read_assignment(resource.assignment_id))
  );
$$;

create function private.can_read_submission_file_path(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submission_files as file
    join public.assignment_submissions as submission on submission.id = file.submission_id
    join public.assignments as assignment on assignment.id = submission.assignment_id
    where file.storage_path = target_path
      and (
        submission.student_id = (select private.current_student_id())
        or (select private.parent_can_read_student(submission.student_id))
        or (select private.can_manage_batch_academics(assignment.batch_id))
      )
  );
$$;

create function private.can_upload_submission_path(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments as assignment
    where assignment.id = (select private.storage_path_uuid(target_path, 2))
      and assignment.institution_id = (select private.storage_path_uuid(target_path, 1))
      and assignment.status = 'published'
      and now() <= assignment.due_at
      and (select private.storage_path_uuid(target_path, 3)) = (select private.current_student_id())
      and (select private.student_can_access_batch(assignment.batch_id))
  );
$$;

create function private.validate_file_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  expected_batch_id uuid;
  expected_assignment_id uuid;
  expected_student_id uuid;
begin
  if (select private.storage_path_uuid(new.storage_path, 1)) is distinct from new.institution_id then
    raise exception 'storage path institution does not match metadata' using errcode = '23514';
  end if;

  if tg_table_name = 'note_files' then
    if (select private.storage_path_uuid(new.storage_path, 2)) is distinct from new.student_id then
      raise exception 'note storage path owner does not match metadata' using errcode = '23514';
    end if;
  elsif tg_table_name = 'learning_resources' then
    if (select private.storage_path_uuid(new.storage_path, 2)) is distinct from new.batch_id or not exists (
      select 1 from public.batches as batch
      join public.subjects as subject
        on subject.academic_course_id = batch.academic_course_id
       and subject.institution_id = batch.institution_id
      where batch.id = new.batch_id and subject.id = new.subject_id
        and batch.institution_id = new.institution_id
    ) then
      raise exception 'resource path, batch, and subject do not match' using errcode = '23514';
    end if;
  elsif tg_table_name = 'submission_files' then
    select assignment.id, submission.student_id
    into expected_assignment_id, expected_student_id
    from public.assignment_submissions as submission
    join public.assignments as assignment on assignment.id = submission.assignment_id
    where submission.id = new.submission_id and submission.institution_id = new.institution_id;
    if (select private.storage_path_uuid(new.storage_path, 2)) is distinct from expected_assignment_id
      or (select private.storage_path_uuid(new.storage_path, 3)) is distinct from expected_student_id then
      raise exception 'submission storage path does not match metadata' using errcode = '23514';
    end if;
  else
    select assignment.batch_id into expected_batch_id
    from public.assignments as assignment
    where assignment.id = new.assignment_id and assignment.institution_id = new.institution_id;
    if (select private.storage_path_uuid(new.storage_path, 2)) is distinct from expected_batch_id then
      raise exception 'assignment resource path does not match its batch' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger note_files_validate before insert or update on public.note_files
  for each row execute function private.validate_file_metadata();
create trigger learning_resources_validate before insert or update on public.learning_resources
  for each row execute function private.validate_file_metadata();
create trigger submission_files_validate before insert or update on public.submission_files
  for each row execute function private.validate_file_metadata();
create trigger assignment_resources_validate before insert or update on public.assignment_resources
  for each row execute function private.validate_file_metadata();

revoke all on function private.storage_path_uuid(text, integer) from public;
revoke all on function private.can_read_learning_resource_path(text) from public;
revoke all on function private.can_read_submission_file_path(text) from public;
revoke all on function private.can_upload_submission_path(text) from public;
grant execute on function private.storage_path_uuid(text, integer) to authenticated;
grant execute on function private.can_read_learning_resource_path(text) to authenticated;
grant execute on function private.can_read_submission_file_path(text) to authenticated;
grant execute on function private.can_upload_submission_path(text) to authenticated;
revoke all on function private.validate_file_metadata() from public, authenticated;

alter table public.student_notes enable row level security;
alter table public.note_files enable row level security;
alter table public.learning_resources enable row level security;
alter table public.submission_files enable row level security;

create policy student_notes_own_all on public.student_notes for all to authenticated
  using (student_id = (select private.current_student_id()))
  with check (student_id = (select private.current_student_id()));
create policy note_files_own_all on public.note_files for all to authenticated
  using (student_id = (select private.current_student_id()))
  with check (student_id = (select private.current_student_id()));

create policy learning_resources_select_authorized on public.learning_resources for select to authenticated
  using (
    (select private.can_manage_batch_academics(batch_id))
    or (select private.student_can_access_batch(batch_id))
    or (select private.parent_can_access_batch(batch_id))
  );
create policy learning_resources_insert_authorized on public.learning_resources for insert to authenticated
  with check (
    uploaded_by_profile_id = (select auth.uid())
    and (select private.can_manage_batch_academics(batch_id))
  );
create policy learning_resources_delete_authorized on public.learning_resources for delete to authenticated
  using ((select private.can_manage_batch_academics(batch_id)));

create policy submission_files_select_authorized on public.submission_files for select to authenticated
  using ((select private.can_read_submission_file_path(storage_path)));
create policy submission_files_insert_own on public.submission_files for insert to authenticated
  with check (
    uploaded_by_profile_id = (select auth.uid())
    and exists (
      select 1 from public.assignment_submissions as submission
      where submission.id = submission_id
        and submission.student_id = (select private.current_student_id())
    )
  );
create policy submission_files_delete_own on public.submission_files for delete to authenticated
  using (
    exists (
      select 1 from public.assignment_submissions as submission
      where submission.id = submission_id
        and submission.student_id = (select private.current_student_id())
        and submission.status <> 'graded'
    )
  );

revoke all on table public.student_notes from public, anon, authenticated;
revoke all on table public.note_files from public, anon, authenticated;
revoke all on table public.learning_resources from public, anon, authenticated;
revoke all on table public.submission_files from public, anon, authenticated;
grant select, insert, update, delete on table public.student_notes to authenticated;
grant select, insert, delete on table public.note_files to authenticated;
grant select, insert, delete on table public.learning_resources to authenticated;
grant select, insert, delete on table public.submission_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-notes', 'student-notes', false, 10485760, array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'
  ]),
  ('learning-resources', 'learning-resources', false, 10485760, array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'
  ]),
  ('assignment-submissions', 'assignment-submissions', false, 10485760, array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_notes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-notes'
    and (select private.storage_path_uuid(name, 1)) = (select private.current_institution_id())
    and (select private.storage_path_uuid(name, 2)) = (select private.current_student_id())
  );
create policy storage_notes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'student-notes'
    and exists (
      select 1 from public.note_files as file
      where file.storage_path = name
        and file.student_id = (select private.current_student_id())
    )
  );
create policy storage_notes_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-notes'
    and (select private.storage_path_uuid(name, 2)) = (select private.current_student_id())
  );

create policy storage_learning_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'learning-resources'
    and (select private.storage_path_uuid(name, 1)) = (select private.current_institution_id())
    and (select private.can_manage_batch_academics((select private.storage_path_uuid(name, 2))))
  );
create policy storage_learning_select on storage.objects for select to authenticated
  using (
    bucket_id = 'learning-resources'
    and (select private.can_read_learning_resource_path(name))
  );
create policy storage_learning_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'learning-resources'
    and (select private.can_manage_batch_academics((select private.storage_path_uuid(name, 2))))
  );

create policy storage_submissions_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'assignment-submissions' and (select private.can_upload_submission_path(name)));
create policy storage_submissions_select on storage.objects for select to authenticated
  using (bucket_id = 'assignment-submissions' and (select private.can_read_submission_file_path(name)));
create policy storage_submissions_delete on storage.objects for delete to authenticated
  using (bucket_id = 'assignment-submissions' and (select private.can_upload_submission_path(name)));

commit;
