# Skill Toss server-side permission matrix

`public.profiles.role` is the authoritative role source. The supported values are
`product_admin`, `super_admin`, `admin`, `teacher`, `student`, and `parent`.
Frontend routes improve navigation only; PostgreSQL privileges, RLS policies, and relational
ownership are the security boundary.

## Phase 1 identity data

| Role | Institutions | Profiles | Student identities | Teacher identities | Parent links |
| --- | --- | --- | --- | --- | --- |
| Product Admin | Read platform institution metadata | Own profile only | None | None | None |
| Super Admin | Own institution | Self and same-tenant managed roles | Same tenant | Same tenant | Same tenant |
| Admin | Own institution | Self and same-tenant teacher/student/parent profiles | Same tenant | Same tenant | Same tenant |
| Teacher | Own institution | Own profile | None | Own active identity | None |
| Student | Own institution | Own profile | Own active identity | None | None |
| Parent | Own institution | Own profile | Explicitly linked active children | None | Own active links |

Inactive profiles can read only their own profile so the client can explain that access is
disabled. They cannot read educational identity rows. Anonymous users have no table privileges.

## Academic-domain rules

These rules apply to the domain migrations that follow:

| Capability | Product Admin | Super Admin | Admin | Teacher | Student | Parent |
| --- | --- | --- | --- | --- | --- | --- |
| Manage tenant academic records | No | Own tenant | Own tenant | No | No | No |
| Read batches | Platform metadata only | Own tenant | Own tenant | Assigned | Enrolled | Linked child |
| Manage attendance | No | Own tenant | Own tenant | Assigned batch | No | No |
| Read attendance | No | Own tenant | Own tenant | Assigned batch | Own | Linked child |
| Manage assignments | No | Own tenant | Own tenant | Assigned batch/course | No | No |
| Submit assignment work | No | No | No | No | Own enrollment | No |
| Read student progress | No | Own tenant | Own tenant | Assigned students | Own | Linked child |

Every academic row carries `institution_id`; policies must validate both tenant ownership and
the relevant assignment/enrollment/link. User-provided IDs alone never establish access.
