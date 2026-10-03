begin;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid,
  title text not null check (btrim(title) <> ''),
  body text not null check (btrim(body) <> ''),
  audience_roles text[] not null default array['teacher', 'student', 'parent'],
  status text not null default 'published' check (status in ('published', 'archived')),
  author_profile_id uuid not null default auth.uid(),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete cascade,
  foreign key (institution_id, author_profile_id)
    references public.profiles(institution_id, id) on delete restrict,
  check (
    cardinality(audience_roles) > 0
    and audience_roles <@ array['super_admin', 'admin', 'teacher', 'student', 'parent']::text[]
  )
);
create index announcements_institution_published_idx
  on public.announcements (institution_id, published_at desc);
create index announcements_batch_published_idx
  on public.announcements (batch_id, published_at desc) where batch_id is not null;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null,
  author_profile_id uuid not null default auth.uid(),
  content text not null check (btrim(content) <> '' and length(content) <= 5000),
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, batch_id)
    references public.batches(institution_id, id) on delete cascade,
  foreign key (institution_id, author_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);
create index community_posts_batch_created_idx on public.community_posts (batch_id, created_at desc);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  post_id uuid not null,
  author_profile_id uuid not null default auth.uid(),
  content text not null check (btrim(content) <> '' and length(content) <= 2000),
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (institution_id, post_id)
    references public.community_posts(institution_id, id) on delete cascade,
  foreign key (institution_id, author_profile_id)
    references public.profiles(institution_id, id) on delete restrict
);
create index community_comments_post_created_idx on public.community_comments (post_id, created_at);

create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function private.set_updated_at();
create trigger community_posts_set_updated_at before update on public.community_posts
  for each row execute function private.set_updated_at();
create trigger community_comments_set_updated_at before update on public.community_comments
  for each row execute function private.set_updated_at();

create function private.can_read_community_batch(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_tenant_admin(batch.institution_id))
    or (
      (select private.current_profile_role()) = 'teacher'
      and (select private.teacher_can_access_batch(batch.id))
    )
    or (
      (select private.current_profile_role()) = 'student'
      and (select private.student_can_access_batch(batch.id))
    )
  from public.batches as batch where batch.id = target_batch_id;
$$;

create function private.can_moderate_community_batch(target_batch_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_tenant_admin(batch.institution_id))
    or (
      (select private.current_profile_role()) = 'teacher'
      and (select private.teacher_can_access_batch(batch.id))
    )
  from public.batches as batch where batch.id = target_batch_id;
$$;

create function private.can_read_announcement(
  target_institution_id uuid,
  target_batch_id uuid,
  target_audience text[],
  target_status text
)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_status = 'published'
    and (select private.current_profile_role()) = any(target_audience)
    and (
      (
        target_batch_id is null
        and target_institution_id = (select private.current_institution_id())
      )
      or (select private.teacher_can_access_batch(target_batch_id))
      or (select private.student_can_access_batch(target_batch_id))
      or (select private.parent_can_access_batch(target_batch_id))
    );
$$;

create function private.can_read_community_post(target_post_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_posts as post
    where post.id = target_post_id
      and (post.status = 'active' or (select private.can_moderate_community_batch(post.batch_id)))
      and (select private.can_read_community_batch(post.batch_id))
  );
$$;

create function private.validate_community_content()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_batch_id uuid;
begin
  if tg_op = 'INSERT' then
    new.author_profile_id = (select auth.uid());
    new.status = case when tg_table_name = 'announcements' then 'published' else 'active' end;
  elsif new.id <> old.id or new.author_profile_id <> old.author_profile_id
    or new.institution_id <> old.institution_id then
    raise exception 'community content ownership cannot be changed' using errcode = '23514';
  end if;

  if tg_table_name = 'community_comments' then
    if tg_op = 'UPDATE' and new.post_id <> old.post_id then
      raise exception 'comment post cannot be changed' using errcode = '23514';
    end if;
    select post.batch_id into target_batch_id from public.community_posts as post where post.id = new.post_id;
  else
    target_batch_id := new.batch_id;
  end if;

  if tg_table_name = 'community_posts' and tg_op = 'UPDATE' and new.batch_id <> old.batch_id then
    raise exception 'post batch cannot be changed' using errcode = '23514';
  end if;

  if tg_table_name <> 'announcements' and tg_op = 'UPDATE' and new.author_profile_id = (select auth.uid()) then
    new.status = old.status;
  elsif tg_table_name <> 'announcements' and tg_op = 'UPDATE'
    and (select private.can_moderate_community_batch(target_batch_id)) then
    new.content = old.content;
  end if;
  return new;
