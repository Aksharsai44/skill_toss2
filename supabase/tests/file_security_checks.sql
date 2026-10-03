do $$
declare
  bucket_name text;
begin
  foreach bucket_name in array array['student-notes', 'learning-resources', 'assignment-submissions']
  loop
    if not exists (
      select 1 from storage.buckets
      where id = bucket_name and not public and file_size_limit = 10485760
    ) then
      raise exception 'missing or unsafe private bucket: %', bucket_name;
    end if;
  end loop;

  if exists (
    select 1 from storage.buckets
    where id in ('student-notes', 'learning-resources', 'assignment-submissions') and public
  ) then
    raise exception 'private educational bucket is public';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_submissions_select'
  ) then
    raise exception 'submission download policy is missing';
  end if;
end;
$$;
