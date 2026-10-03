begin;

-- Auth owns email. Tenant managers may administer profile attributes, but cannot desynchronize
-- public.profiles.email from auth.users.email through the REST API.
revoke update on table public.profiles from authenticated;
grant update (
  institution_id,
  role,
  full_name,
  avatar_url,
  is_active
) on table public.profiles to authenticated;

commit;