end;
$$;

create trigger announcements_validate before insert or update on public.announcements
  for each row execute function private.validate_community_content();
create trigger community_posts_validate before insert or update on public.community_posts
  for each row execute function private.validate_community_content();
create trigger community_comments_validate before insert or update on public.community_comments
  for each row execute function private.validate_community_content();

revoke all on function private.can_read_community_batch(uuid) from public;
revoke all on function private.can_moderate_community_batch(uuid) from public;
revoke all on function private.can_read_announcement(uuid, uuid, text[], text) from public;
revoke all on function private.can_read_community_post(uuid) from public;
revoke all on function private.validate_community_content() from public, authenticated;
grant execute on function private.can_read_community_batch(uuid) to authenticated;
grant execute on function private.can_moderate_community_batch(uuid) to authenticated;
grant execute on function private.can_read_announcement(uuid, uuid, text[], text) to authenticated;
grant execute on function private.can_read_community_post(uuid) to authenticated;

alter table public.announcements enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

create policy announcements_select_authorized on public.announcements for select to authenticated
  using (
    (select private.is_tenant_admin(institution_id))
    or (select private.can_read_announcement(institution_id, batch_id, audience_roles, status))
  );
create policy announcements_insert_authorized on public.announcements for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and (
      (select private.is_tenant_admin(institution_id))
      or (batch_id is not null and (select private.teacher_can_access_batch(batch_id)))
    )
  );
create policy announcements_update_authorized on public.announcements for update to authenticated
  using (
    (select private.is_tenant_admin(institution_id))
    or (author_profile_id = (select auth.uid()) and batch_id is not null and (select private.teacher_can_access_batch(batch_id)))
  )
  with check (
    (select private.is_tenant_admin(institution_id))
    or (author_profile_id = (select auth.uid()) and batch_id is not null and (select private.teacher_can_access_batch(batch_id)))
  );

create policy community_posts_select_authorized on public.community_posts for select to authenticated
  using (
    (status = 'active' or (select private.can_moderate_community_batch(batch_id)))
    and (select private.can_read_community_batch(batch_id))
  );
create policy community_posts_insert_authorized on public.community_posts for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and (select private.current_profile_role()) in ('teacher', 'student')
    and (select private.can_read_community_batch(batch_id))
  );
create policy community_posts_update_authorized on public.community_posts for update to authenticated
  using (author_profile_id = (select auth.uid()) or (select private.can_moderate_community_batch(batch_id)))
  with check (author_profile_id = (select auth.uid()) or (select private.can_moderate_community_batch(batch_id)));

create policy community_comments_select_authorized on public.community_comments for select to authenticated
  using (
    (status = 'active' or exists (
      select 1 from public.community_posts as post
      where post.id = post_id and (select private.can_moderate_community_batch(post.batch_id))
    ))
    and (select private.can_read_community_post(post_id))
  );
create policy community_comments_insert_authorized on public.community_comments for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and (select private.current_profile_role()) in ('teacher', 'student')
    and (select private.can_read_community_post(post_id))
  );
create policy community_comments_update_authorized on public.community_comments for update to authenticated
  using (
    author_profile_id = (select auth.uid())
    or exists (
      select 1 from public.community_posts as post
      where post.id = post_id and (select private.can_moderate_community_batch(post.batch_id))
    )
  )
  with check (
    author_profile_id = (select auth.uid())
    or exists (
      select 1 from public.community_posts as post
      where post.id = post_id and (select private.can_moderate_community_batch(post.batch_id))
    )
  );

revoke all on table public.announcements from public, anon, authenticated;
revoke all on table public.community_posts from public, anon, authenticated;
revoke all on table public.community_comments from public, anon, authenticated;
grant select, insert, update on table public.announcements to authenticated;
grant select, insert, update on table public.community_posts to authenticated;
grant select, insert, update on table public.community_comments to authenticated;

commit;
