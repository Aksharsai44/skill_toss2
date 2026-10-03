# Skill Toss PostgreSQL domain map

All application-owned primary keys are UUIDs. Tenant-owned tables include `institution_id` and
use composite foreign keys such as `(institution_id, batch_id)` so an identifier from another
tenant cannot form a valid relationship.

| Entity | Table | Important relationships and constraints | RLS scope |
| --- | --- | --- | --- |
| Institution | `institutions` | Case-insensitive unique `code` | Own tenant; platform metadata for Product Admin |
| User profile | `profiles` | PK/FK to `auth.users`; six-role check; active tenant requirement | Self or same-tenant manager |
| Student identity | `students` | Optional unique profile; unique tenant roll number | Self, linked parent, tenant manager |
| Teacher identity | `teachers` | Optional unique profile; unique tenant employee code | Self or tenant manager |
| Parent-child link | `parent_student_links` | Unique parent/student pair; tenant-composite FKs | Parent or tenant manager |
| Department | `departments` | Unique tenant code | Active same-tenant users |
| Academic course | `academic_courses` | Tenant-composite department FK; unique tenant code | Active same-tenant users |
| Subject | `subjects` | Tenant-composite course FK; unique code per course | Active same-tenant users |
| Batch | `batches` | Tenant-composite course FK; soft archive invariant | Manager or related teacher/student/parent |
| Teacher assignment | `teacher_batch_assignments` | Tenant-composite batch/teacher/subject FKs | Manager or batch participant |
| Student enrollment | `student_enrollments` | Unique batch/student pair; soft removal invariant | Manager, assigned teacher, own student, linked parent |

`academic_courses` is intentionally distinct from the frontend Course Builder's historical
`courses` query. The latter has no deployed table and represents a later learning-content domain;
using a separate name prevents two features from silently sharing incompatible records.
