do $$
declare
  expected_table text;
begin
  foreach expected_table in array array['announcements', 'community_posts', 'community_comments']
  loop
    if to_regclass('public.' || expected_table) is null then
      raise exception 'missing communication table: %', expected_table;
    end if;
    if has_table_privilege('anon', 'public.' || expected_table, 'SELECT') then
      raise exception 'anon can read communication table: %', expected_table;
    end if;
    if has_table_privilege('authenticated', 'public.' || expected_table, 'DELETE') then
      raise exception 'hard-delete is exposed for communication table: %', expected_table;
    end if;
  end loop;
end;
$$;
