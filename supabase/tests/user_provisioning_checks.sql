do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'provision_invited_user'
      and p.prosecdef
  ) then
    raise exception 'trusted provisioning function is missing or not security definer';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.provision_invited_user(uuid,uuid,text,text,text,uuid,text,uuid,uuid,text,uuid,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.provision_invited_user(uuid,uuid,text,text,text,uuid,text,uuid,uuid,text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'browser roles can execute trusted provisioning';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.provision_invited_user(uuid,uuid,text,text,text,uuid,text,uuid,uuid,text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'service role cannot execute trusted provisioning';
  end if;
end;
$$;
